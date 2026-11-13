import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repositoryForTest } from "../repository/repository.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";

// The provenance of the JSON report balance writes, run in the folder with nothing named but the format and what is given.
function provenanceIn(folder: string, ...args: string[]): { readonly target: string; readonly sourceSha: string } {
  let report = "";
  main(["balance", "--format", "json", ...args], folder, { output: { fd: 1, write: (text) => (report += text) }, error: { fd: 2, write: () => {} } });
  return (JSON.parse(report) as { provenance: { target: string; sourceSha: string } }).provenance;
}

describe("balance will use the default when an input is not named", () => {
  it("[CLM-CLI-139] no target name named: balance uses unknown-target", () => {
    expect(provenanceIn(temporaryDirectory("no-target-")).target).toBe("unknown-target");
  });

  it("[CLM-CLI-140] no source commit named: balance uses the target's HEAD", () => {
    const repository = repositoryForTest();
    const head = repository.commit("one");

    expect(provenanceIn(repository.top).sourceSha).toBe(head);
  });

  it("[CLM-CLI-141] no source commit named, in no git repository: balance uses unknown", () => {
    expect(provenanceIn(temporaryDirectory("no-git-")).sourceSha).toBe("unknown");
  });
});

describe("balance works out the target's folder", () => {
  it("[CLM-CLI-184] a corpus named in a git repository's subfolder, run from elsewhere: the target is that repository", () => {
    const repository = repositoryForTest();
    repository.write("docs/features/one.feature", "@ONE\nFeature: one\n");
    const head = repository.commit("one");

    expect(provenanceIn(temporaryDirectory("elsewhere-"), "--features", `${repository.top}/docs/features`).sourceSha).toBe(head);
  });
});

describe("the run will be not reconciled, naming why", () => {
  // The run verdict of the JSON report balance writes, run in the folder with nothing named but the format.
  function runVerdictIn(folder: string): unknown {
    let report = "";
    main(["balance", "--format", "json"], folder, { output: { fd: 1, write: (text) => (report += text) }, error: { fd: 2, write: () => {} } });
    return (JSON.parse(report) as { runVerdict: unknown }).runVerdict;
  }

  it.each([
    ["CLM-EVR-006", "no corpus directory", (folder: string) => folder],
    [
      "CLM-EVR-007",
      "an empty corpus directory",
      (folder: string) => {
        mkdirSync(join(folder, "features"));
        return folder;
      },
    ],
  ] as const)("[%s] a run with %s, and no Evidence Observation, is not reconciled, naming why", (_clm, _what, made) => {
    expect(runVerdictIn(made(temporaryDirectory("corpus-")))).toEqual({ verdict: "not-reconciled", why: "nothing-to-reconcile" });
  });
});
