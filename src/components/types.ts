import type { ImportSummary } from "@/lib/clean";
import type { ScoredLead } from "@/lib/score";

export type { ScoredLead };

export type ScoreResponse = {
  import: ImportSummary;
  leads: ScoredLead[];
  owner: boolean;
};
