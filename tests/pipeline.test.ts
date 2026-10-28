// Regression tests for the cleaning, scoring and routing pipeline.
// Runs with the local rules classifier (no API key), so it's free and deterministic.

import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { cleanRows, parseCsv } from "@/lib/clean";
import { defaultFlowVariables, type FlowVariables } from "@/lib/flow";

// Score-only behaviour, for tests about scoring rather than the user's Hot rules.
const scoreOnly: FlowVariables = { ...defaultFlowVariables, hotRules: { ...defaultFlowVariables.hotRules, enabled: false } };
import { buildPdf } from "@/lib/report";
import { scoreLeads, type ScoredLead } from "@/lib/score";
import { buildRows, csvRecords, summarize } from "@/lib/summary";

beforeAll(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

const HEADER = "first_name,last_name,email,phone,title,company,company_size,industry,city,country,notes";
const csv = (...lines: string[]) => [HEADER, ...lines].join("\n");

function clean(text: string) {
  const { rows, emptyRows } = parseCsv(text);
  return cleanRows(rows, emptyRows);
}

async function pipeline(text: string, vars: FlowVariables = defaultFlowVariables) {
  const cleaned = clean(text);
  const leads = await scoreLeads(cleaned.leads, cleaned.summary.missingColumns);
  const rows = buildRows(leads, vars);
  return { cleaned, leads, rows, summary: summarize(rows, cleaned.summary) };
}

const find = (leads: ScoredLead[], first: string) => leads.find((l) => l.firstName === first)!;

describe("duplicate detection", () => {
  it("merges exact duplicates by email, ignoring case, and records the merge", () => {
    const r = clean(
      csv(
        "Maya,Cohen,maya@brightloop.io,,VP Sales,Brightloop,120,B2B SaaS,Tel Aviv,Israel,Demo request",
        "maya,cohen,MAYA@Brightloop.io,,,brightloop,,SaaS,TLV,IL,Asked about pricing",
      ),
    );
    expect(r.leads).toHaveLength(1);
    expect(r.summary.exactDuplicates).toBe(1);
    const lead = r.leads[0];
    expect(lead.rowNumbers).toEqual([2, 3]);
    expect(lead.merged[0]).toMatchObject({ rowNumber: 3, matchedOn: "Same email" });
    // Information from both records is preserved.
    expect(lead.notes).toContain("Demo request");
    expect(lead.notes).toContain("Asked about pricing");
  });

  it("treats gmail dots and +tags as the same address", () => {
    const r = clean(
      csv("Dana,Ross,dana.ross+leads@gmail.com,,CEO,Acme,50,Software,Boston,USA,", "Dana,Ross,danaross@gmail.com,,CEO,Acme,50,Software,Boston,USA,"),
    );
    expect(r.leads).toHaveLength(1);
  });

  it("merges fuzzy duplicates: similar name, same company, no conflicting email", () => {
    const r = clean(
      csv("Jonathan,Smith,jon@orbitcloud.com,,Director,OrbitCloud,1500,B2B SaaS,Toronto,Canada,", "Jonathon,Smith,,,Director,OrbitCloud Inc.,,,,,Met at booth"),
    );
    expect(r.leads).toHaveLength(1);
    expect(r.summary.fuzzyDuplicates).toBe(1);
    expect(r.leads[0].merged[0].matchedOn).toBe("Similar name, same company");
  });

  it("merges records that share a phone number at the same company", () => {
    const r = clean(
      csv("Lee,Park,lee@acme.io,+1 (415) 555-0134,VP Sales,Acme,300,Software,,USA,", "L.,Park,,415-555-0134,,Acme,,,,,"),
    );
    expect(r.leads).toHaveLength(1);
    expect(r.leads[0].merged[0].matchedOn).toBe("Same phone");
  });

  it("does NOT merge same name + company when the emails conflict; flags it instead", () => {
    const r = clean(
      csv("David,Levi,david.levi@acme.com,,CTO,Acme,300,Software,,Israel,", "David,Levi,dlevi@other-acme.com,,Engineer,Acme,300,Software,,Israel,"),
    );
    expect(r.leads).toHaveLength(2);
    expect(r.summary.possibleDuplicatePairs).toBe(1);
    expect(r.leads[0].possibleDuplicateRows).toEqual([3]);
  });

  it("does NOT merge two different people on a shared inbox", () => {
    const r = clean(
      csv("Anna,Berg,sales@nordic.io,,VP Sales,Nordic,80,Software,Oslo,Norway,", "Mark,Olsen,sales@nordic.io,,SDR,Nordic,80,Software,Oslo,Norway,"),
    );
    expect(r.leads).toHaveLength(2);
    expect(r.summary.possibleDuplicatePairs).toBe(1);
  });
});

describe("data quality", () => {
  it("flags a malformed email as invalid and routes it to Data Hygiene", async () => {
    const { rows } = await pipeline(csv("Liam,Murphy,liam.murphy@,,Sales Director,Northbeam,90,B2B SaaS,Dublin,Ireland,Wants pricing"));
    const r = rows[0];
    expect(r.lead.quality).toBe("Invalid");
    expect(r.lead.issues.map((i) => i.code)).toContain("email_malformed");
    expect(r.flow.tier).toBe("Disqualify");
    expect(r.flow.owner).toBe("Data Hygiene Queue");
  });

  it("lists every issue on a lead, not just the first", () => {
    const r = clean(csv("Sara,Kim,sara.kim@gmail.com,12,,Kim Consulting,abc,Consulting,Austin,USA,"));
    const codes = r.leads[0].issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["email_free", "phone_invalid", "title_missing", "size_unreadable"]));
    expect(r.leads[0].quality).toBe("Needs review");
  });

  it("treats a missing name as invalid and placeholder values as invalid", () => {
    const r = clean(csv(",,someone@acme.io,,CEO,Acme,50,Software,,USA,", "test,test,test@test.com,,test,test,,,,,"));
    expect(r.leads.every((l) => l.quality === "Invalid")).toBe(true);
    expect(r.leads[0].issues.map((i) => i.code)).toContain("name_missing");
    expect(r.leads[1].issues.map((i) => i.code)).toEqual(expect.arrayContaining(["placeholder", "email_test"]));
  });

  it("flags keyboard-mash and symbol-only names", () => {
    const r = clean(csv("ajshdkjasd,Howard,a@howard.io,,CEO,Howard,50,Software,,USA,", "Ryan,???,r@fable.io,,CEO,Fable,50,Software,,USA,"));
    expect(r.leads.every((l) => l.issues.some((i) => i.code === "name_suspicious"))).toBe(true);
  });

  it("does not flag real names that look like test words", () => {
    const r = clean(csv("Tal,Bar,tal@samplelabs.co,,Analyst,Sample Labs,40,Software,Haifa,Israel,"));
    expect(r.leads[0].issues.map((i) => i.code)).not.toContain("placeholder");
    expect(r.leads[0].quality).toBe("Valid");
  });

  it("flags a city that contradicts the country", () => {
    const r = clean(csv("Ori,Sasson,ori@shieldlayer.com,,CISO,ShieldLayer,410,Cybersecurity,Tel Aviv,Germany,"));
    expect(r.leads[0].issues.map((i) => i.code)).toContain("location_conflict");
  });
});

describe("scoring and tiers", () => {
  it("keeps a valid, high-intent lead out of Data Hygiene even with a low score", async () => {
    const text = csv("Tal,Bar,tal@tinyshop.co,,Analyst,TinyShop,4,Retail,,,Requested pricing for 3 stores");
    const { rows } = await pipeline(text, scoreOnly);
    expect(rows[0].lead.score).toBeLessThan(defaultFlowVariables.warmThreshold);
    expect(rows[0].lead.intentStrength).toBe("Strong");
    expect(rows[0].flow.tier).toBe("Warm");
    expect(rows[0].flow.owner).toBe("SDR Queue");

    const off = await pipeline(text, { ...scoreOnly, promoteStrongSignals: false });
    expect(off.rows[0].flow.tier).toBe("Nurture");
  });

  it("never disqualifies a valid lead just for a low score", async () => {
    const { rows } = await pipeline(csv("Ben,Carter,ben@sparkmail.app,,Intern,Sparkmail,3,Retail,,,"));
    expect(rows[0].lead.quality).not.toBe("Invalid");
    expect(rows[0].flow.tier).toBe("Nurture");
    expect(rows[0].flow.owner).toBe("Marketing Nurture");
  });

  it("weights a pricing request above a guide download", async () => {
    const { leads } = await pipeline(
      csv(
        "Amy,One,amy@fintechco.com,,VP Sales,FintechCo,300,Fintech,London,UK,Requested pricing",
        "Bob,Two,bob@fintechco2.com,,VP Sales,FintechCo2,300,Fintech,London,UK,Downloaded our buyer guide",
      ),
    );
    const amy = find(leads, "Amy");
    const bob = find(leads, "Bob");
    expect(amy.score).toBeGreaterThan(bob.score);
    expect(bob.intentStrength).toBe("Weak");
  });

  it("explains every score: the breakdown rescaled to 100 is the score", async () => {
    const { leads } = await pipeline(readFileSync("public/sample-leads.csv", "utf8"));
    for (const l of leads) {
      const pts = l.breakdown.reduce((s, b) => s + b.points, 0);
      const max = l.breakdown.reduce((s, b) => s + b.max, 0);
      expect(Math.round((pts / max) * 100)).toBe(l.score);
    }
  });

  it("doesn't penalize leads for columns the whole file lacks", async () => {
    const text = ["name,email,title,company,city,notes", "Ana Gold,ana@gold.io,VP Operations,Gold Co,\"Boston, MA\",Requested pricing"].join("\n");
    const { cleaned, leads } = await pipeline(text);
    expect(cleaned.summary.missingColumns).toEqual(["Company size", "Industry"]);
    const excluded = leads[0].breakdown.filter((b) => b.value === "Not in your file").map((b) => b.criterion);
    expect(excluded).toHaveLength(2);
    expect(leads[0].score).toBeGreaterThanOrEqual(75); // VP + pricing + US + complete, out of the 65 points that apply
  });

  it("handles conflicting signals: strong intent + not interested goes to review, not Disqualify", async () => {
    const { rows } = await pipeline(
      csv(
        "Cara,Conflict,cara@meridianhq.com,,VP RevOps,Meridian,450,B2B SaaS,Boston,USA,Asked for pricing but said not interested this year",
        "Nick,No,nick@meridianhq2.com,,VP RevOps,Meridian2,450,B2B SaaS,Boston,USA,Not interested - please do not contact",
      ),
    );
    const cara = rows.find((r) => r.lead.firstName === "Cara")!;
    const nick = rows.find((r) => r.lead.firstName === "Nick")!;
    expect(cara.flow.tier).toBe("Nurture");
    expect(cara.flow.task?.subject).toBe("Review conflicting signals");
    expect(nick.flow.tier).toBe("Disqualify");
    expect(nick.flow.owner).toBe("Do Not Contact");
  });
});

describe("user-defined Hot rules", () => {
  const H = "first_name,last_name,email,title,company,city,status,estimated_monthly_spend,last_contacted,notes";
  const rows = (...l: string[]) => [H, ...l].join("\n");
  const withRules = (patch: Partial<FlowVariables["hotRules"]>): FlowVariables => ({
    ...defaultFlowVariables,
    hotRules: { ...defaultFlowVariables.hotRules, ...patch },
  });

  it("makes a low-scoring lead Hot when it matches the user's actions and recency", async () => {
    const text = rows(
      'Amy,Lane,amy@lane.co,Office Manager,Lane Co,"Austin, TX",Proposal sent,900,2026-10-20,',
      'Ben,Moss,ben@moss.co,Office Manager,Moss Co,"Austin, TX",Proposal sent,900,2026-09-01,',
      'Cal,Reed,cal@reed.co,Office Manager,Reed Co,"Austin, TX",New,900,2026-10-21,Downloaded a guide',
    );
    const { rows: r } = await pipeline(text, withRules({ actions: ["Proposal sent"], withinDays: 3, fromNewestDate: true }));
    const tier = (n: string) => r.find((x) => x.lead.firstName === n)!.flow;
    expect(tier("Amy").tier).toBe("Hot"); // 1 day before the newest date
    expect(tier("Amy").why).toMatch(/Matches your Hot rule: Proposal sent/);
    expect(tier("Ben").tier).not.toBe("Hot"); // too long ago
    expect(tier("Cal").tier).not.toBe("Hot"); // recent but no matching action
  });

  it("filters by deal value and can be switched off", async () => {
    const text = rows(
      'Amy,Lane,amy@lane.co,Office Manager,Lane Co,"Austin, TX",Meeting booked,2200,2026-10-20,',
      'Ben,Moss,ben@moss.co,Office Manager,Moss Co,"Austin, TX",Meeting booked,180,2026-10-20,',
    );
    const on = await pipeline(text, withRules({ actions: ["Meeting booked"], withinDays: null, minValue: 1000 }));
    expect(on.summary.hot).toBe(1);
    const off = await pipeline(text, withRules({ enabled: false }));
    expect(off.summary.hot).toBe(0);
  });

  it("reads stage, value, dates and referrals from typical CRM columns", () => {
    const r = clean(rows('Amy,Lane,amy@lane.co,Owner,Lane Co,"San Diego, CA",Proposal sent,"$1,500",yesterday,Referral from an existing customer'));
    const l = r.leads[0];
    expect([l.stage, l.dealValue, l.isReferral, l.country]).toEqual(["Proposal sent", 1500, true, "United States"]);
    expect(l.lastActivity).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("enrichment", () => {
  it("fills segment and region from messy inputs, and marks the rest Unavailable", () => {
    const r = clean(
      [
        "name,email,title,company,employees,location,country",
        "Ana Gold,ana@a.io,CEO,A,51-200 employees,,US-NY",
        "Ben Silver,ben@b.io,CEO,B,1K-5K,Berlin,",
        "Cy Bronze,cy@c.co.uk,CEO,C,Enterprise,,",
        "Di Iron,di@d.io,CEO,D,,,",
      ].join("\n"),
    );
    const [a, b, c, d] = r.leads;
    expect([a.segment, a.region]).toEqual(["SMB", "North America"]);
    expect([b.segment, b.region, b.country]).toEqual(["Enterprise", "DACH", "Germany"]);
    expect([c.segment, c.region]).toEqual(["Enterprise", "UK"]);
    expect([d.segment, d.region]).toEqual(["Unavailable", "Unavailable"]);
  });

  it("never leaves intent or task blank in the export", async () => {
    const { rows } = await pipeline(readFileSync("public/sample-leads.csv", "utf8"));
    for (const rec of csvRecords(rows)) {
      for (const [k, v] of Object.entries(rec)) if (k !== "user_correction") expect(String(v), k).not.toBe("");
    }
  });
});

describe("import limits and accounting", () => {
  const many = (n: number) => csv(...Array.from({ length: n }, (_, i) => `First${i},Last${i},p${i}@co${i}.com,,CEO,Co${i},50,Software,,USA,`));

  it("processes the first 100 rows and reports exactly which rows were skipped", () => {
    const r = clean(many(130));
    expect(r.summary.processed).toBe(100);
    expect(r.summary.overLimit).toEqual({ count: 30, firstRow: 102, lastRow: 131 });
    expect(r.summary.rowsInFile).toBe(130);
  });

  it("counts empty rows separately instead of dropping them silently", () => {
    const r = clean(csv("Ana,Gold,ana@a.io,,CEO,A,50,Software,,USA,", ",,,,,,,,,,", "Ben,Silver,ben@b.io,,CEO,B,50,Software,,USA,"));
    expect(r.summary.emptyRowsSkipped).toBe(1);
    expect(r.summary.processed).toBe(2);
  });

  it("accounts for every row: processed - merged = leads", () => {
    const r = clean(readFileSync("public/sample-leads.csv", "utf8"));
    expect(r.summary.processed - r.summary.duplicatesMerged).toBe(r.summary.leadsOut);
    expect(r.leads).toHaveLength(r.summary.leadsOut);
  });
});

describe("dashboard, CSV and PDF agree", () => {
  for (const hotThreshold of [75, 90, 60]) {
    it(`Hot count matches everywhere at Hot threshold ${hotThreshold}`, async () => {
      const vars = { ...defaultFlowVariables, hotThreshold, warmThreshold: Math.min(55, hotThreshold - 5) };
      const { rows, summary } = await pipeline(readFileSync("public/sample-leads.csv", "utf8"), vars);
      const csvHot = csvRecords(rows).filter((r) => r.tier === "Hot").length;
      const rowHot = rows.filter((r) => r.flow.tier === "Hot").length;
      expect(csvHot).toBe(summary.hot);
      expect(rowHot).toBe(summary.hot);
      expect(Object.values(summary.tiers).reduce((a, b) => a + b, 0)).toBe(rows.length);

      const doc = await buildPdf({ fileName: "sample.csv", rows, summary });
      expect(doc.getNumberOfPages()).toBe(1);
      const pdf = doc.output();
      // The Hot KPI tile and hero tile both print the shared summary value.
      expect(pdf.match(new RegExp(`\\(${summary.hot}\\) Tj`, "g"))?.length ?? 0).toBeGreaterThanOrEqual(2);
    });
  }
});
