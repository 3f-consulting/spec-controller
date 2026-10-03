import assert from "node:assert/strict";

const STORED_RUN_FILE: Readonly<Record<string, string>> = {
  "the saved reconciliation, in markdown": "spec-reconciliation.md",
  "the saved reconciliation, in JSON": "spec-reconciliation.json",
  "the run manifest": "run.yaml",
};

export const STORED_RUN_FILE_INTENT = Object.keys(STORED_RUN_FILE)
  .map((intent) => intent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

export function storedRunFile(intent: string): string {
  const name = STORED_RUN_FILE[intent];
  assert.ok(name, `no file a stored run writes is named "${intent}"`);
  return name;
}
