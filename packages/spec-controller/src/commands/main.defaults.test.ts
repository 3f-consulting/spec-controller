import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repositoryForTest } from "../repository/repository.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";

interface ProvenanceRead {
  readonly target: string;
  readonly sourceSha: string;
  readonly inputs: readonly { readonly name: string; readonly path?: string }[];
}

// The provenance of the JSON report balance writes, run in the folder with nothing named but the format and what is given.
function provenanceIn(folder: string, ...args: string[]): ProvenanceRead {
  let report = "";
  main(["balance", "--format", "json", ...args], folder, { output: { fd: 1, write: (text) => (report += text) }, error: { fd: 2, write: () => {} } });
  return (JSON.parse(report) as { provenance: ProvenanceRead }).provenance;
}

// The path the provenance shows for the input of that name.
const inputPath = ({ inputs }: ProvenanceRead, name: string): string | undefined => inputs.find((input) => input.name === name)?.path;

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
  it.each([
    ["by its own path", (top: string) => top],
    [
      "through a link to it",
      (top: string) => {
        const link = join(temporaryDirectory("link-"), "linked");
        symlinkSync(top, link);
        return link;
      },
    ],
  ])("[CLM-CLI-184] a corpus named in a git repository's subfolder, reached %s, run from elsewhere: the target is that repository", (_reached, named) => {
    const repository = repositoryForTest();
    repository.write("docs/features/one.feature", "@ONE\nFeature: one\n");
    const head = repository.commit("one");

    const provenance = provenanceIn(temporaryDirectory("elsewhere-"), "--features", `${named(repository.top)}/docs/features`);

    expect({ sourceSha: provenance.sourceSha, corpus: inputPath(provenance, "features") }).toEqual({ sourceSha: head, corpus: "docs/features" });
  });

  it("[CLM-CLI-144] a corpus named in no git repository, run from elsewhere: the target is the corpus's folder", () => {
    const folder = temporaryDirectory("no-git-");
    mkdirSync(join(folder, "features"));

    expect(inputPath(provenanceIn(temporaryDirectory("elsewhere-"), "--features", join(folder, "features")), "features")).toBe("features");
  });

  it("[CLM-CLI-142] no feature corpus named, run from a folder: the target is that folder", () => {
    const folder = temporaryDirectory("no-corpus-");
    mkdirSync(join(folder, "reports"));
    writeFileSync(join(folder, "reports", "vitest.json"), '{"testResults":[]}');

    expect(inputPath(provenanceIn(folder, "--vitest", join(folder, "reports", "vitest.json")), "vitest")).toBe("reports/vitest.json");
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
    ["CLM-EVR-006", "no feature corpus", (folder: string) => folder],
    [
      "CLM-EVR-007",
      "an empty feature corpus",
      (folder: string) => {
        mkdirSync(join(folder, "features"));
        return folder;
      },
    ],
  ] as const)("[%s] a run with %s, and no Evidence Observation, is not reconciled, naming why", (_clm, _what, made) => {
    expect(runVerdictIn(made(temporaryDirectory("corpus-")))).toEqual({ verdict: "not-reconciled", why: "nothing-to-reconcile" });
  });
});
