import { describe, expect, it } from "vitest";
import originVariants from "../inputs/origin.variants.json" with { type: "json" };
import { repositoryOfOrigin } from "../inputs/origin.js";
import { provenanceOf, type Provenance, type ProvenanceInput, type RunIdentity } from "./provenance.js";

// The details named, as the provenance of a run in /work/acme with that identity and those inputs has them.
function detailsOfRun(identity: Partial<RunIdentity>, inputs: readonly ProvenanceInput[], details: Partial<Provenance>): Partial<Provenance> {
  const provenance = provenanceOf({ toolInstalledAsPackage: false, runTime: "2026-01-01T00:00:00Z", ...identity }, inputs, "/work/acme", repositoryOfOrigin);
  return Object.fromEntries(Object.keys(details).flatMap((detail) => (detail in provenance ? [[detail, provenance[detail as keyof Provenance]]] : [])));
}

const asWritten = (details: Partial<Provenance>): Partial<Provenance> => Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined));

type Row = readonly [string, string, Partial<RunIdentity>, readonly ProvenanceInput[], Partial<Provenance>];

const expectProvenance = (_clm: string, _had: string, identity: Partial<RunIdentity>, inputs: readonly ProvenanceInput[], details: Partial<Provenance>) => {
  expect(detailsOfRun(identity, inputs, details)).toStrictEqual(asWritten(details));
};

// The origins each variant stands for, and the target each gives.
const ORIGINS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  "https with a user, password, query or fragment": [["https://ci:s3cret@example.com/acme/web?x=1#y", "acme/web"]],
  "scp form (`git@host:owner/repo.git`)": [["git@github.com:acme/web.git", "acme/web"]],
  ssh: [["ssh://git@github.com/acme/web.git", "acme/web"]],
  "`host:owner/repo.git`": [["github.com:acme/web.git", "acme/web"]],
  "a repository named `owner.github.io`": [["git@github.com:acme/acme.github.io.git", "acme/acme.github.io"]],
  "a GitLab subgroup (`group/sub/web` gives `sub/web`)": [["https://gitlab.com/group/sub/web.git", "sub/web"]],
  "a path": [["/srv/git/web.git", "web"]],
  "a `file://` URL": [["file:///srv/git/web.git", "web"]],
  "one with no owner and repository in its path": [["https://example.com/web", "unknown-target"]],
  "`git://`": [["git://example.com/acme/web.git", "unknown-target"]],
  "a form no reader knows such as `foo`": [
    ["foo", "unknown-target"],
    [":https://github.com/acme/web.git", "unknown-target"],
    ["github.com:acme/web.git\n", "unknown-target"],
  ],
  "`/`": [["/", "unknown-target"]],
  "`file:///`": [["file:///", "unknown-target"]],
};

// The targets the origins a variant stands for give, beside the targets the variant names for them.
function targetsOf(variant: string): { readonly given: readonly string[]; readonly named: readonly string[] } {
  const origins = ORIGINS[variant];
  if (origins === undefined) throw new Error(`no origin for the variant ${variant}`);
  return { given: origins.map(([origin]) => detailsOfRun({ origin }, [], { target: "" }).target!), named: origins.map(([, target]) => target) };
}

describe("the target will be the one given, else the origin's owner and repository, else unknown-target", () => {
  it.each([
    ["CLM-EVR-037", "a target given as acme/web", { givenTarget: "acme/web", origin: "https://github.com/other/repo" }, [], { target: "acme/web" }],
    ["CLM-EVR-077", "no target given, and no origin", {}, [], { target: "unknown-target" }],
  ] as const satisfies readonly Row[])("[%s] a run that had %s will have its target in the provenance", expectProvenance);

  it.each(originVariants["CLM-EVR-039"].variants)("[CLM-EVR-039] a run that had no target given, and an origin by %s will have the target owner/repo from its path", (variant) => {
    const { given, named } = targetsOf(variant);

    expect(given).toEqual(named);
  });

  it.each(originVariants["CLM-EVR-047"].variants)("[CLM-EVR-047] a run that had no target given, and a local origin by %s will have the target its base name", (variant) => {
    const { given, named } = targetsOf(variant);

    expect(given).toEqual(named);
  });

  it.each(originVariants["CLM-EVR-052"].variants)("[CLM-EVR-052] a run that had no target given, and an origin that is %s will have the target unknown-target", (variant) => {
    const { given, named } = targetsOf(variant);

    expect(given).toEqual(named);
  });
});

describe("the source SHA will be the one given, else HEAD, else unknown", () => {
  it.each([
    ["CLM-EVR-038", "a source SHA given as abc1234, in a git repository at def5678", { givenSourceSha: "abc1234", head: "def5678" }, [], { sourceSha: "abc1234" }],
    ["CLM-EVR-078", "no source SHA given, in a git repository at def5678", { head: "def5678" }, [], { sourceSha: "def5678" }],
    ["CLM-EVR-079", "no source SHA given, in no git repository", {}, [], { sourceSha: "unknown" }],
  ] as const satisfies readonly Row[])("[%s] a run that had %s will have its source SHA in the provenance", expectProvenance);
});

describe("the tool will be its commit when it runs from its checkout, else its version", () => {
  it.each([
    ["CLM-EVR-040", "the tool running from its own checkout at 9f8e7d6", { toolSha: "9f8e7d6", toolVersion: "0.0.0" }, [], { toolSha: "9f8e7d6" }],
    ["CLM-EVR-041", "the tool installed as a package, version 0.1.256", { toolSha: "1a2b3c4", toolInstalledAsPackage: true, toolVersion: "0.1.256" }, [], { toolSha: undefined, toolVersion: "0.1.256" }],
    ["CLM-EVR-046", "the tool copied in, its nearest package.json with no version", {}, [], { toolSha: undefined, toolVersion: "unknown" }],
  ] as const satisfies readonly Row[])("[%s] a run that had %s will have its tool in the provenance", expectProvenance);
});

describe("the inputs will list each input read, given or by default, name each one not given as absent, and show a path inside the target relative to it", () => {
  it.each([
    ["CLM-EVR-080", "the CI workflows, read by default", {}, [{ name: "workflows", path: "/work/acme/.github/workflows" }], { inputs: [{ name: "workflows", path: ".github/workflows" }] }],
    ["CLM-EVR-042", "a Cucumber evidence report given", {}, [{ name: "cucumber", path: "cucumber.json" }], { inputs: [{ name: "cucumber", path: "cucumber.json" }] }],
    ["CLM-EVR-043", "no Cucumber evidence report given", {}, [{ name: "cucumber" }], { inputs: [{ name: "cucumber" }] }],
    ["CLM-EVR-044", "an input at /work/acme/a.json, for a target at /work/acme", {}, [{ name: "vitest", path: "/work/acme/a.json" }], { inputs: [{ name: "vitest", path: "a.json" }] }],
  ] as const satisfies readonly Row[])("[%s] a run that had %s will have its inputs in the provenance", expectProvenance);
});

describe("the provenance will have the time the run started", () => {
  it("[CLM-EVR-053] a run that started at 2026-11-12T07:08:14Z will have the run's time 2026-11-12T07:08:14Z", () => {
    expect(detailsOfRun({ runTime: "2026-11-12T07:08:14Z" }, [], { runTime: "" })).toStrictEqual({ runTime: "2026-11-12T07:08:14Z" });
  });
});
