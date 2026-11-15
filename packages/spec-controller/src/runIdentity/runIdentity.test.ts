import { provenanceOf, repositoryOfOrigin } from "@3f-consulting/spec-controller-core";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { folderForTest, repositoryForTest, type TestFolder, type TestRepository } from "../repository/repository.test-utils.js";
import { runIdentityIn } from "./runIdentity.js";

type Provenance = ReturnType<typeof provenanceOf>;

// The provenance of a run in the repository, as the real adapter reads it and the domain describes it.
function provenanceIn(repository: TestFolder, given: { readonly target?: string; readonly sourceSha?: string } = {}, toolFolder?: string): Provenance {
  return provenanceOf(runIdentityIn(repository.top, given, toolFolder), [], repository.top, repositoryOfOrigin);
}

// The details the row names, as the provenance has them; a detail the row gives as undefined is one it does not have.
function detailsOf(provenance: Provenance, details: Partial<Provenance>): Partial<Provenance> {
  return Object.fromEntries(Object.keys(details).flatMap((detail) => (detail in provenance ? [[detail, provenance[detail as keyof Provenance]]] : [])));
}

const asWritten = (details: Partial<Provenance>): Partial<Provenance> => Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined));

// A repository whose origin is the given one, at its first commit.
function repositoryWithOrigin(origin: string): TestFolder {
  const repository = repositoryForTest();
  repository.git("remote", "add", "origin", origin);
  repository.commit("first");
  return repository;
}

describe("the provenance describes the run, as the run's repository and the tool's folder give it", () => {
  it.each([
    ["CLM-EVR-039", "https://ci:s3cret@example.com/acme/web?x=1#y", "acme/web"],
    ["CLM-EVR-045", "git@github.com:acme/web.git", "acme/web"],
    ["CLM-EVR-049", "ssh://git@github.com/acme/web.git", "acme/web"],
    ["CLM-EVR-050", "github.com:acme/web.git", "acme/web"],
    ["CLM-EVR-074", "git@github.com:acme/acme.github.io.git", "acme/acme.github.io"],
    ["CLM-EVR-075", "https://gitlab.com/group/sub/web.git", "sub/web"],
    ["CLM-EVR-047", "/srv/git/web.git", "web"],
    ["CLM-EVR-048", "file:///srv/git/web.git", "web"],
    ["CLM-EVR-051", "git://example.com/acme/web.git", "unknown-target"],
    ["CLM-EVR-052", "https://example.com/web", "unknown-target"],
    ["CLM-EVR-071", "foo", "unknown-target"],
  ] as const)("[%s] no target given, and a repository whose origin is %s: the target is %s", (_clm, origin, target) => {
    expect(provenanceIn(repositoryWithOrigin(origin)).target).toBe(target);
  });

  it("[CLM-EVR-037] a target given as acme/web, in a repository whose origin is another: the target is acme/web", () => {
    expect(provenanceIn(repositoryWithOrigin("https://github.com/other/repo"), { target: "acme/web" }).target).toBe("acme/web");
  });

  it("[CLM-EVR-038] a source SHA given as abc1234, in a git repository at another commit: the source SHA is abc1234", () => {
    expect(provenanceIn(repositoryWithOrigin("https://github.com/acme/web"), { sourceSha: "abc1234" }).sourceSha).toBe("abc1234");
  });

  it("[CLM-EVR-053] a run that started at 2026-11-12T07:08:14.999Z: the run's time is 2026-11-12T07:08:14Z", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    vi.setSystemTime(new Date("2026-11-12T07:08:14.999Z"));

    expect(provenanceIn(repositoryWithOrigin("https://github.com/acme/web")).runTime).toBe("2026-11-12T07:08:14Z");
  });

  it.each([
    [
      "CLM-EVR-040",
      "from its own checkout",
      repositoryForTest,
      { "packages/spec-controller/package.json": '{"version":"0.0.0"}', "packages/spec-controller/dist/cli.js": "" },
      "packages/spec-controller/dist",
      (head: string) => ({ toolSha: head }),
    ],
    [
      "CLM-EVR-041",
      "installed as a package, version 0.1.256, in a checkout of its own",
      repositoryForTest,
      { "packages/spec-controller/node_modules/@3f-consulting/spec-controller/package.json": '{"version":"0.1.256"}', "packages/spec-controller/node_modules/@3f-consulting/spec-controller/dist/cli.js": "" },
      "packages/spec-controller/node_modules/@3f-consulting/spec-controller/dist",
      () => ({ toolSha: undefined, toolVersion: "0.1.256" }),
    ],
    [
      "CLM-EVR-046",
      "copied into another repository's packages folder, its nearest package.json with no version",
      repositoryForTest,
      { "packages/vendor/spec-controller/package.json": "{}", "packages/vendor/spec-controller/dist/cli.js": "" },
      "packages/vendor/spec-controller/dist",
      () => ({ toolSha: undefined, toolVersion: "unknown" }),
    ],
    [
      "CLM-EVR-046",
      "copied into a folder outside any repository, its nearest package.json with no version",
      folderForTest,
      { "tools/spec-controller/package.json": "{}", "tools/spec-controller/dist/cli.js": "" },
      "tools/spec-controller/dist",
      () => ({ toolSha: undefined, toolVersion: "unknown" }),
    ],
    [
      "CLM-EVR-046",
      "copied into a folder outside any repository, with no package.json above it",
      folderForTest,
      { "tools/dist/cli.js": "" },
      "tools/dist",
      () => ({ toolSha: undefined, toolVersion: "unknown" }),
    ],
  ] as const)("[%s] the tool running %s has the provenance it describes", (_clm, _running, folderMade, files, toolPath, details) => {
    const folder: TestFolder & Partial<Pick<TestRepository, "commit">> = folderMade();
    Object.entries(files).forEach(([path, text]) => folder.write(path, text));
    const head = folder.commit?.("first") ?? "";

    const provenance = provenanceIn(folder, {}, join(realpathSync(folder.top), toolPath));

    expect(detailsOf(provenance, details(head))).toStrictEqual(asWritten(details(head)));
  });
});
