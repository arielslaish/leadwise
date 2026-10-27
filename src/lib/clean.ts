// Step 1 of the pipeline: deterministic cleaning, no AI.
// Normalizes fields, maps city/country variants, buckets company size,
// flags junk, and merges duplicates (same email) into one record.

import Papa from "papaparse";

export type CleanLead = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  company: string;
  companySize: number | null;
  sizeBand: string;
  segment: "SMB" | "Mid-Market" | "Enterprise" | "Unknown";
  industry: string;
  city: string;
  country: string;
  region: string;
  sources: string[];
  notes: string;
  freeEmail: boolean;
  junkReason: string | null;
};

export type CleanResult = {
  rowsIn: number;
  duplicatesRemoved: number;
  junkFlagged: number;
  leads: CleanLead[];
};

// Accept common header spellings so real-world exports work too.
const HEADER_ALIASES: Record<string, keyof RawRow> = {
  first_name: "firstName", firstname: "firstName", first: "firstName",
  last_name: "lastName", lastname: "lastName", last: "lastName",
  email: "email", email_address: "email",
  title: "title", job_title: "title",
  company: "company", company_name: "company", account: "company",
  company_size: "companySize", employees: "companySize", size: "companySize",
  industry: "industry",
  city: "city",
  country: "country",
  source: "source", lead_source: "source",
  notes: "notes", note: "notes", comments: "notes",
};

type RawRow = {
  firstName?: string; lastName?: string; email?: string; title?: string;
  company?: string; companySize?: string; industry?: string; city?: string;
  country?: string; source?: string; notes?: string;
};

const CITY_MAP: Record<string, string> = {
  tlv: "Tel Aviv", "tel aviv": "Tel Aviv", "tel-aviv": "Tel Aviv", "tel aviv-yafo": "Tel Aviv",
  nyc: "New York", ny: "New York", "new york city": "New York",
  sf: "San Francisco", "ramat gan": "Ramat Gan",
};

const COUNTRY_MAP: Record<string, string> = {
  il: "Israel", isr: "Israel",
  us: "United States", usa: "United States", "united states": "United States",
  uk: "United Kingdom", "united kingdom": "United Kingdom", gb: "United Kingdom",
  uae: "UAE", "united arab emirates": "UAE",
};

const REGION_BY_COUNTRY: Record<string, string> = {
  "United States": "North America", Canada: "North America",
  Israel: "Israel",
  "United Kingdom": "UK", Ireland: "Rest of Europe",
  Germany: "DACH", Austria: "DACH", Switzerland: "DACH",
  France: "Rest of Europe", Spain: "Rest of Europe", Italy: "Rest of Europe",
  Norway: "Rest of Europe", Netherlands: "Rest of Europe", "Czech Republic": "Rest of Europe",
  Australia: "ANZ", "New Zealand": "ANZ",
};

const FREE_DOMAINS = new Set(["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "icloud.com"]);
const JUNK_WORDS = /^(test|asdf|n\/a|na|none|xxx|qwerty)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());

function normalizeCountry(raw: string) {
  const key = raw.trim().toLowerCase();
  return COUNTRY_MAP[key] ?? (key ? titleCase(key) : "");
}

function normalizeCity(raw: string) {
  const key = raw.trim().toLowerCase();
  return CITY_MAP[key] ?? (key ? titleCase(key) : "");
}

function sizeToBand(n: number | null): string {
  if (n == null) return "Unknown";
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 1000) return "201-1000";
  if (n <= 5000) return "1001-5000";
  return "5000+";
}

function bandToSegment(n: number | null): CleanLead["segment"] {
  if (n == null) return "Unknown";
  if (n <= 200) return "SMB";
  if (n <= 1000) return "Mid-Market";
  return "Enterprise";
}

function parseSize(raw: string): number | null {
  const s = raw.toLowerCase().replace(/[,~+\s]/g, "");
  if (!s) return null;
  const k = s.match(/^(\d+(?:\.\d+)?)k$/);
  if (k) return Math.round(parseFloat(k[1]) * 1000);
  const range = s.match(/^(\d+)-(\d+)$/);
  if (range) return Math.round((+range[1] + +range[2]) / 2);
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function junkReason(r: RawRow, email: string): string | null {
  if (!email || !EMAIL_RE.test(email)) return "Invalid email";
  if ([r.firstName, r.lastName, r.company].some((v) => v && JUNK_WORDS.test(v.trim()))) return "Test / placeholder data";
  if (/^(test|noreply|no-reply)@/.test(email) || email.endsWith("@test.com")) return "Test or no-reply address";
  if (!r.company?.trim() || JUNK_WORDS.test(r.company.trim())) return "Missing company";
  return null;
}

// Counts filled fields so the most complete duplicate wins the merge.
const completeness = (l: CleanLead) =>
  [l.firstName, l.lastName, l.title, l.company, l.industry, l.city, l.country, l.notes]
    .filter(Boolean).length + (l.companySize != null ? 1 : 0);

export function parseCsv(text: string): RawRow[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return parsed.data.map((row) => {
    const out: RawRow = {};
    for (const [key, value] of Object.entries(row)) {
      const field = HEADER_ALIASES[key];
      if (field && typeof value === "string") out[field] = value.trim();
    }
    return out;
  });
}

export function cleanRows(rows: RawRow[]): CleanResult {
  const byEmail = new Map<string, CleanLead>();
  const noEmail: CleanLead[] = [];
  let duplicatesRemoved = 0;

  rows.forEach((r, i) => {
    const email = (r.email ?? "").toLowerCase();
    const size = parseSize(r.companySize ?? "");
    const country = normalizeCountry(r.country ?? "");
    const domain = email.split("@")[1] ?? "";
    const lead: CleanLead = {
      id: i + 1,
      firstName: titleCase(r.firstName ?? ""),
      lastName: titleCase(r.lastName ?? ""),
      email,
      title: r.title ?? "",
      company: (r.company ?? "").replace(/\s+(inc\.?|ltd\.?|gmbh|llc)$/i, "").trim(),
      companySize: size,
      sizeBand: sizeToBand(size),
      segment: bandToSegment(size),
      industry: r.industry ?? "",
      city: normalizeCity(r.city ?? ""),
      country,
      region: REGION_BY_COUNTRY[country] ?? (country ? "Other" : "Unknown"),
      sources: r.source ? [r.source] : [],
      notes: r.notes ?? "",
      freeEmail: FREE_DOMAINS.has(domain),
      junkReason: junkReason(r, email),
    };

    if (!email) return noEmail.push(lead);
    const existing = byEmail.get(email);
    if (!existing) return byEmail.set(email, lead);

    duplicatesRemoved++;
    const [keep, drop] = completeness(lead) > completeness(existing) ? [lead, existing] : [existing, lead];
    keep.id = Math.min(keep.id, drop.id);
    keep.sources = [...new Set([...existing.sources, ...lead.sources])];
    keep.notes = [...new Set([existing.notes, lead.notes].filter(Boolean))].join(" | ");
    byEmail.set(email, keep);
  });

  const leads = [...byEmail.values(), ...noEmail].sort((a, b) => a.id - b.id);
  return {
    rowsIn: rows.length,
    duplicatesRemoved,
    junkFlagged: leads.filter((l) => l.junkReason).length,
    leads,
  };
}
