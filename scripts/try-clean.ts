// Quick local check of the cleaning step: npx tsx scripts/try-clean.ts [file.csv]
import { readFileSync } from "node:fs";
import { cleanRows, parseCsv } from "../src/lib/clean";

const r = cleanRows(parseCsv(readFileSync(process.argv[2] ?? "public/sample-leads.csv", "utf8")).rows);
console.log({ rowsIn: r.rowsIn, duplicatesRemoved: r.duplicatesRemoved, junkFlagged: r.junkFlagged, clean: r.leads.length });
console.table(r.leads.map((l) => ({ id: l.id, name: `${l.firstName} ${l.lastName}`, company: l.company, band: l.sizeBand, city: l.city, country: l.country, region: l.region, junk: l.junkReason ?? "" })));
