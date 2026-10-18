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

describe("[SCN-WFS-014] a step that only uses one of GitHub's plumbing actions is not a candidate fitness function, whatever ref pins it", () => {
  it("reads each uses: value as the owner and repository it names, whatever ref or sub-path follows", () => {
    const ci = `jobs:\n  quality:\n    steps:\n${usesValues.map(([uses]) => `      - uses: ${uses}\n`).join("")}`;
    const actions = ciWorkflowSteps([ci]).map((step) => ("action" in step ? step.action : undefined));
    expect(actions).toStrictEqual(
      usesValues.map(([name, repository]) => ({ name, owner: "actions", repository }))
    );
  });
});

describe("[SCN-WFS-015] an action outside the closed list stays a candidate — dependency review, another owner's look-alike and a local action", () => {
  it("reads a local action, a container image and another owner's look-alike as owned by someone other than actions", () => {
    const ci = `jobs:\n  quality:\n    steps:\n      - uses: ./.github/actions/lint\n      - uses: docker://alpine:3\n      - uses: someone/checkout@v1\n`;
    const owners = ciWorkflowSteps([ci]).map((step) => ("action" in step ? step.action.owner : undefined));
    expect(owners).toHaveLength(3);
    for (const owner of owners) expect(owner).not.toBe("actions");
  });
});

const continueOnErrorCi = `jobs:
  pinned:
    steps:
      - name: absent
        run: pnpm lint:absent
      - name: "true"
        continue-on-error: true
        run: pnpm lint:true
      - name: "false"
        continue-on-error: false
        run: pnpm lint:false
      - name: quoted false
        continue-on-error: "false"
        run: pnpm lint:quoted
      - name: quoted true
        continue-on-error: "true"
        run: pnpm lint:quoted-true
      - name: expression
        continue-on-error: \${{ matrix.experimental }}
        run: pnpm lint:expression
  severed:
    continue-on-error: true
    steps:
      - name: absent
        run: pnpm lint:absent
      - name: "false"
        continue-on-error: false
        run: pnpm lint:false
  unsevered:
    continue-on-error: false
    steps:
      - name: absent
        run: pnpm lint:absent
      - name: "true"
        continue-on-error: true
        run: pnpm lint:true
  quoted:
    continue-on-error: "false"
    steps:
      - name: absent
        run: pnpm lint:absent
  expressed:
    continue-on-error: \${{ matrix.experimental }}
    steps:
      - name: absent
        run: pnpm lint:absent
`;

describe("[SCN-WFS-017] a step's continue-on-error is read from the step or from its job, and only an absent value, false or the string \"false\" leaves its job's verdict depending on it", () => {
  it("reads the job's verdict as depending on a step only when neither the step nor its job sets continue-on-error to anything but false or \"false\"", () => {
    const read = ciWorkflowSteps([continueOnErrorCi]).map((step) => [step.job, step.identity, step.abortsJob]);
    expect(read).toStrictEqual([
      ["pinned", "absent", true],
      ["pinned", "true", false],
      ["pinned", "false", true],
      ["pinned", "quoted false", true],
      ["pinned", "quoted true", false],
      ["pinned", "expression", false],
      ["severed", "absent", false],
      ["severed", "false", false],
      ["unsevered", "absent", true],
      ["unsevered", "true", false],
      ["quoted", "absent", true],
      ["expressed", "absent", false],
    ]);
  });
});

const idCi = `jobs:
  check:
    steps:
      - name: padded
        id: "  SCN-FIT-001  "
        run: pnpm lint:padded
      - name: blank
        id: "   "
        run: pnpm lint:blank
      - name: none
        run: pnpm lint:none
`;

describe("[SCN-WFS-018] a step's id: is read trimmed, so a padded code cites as if written unpadded", () => {
  it("reads a padded id: as the unpadded code, and an id: of only spaces as no id: at all", () => {
    const read = ciWorkflowSteps([idCi]).map((step) => [step.identity, step.id]);
    expect(read).toStrictEqual([
      ["padded", "SCN-FIT-001"],
      ["blank", undefined],
      ["none", undefined],
    ]);
  });
});
