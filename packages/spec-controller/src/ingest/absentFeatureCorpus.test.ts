import { afterAll, describe, it, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discover, temporaryDirectoryIn } from "./corpusFixtures.test-utils.js";
import {
  featureCorpusParseErrors,
  readEvidenceObligations,
  readFeatureNames,
  runReconcile,
} from "./ingestQualityChecks.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function absentCorpus(): { features: string; packageJson: string; ci: string } {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-017-absent-${process.pid}-`));
  made.push(root);
  const packageJson = join(root, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "new-client-target", scripts: {} }));
  const features = join(root, "features");
  expect(existsSync(features)).toBe(false);
  return { features, packageJson, ci: root };
}

function unreadableCorpus(): { features: string; packageJson: string; file: string } {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-017-unreadable-${process.pid}-`));
  made.push(root);
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

    expect([...readFeatureNames(features)]).toEqual([]);
  });

  it("raises no evidence obligation, and finds no untagged scenario", () => {
    const { features } = absentCorpus();

    const obligations = readEvidenceObligations(features);

    expect(obligations.scenarioCount).toBe(0);
    expect(obligations.rawScnOccurrences).toBe(0);
    expect(obligations.untaggedScenarios).toEqual([]);
  });

  it("reconciles a bare target that has no package.json either", () => {
    const { features, ci } = absentCorpus();
    const packageJson = join(ci, "absent-package.json");
    expect(existsSync(packageJson)).toBe(false);

    const balance = runReconcile({ features, packageJson, ci });

    expect(balance.ledger.scenarioReconciliations).toEqual([]);
  });
});

describe("[SCN-CLI-017] a corpus that is PRESENT and unreadable is still refused", () => {
  it("keeps reporting the parse failure rather than reading absence into it", () => {
    const { features, file } = unreadableCorpus();

    const errors = featureCorpusParseErrors(features);

    expect(errors.map((e) => e.file)).toEqual([file]);
  });
});

describe("[SCN-CLI-017] an absent feature corpus is a typed fact, not a raw ENOENT", () => {
  function absentDir(): string {
    const dir = join(temporaryDirectoryIn(made, `scn-cli-017-${process.pid}-`), "features");
    expect(existsSync(dir)).toBe(false);
    return dir;
  }

  it("refuses with the corpus's own error rather than letting readdirSync's ENOENT escape", () => {
    const { thrown } = discover(absentDir());

    expect((thrown as Error | undefined)?.name).toBe("MissingFeatureCorpusError");
    expect((thrown as { code?: string } | undefined)?.code).toBeUndefined();
  });

  it("leaves a `features` path that is a FILE to its own fault when the parse-error reader looks at it", () => {
    const notADirectory = join(temporaryDirectoryIn(made, `scn-cli-017-file-${process.pid}-`), "features");
    writeFileSync(notADirectory, "this is a file, not a corpus directory\n");

    let returned: unknown;
    let thrown: unknown;
    try {
      returned = featureCorpusParseErrors(notADirectory);
    } catch (err) {
      thrown = err;
    }

    expect(returned).toBeUndefined();
    expect(thrown).not.toBeInstanceOf(TypeError);
    expect((thrown as NodeJS.ErrnoException).code).toBe("ENOTDIR");
  });
});
