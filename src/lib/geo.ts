// Location enrichment: turn whatever an export calls a place ("USA", "US-NY",
// "Tel Aviv, Israel", "California", an email ending in .co.uk) into a country
// and a sales region. Anything we can't place is "Unavailable", never guessed.

export const UNAVAILABLE = "Unavailable";

// Canonical country -> region
const REGION: Record<string, string> = {
  "United States": "North America", Canada: "North America", Mexico: "Other",
  Israel: "Israel",
  "United Kingdom": "UK",
  Germany: "DACH", Austria: "DACH", Switzerland: "DACH",
  Ireland: "Rest of Europe", France: "Rest of Europe", Spain: "Rest of Europe", Portugal: "Rest of Europe",
  Italy: "Rest of Europe", Netherlands: "Rest of Europe", Belgium: "Rest of Europe", Luxembourg: "Rest of Europe",
  Denmark: "Rest of Europe", Sweden: "Rest of Europe", Norway: "Rest of Europe", Finland: "Rest of Europe",
  Iceland: "Rest of Europe", Poland: "Rest of Europe", "Czech Republic": "Rest of Europe", Hungary: "Rest of Europe",
  Romania: "Rest of Europe", Greece: "Rest of Europe", Estonia: "Rest of Europe", Latvia: "Rest of Europe",
  Lithuania: "Rest of Europe", Croatia: "Rest of Europe", Slovakia: "Rest of Europe", Slovenia: "Rest of Europe",
  Bulgaria: "Rest of Europe", Ukraine: "Rest of Europe", Serbia: "Rest of Europe", Cyprus: "Rest of Europe", Malta: "Rest of Europe",
  Australia: "ANZ", "New Zealand": "ANZ",
  Turkey: "Other", "United Arab Emirates": "Other", "Saudi Arabia": "Other", India: "Other", Singapore: "Other",
  Japan: "Other", China: "Other", "South Korea": "Other", Brazil: "Other", Argentina: "Other", Chile: "Other",
  Colombia: "Other", "South Africa": "Other", Nigeria: "Other", Egypt: "Other", Philippines: "Other",
  Indonesia: "Other", Vietnam: "Other", Thailand: "Other", Malaysia: "Other", "Hong Kong": "Other", Taiwan: "Other",
};

// Aliases and ISO codes -> canonical country (keys are lowercase, punctuation stripped)
const COUNTRY_ALIASES: Record<string, string> = {
  us: "United States", usa: "United States", "u s": "United States", "u s a": "United States", america: "United States",
  "united states of america": "United States", "the united states": "United States",
  ca: "Canada", can: "Canada", mx: "Mexico",
  il: "Israel", isr: "Israel",
  uk: "United Kingdom", gb: "United Kingdom", gbr: "United Kingdom", "great britain": "United Kingdom", britain: "United Kingdom",
  england: "United Kingdom", scotland: "United Kingdom", wales: "United Kingdom", "northern ireland": "United Kingdom",
  de: "Germany", deu: "Germany", deutschland: "Germany", at: "Austria", ch: "Switzerland", schweiz: "Switzerland",
  ie: "Ireland", fr: "France", es: "Spain", espana: "Spain", pt: "Portugal", it: "Italy", italia: "Italy",
  nl: "Netherlands", holland: "Netherlands", "the netherlands": "Netherlands", be: "Belgium", lu: "Luxembourg",
  dk: "Denmark", se: "Sweden", no: "Norway", fi: "Finland", pl: "Poland", cz: "Czech Republic", czechia: "Czech Republic",
  hu: "Hungary", ro: "Romania", gr: "Greece", ee: "Estonia", lv: "Latvia", lt: "Lithuania", hr: "Croatia",
  sk: "Slovakia", si: "Slovenia", bg: "Bulgaria", ua: "Ukraine", rs: "Serbia", cy: "Cyprus", mt: "Malta",
  au: "Australia", aus: "Australia", nz: "New Zealand",
  tr: "Turkey", turkiye: "Turkey", ae: "United Arab Emirates", uae: "United Arab Emirates", sa: "Saudi Arabia", ksa: "Saudi Arabia",
  in: "India", sg: "Singapore", jp: "Japan", cn: "China", kr: "South Korea", korea: "South Korea", br: "Brazil", brasil: "Brazil",
  ar: "Argentina", cl: "Chile", co: "Colombia", za: "South Africa", ng: "Nigeria", eg: "Egypt", ph: "Philippines",
  id: "Indonesia", vn: "Vietnam", th: "Thailand", my: "Malaysia", hk: "Hong Kong", tw: "Taiwan",
};

const US_STATES = new Set([
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware", "florida", "georgia",
  "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine", "maryland",
  "massachusetts", "michigan", "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire",
  "new jersey", "new mexico", "new york", "north carolina", "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania",
  "rhode island", "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont", "virginia", "washington",
  "west virginia", "wisconsin", "wyoming", "district of columbia",
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
  "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
  "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc",
]);

// Well-known cities -> [display name, country]
const CITIES: Record<string, [string, string]> = {
  tlv: ["Tel Aviv", "Israel"], "tel aviv": ["Tel Aviv", "Israel"], "tel-aviv": ["Tel Aviv", "Israel"],
  "tel aviv-yafo": ["Tel Aviv", "Israel"], "tel aviv yafo": ["Tel Aviv", "Israel"], jerusalem: ["Jerusalem", "Israel"],
  haifa: ["Haifa", "Israel"], herzliya: ["Herzliya", "Israel"], "ramat gan": ["Ramat Gan", "Israel"],
  "petah tikva": ["Petah Tikva", "Israel"], "beer sheva": ["Beer Sheva", "Israel"], netanya: ["Netanya", "Israel"],
  "raanana": ["Ra'anana", "Israel"], "ra'anana": ["Ra'anana", "Israel"],
  nyc: ["New York", "United States"], ny: ["New York", "United States"], "new york": ["New York", "United States"],
  "new york city": ["New York", "United States"], manhattan: ["New York", "United States"], brooklyn: ["New York", "United States"],
  sf: ["San Francisco", "United States"], "san francisco": ["San Francisco", "United States"], la: ["Los Angeles", "United States"],
  "los angeles": ["Los Angeles", "United States"], boston: ["Boston", "United States"], chicago: ["Chicago", "United States"],
  austin: ["Austin", "United States"], seattle: ["Seattle", "United States"], denver: ["Denver", "United States"],
  miami: ["Miami", "United States"], atlanta: ["Atlanta", "United States"], dallas: ["Dallas", "United States"],
  "san jose": ["San Jose", "United States"], "palo alto": ["Palo Alto", "United States"], toronto: ["Toronto", "Canada"],
  vancouver: ["Vancouver", "Canada"], montreal: ["Montreal", "Canada"],
  london: ["London", "United Kingdom"], manchester: ["Manchester", "United Kingdom"], edinburgh: ["Edinburgh", "United Kingdom"],
  dublin: ["Dublin", "Ireland"], berlin: ["Berlin", "Germany"], munich: ["Munich", "Germany"], hamburg: ["Hamburg", "Germany"],
  frankfurt: ["Frankfurt", "Germany"], vienna: ["Vienna", "Austria"], zurich: ["Zurich", "Switzerland"], geneva: ["Geneva", "Switzerland"],
  paris: ["Paris", "France"], madrid: ["Madrid", "Spain"], barcelona: ["Barcelona", "Spain"], lisbon: ["Lisbon", "Portugal"],
  milan: ["Milan", "Italy"], rome: ["Rome", "Italy"], amsterdam: ["Amsterdam", "Netherlands"], brussels: ["Brussels", "Belgium"],
  copenhagen: ["Copenhagen", "Denmark"], stockholm: ["Stockholm", "Sweden"], oslo: ["Oslo", "Norway"], helsinki: ["Helsinki", "Finland"],
  warsaw: ["Warsaw", "Poland"], prague: ["Prague", "Czech Republic"], budapest: ["Budapest", "Hungary"], athens: ["Athens", "Greece"],
  tallinn: ["Tallinn", "Estonia"], sydney: ["Sydney", "Australia"], melbourne: ["Melbourne", "Australia"],
  auckland: ["Auckland", "New Zealand"], singapore: ["Singapore", "Singapore"], dubai: ["Dubai", "United Arab Emirates"],
  istanbul: ["Istanbul", "Turkey"], bangalore: ["Bangalore", "India"], bengaluru: ["Bangalore", "India"], mumbai: ["Mumbai", "India"],
  tokyo: ["Tokyo", "Japan"], "sao paulo": ["Sao Paulo", "Brazil"], "são paulo": ["Sao Paulo", "Brazil"],
};

// Country-code email domains -> country (generic .com/.io/.ai tell us nothing)
const TLD: Record<string, string> = {
  il: "Israel", uk: "United Kingdom", de: "Germany", at: "Austria", ch: "Switzerland", ie: "Ireland", fr: "France",
  es: "Spain", pt: "Portugal", it: "Italy", nl: "Netherlands", be: "Belgium", dk: "Denmark", se: "Sweden", no: "Norway",
  fi: "Finland", pl: "Poland", cz: "Czech Republic", ca: "Canada", au: "Australia", nz: "New Zealand", br: "Brazil",
  in: "India", sg: "Singapore", jp: "Japan", tr: "Turkey", ae: "United Arab Emirates", za: "South Africa",
};

const key = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.()]/g, " ").replace(/\s+/g, " ").trim();
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());

/** Resolve one free-text value to a canonical country, if it names one. */
export function toCountry(raw: string): string | null {
  const k = key(raw);
  if (!k) return null;
  if (COUNTRY_ALIASES[k]) return COUNTRY_ALIASES[k];
  const canonical = Object.keys(REGION).find((c) => c.toLowerCase() === k);
  if (canonical) return canonical;
  // "US-NY", "us/ca" style codes
  const code = k.split(/[-/ ]/)[0];
  if (code.length <= 3 && COUNTRY_ALIASES[code]) return COUNTRY_ALIASES[code];
  if (US_STATES.has(k)) return "United States";
  return null;
}

export type Place = { city: string; country: string; region: string; source: "country" | "city" | "state" | "email" | "none" };

/** Best-effort location from country, city/location, state and email domain, in that order of trust. */
export function resolvePlace(input: { country?: string; city?: string; state?: string; email?: string }): Place {
  const cityKey = key(input.city ?? "");
  // A "City, Country" location string: try each comma part
  const parts = (input.city ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const knownCity = CITIES[cityKey] ?? (parts.length ? CITIES[key(parts[0])] : undefined);
  const cityName = knownCity?.[0] ?? (parts[0] ? titleCase(parts[0]) : "");

  let country = input.country ? toCountry(input.country) : null;
  let source: Place["source"] = country ? "country" : "none";
  if (!country && parts.length > 1) {
    for (const p of parts.slice(1).reverse()) {
      // "San Diego, CA": a two-letter part after a city is a US state, not Canada.
      country = US_STATES.has(key(p)) ? "United States" : toCountry(p);
      if (country) break;
    }
    if (country) source = "city";
  }
  if (!country && knownCity) {
    country = knownCity[1];
    source = "city";
  }
  if (!country && input.state && US_STATES.has(key(input.state))) {
    country = "United States";
    source = "state";
  }
  if (!country && input.email) {
    const tld = input.email.toLowerCase().split(".").pop() ?? "";
    if (TLD[tld]) {
      country = TLD[tld];
      source = "email";
    }
  }
  // Keep an unrecognized but non-empty country as typed, so nothing is silently dropped.
  if (!country && input.country?.trim()) return { city: cityName || UNAVAILABLE, country: titleCase(input.country.trim()), region: "Other", source: "country" };

  return {
    city: cityName || UNAVAILABLE,
    country: country ?? UNAVAILABLE,
    region: country ? (REGION[country] ?? "Other") : UNAVAILABLE,
    source,
  };
}

/** True when the city clearly belongs to a different country than the one given. */
export function locationConflict(city: string, country: string): boolean {
  const known = CITIES[key(city)];
  const c = toCountry(country);
  return Boolean(known && c && known[1] !== c);
}
