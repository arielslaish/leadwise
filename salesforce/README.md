# Salesforce metadata

The routing logic the Leadwise dashboard simulates, as deployable Salesforce metadata (SFDX source format).

| File | What it is |
|---|---|
| `flows/Leadwise_Lead_Routing.flow-meta.xml` | Record-triggered Flow on Lead (after save, on create) |
| `objects/Lead/fields/Lead_Score__c` | Number(3,0), the 0-100 score |
| `objects/Lead/fields/Lead_Tier__c` | Picklist: Hot, Warm, Nurture, Disqualify |
| `objects/Lead/fields/Region__c` | Text, the normalized region |
| `queues/*` | 8 Lead queues the Flow routes into |

## Flow logic

```mermaid
flowchart TD
    S([Lead created]) --> D{Decide route}
    D -- "Tier = Disqualify" --> RD[Queue: Data Hygiene]
    D -- "Score ≥ HotThreshold" --> RH["Queue: regional AE<br/>(AMER / ISR / EMEA / APAC)"]
    D -- "Tier = Warm or Hot" --> RW[Queue: SDR]
    D -- default --> RN[Queue: Marketing Nurture]
    RD & RH & RW & RN --> G[Get queue by DeveloperName] --> O[Assign Lead owner]
    O --> T{Needs task?}
    T -- "Hot" --> TH["Task: Call within SLA<br/>High, due today + HotTaskDueDays"]
    T -- "Warm" --> TW["Task: Outreach sequence<br/>Normal, due in 3 days"]
    T -- "No" --> E([End])
```

`HotThreshold` (75) and `HotTaskDueDays` (1) are Flow constants. They are the same two variables visitors adjust on the dashboard.

## Deploy to a dev org

```bash
cd salesforce
sf org login web --alias leadwise-dev
sf project deploy start --target-org leadwise-dev
```

The Flow deploys as **Draft**. Activate it in Setup → Flows after adding members to the queues.
