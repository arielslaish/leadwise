// Mirrors a Salesforce record-triggered Flow on Lead (after save):
//   Start (Lead created) -> Decision: tier -> Assign owner queue by region
//   -> Create follow-up Task (priority + due date depend on tier).
// Runs in the browser, so visitors can change the variables and see routing
// update live. salesforce/force-app/.../Leadwise_Lead_Routing.flow-meta.xml is
// the same logic as deployable Flow metadata; keep the two in sync.

import type { Tier } from "@/config/rubric";

export type FlowVariables = {
  hotThreshold: number; // score at/above which a lead routes as Hot
  hotTaskDueDays: number; // SLA for the first touch on Hot leads
  warmThreshold: number; // score at/above which a lead goes to SDRs instead of Nurture
  warmTaskDueDays: number; // days until the SDR outreach task is due
  enterpriseToStrategic: boolean; // Hot Enterprise accounts skip regional AEs
};

export const defaultFlowVariables: FlowVariables = {
  hotThreshold: 75,
  hotTaskDueDays: 1,
  warmThreshold: 55,
  warmTaskDueDays: 3,
  enterpriseToStrategic: false,
};

const QUEUE_BY_REGION: Record<string, string> = {
  "North America": "AMER AE Queue",
  Israel: "ISR AE Queue",
  UK: "EMEA AE Queue",
  DACH: "EMEA AE Queue",
  "Rest of Europe": "EMEA AE Queue",
  ANZ: "APAC AE Queue",
};

export type FlowOutcome = {
  route: "Hot" | "Warm" | "Nurture" | "Disqualify";
  owner: string;
  task: { subject: string; priority: "High" | "Normal" | "Low"; dueInDays: number } | null;
};

export function runLeadFlow(
  lead: { score: number; tier: Tier; region: string; segment: string },
  vars: FlowVariables,
): FlowOutcome {
  if (lead.tier === "Disqualify") return { route: "Disqualify", owner: "Data Hygiene Queue", task: null };

  if (lead.score >= vars.hotThreshold) {
    const strategic = vars.enterpriseToStrategic && lead.segment === "Enterprise";
    return {
      route: "Hot",
      owner: strategic ? "Strategic Accounts Queue" : (QUEUE_BY_REGION[lead.region] ?? "Global AE Queue"),
      task: { subject: "Call within SLA: hot inbound", priority: "High", dueInDays: vars.hotTaskDueDays },
    };
  }
  if (lead.score >= vars.warmThreshold) {
    return {
      route: "Warm",
      owner: "SDR Queue",
      task: { subject: "Personalized outreach sequence", priority: "Normal", dueInDays: vars.warmTaskDueDays },
    };
  }
  return { route: "Nurture", owner: "Marketing Nurture", task: null };
}
