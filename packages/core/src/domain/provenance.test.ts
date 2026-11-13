import { describe, expect, it } from "vitest";
import { repositoryOfOrigin } from "../inputs/origin.js";
import { provenanceOf, type Provenance, type ProvenanceInput, type RunIdentity } from "./provenance.js";

describe("the provenance describes the run", () => {
  it.each([
    ["CLM-EVR-037", "a target given as acme/web", { givenTarget: "acme/web", origin: "https://github.com/other/repo" }, [], { target: "acme/web" }],
    ["CLM-EVR-039", "no target given, and an origin with a user, password, query and fragment", { origin: "https://ci:s3cret@example.com/acme/web?x=1#y" }, [], { target: "acme/web" }],
    ["CLM-EVR-045", "no target given, and an scp-form origin with a user", { origin: "git@github.com:acme/web.git" }, [], { target: "acme/web" }],
    ["CLM-EVR-049", "no target given, and an ssh origin", { origin: "ssh://git@github.com/acme/web.git" }, [], { target: "acme/web" }],
    ["CLM-EVR-050", "no target given, and an scp-form origin with no user", { origin: "github.com:acme/web.git" }, [], { target: "acme/web" }],
    ["CLM-EVR-047", "no target given, and a local path origin", { origin: "/srv/git/web.git" }, [], { target: "web" }],
    ["CLM-EVR-048", "no target given, and a file origin", { origin: "file:///srv/git/web.git" }, [], { target: "web" }],
    ["CLM-EVR-051", "no target given, and a git origin", { origin: "git://example.com/acme/web.git" }, [], { target: "unknown-target" }],
    ["CLM-EVR-052", "no target given, and an origin with no owner and repository in its path", { origin: "https://example.com/web" }, [], { target: "unknown-target" }],
    ["CLM-EVR-071", "no target given, and an origin no form of origin reads", { origin: "foo" }, [], { target: "unknown-target" }],
    ["CLM-EVR-038", "a source SHA given, in a git repository at another commit", { givenSourceSha: "abc1234", head: "def5678" }, [], { sourceSha: "abc1234" }],
    ["CLM-EVR-040", "the tool running from its own checkout", { toolSha: "9f8e7d6", toolVersion: "0.0.0" }, [], { toolSha: "9f8e7d6" }],
    ["CLM-EVR-041", "the tool installed as a package", { toolSha: "1a2b3c4", toolInstalledAsPackage: true, toolVersion: "0.1.256" }, [], { toolSha: undefined, toolVersion: "0.1.256" }],
    ["CLM-EVR-046", "the tool copied in, its nearest package.json with no version", {}, [], { toolSha: undefined, toolVersion: "unknown" }],
    ["CLM-EVR-042", "a Cucumber evidence report given", {}, [{ name: "cucumber", path: "cucumber.json" }], { inputs: [{ name: "cucumber", path: "cucumber.json" }] }],
    ["CLM-EVR-043", "no Cucumber evidence report given", {}, [{ name: "cucumber" }], { inputs: [{ name: "cucumber" }] }],
    ["CLM-EVR-044", "an input inside the target's folder", {}, [{ name: "vitest", path: "/work/acme/a.json" }], { inputs: [{ name: "vitest", path: "a.json" }] }],
    ["CLM-EVR-053", "a start at 2026-11-12T07:08:14Z", { runTime: "2026-11-12T07:08:14Z" }, [], { runTime: "2026-11-12T07:08:14Z" }],
  ] as const satisfies readonly (readonly [string, string, Partial<RunIdentity>, readonly ProvenanceInput[], Partial<Provenance>])[])(
    "[%s] a run that had %s has the provenance it describes",
    (_clm, _had, identity, inputs, details) => {
      const provenance = provenanceOf({ toolInstalledAsPackage: false, runTime: "2026-01-01T00:00:00Z", ...identity }, inputs, "/work/acme", repositoryOfOrigin);

      expect(Object.fromEntries(Object.keys(details).map((detail) => [detail, provenance[detail as keyof Provenance]]))).toEqual(details);
    },
  );
});
