export type Outcome =
  | "satisfied"
  | "failing"
  | "watermelon"
  | "missing"
  | "cites-unknown-scenario"
  | "cites-no-scenario"
  | "broken"
  | "no-evidence-obligation"
  | "no-scn-code"
  | "duplicate-scn-code"
  | "both-missing";
export type SidePresence = "Exists" | "None";
