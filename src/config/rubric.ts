// ICP scoring rubric. Edit weights and values here; the page renders this
// same object so the logic shown to visitors is always the logic in use.
//
// Two separate questions are answered for every lead:
//   1. Data quality: can we trust and contact this record? (Valid / Needs review / Invalid)
//   2. Sales potential: how good a fit is it? (score 0-100 -> Hot / Warm / Nurture)
// "Disqualify" is reserved for invalid data or an explicit "not interested",
// never for a low score alone.

export const MAX_ROWS = 100;
export const DAILY_UPLOADS_PER_IP = 3;
export const MINUTES_SAVED_PER_ROW = 4; // manual research + triage time a rep skips

export const SENIORITY = ["C-level", "VP", "Director", "Manager", "IC", "Unavailable"] as const;
export type Seniority = (typeof SENIORITY)[number];

export const INDUSTRY_FIT = ["Core", "Adjacent", "Other", "Unavailable"] as const;
export type IndustryFit = (typeof INDUSTRY_FIT)[number];

// Intent categories, strongest first. Claude picks one per lead from the notes.
export const INTENTS = [
  "Pricing or demo request",
  "Direct purchase intent",
  "Contract renewal coming up",
  "Expansion / multiple locations",
  "Evaluating vendors",
  "Event or meeting conversation",
  "Content download / webinar",
  "No signal found",
] as const;
export type Intent = (typeof INTENTS)[number];
export type IntentStrength = "Strong" | "Medium" | "Weak" | "None";

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
      { band: "Unavailable", points: 0 },
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
      { level: "Unavailable", points: 0 },
    ],
  },
  industry: {
    weight: 15,
    label: "Industry fit",
    tiers: [
      { fit: "Core", examples: "B2B SaaS, software, fintech, cybersecurity, data/AI", points: 15 },
      { fit: "Adjacent", examples: "Tech services, e-commerce, martech, HR tech", points: 9 },
      { fit: "Other", examples: "Everything else", points: 3 },
      { fit: "Unavailable", examples: "No industry given", points: 0 },
    ],
  },
  intent: {
    weight: 25,
    label: "Buying intent (notes)",
    signals: [
      { intent: "Pricing or demo request", strength: "Strong", points: 25 },
      { intent: "Direct purchase intent", strength: "Strong", points: 25 },
      { intent: "Contract renewal coming up", strength: "Strong", points: 22 },
      { intent: "Expansion / multiple locations", strength: "Strong", points: 20 },
      { intent: "Evaluating vendors", strength: "Medium", points: 16 },
      { intent: "Event or meeting conversation", strength: "Weak", points: 7 },
      { intent: "Content download / webinar", strength: "Weak", points: 4 },
      { intent: "No signal found", strength: "None", points: 0 },
    ],
  },
  region: {
    weight: 10,
    label: "Region",
    tiers: [
      { match: ["North America", "Israel", "UK", "DACH"], points: 10 },
      { match: ["Rest of Europe", "ANZ"], points: 7 },
      { match: ["Other"], points: 3 },
      { match: ["Unavailable"], points: 0 },
    ],
  },
  completeness: {
    weight: 10,
    label: "Data completeness",
    rule: "10 points minus 2 per data-quality warning (missing title, phone, free email…)",
  },
} as const;

export type Tier = "Hot" | "Warm" | "Nurture" | "Disqualify";
export const TIER_ORDER: Tier[] = ["Hot", "Warm", "Nurture", "Disqualify"];

export function intentInfo(intent: Intent) {
  return rubric.intent.signals.find((s) => s.intent === intent)!;
}

// Shown next to the email field and copied verbatim into the notification email.
export const CONSENT_TEXT =
  "I agree that Ariel Laish may email me once about my results and possible collaboration. No newsletters, no sharing. Reply 'stop' anytime.";

// Offered on the success screen once the email gate is passed. File lives in public/.
export const CV_URL = "/Ariel-Laish-CV.pdf";
