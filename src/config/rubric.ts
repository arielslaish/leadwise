// ICP scoring rubric. Edit weights and values here; the page renders this
// same object so the logic shown to visitors is always the logic in use.

export const MAX_ROWS = 100;
export const DAILY_UPLOADS_PER_IP = 3;
export const MINUTES_SAVED_PER_ROW = 4; // manual research + triage time a rep skips

export const rubric = {
  companySize: {
    weight: 20,
    label: "Company size",
    bands: [
      { band: "1-10", points: 2 },
      { band: "11-50", points: 8 },
      { band: "51-200", points: 16 },
      { band: "201-1000", points: 20 },
      { band: "1001-5000", points: 18 },
      { band: "5000+", points: 12 },
    ],
  },
  seniority: {
    weight: 20,
    label: "Title seniority",
    levels: [
      { level: "C-level", points: 20 },
      { level: "VP", points: 18 },
      { level: "Director", points: 14 },
      { level: "Manager", points: 9 },
      { level: "IC", points: 4 },
    ],
  },
  industry: {
    weight: 20,
    label: "Industry fit",
    tiers: [
      { match: ["B2B SaaS", "Software", "Fintech", "Cybersecurity", "Data/AI"], points: 20 },
      { match: ["Tech services", "E-commerce", "Martech", "HR tech"], points: 12 },
      { match: ["Other"], points: 4 },
    ],
  },
  region: {
    weight: 10,
    label: "Region",
    tiers: [
      { match: ["North America", "Israel", "UK", "DACH"], points: 10 },
      { match: ["Rest of Europe", "ANZ"], points: 7 },
      { match: ["Other"], points: 3 },
    ],
  },
  intent: {
    weight: 20,
    label: "Intent signals (notes)",
    signals: [
      { signal: "Demo or pricing request", points: 20 },
      { signal: "Contract with competitor ending", points: 18 },
      { signal: "Actively evaluating vendors", points: 16 },
      { signal: "Event conversation / webinar attendee", points: 8 },
      { signal: "No signal", points: 0 },
    ],
  },
  completeness: {
    weight: 10,
    label: "Data completeness",
    rule: "Valid business email, name, title, company, size and country present",
  },
  tiers: [
    { tier: "Hot", min: 75 },
    { tier: "Warm", min: 55 },
    { tier: "Nurture", min: 30 },
    { tier: "Disqualify", min: 0 },
  ],
} as const;

export type Tier = (typeof rubric.tiers)[number]["tier"];
