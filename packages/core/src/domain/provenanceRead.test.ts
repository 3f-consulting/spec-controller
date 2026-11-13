import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../../../spec-controller/src/commands/main.js";
import { folderForTest, repositoryForTest, type TestFolder } from "../../../spec-controller/src/repository/repository.test-utils.js";
import { runIdentityIn, toolIdentityIn } from "../../../spec-controller/src/runIdentity/runIdentity.js";
import { repositoryOfOrigin } from "../inputs/origin.js";
import { provenanceOf, type Provenance } from "./provenance.js";

// The provenance of the JSON report balance writes, run in the folder with nothing named but the format and what is given.
function provenanceIn(folder: string, ...args: string[]): Provenance {
  let report = "";
  main(["balance", "--format", "json", ...args], folder, { output: { fd: 1, write: (text) => (report += text) }, error: { fd: 2, write: () => {} } });
  return (JSON.parse(report) as { provenance: Provenance }).provenance;
}

// The tool's SHA and version the provenance gives, for the tool running from the folder at that path under the top.
function toolIn(top: TestFolder, toolPath: string): Pick<Provenance, "toolSha" | "toolVersion"> {
  const toolFolder = join(realpathSync(top.top), toolPath);
  mkdirSync(toolFolder, { recursive: true });
  const { toolSha, toolVersion } = provenanceOf({ ...toolIdentityIn(toolFolder), runTime: "2026-11-12T07:08:14Z" }, [], top.top, repositoryOfOrigin);
  return { toolSha, toolVersion };
}

describe("the provenance describes the run, as balance reads it", () => {
  it("[CLM-EVR-037] a target given as acme/web: the provenance has the target acme/web", () => {
    expect(provenanceIn(folderForTest().top, "--target", "acme/web").target).toBe("acme/web");
  });

  it("[CLM-EVR-038] a source SHA given as abc1234, in a git repository at another commit: the provenance has the source SHA abc1234", () => {
    const repository = repositoryForTest();
    repository.commit("one");

    expect(provenanceIn(repository.top, "--source-sha", "abc1234").sourceSha).toBe("abc1234");
  });

  it.each([
    ["CLM-EVR-045", "git@github.com:acme/web.git", "acme/web"],
    ["CLM-EVR-039", "https://ci:s3cret@example.com/acme/web?x=1#y", "acme/web"],
    ["CLM-EVR-071", "foo", "unknown-target"],
  ] as const)("[%s] no target given, and the origin %s: the provenance has the target %s", (_clm, origin, target) => {
    const repository = repositoryForTest();
    repository.git("remote", "add", "origin", origin);

    expect(provenanceIn(repository.top).target).toBe(target);
  });

  it.each([
    ["CLM-EVR-042", "a Cucumber evidence report given", ["--cucumber", "cucumber.json"], { name: "cucumber", path: "cucumber.json" }],
    ["CLM-EVR-043", "no Cucumber evidence report given", [], { name: "cucumber" }],
  ] as const)("[%s] %s: the provenance names that report among the inputs", (_clm, _given, args, named) => {
    const folder = folderForTest().top;
    writeFileSync(join(folder, "cucumber.json"), "[]");

    expect(provenanceIn(folder, ...args).inputs.filter(({ name }) => name === "cucumber")).toEqual([named]);
  });

  it("[CLM-EVR-040] the tool running from its own checkout at a commit: the provenance has that commit as the tool SHA", () => {
    const checkout = repositoryForTest();
    checkout.write("packages/spec-controller/package.json", '{"name":"spec-controller","version":"0.1.0"}');
    checkout.write("packages/spec-controller/dist/cli.js", "");
    const head = checkout.commit("the tool");

    expect(toolIn(checkout, "packages/spec-controller/dist")).toEqual({ toolSha: head, toolVersion: "0.1.0" });
  });

  it("[CLM-EVR-041] the tool installed as a package, version 0.1.256: the provenance has no tool SHA, and version 0.1.256", () => {
    const project = folderForTest();
    project.write("node_modules/@3f-consulting/spec-controller/package.json", '{"name":"@3f-consulting/spec-controller","version":"0.1.256"}');

    expect(toolIn(project, "node_modules/@3f-consulting/spec-controller/dist")).toEqual({ toolSha: undefined, toolVersion: "0.1.256" });
  });

  it("[CLM-EVR-041] the tool installed as a package, version 0.1.256, under its own checkout's package: the provenance has no tool SHA, and version 0.1.256", () => {
    const checkout = repositoryForTest();
    checkout.write("packages/spec-controller/package.json", '{"name":"spec-controller","version":"0.1.0"}');
    checkout.write("packages/spec-controller/node_modules/@3f-consulting/spec-controller/package.json", '{"name":"@3f-consulting/spec-controller","version":"0.1.256"}');
    checkout.commit("the tool");

    expect(toolIn(checkout, "packages/spec-controller/node_modules/@3f-consulting/spec-controller/dist")).toEqual({ toolSha: undefined, toolVersion: "0.1.256" });
  });

  it.each([
    ["into another repository's vendor folder", "vendor/spec-controller/dist", {}],
    ["into another repository's packages folder", "packages/tools/spec-controller/dist", {}],
    ["beside a package.json whose version is not a string", "vendor/spec-controller/dist", { version: 1 }],
  ] as const)("[CLM-EVR-046] the tool copied in %s, its nearest package.json with no version: the provenance has no tool SHA, and version unknown", (_where, toolPath, manifest) => {
    const host = repositoryForTest();
    host.write("package.json", JSON.stringify({ name: "host", ...manifest }));
    host.commit("the host");

    expect(toolIn(host, toolPath)).toEqual({ toolSha: undefined, toolVersion: "unknown" });
  });

  it("[CLM-EVR-046] the tool copied in, with no package.json above it: the provenance has no tool SHA, and version unknown", () => {
    expect(toolIn(folderForTest(), "spec-controller/dist")).toEqual({ toolSha: undefined, toolVersion: "unknown" });
  });

  describe("the run's time", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("[CLM-EVR-053] a run that started at 2026-11-12T07:08:14Z: the provenance has the run's time 2026-11-12T07:08:14Z", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-12T07:08:14.567Z"));
      const folder = folderForTest();

      expect(provenanceOf(runIdentityIn(folder.top, {}), [], folder.top, repositoryOfOrigin).runTime).toBe("2026-11-12T07:08:14Z");
    });
  });
});
