import { describe, it, expect } from "vitest";
import { parseWorkflows, readUses } from "./checkScriptsRunInCI.js";
import { workflowSteps } from "./parsedWorkflows.test-utils.js";

const usesValues = [
  ["actions/checkout@v4", "checkout"],
  ["actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a", "setup-node"],
  ["actions/setup-python@main", "setup-python"],
  ["actions/upload-artifact@v4.0.2", "upload-artifact"],
  ["actions/cache/restore@v4", "cache"],
  ["actions/cache", "cache"],
] as const;

describe("[CLM-WFS-014] a uses: value is read as its owner and repository, whatever ref or sub-path follows", () => {
  it("reads each uses: value as the owner and repository it names, whatever ref or sub-path follows", () => {
    expect(usesValues.map(([uses]) => readUses(uses))).toStrictEqual(
      usesValues.map(([, repository]) => ({ owner: "actions", repository }))
    );
  });
});

describe("[CLM-WFS-015] a local action, a container image and another owner's look-alike are read as owned by someone other than actions", () => {
  it("reads a local action, a container image and another owner's look-alike as owned by someone other than actions", () => {
    const owners = ["./.github/actions/lint", "docker://alpine:3", "someone/checkout@v1"].map((uses) => readUses(uses).owner);
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

describe("[CLM-WFS-017] a step's continue-on-error is read from the step or from its job, and only an absent value, false or the string \"false\" leaves its job's verdict depending on it", () => {
  it("reads the job's verdict as depending on a step only when neither the step nor its job sets continue-on-error to anything but false or \"false\"", () => {
    const read = workflowSteps([continueOnErrorCi]).map((step) => [step.job, step.identity, step.abortsJob]);
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
        id: "  CLM-FIT-001  "
        run: pnpm lint:padded
      - name: blank
        id: "   "
        run: pnpm lint:blank
      - name: none
        run: pnpm lint:none
`;

describe("[CLM-WFS-018] a step's id: is read trimmed, so a padded code cites as if written unpadded", () => {
  it("reads a padded id: as the unpadded code, and an id: of only spaces as no id: at all", () => {
    const read = workflowSteps([idCi]).map((step) => [step.identity, step.id]);
    expect(read).toStrictEqual([
      ["padded", "CLM-FIT-001"],
      ["blank", undefined],
      ["none", undefined],
    ]);
  });
});

describe("[CLM-WFS-020] a workflow that does not parse is refused by the reader, never read as one with no steps", () => {
  it("returns a source that is not YAML as a fault naming the file, in the YAML parser's own words, and no parsed workflow", () => {
    expect(
      parseWorkflows([
        { file: "ci.yml", source: "name: CI\non: [push]\n" },
        { file: "build.yml", source: "jobs:\n  ci: [\n" },
      ])
    ).toStrictEqual({
      kind: "unparseable",
      faults: [
        {
          file: "build.yml",
          message:
            "Flow sequence in block collection must be sufficiently indented and end with a ] at line 3, column 1:\n\n  ci: [\n\n^\n",
        },
      ],
    });
  });

  it("reads a source that parses with no jobs, and an empty source, as no steps", () => {
    expect(
      parseWorkflows([
        { file: "ci.yml", source: "name: CI\non: [push]\n" },
        { file: "empty.yml", source: "" },
      ])
    ).toStrictEqual({
      kind: "parsed",
      parsed: [
        { file: "ci.yml", steps: [] },
        { file: "empty.yml", steps: [] },
      ],
    });
  });
});
