/**
 * Unit test for the --package-json cross-repo guard-read seam (@SCN-LNT-005).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it carry the
 * @SCN-LNT-005 id matching features/lint-reconciliation.feature, so a grep of the
 * id returns both halves of the pair.
 *
 * It drives the CLI read/reconcile core `runReconcile` over a PLANTED EXTERNAL repo
 * fixture (tests/fixtures/scn-lnt-005/): an external feature NAMING `@lint=lint:vocab-check`,
 * an external package.json where that static check EXISTS, and an external ci.yml that does
 * NOT run it. The static check's `exists` MUST be read from the EXTERNAL package.json (via
 * --package-json), NOT the tool's own cwd package.json (which has no
 * `lint:vocab-check` script). So the scenario reconciles as the WATERMELON
 * (watermelon).
 *
 * Teeth: until --package-json is threaded, `runReconcile` reads the tool's own
 * package.json, where `lint:vocab-check` is absent → missing, not the
 * watermelon. So this REDS on the un-threaded seam (the genuine red→green).
 *
 * Parent: @SCN-LNT-005 — the live ledger.
 */

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { runReconcile, resolveDeferralTags, resolveStaticChecks } from "./ingestQualityChecks.js";
import { DEFAULT_DEFERRAL_TAGS } from "../deferralTags.js";

const FIXTURE = join(process.cwd(), "tests/fixtures/scn-lnt-005");
const EXTERNAL_GUARD = "lint:vocab-check";

describe("[SCN-LNT-005] guard enforcement is read from an externally-specified package.json", () => {
  it("reconciles the external guard as the watermelon — its existence read from the EXTERNAL package.json, not spec-controller's own cwd", () => {
    const balance = runReconcile({
      features: join(FIXTURE, "features"),
      ci: join(FIXTURE, "ci.yml"),
      packageJson: join(FIXTURE, "package.json"),
    });

    const scenario = balance.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-EXT-001");

    // The watermelon: out-of-balance, carrying exactly the present-but-not-enforced
    // -over-real-source static item for the external guard. This is only reachable
    // when `exists` was read from the EXTERNAL package.json (the static check is absent
    // from the tool's own, where it would be missing instead).
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      {
        qualityCheck: "lint", staticCheck: EXTERNAL_GUARD,
        outcome: "watermelon",
        evidenceObligation: { qualityCheck: "lint", staticCheck: EXTERNAL_GUARD },
        evidenceObservation: { qualityCheck: "lint", staticCheck: EXTERNAL_GUARD, exists: true, enforcedOverRealSource: false },
      },
    ]);
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
 * @SCN-USG-010 (@unit) — the de-duplication boundary the widened discovery makes reachable.
 * Drives the real `runReconcile` over the usg-configured-named fixture; the @integration arm
 * drives the same tree through the CLI and reads the rendered report.
 */
describe("[SCN-USG-010] a configured static check a scenario names is counted once, not twice", () => {
  const CONFIGURED_NAMED = join(process.cwd(), "tests/fixtures/usg-configured-named");

  it("posts one static-check credit, attributed, with no uncited twin", () => {
    const balance = runReconcile({
      features: join(CONFIGURED_NAMED, "features"),
      ci: join(CONFIGURED_NAMED, "ci.yml"),
      packageJson: join(CONFIGURED_NAMED, "package.json"),
    });

    // Both observers see a configured check now — the named-obligation one and the discovery
    // one this slice widened. Without the de-duplication the discovery copy lands on the
    // SUSPENSE row as an uncited credit: a phantom twin of a check that is perfectly fine.
    const suspense = balance.ledger.scenarioReconciliations.find(
      (s) => s.kind === "suspense-scenario"
    );
    expect(suspense).toBeUndefined();

    // And the citation still discharges the obligation on the scenario's own row.
    const scenario = balance.ledger.scenarioReconciliations.find((s) => s.scnId === "SCN-TGN-001");
    const lintItems = scenario?.qualityCheckReconciliations.filter((r) => r.qualityCheck === "lint");
    expect(lintItems).toHaveLength(1);
    expect(lintItems?.[0]?.outcome).toBe("satisfied");
    expect(lintItems?.[0]?.staticCheck).toBe("typecheck");
  });
});
