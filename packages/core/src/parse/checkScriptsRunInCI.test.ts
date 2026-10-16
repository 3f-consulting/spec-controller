import { describe, it, expect } from "vitest";
import { ciWorkflowSteps } from "./checkScriptsRunInCI.js";

const usesValues = [
  ["actions/checkout@v4", "checkout"],
  ["actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a", "setup-node"],
  ["actions/setup-python@main", "setup-python"],
  ["actions/upload-artifact@v4.0.2", "upload-artifact"],
  ["actions/cache/restore@v4", "cache"],
  ["actions/cache", "cache"],
] as const;

describe("[SCN-USG-030] a step that only uses one of GitHub's plumbing actions is not a candidate fitness function, whatever ref pins it", () => {
  it("reads each uses: value as the owner and repository it names, whatever ref or sub-path follows", () => {
    const ci = `jobs:\n  quality:\n    steps:\n${usesValues.map(([uses]) => `      - uses: ${uses}\n`).join("")}`;
    const actions = ciWorkflowSteps([ci]).map((step) => ("action" in step ? step.action : undefined));
    expect(actions).toStrictEqual(
      usesValues.map(([name, repository]) => ({ name, owner: "actions", repository }))
    );
  });
});

describe("[SCN-USG-031] an action outside the closed list stays a candidate — dependency review, another owner's look-alike and a local action", () => {
  it("reads a local action, a container image and another owner's look-alike as owned by someone other than actions", () => {
    const ci = `jobs:\n  quality:\n    steps:\n      - uses: ./.github/actions/lint\n      - uses: docker://alpine:3\n      - uses: someone/checkout@v1\n`;
    const owners = ciWorkflowSteps([ci]).map((step) => ("action" in step ? step.action.owner : undefined));
    expect(owners).toHaveLength(3);
    for (const owner of owners) expect(owner).not.toBe("actions");
  });
});
