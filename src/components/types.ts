import type { ScoredLead } from "@/lib/score";

export type { ScoredLead };

export type ScoreResponse = {
  kpis: {
    rowsIn: number;
    duplicatesRemoved: number;
    junkFlagged: number;
    hot: number;
    repHoursSaved: number;
    truncatedFrom: number | null;
  };
  leads: ScoredLead[];
  owner: boolean;
};
