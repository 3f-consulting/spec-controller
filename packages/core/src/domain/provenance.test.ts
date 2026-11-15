import { describe, expect, it } from "vitest";
import { repositoryOfOrigin } from "../inputs/origin.js";
import { provenanceOf, type Provenance, type ProvenanceInput, type RunIdentity } from "./provenance.js";

describe("the provenance says what the run used", () => {
  it.each([
    ["CLM-EVR-037", "a target given as acme/web", { givenTarget: "acme/web", origin: "https://github.com/other/repo" }, [], { target: "acme/web" }],
    ["CLM-EVR-039", "no target given, and an origin with a user, password, query and fragment", { origin: "https://ci:s3cret@example.com/acme/web?x=1#y" }, [], { target: "acme/web" }],
    ["CLM-EVR-045", "no target given, and an scp-form origin with a user", { origin: "git@github.com:acme/web.git" }, [], { target: "acme/web" }],
    ["CLM-EVR-049", "no target given, and an ssh origin", { origin: "ssh://git@github.com/acme/web.git" }, [], { target: "acme/web" }],
    ["CLM-EVR-050", "no target given, and an scp-form origin with no user", { origin: "github.com:acme/web.git" }, [], { target: "acme/web" }],
    ["CLM-EVR-074", "no target given, and the origin git@github.com:acme/acme.github.io.git", { origin: "git@github.com:acme/acme.github.io.git" }, [], { target: "acme/acme.github.io" }],
    ["CLM-EVR-075", "no target given, and the origin https://gitlab.com/group/sub/web.git", { origin: "https://gitlab.com/group/sub/web.git" }, [], { target: "sub/web" }],
    ["CLM-EVR-047", "no target given, and a local path origin", { origin: "/srv/git/web.git" }, [], { target: "web" }],
    ["CLM-EVR-048", "no target given, and a file origin", { origin: "file:///srv/git/web.git" }, [], { target: "web" }],
    ["CLM-EVR-051", "no target given, and a git origin", { origin: "git://example.com/acme/web.git" }, [], { target: "unknown-target" }],
    ["CLM-EVR-052", "no target given, and an origin with no owner and repository in its path", { origin: "https://example.com/web" }, [], { target: "unknown-target" }],
    ["CLM-EVR-071", "no target given, and an origin no form of origin reads", { origin: "foo" }, [], { target: "unknown-target" }],
    ["CLM-EVR-071", "no target given, and the origin /, a local path with no segment", { origin: "/" }, [], { target: "unknown-target" }],
    ["CLM-EVR-071", "no target given, and the origin file:///, a file URL with no segment", { origin: "file:///" }, [], { target: "unknown-target" }],
    ["CLM-EVR-038", "a source SHA given, in a git repository at another commit", { givenSourceSha: "abc1234", head: "def5678" }, [], { sourceSha: "abc1234" }],
    ["CLM-EVR-040", "the tool running from its own checkout", { toolSha: "9f8e7d6", toolVersion: "0.0.0" }, [], { toolSha: "9f8e7d6" }],
    ["CLM-EVR-041", "the tool installed as a package", { toolVersion: "0.1.256" }, [], { toolSha: undefined, toolVersion: "0.1.256" }],
    ["CLM-EVR-046", "the tool copied in, its nearest package.json with no version", {}, [], { toolSha: undefined, toolVersion: "unknown" }],
    ["CLM-EVR-042", "a Cucumber evidence report given", {}, [{ name: "cucumber", path: "cucumber.json" }], { inputs: [{ name: "cucumber", path: "cucumber.json" }] }],
    ["CLM-EVR-043", "no Cucumber evidence report given", {}, [{ name: "cucumber" }], { inputs: [{ name: "cucumber" }] }],
    ["CLM-EVR-044", "an input inside the target's folder", {}, [{ name: "vitest", path: "/work/acme/a.json" }], { inputs: [{ name: "vitest", path: "a.json" }] }],
    ["CLM-EVR-053", "a start at 2026-11-12T07:08:14Z", { runTime: "2026-11-12T07:08:14Z" }, [], { runTime: "2026-11-12T07:08:14Z" }],
  ] as const satisfies readonly (readonly [string, string, Partial<RunIdentity>, readonly ProvenanceInput[], Partial<Provenance>])[])(
    "[%s] a run that had %s has what it used in the provenance",
    (_clm, _had, identity, inputs, details) => {
      const provenance = provenanceOf({ runTime: "2026-01-01T00:00:00Z", ...identity }, inputs, "/work/acme", repositoryOfOrigin);

      expect(Object.fromEntries(Object.keys(details).flatMap((detail) => (detail in provenance ? [[detail, provenance[detail as keyof Provenance]]] : [])))).toStrictEqual(
        Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined)),
      );
    },
  );
});
