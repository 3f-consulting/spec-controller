import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { discover } from "./corpusFixtures.test-utils.js";
import { featureNamesOf, readCorpus } from "./ingestQualityChecks.js";
import { readEvidenceObligations, readFeatureCorpus, runReconcile } from "./corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

function absentCorpus(): { features: string; packageJson: string; ci: string } {
  const root = temporaryDirectory(`scn-cli-017-absent-${process.pid}-`);
  const packageJson = join(root, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "new-client-target", scripts: {} }));
  const features = join(root, "features");
  expect(existsSync(features)).toBe(false);
  return { features, packageJson, ci: root };
}

function unreadableCorpus(): { features: string; packageJson: string; file: string } {
  const root = temporaryDirectory(`scn-cli-017-unreadable-${process.pid}-`);
  const packageJson = join(root, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "new-client-target", scripts: {} }));
  const features = join(root, "features");
  mkdirSync(features, { recursive: true });
  const file = join(features, "target.feature");
  writeFileSync(file, "not gherkin at all {{{\n");
  return { features, packageJson, file };
}

describe("[SCN-CLI-017] balance reads an absent corpus as no corpus, at every reader", () => {

  it("reads no feature-code map", () => {
    const { features } = absentCorpus();

    expect([...featureNamesOf(readFeatureCorpus(features))]).toEqual([]);
  });

  it("raises no evidence obligation, and finds no untagged scenario", () => {
    const { features } = absentCorpus();

    const obligations = readEvidenceObligations(features);

    expect(obligations.scenarioCount).toBe(0);
    expect(obligations.rawClaimCodeOccurrences).toBe(0);
    expect(obligations.untaggedScenarios).toEqual([]);
  });

  it("reconciles a bare target that has no package.json either", () => {
    const { features, ci } = absentCorpus();
    const packageJson = join(ci, "absent-package.json");
    expect(existsSync(packageJson)).toBe(false);

    const balance = runReconcile({ features, packageJson, ci }, resolveTargetRoot({ features }));

    expect(balance.ledger.claimReconciliations).toEqual([]);
  });
});

describe("[SCN-CLI-017] a corpus that is PRESENT and unreadable is still refused", () => {
  it("keeps reporting the parse failure rather than reading absence into it", () => {
    const { features, file } = unreadableCorpus();

    const reading = readCorpus(features);

    expect(reading.kind === "unparseable" ? reading.faults.map(({ file: faulted }) => faulted) : reading).toEqual([file]);
  });
});

describe("[SCN-CLI-017] an absent feature corpus is a typed fact, not a raw ENOENT", () => {
  function absentDir(): string {
    const dir = join(temporaryDirectory(`scn-cli-017-${process.pid}-`), "features");
    expect(existsSync(dir)).toBe(false);
    return dir;
  }

  it("refuses with the corpus's own error rather than letting readdirSync's ENOENT escape", () => {
    const { thrown } = discover(absentDir());

    expect((thrown as Error | undefined)?.name).toBe("MissingFeatureCorpusError");
    expect((thrown as { code?: string } | undefined)?.code).toBeUndefined();
  });

  it("leaves a `features` path that is a FILE to its own fault when the parse-error reader looks at it", () => {
    const notADirectory = join(temporaryDirectory(`scn-cli-017-file-${process.pid}-`), "features");
    writeFileSync(notADirectory, "this is a file, not a corpus directory\n");

    const reading = readCorpus(notADirectory);

    expect(reading).toEqual({
      kind: "read-fault",
      fault: { path: notADirectory, reason: expect.stringMatching(/^ENOTDIR: /) as unknown },
    });
  });
});
