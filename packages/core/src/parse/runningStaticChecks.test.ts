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
import { recognisedRunners, runningStaticChecks } from "./runningStaticChecks.js";
import { resolveRunners } from "./targetManifest.js";
import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";

// THE MEMBERSHIP ARGUMENT — the target's declared behavioural runners, which is what the observed
// prefix set used to be (@SCN-USG-004, 3F-3343). A target that has named none has every step of
// its pipeline reported as a candidate, so a fixture whose CI runs a suite has to say so or the
// arm is asserting over a `new-client` report rather than over the case it is about.
const NO_RUNNERS: Readonly<Record<string, string | null>> = {};
const SUITE_RUNNERS: Readonly<Record<string, string | null>> = {
  unit: "vitest",
  integration: "cucumber-js",
};

describe("[SCN-USG-001] runningStaticChecks — the running-guard observer (emits a GuardEvidenceObservation per running CI guard)", () => {
  const usgPkg: PackageJsonScripts = {
    scripts: {
      "lint:foo": "echo foo",
      "lint:bar": "echo bar",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  // THE PIPELINE IS ITS TWO CHECKS AND ITS TWO SUITES, and no plumbing. Under the inverted
  // membership rule (@SCN-USG-004) a plumbing step is a candidate like any other and leaves by
  // `notChecks`; keeping the install step here would put a third row in every assertion below and
  // make this scenario about a disposition that is @SCN-USG-015's.
  const usgCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm lint:foo",
    "      - run: pnpm lint:bar",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  // A running CI static check is emitted as a GuardEvidenceObservation —
  // exists + enforcedOverRealSource are true by construction (a step the pipeline runs). The
  // static analogue of the runner emitting a passing test result.
  it("emits a GuardEvidenceObservation for each check step a CI run step invokes (test / cucumber excluded)", () => {
    // test + cucumber are the runtime axis's observed evidence, and what keeps them off this axis
    // is the runner block this target names — not anything about how they are spelled.
    expect(runningStaticChecks([usgCi], usgPkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("does not emit an observation for a script that exists but no CI step invokes", () => {
    const withUnwired: PackageJsonScripts = {
      scripts: { ...usgPkg.scripts, "lint:unwired": "echo unwired" },
    };
    expect(runningStaticChecks([usgCi], withUnwired, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

describe("[SCN-USG-003] test and cucumber CI steps are not candidate fitness checks, because the manifest names their runners", () => {
  // ONE MANIFEST, READ BY BOTH HALVES OF THE SCENARIO. The observer takes the scripts; the
  // recognition takes the runner block the SAME manifest carries. Two fixture objects would let
  // the premise this scenario now rests on drift away from the target the claim is asserted over,
  // and the claim would go on passing over a target that names no runner at all — which is
  // precisely the shape this Update exists to stop being possible.
  const manifest = {
    scripts: { "lint:foo": "echo x", test: "vitest run", cucumber: "cucumber-js" },
    specController: { runners: { unit: "vitest", integration: "cucumber-js" } },
  };
  const pkg2: PackageJsonScripts = { scripts: manifest.scripts };
  const ci2 = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm lint:foo",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  it("names a runner for each suite its CI runs — the Given, read rather than assumed", () => {
    // THE PREMISE, ASSERTED THROUGH THE PRODUCT'S OWN READERS. The Given says this target's
    // manifest names the unit and integration runners its test and cucumber scripts run; an
    // unasserted Given is a sentence, and a claim resting on one rests on nothing. Not a second
    // copy of @SCN-USG-011: that scenario pins what recognition IS (the manifest hop, the depth
    // bound, the loop, the command position) over fixtures built to exercise each; this arm asks
    // only whether THIS target is the target the Given describes.
    const { tiers } = resolveRunners(manifest);
    expect(recognisedRunners([ci2], pkg2, tiers)).toEqual([
      { tier: "unit", runner: "vitest", step: "pnpm test" },
      { tier: "integration", runner: "cucumber-js", step: "pnpm cucumber" },
    ]);
  });

  it("emits an observation for the check step alone — the two runner steps are excluded", () => {
    // Only lint:foo is a running fitness check; test + cucumber — the two steps the arm above
    // recognises as this target's runners — never enter the observed set. WHAT KEEPS THEM OUT IS
    // THE RUNNER BLOCK, which since @SCN-USG-004 is the membership rule itself: pass NO_RUNNERS
    // here and all three steps are candidates, which is the `new-client` report and is exactly
    // what this scenario says a target naming its runners does not get.
    expect(runningStaticChecks([ci2], pkg2, resolveRunners(manifest).tiers)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("does not let the citation stamp widen membership — a cited runner step is still excluded", () => {
    // The observer learned to stamp an @SCN (3F-2568), and the stamp is applied AFTER the
    // membership filter. Reaching for it earlier — or letting "the seam answered for this
    // handle" stand in for membership — would put every CI step this reader can name onto the
    // axis, which is exactly what test and cucumber must never be. citedScn answers for
    // everything here, so the filter's placement is the only thing keeping them out.
    expect(
      runningStaticChecks([ci2], pkg2, resolveRunners(manifest).tiers, [], () => ({
        checkTag: "foo",
        scnId: "SCN-TGT-001",
      })).map(
        (o) => o.staticCheck,
      ),
    ).toEqual(["lint:foo"]);
  });
});

describe("[SCN-USG-004] runningStaticChecks observes a CI script matching no convention of ours", () => {
  // THE SWITCH, READ AT THE OBSERVER. `domain-purity` carries neither `lint:` nor `guard:` nor
  // any other prefix this tool has ever recognised, so nothing about its NAME can find it. It is
  // observed because it is a step of the pipeline the manifest did not name a runner and nothing
  // excluded — the inverted membership rule, and the whole of this scenario.
  //
  // THE RUNNERS ARE WHAT KEEP THE COUNT AT ONE. `test` and `cucumber` run in this pipeline too
  // and are no longer held off the axis by carrying no prefix; what holds them off is rule D over
  // the runner block this manifest names (@SCN-USG-003, landed one sub-issue back). A fixture
  // that named none would report three candidates, which is the `new-client` report and is
  // @SCN-USG-017's, not this arm's.
  //
  // THE PLUMBING STEP IS GONE FROM THIS FIXTURE, deliberately. It was here to show that `install`
  // is not a script and so could never match a prefix — a fact the retired rule owned. Under the
  // inversion a plumbing step is a candidate like any other and leaves by `notChecks`
  // (@SCN-USG-015); asserting that here would be a second scenario's claim wearing this one's tag.
  //
  // `domain-purity` is a script NAME — a value, not vocabulary — so the handle itself is
  // deliberately untouched by the static-check rename (3F-1929; 3F-1852 owns script names).
  const unprefixedManifest = {
    scripts: {
      "domain-purity": "echo domain-purity",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
    specController: { runners: { unit: "vitest", integration: "cucumber-js" } },
  };
  const unprefixedPkg: PackageJsonScripts = { scripts: unprefixedManifest.scripts };
  const unprefixedCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm domain-purity",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");
  // THE MEMBERSHIP ARGUMENT, NAMED ONCE, so these arms state the CLAIM — an unprefixed script is
  // observed — separately from whatever is deciding membership. In the red it was the production
  // prefix set and these calls found nothing, which was the fault; it is this target's runner
  // block now, and every step that is not a runner is a candidate.
  const membership = SUITE_RUNNERS;

  it("emits a GuardEvidenceObservation for a script no convention of ours reaches", () => {
    expect(
      runningStaticChecks([unprefixedCi], unprefixedPkg, membership)
    ).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "domain-purity",
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
    const observed = runningStaticChecks(
      [unprefixedCi],
      unprefixedPkg,
      membership,
      [],
      () => null
    );

    expect(observed).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "domain-purity",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
    expect(observed[0]).not.toHaveProperty("scnId");
  });

  it("observes the prefixed and the unprefixed alike — the prefix buys nothing and costs nothing", () => {
    // THE COMPATIBILITY CLAIM, HELD AT THE OBSERVER (`doc/compatibility.md`). A `lint:`- or
    // `guard:`-prefixed script invoked by a `run:` step is still observed as a running static
    // check; what changed is why. A reader that had retired the prefixes by NARROWING — dropping
    // the set and keeping a script-name rule of some other shape — reds here rather than only in
    // a consumer's tree six months from now.
    const mixedManifest = {
      scripts: {
        "lint:foo": "echo foo",
        "guard:legacy": "echo legacy",
        "domain-purity": "echo dp",
        test: "vitest run",
        cucumber: "cucumber-js",
      },
      specController: { runners: { unit: "vitest", integration: "cucumber-js" } },
    };
    const mixedPkg: PackageJsonScripts = { scripts: mixedManifest.scripts };
    const mixedCi = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - run: pnpm lint:foo",
      "      - run: pnpm guard:legacy",
      "      - run: pnpm domain-purity",
      "      - run: pnpm test",
      "      - run: pnpm cucumber",
    ].join("\n");
    expect(
      runningStaticChecks([mixedCi], mixedPkg, membership).map((o) => o.staticCheck)
    ).toEqual(["domain-purity", "guard:legacy", "lint:foo"]);
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
    expect(runningStaticChecks([ci, nightly], pkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("emits one observation per STEP when two workflows invoke the same check", () => {
    // A CANDIDATE IS A STEP, NOT A SCRIPT (@SCN-USG-004). This arm used to read the other way —
    // one check however many steps ran it — and the inversion moved it, deliberately rather than
    // as a side-effect. A step is what carries an `id:`, so it is what can cite a row, and this
    // repository's own pipeline has two steps running one script (`timing:score`) that answer two
    // different fitness rows. Folding them would hand the first row's credit to both and leave the
    // second reading `missing` over a check that ran.
    //
    // What the two share is their HANDLE, which is where-to-fix and does not have to be unique.
    expect(runningStaticChecks([nightly, nightly], pkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
      { qualityCheck: "lint", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("keeps a malformed workflow from discarding the commands of the ones beside it", () => {
    // Parse tolerance is PER SOURCE. Joining the sources before parsing would let one
    // unparseable file hide every other file's checks — a wider watermelon-hiding
    // surface than the one the fail-safe parse was built to keep narrow.
    const malformed = "jobs:\n  - this: [is not\n    valid yaml";

    expect(runningStaticChecks([malformed, nightly], pkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:sweep", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

/**
 * @SCN-USG-009 (@unit) — the CONFIGURED static check, STILL HONOURED AND NOW INERT FOR DISCOVERY
 * (@SCN-USG-004, 3F-3343). It existed because discovery keyed on a name: a target whose check our
 * convention missed named it here and was found. Nothing keys on a name any more, so every script
 * this list could name is discovered anyway and naming one changes no row. What it still settles
 * is what a candidate is CALLED where a step invokes more than one script — the last thing a
 * consumer saying "this one is the static check" has left to decide.
 *
 * ITS REMOVAL IS 3F-3161'S AND IS A MAJOR VERSION. A configuration that has stopped mattering has
 * not stopped being read (`doc/compatibility.md`), and these arms are the witness of that.
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
    expect(runningStaticChecks(ci, pkg, SUITE_RUNNERS, ["typecheck"])).toEqual([
      { qualityCheck: "lint", staticCheck: "typecheck", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("finds it WITHOUT the configuration too — the entry is inert for discovery", () => {
    // WHAT THIS ARM USED TO SAY, AND WHY IT NOW SAYS THE OPPOSITE. Before 3F-2495 `tsc --noEmit`
    // reds a build and the observer could not see it, because it is not called lint:typecheck;
    // this configuration is what closed that silence, and this arm read "finds nothing without
    // the configuration". @SCN-USG-004 closes the same silence for every script at once, so the
    // configuration no longer changes this answer — measured here rather than asserted, because
    // "supported and inert" is a claim about behaviour and only a run can hold it.
    expect(runningStaticChecks(ci, pkg, SUITE_RUNNERS)).toEqual([
      { qualityCheck: "lint", staticCheck: "typecheck", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("names the candidate by the configured script where its step invokes two", () => {
    // WHAT THE CONFIGURATION STILL SETTLES. A step running two of the target's scripts has two
    // names available and the report can print one; the consumer saying which of them IS the
    // static check is the answer, and it is the only thing left for this list to decide. Drop the
    // entry and the row is named `build`, which is where-to-fix pointing at the wrong thing.
    const both: PackageJsonScripts = {
      scripts: { build: "tsc -b", typecheck: "tsc --noEmit" },
    };
    const ciBoth = ["jobs:\n  ci:\n    steps:\n      - run: pnpm build && pnpm typecheck\n"];

    expect(runningStaticChecks(ciBoth, both, SUITE_RUNNERS, ["typecheck"]).map((o) => o.staticCheck))
      .toEqual(["typecheck"]);
    expect(runningStaticChecks(ciBoth, both, SUITE_RUNNERS).map((o) => o.staticCheck))
      .toEqual(["build"]);
  });

  it("still requires the check to RUN in CI — the manifest is not the source", () => {
    // A configured script CI does not run is not a gate. Without this, configuring a helper
    // would red a repository for owning it — the call deriveLocalLadder already makes.
    const ciWithout = ["jobs:\n  ci:\n    steps:\n      - run: pnpm test\n"];

    expect(runningStaticChecks(ciWithout, pkg, SUITE_RUNNERS, ["typecheck"])).toEqual([]);
  });

  it("ignores a configuration naming a script the manifest does not define", () => {
    // The entry reaches nothing, and — since the switch — takes nothing away either: the steps
    // this pipeline runs are candidates whatever this list says, and `pnpm typecheck` is one of
    // them. What is asserted is that a nonsense entry adds no row of its own.
    expect(runningStaticChecks(ci, pkg, SUITE_RUNNERS, ["nonexistent"]).map((o) => o.staticCheck))
      .toEqual(["typecheck"]);
  });

  it("emits a configured check exactly once even if it is also prefix-recognised", () => {
    // Belt and braces against the double-count @SCN-USG-010 guards one layer up: a target
    // that both names a lint: script AND configures it must not get two observations.
    const pkgPrefixed: PackageJsonScripts = { scripts: { "lint:foo": "echo foo" } };
    const ciPrefixed = ["jobs:\n  ci:\n    steps:\n      - run: pnpm lint:foo\n"];

    expect(runningStaticChecks(ciPrefixed, pkgPrefixed, NO_RUNNERS, ["lint:foo"])).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true },
    ]);
  });
});

describe("[SCN-USG-013] a `uses:` step is a candidate fitness check, reported by the action it uses", () => {
  // A QUALITY CHECK CAN BE AN ACTION, and the common ones are: CodeQL's analyse step and a
  // dependency review are actions rather than commands. A reader discarding every `uses:` step
  // drops those checks and drops them without a word, which is the fault the inverted membership
  // rule exists to end — arriving by a different route and wearing a parse limitation's clothes.
  const pkg: PackageJsonScripts = {
    scripts: { "domain-purity": "echo domain-purity", test: "vitest run" },
  };
  const ci = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - uses: github/codeql-action/analyze@v3",
    "      - name: Dependency review",
    "        uses: actions/dependency-review-action@v4",
    "      - run: pnpm domain-purity",
    "      - run: pnpm test",
  ].join("\n");

  it("observes an action step, named by the action it uses", () => {
    // THE WHOLE SET RATHER THAN ONE MEMBER. A reader that gained the `uses:` half while losing the
    // `run:` half satisfies any single `includes`, and so does one that let the runner step
    // through beside them. Sorted by handle, which is this observer's own order.
    expect(runningStaticChecks([ci], pkg, SUITE_RUNNERS).map((o) => o.staticCheck)).toEqual([
      "Dependency review",
      "domain-purity",
      "github/codeql-action/analyze@v3",
    ]);
  });

  it("names an action step by its `name:` where it has one — GitHub's own order, not the reference", () => {
    // THE IDENTITY IS GITHUB'S: `name:` first, else the `uses:` value. A consumer reading a report
    // row or writing an exclusion copies the string already in front of them in their run log, so
    // the two halves of the pipeline above are named the two different ways GitHub names them.
    const named = runningStaticChecks([ci], pkg, SUITE_RUNNERS).map((o) => o.staticCheck);
    expect(named).toContain("Dependency review");
    expect(named).not.toContain("actions/dependency-review-action@v4");
  });

  it("reads the action step's own `continue-on-error`, rather than vouching for it", () => {
    // AN ACTION STEP IS A STEP IN EVERY OTHER RESPECT TOO. A step whose red its job survives runs,
    // reds and leaves the pipeline green, and that is as true of an action as of a command — a
    // widening that admitted actions while assuming them enforced would bank the very watermelon
    // @SCN-LNT-032 closed for commands.
    const severed = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - uses: github/codeql-action/analyze@v3",
      "        continue-on-error: true",
    ].join("\n");
    expect(runningStaticChecks([severed], pkg, SUITE_RUNNERS)).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "github/codeql-action/analyze@v3",
        exists: true,
        enforcedOverRealSource: false,
      },
    ]);
  });

  it("still leaves the runner step out, whatever form the steps beside it take", () => {
    // THE CONTROL ON THE WIDENING. A rule that admitted every step would satisfy the arms above
    // while putting the target's own unit suite on the static axis — the one thing @SCN-USG-003
    // says a target naming its runners does not get.
    expect(runningStaticChecks([ci], pkg, SUITE_RUNNERS).map((o) => o.staticCheck)).not.toContain(
      "pnpm test",
    );
  });
});
