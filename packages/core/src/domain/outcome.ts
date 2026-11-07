export type Outcome =
  | "satisfied"
  | "failing"
  | "watermelon"
  | "missing"
  | "cites-unknown-scenario"
  | "cites-no-scenario"
  | "broken"
  | "no-evidence-obligation"
  | "no-claim-code"
  | "duplicate-claim-code"
  | "both-missing";
export type SidePresence = "Exists" | "None";
