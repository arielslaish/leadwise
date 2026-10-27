# Leadwise

**Upload a lead list. See who to call first.**

Leadwise takes a messy CSV of leads (inbound forms, event scans, list imports), cleans it, scores every row with Claude against a transparent ICP rubric, and routes each lead the way a Salesforce record-triggered Flow would.

Built by [Ariel Laish](https://www.linkedin.com/in/ariellaish) as a working demo of GTM engineering: data hygiene, AI lead scoring, routing logic and a deployed backend.

## How it works

```
CSV upload
   │
   ▼
POST /api/score ──► rate limit (per IP + global daily cap, Upstash Redis)
   │
   ├─ 1. Parse      map common column names, 100-row cap
   ├─ 2. Clean      normalize casing, cities, countries; merge duplicates; flag junk
   ├─ 3. Score      one batched Claude Haiku call, structured JSON output
   │                junk rows skip the model; tier is derived in code from the score
   ▼
Dashboard (browser)
   ├─ 4. Route      Salesforce-style Flow: tier → owner queue → follow-up task
   │                (Hot threshold and SLA are adjustable live)
   └─ 5. Download   email + consent gate → POST /api/capture → notification email (Resend)
                    CSV is built in the browser; uploaded data is never stored
```

| Piece | File |
|---|---|
| Scoring rubric (editable) | `src/config/rubric.ts` |
| Cleaning and dedupe | `src/lib/clean.ts` |
| Claude scoring | `src/lib/score.ts` |
| Routing flow | `src/lib/flow.ts` |
| Rate limiting | `src/lib/rateLimit.ts` |
| API routes | `src/app/api/score`, `src/app/api/capture` |

## Stack

Next.js (App Router, TypeScript, Tailwind) on Vercel · Claude Haiku via the Anthropic SDK · Upstash Redis · Resend

## Run locally

```bash
npm install
cp .env.example .env.local   # add keys; without ANTHROPIC_API_KEY a local rubric scorer is used
npm run dev
```

Click **Try sample data** to run the included fictional list (`public/sample-leads.csv`).

## Cost and safety

- One Claude call per upload, max 100 rows: well under one cent per run.
- 3 uploads per IP per day, 150 per day overall. Without Redis in production, scoring is refused rather than left unprotected.
- Uploaded CSVs are processed in memory and never stored or logged.
