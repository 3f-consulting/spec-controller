/**
 * Unit tests for the running-guard observer (src/ingest/ciGuards.ts) —
 * `runningStaticChecks` emits a GuardEvidenceObservation per running CI guard. The evidence-obligation
 * observer (`checkStaticEvidenceObligations`) is pinned in src/ingest/guard.test.ts; the shared CI-parse primitive both
 * use lives in src/ingest/ciCommands.ts. reconcile's folding of a no-evidence-obligation running static check onto
 * the suspense row is pinned in src/domain/evidenceReconciliation.test.ts.
 *
 * Parent: @SCN-USG-001 (the uncited static-check).
 */

import { describe, it, expect } from "vitest";
import { runningStaticChecks } from "./runningStaticChecks.js";
import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";

// The guard-prefix set is SET at the CLI edge (ingest/ingestQualityChecks.ts) and
// injected into the pure function. These tests inject the portfolio default explicitly.
const DEFAULT_PREFIXES = ["lint:", "guard:"] as const;

describe("[SCN-USG-001] runningStaticChecks — the running-guard observer (emits a GuardEvidenceObservation per running CI guard)", () => {
  const usgPkg: PackageJsonScripts = {
    scripts: {
      "lint:foo": "echo foo",
      "lint:bar": "echo bar",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const usgCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm install --frozen-lockfile",
    "      - run: pnpm lint:foo",
    "      - run: pnpm lint:bar",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  // A running CI static check is emitted as a GuardEvidenceObservation —
  // exists + enforcedOverRealSource are true by construction (a package.json script a CI
  // run: step invokes). The static analogue of the runner emitting a passing test result.
  it("emits a GuardEvidenceObservation for each lint:* script a CI run step invokes (test / cucumber / install excluded)", () => {
    // test + cucumber are the runtime axis's observed evidence; install is not a script.
    expect(runningStaticChecks([usgCi], usgPkg, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("does not emit an observation for a lint:* script that exists but no CI step invokes", () => {
    const withUnwired: PackageJsonScripts = {
      scripts: { ...usgPkg.scripts, "lint:unwired": "echo unwired" },
    };
    expect(runningStaticChecks([usgCi], withUnwired, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

describe("[SCN-USG-003] the runtime axis's own CI steps are not derived as fitness checks", () => {
  const pkg2: PackageJsonScripts = {
    scripts: { "lint:foo": "echo x", test: "vitest run", cucumber: "cucumber-js" },
  };
  const ci2 = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm install --frozen-lockfile",
    "      - run: pnpm lint:foo",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  it("emits observations only for lint:* scripts — test / cucumber / install CI steps are excluded", () => {
    // Only lint:foo is a running fitness check; test + cucumber (the runtime axis's observed
    // evidence) and install (not a script) never enter the observed set.
    expect(runningStaticChecks([ci2], pkg2, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("does not let the citation stamp widen membership — a cited runtime step is still excluded", () => {
    // The observer learned to stamp an @SCN (3F-2568), and the stamp is applied AFTER the
    // membership filter. Reaching for it earlier — or letting "the seam answered for this
    // handle" stand in for membership — would put every CI step this reader can name onto the
    // axis, which is exactly what test and cucumber must never be. citedScn answers for
    // everything here, so the filter's placement is the only thing keeping them out.
    expect(
      runningStaticChecks([ci2], pkg2, DEFAULT_PREFIXES, [], () => ({
        checkTag: "foo",
        scnId: "SCN-TGT-001",
      })).map(
        (o) => o.staticCheck,
      ),
    ).toEqual(["lint:foo"]);
  });
});

describe("[SCN-USG-004] runningStaticChecks observes guard:-prefixed CI scripts as static checks, not just lint:*", () => {
  // an adopter's repository-shaped case: a guard:domain-purity script (guard:*, not lint:*) a CI run: step
  // invokes must be observed as a running static check under the default prefix set, so the
  // reconciler can fold one no fitness scenario cites to the suspense row as an uncited static
  // check. The PREFIX SET is what does the finding, and it is what these arms pin — the spelling
  // `lint` has no privilege here and less claim to one since bare @lint became one style-lint
  // check among many (@SCN-LNT-010).
  // test/cucumber (neither prefix) stay excluded by construction — preserving @SCN-USG-003.
  // `guard:domain-purity` is a script NAME — a value, not vocabulary — so the handle itself
  // is deliberately untouched by the static-check rename (3F-1929; 3F-1852 owns script names).
  const guardPkg: PackageJsonScripts = {
    scripts: {
      "guard:domain-purity": "echo domain-purity",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const guardCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm install --frozen-lockfile",
    "      - run: pnpm guard:domain-purity",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  it("emits a GuardEvidenceObservation for a guard:* script a CI run step invokes", () => {
    expect(runningStaticChecks([guardCi], guardPkg, DEFAULT_PREFIXES)).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "guard:domain-purity",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("carries NO scnId key when the seam is asked and answers nothing — the uncited shape", () => {
    // THE OTHER HALF OF UNCITED, and the only arm here that can see it. Every sibling calls the
    // observer without a seam and reads its result with `toEqual`, so all of them pass against
    // an observation carrying `scnId: undefined` — `toEqual` treats an undefined-valued key as
    // absent. The source refuses that shape deliberately (`...(scnId !== null ? { scnId } : {})`
    // rather than `scnId: scnId ?? undefined`, so an uncited observation's JSON stays
    // byte-identical), and until this arm nothing held it to the refusal: swapping the spread for
    // the coalesce reds this test and leaves its fifteen siblings green (measured, 3F-2579).
    //
    // Asked-and-answered-nothing is the fixture's registered-but-uncarried target reduced to one
    // function: the registry resolves a bare check for the handle and the corpus carries it
    // nowhere. What the observer must NOT do is fill the gap from the handle it already has.
    const observed = runningStaticChecks([guardCi], guardPkg, DEFAULT_PREFIXES, [], () => null);

    expect(observed).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "guard:domain-purity",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
    expect(observed[0]).not.toHaveProperty("scnId");
  });

  it("observes both lint:* and guard:* running scripts together, still excluding test/cucumber", () => {
    const mixedPkg: PackageJsonScripts = {
      scripts: {
        "lint:foo": "echo foo",
        "guard:domain-purity": "echo dp",
        test: "vitest run",
        cucumber: "cucumber-js",
      },
    };
    const mixedCi = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - run: pnpm lint:foo",
      "      - run: pnpm guard:domain-purity",
      "      - run: pnpm test",
      "      - run: pnpm cucumber",
    ].join("\n");
    expect(runningStaticChecks([mixedCi], mixedPkg, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "guard:domain-purity", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

describe("[SCN-USG-007] a static check running in ANY of a target's workflows is observed", () => {
  // A pipeline split across files is ordinary — a slow sweep moved off the per-push
  // ladder, a security scan on its own trigger. The observer reads a LIST of sources
  // for exactly that reason; reading one document would let a check leave the books by
  // being written down somewhere else, which since 3F-2306 is a way to make a red go
  // away without fixing anything.
  const pkg: PackageJsonScripts = {
    scripts: { "lint:sweep": "echo sweep", test: "vitest run" },
  };
  const ci = ["jobs:", "  ci:", "    steps:", "      - run: pnpm test"].join("\n");
  const nightly = [
    "jobs:",
    "  nightly:",
    "    steps:",
    "      - run: pnpm lint:sweep",
  ].join("\n");

  it("emits the check invoked by the SECOND source, which reading the first alone would miss", () => {
    expect(runningStaticChecks([ci, nightly], pkg, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("emits it exactly once when more than one workflow invokes it", () => {
    // The observation is per CHECK, not per invocation: a check wired into both the
    // per-push and the nightly pipeline is one running check, and counting it twice
    // would inflate the running tally the report prints.
    expect(runningStaticChecks([nightly, nightly], pkg, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("keeps a malformed workflow from discarding the commands of the ones beside it", () => {
    // Parse tolerance is PER SOURCE. Joining the sources before parsing would let one
    // unparseable file hide every other file's checks — a wider watermelon-hiding
    // surface than the one the fail-safe parse was built to keep narrow.
    const malformed = "jobs:\n  - this: [is not\n    valid yaml";

    expect(runningStaticChecks([malformed, nightly], pkg, DEFAULT_PREFIXES)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

/**
 * @SCN-USG-009 (@unit) — the CONFIGURED static check. The prefix set is a discovery
 * heuristic, never a definition: a target names the scripts its own convention missed,
 * and the observer finds them exactly as it finds a prefixed one.
 *
 * Bidirectional back-reference: grepping `SCN-USG-009` returns this block AND the
 * features/uncited-static-checks.feature scenario.
 */
describe("[SCN-USG-009] runningStaticChecks observes a script the target CONFIGURES a static check", () => {
  const pkg: PackageJsonScripts = {
    scripts: {
      typecheck: "tsc --noEmit",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const ci = [
    "jobs:\n  ci:\n    steps:\n      - run: pnpm typecheck\n      - run: pnpm test\n",
  ];

  it("finds a configured script no prefix recognises", () => {
    expect(runningStaticChecks(ci, pkg, DEFAULT_PREFIXES, ["typecheck"])).toEqual([
      { qualityCheck: "lint", staticCheck: "typecheck", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("finds nothing without the configuration — the false negative this closes", () => {
    // The state of the world before 3F-2495: `tsc --noEmit` reds the build on a violation
    // and is static analysis by any reading, and the observer cannot see it, because it is
    // not called lint:typecheck. Silence, not a verdict.
    expect(runningStaticChecks(ci, pkg, DEFAULT_PREFIXES)).toEqual([]);
  });

  it("EXTENDS the prefixes rather than replacing them", () => {
    // Config extends, never replaces (the resolveDeferralTags contract): a configuration
    // cannot un-recognise a check the convention already found.
    const both: PackageJsonScripts = {
      scripts: { ...pkg.scripts, "lint:foo": "echo foo" },
    };
    const ciBoth = ["jobs:\n  ci:\n    steps:\n      - run: pnpm typecheck\n      - run: pnpm lint:foo\n"];

    expect(runningStaticChecks(ciBoth, both, DEFAULT_PREFIXES, ["typecheck"]).map((o) => o.staticCheck))
      .toEqual(["lint:foo", "typecheck"]);
  });

  it("still requires the check to RUN in CI — the manifest is not the source", () => {
    // A configured script CI does not run is not a gate. Without this, configuring a helper
    // would red a repository for owning it — the call deriveLocalLadder already makes.
    const ciWithout = ["jobs:\n  ci:\n    steps:\n      - run: pnpm test\n"];

    expect(runningStaticChecks(ciWithout, pkg, DEFAULT_PREFIXES, ["typecheck"])).toEqual([]);
  });

  it("ignores a configuration naming a script the manifest does not define", () => {
    expect(runningStaticChecks(ci, pkg, DEFAULT_PREFIXES, ["nonexistent"])).toEqual([]);
  });

  it("emits a configured check exactly once even if it is also prefix-recognised", () => {
    // Belt and braces against the double-count @SCN-USG-010 guards one layer up: a target
    // that both names a lint: script AND configures it must not get two observations.
    const pkgPrefixed: PackageJsonScripts = { scripts: { "lint:foo": "echo foo" } };
    const ciPrefixed = ["jobs:\n  ci:\n    steps:\n      - run: pnpm lint:foo\n"];

    expect(runningStaticChecks(ciPrefixed, pkgPrefixed, DEFAULT_PREFIXES, ["lint:foo"])).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });
});
