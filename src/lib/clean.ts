// Step 1 of the pipeline: deterministic cleaning, no AI.
//   parse    -> map any export's columns, keep each record's original row number
//   enrich   -> segment from company size, region from country/city/state/email
//   validate -> every data-quality issue per lead (not just the first)
//   dedupe   -> exact and fuzzy matching with an audit trail; uncertain pairs
//               are flagged for review instead of merged

import Papa from "papaparse";
import { MAX_ROWS } from "@/config/rubric";
import { locationConflict, resolvePlace, UNAVAILABLE } from "./geo";

export type Severity = "error" | "warning";
export type Issue = { code: string; label: string; severity: Severity };
export type DataQuality = "Valid" | "Needs review" | "Invalid";
export type Segment = "SMB" | "Mid-Market" | "Enterprise" | "Unavailable";

export const STAGES = ["New", "Contacted", "Follow-up", "Qualified", "Meeting booked", "Proposal sent", "Nurture", "Unresponsive", "Recycled", "Closed won", "Closed lost", "Unavailable"] as const;
export type Stage = (typeof STAGES)[number];

export type MergedRecord = { rowNumber: number; name: string; email: string; matchedOn: string };

export type CleanLead = {
  id: number;
  rowNumbers: number[]; // every source row folded into this lead
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  company: string;
  companySize: number | null;
  sizeBand: string;
  segment: Segment;
  industry: string;
  city: string;
  country: string;
  region: string;
  sources: string[];
  notes: string;
  lastActivity: string | null; // ISO date of the last touch, when the file has one
  stage: Stage; // pipeline status, normalized
  dealValue: number | null; // estimated value / spend, as given
  isReferral: boolean;
  freeEmail: boolean;
  quality: DataQuality;
  issues: Issue[];
  merged: MergedRecord[];
  possibleDuplicateRows: number[]; // similar records we deliberately did NOT merge
};

export type ImportSummary = {
  rowsInFile: number; // non-empty data rows uploaded
  emptyRowsSkipped: number;
  processed: number; // rows that entered cleaning (max MAX_ROWS)
  overLimit: { count: number; firstRow: number | null; lastRow: number | null };
  duplicatesMerged: number; // rows folded into another lead
  exactDuplicates: number;
  fuzzyDuplicates: number;
  possibleDuplicatePairs: number;
  leadsOut: number;
  missingColumns: ScoredColumn[]; // scoring criteria the file has no data for (excluded, not penalized)
  hasActivityDates: boolean;
  hasDealValues: boolean;
};

export type ScoredColumn = "Company size" | "Industry" | "Title" | "Notes";

export type CleanResult = { summary: ImportSummary; leads: CleanLead[] };

type RawRow = {
  rowNumber: number;
  firstName?: string; lastName?: string; email?: string; phone?: string; title?: string;
  company?: string; companySize?: string; industry?: string; city?: string; state?: string;
  country?: string; source?: string; notes?: string; lastActivity?: string; stage?: string; value?: string;
};
type Field = Exclude<keyof RawRow, "rowNumber">;

// Accept common header spellings so real-world exports work too.
const HEADER_ALIASES: Record<string, Field | "fullName"> = {
  first_name: "firstName", firstname: "firstName", first: "firstName", given_name: "firstName",
  last_name: "lastName", lastname: "lastName", last: "lastName", surname: "lastName", family_name: "lastName",
  name: "fullName", full_name: "fullName", contact: "fullName", contact_name: "fullName", lead_name: "fullName",
  email: "email", email_address: "email", e_mail: "email", work_email: "email", business_email: "email", mail: "email",
  phone: "phone", phone_number: "phone", mobile: "phone", mobile_phone: "phone", tel: "phone", telephone: "phone",
  work_phone: "phone", cell: "phone",
  title: "title", job_title: "title", position: "title", role: "title", jobtitle: "title",
  company: "company", company_name: "company", account: "company", account_name: "company",
  organization: "company", organisation: "company", employer: "company",
  company_size: "companySize", employees: "companySize", size: "companySize", headcount: "companySize",
  employee_count: "companySize", number_of_employees: "companySize", no_of_employees: "companySize",
  company_employees: "companySize", employees_range: "companySize",
  industry: "industry", vertical: "industry", sector: "industry",
  city: "city", location: "city", address: "city", hq: "city", hq_location: "city",
  state: "state", province: "state", state_province: "state",
  country: "country", country_region: "country", region: "country", hq_country: "country", country_code: "country",
  source: "source", lead_source: "source", channel: "source",
  notes: "notes", note: "notes", comments: "notes", comment: "notes", description: "notes", message: "notes",
  last_contacted: "lastActivity", last_contact: "lastActivity", last_contact_date: "lastActivity", last_activity: "lastActivity",
  last_activity_date: "lastActivity", last_touch: "lastActivity", last_touched: "lastActivity", last_engagement: "lastActivity",
  last_interaction: "lastActivity", activity_date: "lastActivity", last_contacted_date: "lastActivity",
  status: "stage", lead_status: "stage", stage: "stage", lifecycle_stage: "stage", deal_stage: "stage", pipeline_stage: "stage",
  estimated_monthly_spend: "value", monthly_spend: "value", deal_value: "value", deal_size: "value", amount: "value",
  budget: "value", arr: "value", mrr: "value", estimated_value: "value", opportunity_amount: "value", potential_value: "value",
};

// Header normalizer: "Job Title", "job-title", "JobTitle " and a BOM all map the same way.
const normalizeHeader = (h: string) =>
  h.replace(/^﻿/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function parseCsv(text: string): { rows: RawRow[]; columns: Field[]; emptyRows: number } {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), { header: true, transformHeader: normalizeHeader });
  const columns = new Set<Field>();
  const rows: RawRow[] = [];
  let emptyRows = 0;
  parsed.data.forEach((row, i) => {
    const out: RawRow = { rowNumber: i + 2 }; // line 1 is the header
    let any = false;
    for (const [key, value] of Object.entries(row)) {
      const field = HEADER_ALIASES[key];
      if (!field || typeof value !== "string" || !value.trim()) continue;
      any = true;
      if (field === "fullName") {
        const [first, ...rest] = value.trim().split(/\s+/);
        out.firstName ??= first;
        out.lastName ??= rest.join(" ");
        columns.add("firstName");
      } else {
        out[field] ??= value.trim();
        columns.add(field);
      }
    }
    if (any) rows.push(out);
    else emptyRows++;
  });
  return { rows, columns: [...columns], emptyRows };
}

// ---------- normalization ----------

const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "yahoo.com", "outlook.com", "icloud.com", "live.com", "aol.com",
  "proton.me", "protonmail.com", "gmx.com", "gmx.de", "mail.com", "walla.co.il", "yandex.com",
]);
const ROLE_LOCALS = /^(info|sales|admin|contact|hello|support|office|team|marketing|hr|jobs|billing)$/;
// Only values that are never a real name or company ("Bar", "Abc" and "Sample" can be).
const JUNK_WORDS = /^(test|testing|asdf+|qwerty|n\/?a|none|null|xxx+|dummy|lorem|ipsum|placeholder|-+|\.+)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const normName = (s: string) => fold(s).replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
export const normCompany = (s: string) =>
  fold(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(inc|incorporated|ltd|limited|llc|gmbh|corp|corporation|co|company|plc|sa|ag|bv|srl|pty|the)\b/g, " ")
    .replace(/\s+/g, "");
export function normEmail(s: string) {
  const e = s.trim().toLowerCase();
  const [local, domain] = e.split("@");
  if (!domain) return e;
  let l = local.split("+")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") l = l.replace(/\./g, "");
  return `${l}@${domain === "googlemail.com" ? "gmail.com" : domain}`;
}
export const normPhone = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d.length >= 8 ? d.slice(-9) : "";
};

function parseSize(raw: string): number | null {
  const s = raw.toLowerCase().replace(/,/g, "").trim();
  if (!s) return null;
  if (/enterprise|large/.test(s)) return 5000;
  if (/mid[\s-]?market|medium|mid/.test(s)) return 500;
  if (/smb|small|startup/.test(s)) return 30;
  if (/self[\s-]?employed|solo|freelanc/.test(s)) return 1;
  const nums = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(k|m)?/g)].map((m) => parseFloat(m[1]) * (m[2] === "k" ? 1000 : m[2] === "m" ? 1_000_000 : 1));
  if (!nums.length) return null;
  return Math.round(nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0]);
}

function sizeToBand(n: number | null): string {
  if (n == null) return UNAVAILABLE;
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 1000) return "201-1000";
  if (n <= 5000) return "1001-5000";
  return "5000+";
}

function toSegment(n: number | null): Segment {
  if (n == null) return "Unavailable";
  if (n <= 200) return "SMB";
  if (n <= 1000) return "Mid-Market";
  return "Enterprise";
}

// ---------- data quality ----------

// Digits, no letters at all ("???"), repeated characters, or keyboard mashing ("ajshdkjasd").
const suspiciousName = (s: string) =>
  /\d/.test(s) ||
  !/\p{L}/u.test(s) ||
  /^(.)\1{2,}$/i.test(s) ||
  /[bcdfghjklmnpqrstvwxz]{5,}/i.test(s) ||
  (s.length === 1 && !/^[a-z]\.?$/i.test(s));

// ---------- dates, values, stages ----------

const DAY = 86_400_000;
/** ISO yyyy-mm-dd from common export formats and relative words; null if unreadable. */
export function parseDate(raw: string, now = new Date()): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (s === "today") return iso(now);
  if (s === "yesterday") return iso(new Date(now.getTime() - DAY));
  const ago = s.match(/^(\d+)\s*(day|days|d|week|weeks|w)\s*ago$/);
  if (ago) return iso(new Date(now.getTime() - Number(ago[1]) * (ago[2].startsWith("w") ? 7 : 1) * DAY));
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/); // US style mm/dd/yyyy
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return iso(new Date(Date.UTC(y, +m[1] - 1, +m[2])));
  }
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : iso(new Date(t));
}

function parseValue(raw: string): number | null {
  const s = raw.replace(/[$€£₪,\s]/g, "").toLowerCase();
  const m = s.match(/^(\d+(?:\.\d+)?)(k)?$/);
  return m ? Math.round(parseFloat(m[1]) * (m[2] ? 1000 : 1)) : null;
}

const STAGE_RULES: [Stage, RegExp][] = [
  ["Closed won", /won|customer|signed/],
  ["Closed lost", /lost|disqualif|dead/],
  ["Proposal sent", /proposal|quote|negotiat/],
  ["Meeting booked", /meeting|demo (booked|scheduled)|booked/],
  ["Qualified", /qualified|sql|opportunity/],
  ["Follow-up", /follow/],
  ["Contacted", /contacted|attempt|working|in progress/],
  ["Unresponsive", /unresponsive|no response|ghost/],
  ["Recycled", /recycl/],
  ["Nurture", /nurtur/],
  ["New", /^new|open|uncontacted|mql/],
];
export const toStage = (raw: string): Stage => {
  const s = raw.trim().toLowerCase();
  if (!s) return "Unavailable";
  return STAGE_RULES.find(([, re]) => re.test(s))?.[0] ?? "Unavailable";
};

export function assessQuality(r: RawRow, lead: Omit<CleanLead, "quality" | "issues">): Issue[] {
  const issues: Issue[] = [];
  const add = (code: string, label: string, severity: Severity) => issues.push({ code, label, severity });
  const phoneDigits = (r.phone ?? "").replace(/\D/g, "");
  const validPhone = phoneDigits.length >= 7 && phoneDigits.length <= 15 && !/^(\d)\1+$/.test(phoneDigits);
  const email = lead.email;

  if (!email) add("email_missing", "Missing email", validPhone ? "warning" : "error");
  else if (!EMAIL_RE.test(email)) add("email_malformed", `Malformed email "${email}"`, "error");
  else {
    const [local] = email.split("@");
    if (/^(test|noreply|no-reply|donotreply)$/.test(local) || /@(test|example)\.(com|org)$/.test(email))
      add("email_test", "Test or no-reply address", "error");
    else if (ROLE_LOCALS.test(local)) add("email_role", "Role-based inbox, not a person", "warning");
    if (lead.freeEmail) add("email_free", "Personal email domain", "warning");
  }

  if (r.phone && !validPhone) add("phone_invalid", `Invalid phone "${r.phone}"`, "warning");

  const first = r.firstName?.trim() ?? "";
  const last = r.lastName?.trim() ?? "";
  if ([first, last, r.company?.trim() ?? ""].some((v) => v && JUNK_WORDS.test(v))) add("placeholder", "Test or placeholder values", "error");
  if (!first && !last) add("name_missing", "Missing name", "error");
  else if (!first || !last) add("name_partial", `Missing ${first ? "last" : "first"} name`, "warning");
  if ((first && suspiciousName(first)) || (last && suspiciousName(last))) add("name_suspicious", "Suspicious name", "warning");

  if (!lead.company) add("company_missing", "Missing company", lead.freeEmail || !email ? "error" : "warning");
  if (!lead.title) add("title_missing", "Missing job title", "warning");
  if (r.lastActivity && !lead.lastActivity) add("date_unreadable", `Unreadable activity date "${r.lastActivity}"`, "warning");
  if (r.value && lead.dealValue == null) add("value_unreadable", `Unreadable value "${r.value}"`, "warning");
  // A business email whose domain shares nothing with the company name is worth a second look.
  if (lead.company && email && EMAIL_RE.test(email) && !lead.freeEmail) {
    const dom = (email.split("@")[1] ?? "").split(".")[0].replace(/[^a-z0-9]/g, "");
    const co = normCompany(lead.company);
    const overlap = dom.length >= 4 && co.length >= 4 && (co.includes(dom) || dom.includes(co) || co.slice(0, 4) === dom.slice(0, 4));
    if (dom && co && !overlap) add("domain_mismatch", `Email domain doesn't match company "${lead.company}"`, "warning");
  }
  if (r.companySize && lead.companySize == null) add("size_unreadable", `Company size unreadable "${r.companySize}"`, "warning");
  if (lead.region === UNAVAILABLE) add("location_missing", "Location unavailable", "warning");
  if (r.city && r.country && locationConflict(r.city, r.country)) add("location_conflict", `City "${r.city}" doesn't match country "${r.country}"`, "warning");

  return issues;
}

const qualityOf = (issues: Issue[]): DataQuality =>
  issues.some((i) => i.severity === "error") ? "Invalid" : issues.length ? "Needs review" : "Valid";

// ---------- duplicates ----------

// Jaro-Winkler similarity, 0..1. Good for short strings like names.
export function similarity(a: string, b: string): number {
  if (a === b) return a ? 1 : 0;
  if (!a || !b) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array(a.length).fill(false);
  const bm = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (bm[j] || a[i] !== b[j]) continue;
      am[i] = bm[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0;
  for (let i = 0, k = 0; i < a.length; i++) {
    if (!am[i]) continue;
    while (!bm[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

type Match = { kind: "merge" | "possible"; exact: boolean; reason: string } | null;

/** Decide whether two leads are the same person. Conservative: when unsure, flag instead of merging. */
export function matchLeads(a: CleanLead, b: CleanLead): Match {
  const nameA = normName(`${a.firstName} ${a.lastName}`);
  const nameB = normName(`${b.firstName} ${b.lastName}`);
  const hasNames = nameA.includes(" ") && nameB.includes(" ");
  const nameSim = similarity(nameA, nameB);
  const sameCompany = Boolean(normCompany(a.company)) && normCompany(a.company) === normCompany(b.company);
  const emailsValid = EMAIL_RE.test(a.email) && EMAIL_RE.test(b.email);
  const sameEmail = emailsValid && normEmail(a.email) === normEmail(b.email);
  const differentEmails = emailsValid && !sameEmail;
  const pa = normPhone(a.phone);
  const samePhone = Boolean(pa) && pa === normPhone(b.phone);

  if (sameEmail) {
    // A shared inbox used by two different people is not one lead.
    if (hasNames && nameSim < 0.75) return { kind: "possible", exact: false, reason: "Same email, different names" };
    return { kind: "merge", exact: true, reason: "Same email" };
  }
  if (samePhone && (sameCompany || (hasNames && nameSim >= 0.9))) return { kind: "merge", exact: true, reason: "Same phone" };
  if (hasNames && sameCompany && nameA === nameB) {
    return differentEmails
      ? { kind: "possible", exact: false, reason: "Same name and company, different emails" }
      : { kind: "merge", exact: true, reason: "Same name and company" };
  }
  if (hasNames && sameCompany && nameSim >= 0.9) {
    return differentEmails
      ? { kind: "possible", exact: false, reason: "Similar name, same company, different emails" }
      : { kind: "merge", exact: false, reason: "Similar name, same company" };
  }
  return null;
}

const filled = (l: CleanLead) =>
  [l.firstName, l.lastName, l.email, l.phone, l.title, l.company, l.industry, l.notes].filter(Boolean).length +
  (l.companySize != null ? 1 : 0) + (l.region !== UNAVAILABLE ? 1 : 0);

/** Fold `other` into `keep`: fill blanks, keep every distinct value we'd otherwise lose. */
function mergeInto(keep: CleanLead, other: CleanLead, matchedOn: string) {
  for (const f of ["firstName", "lastName", "email", "phone", "title", "company", "industry"] as const) {
    if (!keep[f] && other[f]) keep[f] = other[f];
  }
  if (keep.companySize == null && other.companySize != null) {
    keep.companySize = other.companySize;
    keep.sizeBand = other.sizeBand;
    keep.segment = other.segment;
  }
  if (keep.region === UNAVAILABLE && other.region !== UNAVAILABLE) {
    keep.city = other.city;
    keep.country = other.country;
    keep.region = other.region;
  }
  if (other.lastActivity && (!keep.lastActivity || other.lastActivity > keep.lastActivity)) keep.lastActivity = other.lastActivity;
  if (keep.dealValue == null) keep.dealValue = other.dealValue;
  if (keep.stage === "Unavailable") keep.stage = other.stage;
  keep.isReferral ||= other.isReferral;
  const altEmail = other.email && normEmail(other.email) !== normEmail(keep.email) ? `Alt email: ${other.email}` : "";
  keep.sources = [...new Set([...keep.sources, ...other.sources])];
  keep.notes = [...new Set([keep.notes, other.notes, altEmail].filter(Boolean))].join(" | ");
  keep.rowNumbers = [...keep.rowNumbers, ...other.rowNumbers].sort((x, y) => x - y);
  keep.merged.push(
    { rowNumber: other.rowNumbers[0], name: `${other.firstName} ${other.lastName}`.trim(), email: other.email, matchedOn },
    ...other.merged,
  );
  keep.possibleDuplicateRows = [...new Set([...keep.possibleDuplicateRows, ...other.possibleDuplicateRows])];
}

// ---------- pipeline ----------

function buildLead(r: RawRow, id: number): CleanLead {
  const email = (r.email ?? "").trim().toLowerCase();
  const domain = email.split("@")[1] ?? "";
  const size = parseSize(r.companySize ?? "");
  const place = resolvePlace({ country: r.country, city: r.city, state: r.state, email });
  const base = {
    id,
    rowNumbers: [r.rowNumber],
    firstName: titleCase(r.firstName ?? ""),
    lastName: titleCase(r.lastName ?? ""),
    email,
    phone: r.phone ?? "",
    title: r.title ?? "",
    company: (r.company ?? "").replace(/[\s,]+(inc\.?|ltd\.?|gmbh|llc)$/i, "").trim(),
    companySize: size,
    sizeBand: sizeToBand(size),
    segment: toSegment(size),
    industry: r.industry ?? "",
    city: place.city,
    country: place.country,
    region: place.region,
    sources: r.source ? [r.source] : [],
    notes: r.notes ?? "",
    lastActivity: r.lastActivity ? parseDate(r.lastActivity) : null,
    stage: toStage(r.stage ?? ""),
    dealValue: r.value ? parseValue(r.value) : null,
    isReferral: /referral|referred/i.test(`${r.source ?? ""} ${r.notes ?? ""}`),
    freeEmail: FREE_DOMAINS.has(domain),
    merged: [],
    possibleDuplicateRows: [],
  };
  const issues = assessQuality(r, base);
  return { ...base, issues, quality: qualityOf(issues) };
}

export function cleanRows(allRows: RawRow[], emptyRows = 0): CleanResult {
  const rows = allRows.slice(0, MAX_ROWS);
  const over = allRows.slice(MAX_ROWS);
  const leads = rows.map((r, i) => buildLead(r, i + 1));

  let exact = 0;
  let fuzzy = 0;
  let possible = 0;
  const alive = new Set(leads.map((l) => l.id));
  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      const a = leads[i];
      const b = leads[j];
      if (!alive.has(a.id) || !alive.has(b.id)) continue;
      const m = matchLeads(a, b);
      if (!m) continue;
      if (m.kind === "possible") {
        possible++;
        a.possibleDuplicateRows.push(b.rowNumbers[0]);
        b.possibleDuplicateRows.push(a.rowNumbers[0]);
        continue;
      }
      if (m.exact) exact++;
      else fuzzy++;
      const [keep, drop] = filled(b) > filled(a) ? [b, a] : [a, b];
      mergeInto(keep, drop, m.reason);
      alive.delete(drop.id);
    }
  }

  // Re-check quality on merged leads: a merge can fill a missing email or company.
  const out = leads
    .filter((l) => alive.has(l.id))
    .map((l) => {
      if (!l.merged.length) return l;
      const issues = assessQuality(
        { rowNumber: l.rowNumbers[0], firstName: l.firstName, lastName: l.lastName, email: l.email, phone: l.phone, title: l.title, company: l.company, companySize: l.companySize != null ? String(l.companySize) : "", city: l.city === UNAVAILABLE ? "" : l.city, country: l.country === UNAVAILABLE ? "" : l.country },
        l,
      );
      return { ...l, issues, quality: qualityOf(issues) };
    })
    .sort((a, b) => a.rowNumbers[0] - b.rowNumbers[0])
    .map((l, i) => ({ ...l, id: i + 1 }));

  return {
    summary: {
      rowsInFile: allRows.length,
      emptyRowsSkipped: emptyRows,
      processed: rows.length,
      overLimit: { count: over.length, firstRow: over[0]?.rowNumber ?? null, lastRow: over.at(-1)?.rowNumber ?? null },
      duplicatesMerged: exact + fuzzy,
      exactDuplicates: exact,
      fuzzyDuplicates: fuzzy,
      possibleDuplicatePairs: possible,
      leadsOut: out.length,
      missingColumns: (
        [
          ["Company size", "companySize"],
          ["Industry", "industry"],
          ["Title", "title"],
          ["Notes", "notes"],
        ] as const
      )
        .filter(([, f]) => !rows.some((r) => r[f]?.trim()))
        .map(([label]) => label),
      hasActivityDates: out.some((l) => l.lastActivity),
      hasDealValues: out.some((l) => l.dealValue != null),
    },
    leads: out,
  };
}
