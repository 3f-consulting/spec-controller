/**
 * Unit test for the cross-repo fitness read (@SCN-LNT-005) — spec-controller reconciling a
 * TARGET that is not itself.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it carry the
 * @SCN-LNT-005 id matching features/fitness-reconciliation.feature, so a grep of the
 * id returns both halves of the pair.
 *
 * It drives the CLI read/reconcile core `runReconcile` over a PLANTED EXTERNAL repository
 * fixture (tests/fixtures/scn-lnt-005/), which supplies EVERY input the outcome rests on: a
 * registry naming `lint:vocab-check` the check `vocab-check`, a corpus whose stepless fitness
 * scenario carries that bare tag, a package.json defining the script, and a ci.yml that never
 * runs it. None of those words appears in spec-controller's own tree, so the arm cannot pass by
 * accidentally reading the tool's own registry, corpus, scripts or CI.
 *
 * Teeth: with the registry resolved from the tool's own package.json the target's corpus raises
 * no fitness obligation at all; with the citation resolved against the tool's own features the
 * handle is never observed and the obligation reads `missing`, carrying no credit. Either fault
 * reds the `toEqual` below.
 *
 * Parent: @SCN-LNT-005 — the live ledger.
 */

import { describe, it, expect } from "vitest";
// The `lint` quality-check carries two shapes since @SCN-CIP-003 (a static-check fact and a
// measurement), so a reader wanting a static check's own runnable handle asks for one.
import { isStaticCheckObservation } from "@3f-consulting/spec-controller-core/internal";
import { join } from "node:path";
import {
  runReconcile,
  resolveDeferralTags,
  resolveStaticChecks,
  resolveCheckRegistry,
} from "./ingestQualityChecks.js";
import { DEFAULT_DEFERRAL_TAGS } from "../deferralTags.js";

const FIXTURE = join(process.cwd(), "tests/fixtures/scn-lnt-005");
const EXTERNAL_SCRIPT = "lint:vocab-check";
const EXTERNAL_CHECK = "vocab-check";

describe("[SCN-LNT-005] a fitness check is read from the external target's own package.json", () => {
  it("reconciles the external check as the watermelon — registry, corpus, scripts and CI all read from the TARGET", () => {
    const balance = runReconcile({
      features: join(FIXTURE, "features"),
      ci: join(FIXTURE, "ci.yml"),
      packageJson: join(FIXTURE, "package.json"),
    });

    const scenario = balance.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-EXT-001");

    // THE TWO SIDES NAME DIFFERENT WORDS. The obligation names the BARE tag the target's fitness
    // scenario carries; the observation names the RUNNABLE handle its CI would have had to invoke,
    // and carries the citation that is the only thing able to join them. Present in the target's
    // package.json and enforced by none of its CI steps is the watermelon.
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: EXTERNAL_CHECK,
        outcome: "watermelon",
        evidenceObligation: { qualityCheck: "lint", staticCheck: EXTERNAL_CHECK },
        evidenceObservation: {
          qualityCheck: "lint",
          staticCheck: EXTERNAL_SCRIPT,
          checkTag: EXTERNAL_CHECK,
          exists: true,
          enforcedOverRealSource: false,
          scnId: "SCN-EXT-001",
        },
      },
    ]);
  });
});

/**
 * @SCN-LNT-005 (@unit) — the registry config read in isolation, the third of the three
 * `specController.*` resolvers this edge owns. Its consumers are the reconciler above and the
 * tier-tag floor (`lintScnTagsCli`), which reads it through this same function so the floor admits
 * exactly the tags the obligation rule raises against.
 */
describe("[SCN-LNT-005] resolveCheckRegistry reads specController.checkRegistry", () => {
  it("maps each configured script handle to its bare check tag", () => {
    const registry = resolveCheckRegistry({
      specController: { checkRegistry: { "lint:vocab-check": "vocab-check" } },
    });
    expect([...registry]).toEqual([["lint:vocab-check", "vocab-check"]]);
  });

  it("resolves EMPTY when the target registers nothing — the reading is inert until something does", () => {
    // The default is empty, never a starter set: a registry entry the target did not write would
    // put a fitness obligation on its books under a word it never used. This is also why
    // spec-controller's own tree is unmoved by the reconciler's registry read — it registers
    // nothing, so no bare tag names a check and no fitness obligation is raised.
    expect([...resolveCheckRegistry({})]).toEqual([]);
    expect([...resolveCheckRegistry({ specController: {} })]).toEqual([]);
  });

  it("ignores malformed config defensively — an array, a string, a non-string entry", () => {
    // Consistent with resolveDeferralTags and resolveStaticChecks beside it: a target's manifest is
    // data from outside, and a registry that threw on one typo would turn it into a run producing
    // no verdict at all.
    expect([...resolveCheckRegistry({ specController: { checkRegistry: ["nope"] } })]).toEqual([]);
    expect([...resolveCheckRegistry({ specController: { checkRegistry: "nope" } })]).toEqual([]);
    expect([...resolveCheckRegistry({ specController: { checkRegistry: null } })]).toEqual([]);
    expect(
      [...resolveCheckRegistry({ specController: { checkRegistry: { a: 7, b: "check" } } })]
    ).toEqual([["b", "check"]]);
  });
});

/**
 * @SCN-PND-021 (@unit) — the config read/union in isolation. `resolveDeferralTags` takes the
 * target's parsed `package.json` object and returns DEFAULT_DEFERRAL_TAGS EXTENDED by
 * `specController.deferralTags`. Config EXTENDS, never replaces (a project cannot un-recognise a
 * built-in); configured tags are bare names, `@`-stripped, consistent with the starter set;
 * malformed config is ignored defensively. The core parser stays pure — it takes this union as its
 * injected `deferralTags` param.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the [SCN-PND-021] id,
 * matching features/pending-items.feature and the @integration arm in
 * tests/steps/pendingItems.steps.ts (a grep of the id returns both halves), plus the --help arm in
 * packages/spec-controller/src/cli-registry.test.ts.
 */
describe("[SCN-PND-021] resolveDeferralTags extends the starter set with specController.deferralTags", () => {
  it("unions a project-configured tag with the built-in starter set — the configured tag is recognised", () => {
    // Teeth: the configured `deferred` tag must appear in the resolved set (so it defers like a
    // built-in), alongside the whole starter set. Reds while the config is ignored (the stub returns
    // the starter set only).
    const resolved = resolveDeferralTags({ specController: { deferralTags: ["deferred"] } });
    expect(resolved).toContain("deferred");
    for (const builtin of DEFAULT_DEFERRAL_TAGS) {
      expect(resolved).toContain(builtin);
    }
  });

  it("EXTENDS, never replaces — a project cannot un-recognise a built-in, even with a disjoint config", () => {
    // Config extends the recognised set: configuring `deferred` keeps every built-in (`@wip` still
    // defers). The resolved set is a superset of DEFAULT_DEFERRAL_TAGS plus the configured tag.
    const resolved = resolveDeferralTags({ specController: { deferralTags: ["deferred"] } });
    expect(new Set(resolved)).toEqual(new Set([...DEFAULT_DEFERRAL_TAGS, "deferred"]));
    // Even an EMPTY configured list leaves the built-in set intact — it cannot subtract `@wip`.
    expect(new Set(resolveDeferralTags({ specController: { deferralTags: [] } }))).toEqual(
      new Set(DEFAULT_DEFERRAL_TAGS)
    );
  });

  it("returns exactly the starter set when no specController.deferralTags is configured", () => {
    // A package.json with no `specController` field (or no `deferralTags`) resolves to the starter
    // set alone — the default the pure parser already applies.
    expect(new Set(resolveDeferralTags({}))).toEqual(new Set(DEFAULT_DEFERRAL_TAGS));
    expect(new Set(resolveDeferralTags({ specController: {} }))).toEqual(new Set(DEFAULT_DEFERRAL_TAGS));
  });

  it("strips a leading `@` and ignores malformed (non-string / non-array) config entries", () => {
    // Configured tags are bare names, `@`-stripped, consistent with DEFAULT_DEFERRAL_TAGS — so
    // `@deferred` resolves to the bare `deferred` the tag-line parser compares against. Non-string
    // entries and a non-array `deferralTags` are ignored defensively (never a crash, never a stray tag).
    expect(resolveDeferralTags({ specController: { deferralTags: ["@deferred"] } })).toContain("deferred");
    const mixed = resolveDeferralTags({ specController: { deferralTags: ["@custom", 7, null] as unknown[] } });
    expect(mixed).toContain("custom");
    expect(new Set(mixed)).toEqual(new Set([...DEFAULT_DEFERRAL_TAGS, "custom"]));
    // A non-array `deferralTags` is ignored — the starter set is returned unchanged.
    expect(new Set(resolveDeferralTags({ specController: { deferralTags: "nope" as unknown } }))).toEqual(
      new Set(DEFAULT_DEFERRAL_TAGS)
    );
  });
});

/**
 * @SCN-USG-009 (@unit) — the target's static-check CONFIGURATION, the reader half.
 * `specController.staticChecks` extends the prefix discovery; the observer half is pinned in
 * packages/core/src/parse/runningStaticChecks.test.ts.
 */
describe("[SCN-USG-009] resolveStaticChecks reads specController.staticChecks", () => {
  it("returns the configured script names", () => {
    expect(resolveStaticChecks({ specController: { staticChecks: ["typecheck"] } })).toEqual([
      "typecheck",
    ]);
  });

  it("returns nothing when the target configures none", () => {
    // The default is EMPTY, not a starter set: unlike deferral tags there is no built-in a
    // project would inherit, because the built-in discovery IS the prefix set. A default here
    // would put a check on a target's books that its own conventions never claimed.
    expect(resolveStaticChecks({})).toEqual([]);
    expect(resolveStaticChecks({ specController: {} })).toEqual([]);
  });

  it("ignores non-array and non-string config defensively", () => {
    // Consistent with resolveDeferralTags: malformed config degrades to "configured nothing",
    // never to a crash — the reader is the impure edge and a target's manifest is not ours.
    expect(resolveStaticChecks({ specController: { staticChecks: "typecheck" } })).toEqual([]);
    expect(resolveStaticChecks({ specController: { staticChecks: [1, "typecheck", null] } })).toEqual([
      "typecheck",
    ]);
  });

  it("de-duplicates, so a repeated configuration cannot double-count its check", () => {
    expect(
      resolveStaticChecks({ specController: { staticChecks: ["typecheck", "typecheck"] } })
    ).toEqual(["typecheck"]);
  });

  it("takes bare script names, NOT @-prefixed tags", () => {
    // These are package.json manifest KEYS, not tags, so there is no `@` to strip — the one
    // place this reader deliberately differs from resolveDeferralTags beside it.
    expect(resolveStaticChecks({ specController: { staticChecks: ["@typecheck"] } })).toEqual([
      "@typecheck",
    ]);
  });
});

/**
 * @SCN-USG-009 (@unit) — the CITATION half, over the same fixture the @integration arm drives.
 * `resolveStaticChecks` above pins the reader that DISCOVERS the configured script;
 * `runningStaticChecks.test.ts` pins the observer that emits it. Neither of them can say where
 * the credit LANDS, and under the one posting rule that is the half the verdict turns on.
 *
 * REGISTERED, AND STILL UNCITED — the shape the fixture holds. The target maps typecheck to the
 * bare check typecheck, so the seam resolves a tag for the handle; nothing in its corpus carries
 * that tag, so it reaches no @SCN and the credit cites nothing. Both facts are read below,
 * because asserting the landing alone would pass just as well over an unregistered handle, which
 * reaches nothing for a second reason and would let a reader that took every registered handle
 * for an attributed one go on passing.
 */
describe("[SCN-USG-009] a configured static check nothing cites posts an uncited credit", () => {
  const CONFIGURED = join(process.cwd(), "tests/fixtures/usg-configured");

  const reconcile = () =>
    runReconcile({
      features: join(CONFIGURED, "features"),
      ci: join(CONFIGURED, "ci.yml"),
      packageJson: join(CONFIGURED, "package.json"),
    });

  it("banks the credit on the suspense row, naming the handle that ran", () => {
    const suspense = reconcile().ledger.scenarioReconciliations.find(
      (s) => s.kind === "suspense-scenario"
    );
    const items = suspense?.qualityCheckReconciliations.filter((r) => r.qualityCheck === "lint");

    expect(items).toHaveLength(1);
    expect(items?.[0]?.outcome).toBe("cites-no-scenario");
    expect(items?.[0]?.staticCheck).toBe("typecheck");
  });

  it("posts it ONCE, over a handle BOTH doors reach", () => {
    // This target's registry names typecheck, so the obligation-side observer can answer for
    // the handle the discovery side already found — and the ingest edge's no-double-observe
    // filter is the only thing collapsing the two. MEASURED: admitting every registry entry
    // leaves this green, because that filter holds; admitting them with the filter removed
    // reports one run twice and reds. Neither plant is reachable without the registry entry.
    const lintItems = reconcile().ledger.scenarioReconciliations.flatMap((s) =>
      s.qualityCheckReconciliations.filter((r) => r.qualityCheck === "lint")
    );

    expect(lintItems).toHaveLength(1);
  });

  it("raises no fitness obligation, because nothing in the corpus carries the tag", () => {
    // The other half of registered-but-uncarried, and what stops this arm passing for the wrong
    // reason. The tag IS resolvable — registeredCheckTags answers `typecheck` for this target —
    // so the corpus could have carried it; the scenario that would have raised the obligation is
    // the thing the fixture withholds.
    const scenario = reconcile().ledger.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-TGZ-001"
    );

    expect(scenario?.qualityCheckReconciliations.map((r) => r.qualityCheck)).toEqual(["unit"]);
  });
});

/**
 * @SCN-USG-010 (@unit) — the de-duplication boundary, over the one target that can reach it.
 * Drives the real `runReconcile` over the usg-configured-named fixture; the @integration arm
 * drives the same tree through the CLI and reads the rendered report.
 *
 * THE POSTED CREDITS ARE READ HERE, AND THE COUNT THERE, because the two plants surface in
 * different places. Reconciliation is per-OBLIGATION, so `qualityCheckReconciliations` reads
 * satisfied under either plant and cannot carry this arm; the render's running count moves under
 * one of them; the row's own posted credits move under both. That last reading is this layer's,
 * because the rendered report does not expose it.
 */
describe("[SCN-USG-010] a configured static check a scenario cites is posted once, not twice", () => {
  const CONFIGURED_NAMED = join(process.cwd(), "tests/fixtures/usg-configured-named");

  const reconcile = () =>
    runReconcile({
      features: join(CONFIGURED_NAMED, "features"),
      ci: join(CONFIGURED_NAMED, "ci.yml"),
      packageJson: join(CONFIGURED_NAMED, "package.json"),
    });

  it("posts ONE credit to the cited row, over a handle both doors reach", () => {
    // THE DOUBLE-COUNT ITSELF, read where it is always visible. Both doors stand open over
    // typecheck — the manifest configures it, and the registry reaches it because the corpus
    // carries the tag it resolves to — and the two disagree about where the credit lands, so a
    // lost de-duplication puts one run on this row twice. MEASURED: removing the ingest edge's
    // no-double-observe filter reds this (two distinct observations). The SECOND route that could
    // once double-post here — the by-name arm, which posted an uncited run to every row naming its
    // handle, reachable because this target's bare tag EQUALS its handle — is gone (3F-2590), so
    // the ingest edge's filter is now the only thing standing between this row and two credits.
    const scenario = reconcile().ledger.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-TGN-001"
    );
    const posted = scenario?.evidenceObservations.filter(isStaticCheckObservation);

    expect(posted).toHaveLength(1);
    expect(posted?.[0]?.scnId).toBe("SCN-TGN-001");
    expect(posted?.[0]?.staticCheck).toBe("typecheck");
  });

  it("discharges the obligation on the cited row, under the BARE tag", () => {
    // The attribution the citation seam produces: the run holds the handle typecheck, the
    // obligation the stepless scenario raises holds the bare check typecheck, and the credit
    // reaches the row by CITATION rather than by those two spellings meeting. They happen to
    // coincide for this check, which is exactly why the arm above exists.
    const scenario = reconcile().ledger.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-TGN-001"
    );
    const lintItems = scenario?.qualityCheckReconciliations.filter((r) => r.qualityCheck === "lint");

    expect(lintItems).toHaveLength(1);
    expect(lintItems?.[0]?.outcome).toBe("satisfied");
    expect(lintItems?.[0]?.staticCheck).toBe("typecheck");
  });

  it("banks nothing on the suspense row — the cited twin of @SCN-USG-009's uncited credit", () => {
    // The one fact between the two targets is the tag this fixture's stepless scenario carries.
    // A reader that placed nothing would leave the same credit here that usg-configured gets, and
    // the pair would stop being a control.
    expect(
      reconcile().ledger.scenarioReconciliations.find((s) => s.kind === "suspense-scenario")
    ).toBeUndefined();
  });
});
