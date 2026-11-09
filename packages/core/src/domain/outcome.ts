export type Outcome =
  | "satisfied"
  | "failing"
  | "cannot-fail"
  | "missing"
  | "cites-unknown-claim"
  | "cites-no-claim"
  | "never-ran"
  | "not-asked-for"
  | "no-claim-code"
  | "duplicate-claim-code"
  | "no-quality-check";
export type SidePresence = "Exists" | "None";
