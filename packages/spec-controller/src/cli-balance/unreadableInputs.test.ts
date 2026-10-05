import { afterAll, describe, expect, it } from "vitest";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkInputsParse } from "./cli.js";
import { checkInputPaths, checkInputShapes, checkSavedReconciliation, jsonInputsOf, reRenderOrRefusal } from "./unreadableInputs.js";

const nothingByDefault = (): boolean => false;
const reading = (content: string) => (): string => content;

describe("[SCN-CLI-076] checkInputShapes refuses a Vitest report not in the reporter's shape", () => {
  it("names the flag, the file and where the shape is wrong", () => {
    const inputs = jsonInputsOf({ vitest: "reports/vitest.json" }, nothingByDefault);
    const error = checkInputShapes(inputs, reading('{"testResults":"x"}'));

    expect(error).toContain("--vitest");
    expect(error).toContain("reports/vitest.json");
    expect(error).toContain("testResults is a string, not a list");
  });

  it("refuses an object the reporter never writes, one with no test results", () => {
    const error = checkInputShapes(jsonInputsOf({ vitest: "v.json" }, nothingByDefault), reading("{}"));
    expect(error).toContain("testResults is missing");
  });

  it("passes a report in the reporter's shape, so the run goes on to reconcile", () => {
    const report = JSON.stringify({ testResults: [{ name: "a.test.ts", status: "passed", assertionResults: [] }] });
    expect(checkInputShapes(jsonInputsOf({ vitest: "v.json" }, nothingByDefault), reading(report))).toBeNull();
  });

  it("reads nothing when no report is given", () => {
    const read = (): string => {
      throw new Error("nothing was given, so nothing is read");
    };
    expect(checkInputShapes(jsonInputsOf({}, nothingByDefault), read)).toBeNull();
  });
});

describe("[SCN-CLI-077] checkInputShapes refuses a Cucumber report not in the formatter's shape", () => {
  it("names the flag, the file and where the shape is wrong", () => {
    const error = checkInputShapes(jsonInputsOf({ cucumber: "reports/cucumber.json" }, nothingByDefault), reading("{}"));

    expect(error).toContain("--cucumber");
    expect(error).toContain("reports/cucumber.json");
    expect(error).toContain("the top level is an object, not a list");
  });

  it("passes a report in the formatter's shape", () => {
    const report = JSON.stringify([{ uri: "a.feature", elements: [{ tags: [{ name: "@x" }], steps: [] }] }]);
    expect(checkInputShapes(jsonInputsOf({ cucumber: "c.json" }, nothingByDefault), reading(report))).toBeNull();
  });
});

describe("[SCN-CLI-078] checkInputShapes refuses a CI step record not in shape", () => {
  it("names the flag, the file and where the shape is wrong", () => {
    const inputs = jsonInputsOf({ "ci-steps": "evidence/ci-steps.json" }, nothingByDefault);
    const error = checkInputShapes(inputs, reading('{"SCN-ABC-001":{"outcome":1}}'));

    expect(error).toContain("--ci-steps");
    expect(error).toContain("evidence/ci-steps.json");
    expect(error).toContain("SCN-ABC-001.outcome is a number, not a string");
  });
});

describe("[SCN-CLI-079] checkInputShapes refuses a package.json not in a manifest's shape, given or read by default", () => {
  it("names the flag, the file and where the shape is wrong when it is given", () => {
    const inputs = jsonInputsOf({ "package-json": "target/package.json" }, nothingByDefault);
    const error = checkInputShapes(inputs, reading('{"scripts":{"lint":5}}'));

    expect(error).toContain("--package-json");
    expect(error).toContain("target/package.json");
    expect(error).toContain("scripts.lint is a number, not a string");
  });

  it("reads the package.json the run reads by default when none is given", () => {
    const inputs = jsonInputsOf({}, (path) => path === "package.json");
    const error = checkInputShapes(inputs, reading('{"scripts":"x"}'));

    expect(error).toContain("package.json read by default");
    expect(error).toContain("scripts is a string, not an object");
  });

  it("refuses a default package.json that does not parse, rather than crashing on it", () => {
    const error = checkInputShapes(jsonInputsOf({}, (path) => path === "package.json"), reading("{not json"));
    expect(error).toContain("package.json read by default is not valid JSON");
  });

  it("reads no default package.json when there is none, or when one is given by name", () => {
    const read = (): string => {
      throw new Error("no default manifest is read");
    };
    expect(checkInputShapes(jsonInputsOf({}, nothingByDefault), read)).toBeNull();
    expect(jsonInputsOf({ "package-json": "given.json" }, () => true).map((input) => input.path)).toEqual(["given.json"]);
  });
});

describe("[SCN-CLI-080] checkInputShapes reads a well-formed empty report", () => {
  it.each([
    ["vitest", '{"testResults":[]}'],
    ["cucumber", "[]"],
    ["ci-steps", "{}"],
  ])("passes an empty --%s", (flag, content) => {
    expect(checkInputShapes(jsonInputsOf({ [flag]: "empty.json" }, nothingByDefault), reading(content))).toBeNull();
  });
});

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) {
    for (const entry of ["features", "workflows"]) {
      const path = join(dir, entry);
      if (existsSync(path)) chmodSync(path, 0o755);
    }
    for (const entry of [join("features", "a.feature"), join("workflows", "ci.yml")]) {
      const path = join(dir, entry);
      if (existsSync(path)) chmodSync(path, 0o644);
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

function targetOnDisk(): { features: string; ci: string } {
  const dir = mkdtempSync(join(tmpdir(), "input-paths-"));
  made.push(dir);
  const features = join(dir, "features");
  const ci = join(dir, "workflows");
  mkdirSync(features);
  mkdirSync(ci);
  writeFileSync(join(features, "a.feature"), "Feature: a\n");
  writeFileSync(join(ci, "ci.yml"), "jobs: {}\n");
  return { features, ci };
}

describe("[SCN-CLI-075] checkInputPaths refuses a path that is not the kind its flag reads", () => {
  it("refuses a regular file given as the feature corpus, naming the flag and the path", () => {
    const { features } = targetOnDisk();
    const file = join(features, "a.feature");
    const error = checkInputPaths({ features: file });

    expect(error).toContain("--features");
    expect(error).toContain(file);
    expect(error).toContain("ENOTDIR");
  });

  it("names the entry when the corpus holds a directory named as a feature file", () => {
    const { features } = targetOnDisk();
    mkdirSync(join(features, "z.feature"));
    const error = checkInputPaths({ features });

    expect(error).toContain("--features");
    expect(error).toContain(join(features, "z.feature"));
    expect(error).toContain("EISDIR");
  });

  it("names the entry when the CI workflows hold a directory named as a workflow file", () => {
    const { features, ci } = targetOnDisk();
    mkdirSync(join(ci, "x.yml"));
    const error = checkInputPaths({ features, ci });

    expect(error).toContain("--ci");
    expect(error).toContain(join(ci, "x.yml"));
    expect(error).toContain("EISDIR");
  });

  it("reads a corpus directory and a workflow file or directory, so the run goes on", () => {
    const { features, ci } = targetOnDisk();
    expect(checkInputPaths({ features, ci })).toBeNull();
    expect(checkInputPaths({ features, ci: join(ci, "ci.yml") })).toBeNull();
  });
});

describe("[SCN-CLI-082] an input the tool is not permitted to read is refused, naming it and the path", () => {
  it("refuses an unreadable feature file, naming it and the operating system's reason", () => {
    const { features } = targetOnDisk();
    const file = join(features, "a.feature");
    chmodSync(file, 0o000);
    const error = checkInputPaths({ features });

    expect(error).toContain("--features");
    expect(error).toContain(file);
    expect(error).toContain("EACCES");
  });

  it("refuses an unreadable feature corpus directory", () => {
    const { features } = targetOnDisk();
    chmodSync(features, 0o000);
    const error = checkInputPaths({ features });

    expect(error).toContain(features);
    expect(error).toContain("EACCES");
    chmodSync(features, 0o755);
  });

  it("refuses an unreadable CI workflow file and an unreadable CI workflows directory", () => {
    const first = targetOnDisk();
    chmodSync(join(first.ci, "ci.yml"), 0o000);
    expect(checkInputPaths(first)).toContain(join(first.ci, "ci.yml"));

    const second = targetOnDisk();
    chmodSync(second.ci, 0o000);
    const error = checkInputPaths(second);
    expect(error).toContain("--ci");
    expect(error).toContain("EACCES");
    chmodSync(second.ci, 0o755);
  });

  it("says a report it could not read could not be read, rather than calling it invalid JSON", () => {
    const read = (): string => {
      throw Object.assign(new Error("EACCES: permission denied, open 'v.json'"), { code: "EACCES" });
    };
    const error = checkInputsParse({ vitest: "v.json" }, read);

    expect(error).toContain("--vitest");
    expect(error).toContain("could not be read");
    expect(error).not.toContain("not valid JSON");
  });

  it("refuses the package.json read by default when it cannot be read", () => {
    const read = (): string => {
      throw new Error("EACCES: permission denied, open 'package.json'");
    };
    expect(checkInputShapes(jsonInputsOf({}, () => true), read)).toContain("package.json read by default could not be read");
  });
});

const SAVED = {"runProvenance":{"target":"unknown-target","sourceSha":null,"toolSha":null,"toolVersion":"0.1.0-alpha.5","runTimestamp":"2026-09-27T10:03:01Z","inputs":{"features":"feat"},"strict":false},"summary":{"scenarioReconciliations":{"total":1,"balanced":0,"outOfBalance":1,"phantom":0,"suspense":0},"evidenceObligations":{"total":1,"byOutcome":{"satisfied":0,"missing":0,"failing":0,"watermelon":0,"cites-unknown-scenario":0,"cites-no-scenario":0,"no-scn-code":1,"duplicate-scn-code":0,"broken":0,"no-evidence-obligation":0,"both-missing":0},"outOfBalance":1,"missingByQualityCheck":[]},"pending":0,"testVolume":{"totalEvidenceObservations":0,"onScenario":0,"onPhantomScenario":0,"onSuspenseScenario":0},"rawByRuntimeQualityCheck":{"unit":0,"integration":0,"e2e":0,"performance":0},"staticChecks":{"runningStaticCheckCount":0,"uncitedStaticCheckCount":0},"fitness":{"satisfied":0,"total":0}},"ledger":{"scenarioReconciliations":[{"scnId":"a.feature : one","kind":"scenario","verdict":"out-of-balance","evidenceObservations":[],"evidenceObligations":[],"qualityCheckReconciliations":[{"outcome":"no-scn-code","evidenceObligation":{}}],"reconcilingItems":[{"outcome":"no-scn-code","evidenceObligation":{}}],"pendingItems":[]}]},"scenarioCodeErrors":[],"scenarioCodePopulation":{"featureFiles":1,"featureCodes":0},"evidenceObligations":{"excludedOccurrences":0,"untaggedScenarios":[{"feature":"a.feature","scenario":"one"}],"proseOnlyCodes":[]}};

describe("[SCN-CLI-074] a saved file that is not a saved reconciliation is refused, and nothing is rendered", () => {
  it.each([
    [[], "the top level is a list, not an object"],
    ["x", "the top level is a string, not an object"],
    [{ ...SAVED, ledger: undefined }, "ledger is missing"],
    [{ ...SAVED, ledger: "x" }, "ledger is a string, not an object"],
    [{ ...SAVED, ledger: { scenarioReconciliations: {} } }, "ledger.scenarioReconciliations is an object, not a list"],
    [{ ...SAVED, runProvenance: null }, "runProvenance is null, not an object"],
    [{ ...SAVED, scenarioCodeErrors: "x" }, "scenarioCodeErrors is a string, not a list"],
  ])("names where %j departs from a saved reconciliation", (document, fault) => {
    const error = checkSavedReconciliation("saved.json", JSON.stringify(document));

    expect(error).toContain("--render-from-json");
    expect(error).toContain("saved.json");
    expect(error).toContain(fault);
  });

  it("passes a reconciliation this tool saved", () => {
    expect(checkSavedReconciliation("saved.json", JSON.stringify(SAVED))).toBeNull();
  });

  it("refuses, naming the file, a saved reconciliation the renderer cannot read below its top", () => {
    const broken = { ...SAVED, ledger: { scenarioReconciliations: [null] } };
    const rendered = reRenderOrRefusal("saved.json", JSON.stringify(broken), false);

    expect(typeof rendered).toBe("string");
    expect(rendered).toContain("--render-from-json");
    expect(rendered).toContain("saved.json");
  });

  it("renders a reconciliation this tool saved", () => {
    const rendered = reRenderOrRefusal("saved.json", JSON.stringify(SAVED), false);
    expect(typeof rendered).toBe("object");
  });
});
