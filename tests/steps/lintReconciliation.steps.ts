/**
 * Step definitions for features/lint-reconciliation.feature (the @LNT static-guard
 * kind).
 *
 * @SCN-LNT-001 — the bidirectional @integration evidence marker (Evidence
 * Manifesto §9). This arm exercises the static-kind wiring END-TO-END over the
 * REAL tree: parseScenarios reads a @lint=<guard> tag → a {kind:"static"} declared
 * evidence obligation; ingest/guard reads the tool's OWN .github/workflows/ci.yml +
 * package.json (NOT a fixture — acceptance condition 1); reconcile + renderMarkdown
 * produce the ledger. It complements the @unit test that proves reconcile
 * over a constructed guard evidence observation in isolation.
 *
 * Assertions are ROW-SCOPED to the scenario's own row CELLS (per the earlier
 * hardening) — not a bare regex over the whole report, which would be toothless.
 *
 * Self-contained module-level outcome + distinct step text, so it shares no outcome
 * with ledger.steps.ts (Cucumber registers step definitions globally).
 *
 * Evidence: @SCN-LNT-001 — the seam-bearing first sub-issue; satisfied path.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseScenarios } from "@3f-consulting/spec-controller-core";
import { checkStaticEvidenceObligations } from "@3f-consulting/spec-controller-core";
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import type { Scenario, EvidenceObservation } from "@3f-consulting/spec-controller-core";
import type { RunContext } from "@3f-consulting/spec-controller-core";

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let scenarios: Scenario[];
let evidenceObservations: EvidenceObservation[];
let markdown: string;

// A RunContext fixture — the sibling provenance arg renderMarkdown now requires.
// These @LNT assertions are ROW-SCOPED to the verdict table cells, so
// the provenance header above leaves them byte-green (the Scenario-CRUD Read).
const CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

// @SCN-LNT-005 outcome: the resolved external repo input paths (--package-json + --ci).
let externalOpts: { features: string; ci: string; packageJson: string };

/**
 * Extract a scenario's OWN ledger LEDGER row, split into its cells — `| <scnId> |
 * <verdict> | <reconciling items> |` → the verdict + items CELLS, so an assertion scopes
 * to the row, not the whole report.
 *
 * Scoped to the `## Scenario Reconciliations` section: the reformat moved the ledger
 * to the end and added summary cuts above it that ALSO mention the scnId in a first cell —
 * the `### Lint evidence obligations` table (`| <scnId> | <guard> | <outcome> |`) and
 * the by-feature table — so a whole-report search would shadow the ledger row. Searching
 * only the ledger, matching the scnId in the FIRST cell, keeps the assertions on-target.
 */
function rowCells(scnId: string): { verdict: string; items: string } {
  const ledgerStart = markdown.indexOf("## Scenario Reconciliations");
  const ledger = ledgerStart >= 0 ? markdown.slice(ledgerStart) : markdown;
  const row = ledger.split("\n").find((line) => {
    if (!line.startsWith("|")) return false;
    const cells = line.split("|").map((c) => c.trim());
    return cells[1] === scnId;
  });
  assert.ok(row, `expected a ledger row for ${scnId}; got:\n${markdown}`);
  const cells = row.split("|").map((c) => c.trim());
  // cells: ['', scnId, verdict, items, ''].
  return { verdict: cells[2] ?? "", items: cells[3] ?? "" };
}

// @SCN-LNT-001
Given(
  "a declared @lint scenario {string} requiring the static guard {string}",
  function (scnId: string, guard: string) {
    // Build the declared side from a real feature snippet through the declared
    // reader, so this arm exercises the @lint=<guard> → {kind:"static"} parse seam
    // (not a hand-seeded Scenario the reader never produced).
    const feature = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @lint=${guard} @${scnId}`,
      "    Scenario: a fixture scenario",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
  }
);

// @SCN-LNT-001
Given(
  "spec-controller's real CI config and package.json wire {string} as a run step over the real tree",
  function (guard: string) {
    // Read the tool's OWN, REAL CI config + package.json from the checked-out
    // tree (cwd is the repo root under `pnpm cucumber`) — the dogfood subject, not
    // a planted fixture. ingest/guard reports whether the guard's command is a CI
    // run: step over the real source.
    const root = process.cwd();
    const ciSource = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    ) as PackageJsonScripts;
    evidenceObservations = checkStaticEvidenceObligations([guard], ciSource, packageJson);
  }
);

// @SCN-LNT-002
Given(
  "a planted package.json defines the guard {string} but the planted CI config does not run it",
  function (guard: string) {
    // The PLANTED watermelon — a fixture ci.yml + fixture package.json fed
    // through the ingest/guard DETECTOR, NOT the tool's real tree: the guard
    // EXISTS as a package.json script (fixture-green) but its command is absent from
    // the CI config, so it guards nothing over real source. The planted guard is
    // never a real in-repo script; spec-controller cannot keep a permanent real
    // watermelon (acceptance bar: the detector CATCHES it over the planted fixture).
    const plantedCi = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Type-check",
      "        run: pnpm typecheck",
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");
    const plantedPackageJson: PackageJsonScripts = {
      scripts: {
        [guard]: "tsx scripts/planted-watermelon.ts",
        test: "vitest run",
        typecheck: "tsc --noEmit",
      },
    };
    evidenceObservations = checkStaticEvidenceObligations([guard], plantedCi, plantedPackageJson);
  }
);

// @SCN-LNT-003
Given(
  "a planted package.json and CI config that name no such guard {string}",
  function (guard: string) {
    // The ABSENT guard — named by a @lint=<guard> scenario but present in
    // NEITHER the package.json scripts NOR the CI config. Fed through the real
    // ingest/guard DETECTOR over a planted fixture: the guard is genuinely absent
    // from both inputs, so the detector reports exists:false AND
    // enforcedOverRealSource:false — a required ledger entry never recorded
    // (missing), GENUINELY DIFFERENT from the watermelon (exists:true
    // but unenforced). The planted guard is never a real in-repo script.
    const plantedCi = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Type-check",
      "        run: pnpm typecheck",
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");
    const plantedPackageJson: PackageJsonScripts = {
      scripts: {
        test: "vitest run",
        typecheck: "tsc --noEmit",
      },
    };
    evidenceObservations = checkStaticEvidenceObligations([guard], plantedCi, plantedPackageJson);
  }
);

// @SCN-LNT-004
Given(
  "a scenario {string} requiring both a @unit runtime test and the static guard {string}",
  function (scnId: string, guard: string) {
    // The kind-axis multi-evidence obligation case: a SINGLE scenario
    // carries BOTH a @unit runtime evidence obligation AND a @lint=<guard> static
    // evidence obligation, built through the real declared reader so the dual-kind parse
    // seam is exercised — parseScenarios emits TWO evidence obligations from one tag block
    // ({qualityCheck: "unit"} + {kind:"static",guard}). Not a hand-seeded
    // Scenario the reader never produced.
    const feature = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @lint=${guard} @${scnId}`,
      "    Scenario: a fixture scenario",
      "      Given a fixture step",
    ].join("\n");
    scenarios = parseScenarios(feature);
  }
);

// @SCN-LNT-004
Given(
  "the unit result for {string} is green but the planted CI does not run the guard {string}",
  function (scnId: string, guard: string) {
    // Two INDEPENDENT evidence observations, one per kind: a GREEN runtime result for the
    // scenario's @unit evidence obligation, AND a planted guard evidence observation where the guard
    // EXISTS as a package.json script but the planted CI does not run it (the
    // watermelon precursor — exists:true, enforcedOverRealSource:false). The guard
    // arm is read through the real ingest/guard DETECTOR over a planted fixture,
    // not a hand-seeded evidence observation; the planted guard is never a real in-repo script.
    const plantedCi = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");
    const plantedPackageJson: PackageJsonScripts = {
      scripts: {
        [guard]: "tsx scripts/unwired-guard.ts",
        test: "vitest run",
      },
    };
    evidenceObservations = [
      { qualityCheck: "unit", scnId, status: "passed" },
      ...checkStaticEvidenceObligations([guard], plantedCi, plantedPackageJson),
    ];
  }
);

// @SCN-LNT-001
// @SCN-LNT-002
// @SCN-LNT-003
// @SCN-LNT-004
When("the lint reconciler runs", function () {
  markdown = renderMarkdown(reconcile(scenarios, evidenceObservations), CTX);
});

// @SCN-LNT-005
Given(
  "an externally-specified package.json declaring the guard {string} and an external CI config that does not run it",
  function (_guard: string) {
    // Point at the PLANTED EXTERNAL fixture (tests/fixtures/scn-lnt-005/) — an
    // external feature declaring @lint=lint:vocab-check, an external package.json
    // where the guard EXISTS, and an external ci.yml that does NOT run it. The guard
    // is absent from the tool's OWN package.json, so reading it as the watermelon
    // proves `exists` came from the EXTERNAL package.json (the --package-json seam).
    const fixture = join(process.cwd(), "tests/fixtures/scn-lnt-005");
    externalOpts = {
      features: join(fixture, "features"),
      ci: join(fixture, "ci.yml"),
      packageJson: join(fixture, "package.json"),
    };
  }
);

// @SCN-LNT-005
When(
  "the reconciler runs against the external repo via --package-json and --ci",
  function () {
    // Drive the CLI core end-to-end (the cross-component arm): arg-resolved input
    // paths → declared read → static guard read against the EXTERNAL package.json +
    // CI → reconcile → render. Until --package-json is threaded, runReconcile reads
    // the tool's own package.json and the guard reconciles missing.
    markdown = renderMarkdown(runReconcile(externalOpts), CTX);
  }
);

// @SCN-LNT-001
Then(
  "the ledger reports the lint scenario {string} as balanced with no reconciling items",
  function (scnId: string) {
    // Row-scoped + has teeth: the scenario's OWN verdict CELL must read balanced
    // and NOT out-of-balance, and its reconciling-items CELL must be empty (the
    // em-dash placeholder). Under a not-balanced mutation of the static branch the
    // verdict cell flips and the items cell lists the watermelon item, so this reds.
    const { verdict, items } = rowCells(scnId);
    assert.match(
      verdict,
      /\bbalanced\b/,
      `expected ${scnId}'s verdict cell to read balanced; got "${verdict}"`
    );
    assert.doesNotMatch(
      verdict,
      /out-of-balance/,
      `expected ${scnId} not to be out-of-balance; got "${verdict}"`
    );
    assert.equal(
      items,
      "—",
      `expected ${scnId} to carry no reconciling items; got "${items}"`
    );
  }
);

// @SCN-LNT-002
Then(
  "the ledger reports the lint scenario {string} as out-of-balance with a watermelon reconciling item for the guard {string}",
  function (scnId: string, guard: string) {
    // Row-scoped + has teeth: the scenario's OWN verdict CELL must read
    // out-of-balance (NOT balanced), and its reconciling-items CELL must carry the
    // level-less lint watermelon item (the 🍉 glyph + the outcome). Under a detector
    // that fails to catch the planted watermelon the verdict cell flips to balanced
    // and the item vanishes, so this reds.
    const { verdict, items } = rowCells(scnId);
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance for the unwired guard "${guard}"; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*Evidence Observation is passing but fabricated/,
      `expected ${scnId} to carry the lint watermelon reconciling item for "${guard}"; got "${items}"`
    );
    assert.match(
      items,
      /🍉/,
      `expected ${scnId}'s watermelon item to carry the 🍉 glyph; got "${items}"`
    );
  }
);

// @SCN-LNT-003
Then(
  "the ledger reports the lint scenario {string} as out-of-balance with a missing reconciling item for the guard {string}",
  function (scnId: string, guard: string) {
    // Row-scoped + has teeth: the scenario's OWN verdict CELL must read
    // out-of-balance (NOT balanced), and its reconciling-items CELL must carry the
    // level-less lint missing item (the ∅ glyph + the outcome). Under
    // the earlier coarse else (the absent guard folded into the watermelon
    // outcome) the items cell reads watermelon with the
    // 🍉 glyph instead, so this reds.
    const { verdict, items } = rowCells(scnId);
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance for the absent guard "${guard}"; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*missing/,
      `expected ${scnId} to carry the lint missing reconciling item for "${guard}"; got "${items}"`
    );
    assert.match(
      items,
      /∅/,
      `expected ${scnId}'s missing item to carry the ∅ glyph; got "${items}"`
    );
  }
);

// @SCN-LNT-004
Then(
  "the ledger reports the lint scenario {string} as out-of-balance, the runtime evidence obligation balanced and omitted, and the static guard {string} carried as a watermelon reconciling item",
  function (scnId: string, guard: string) {
    // Row-scoped + has teeth, proving INDEPENDENCE PER KIND on the rendered report:
    // the scenario's OWN verdict CELL reads out-of-balance, and its reconciling-items
    // CELL carries the level-less lint watermelon item (the 🍉 glyph) for the guard
    // — AND does NOT carry the @unit runtime item, because the balanced runtime
    // evidence obligation is OMITTED from the reconciling items. So one kind (runtime)
    // balances and is dropped while the other (static) is the watermelon and remains:
    // the two kinds are reconciled independently, not collapsed to one verdict. Under
    // a mutation that drops the per-kind reconcile of one evidence obligation, either the
    // verdict flips to balanced and the watermelon vanishes, or the omitted runtime
    // item appears — so this reds.
    const { verdict, items } = rowCells(scnId);
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance (the lint watermelon holds it out); got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*Evidence Observation is passing but fabricated/,
      `expected ${scnId} to carry the lint watermelon reconciling item for "${guard}"; got "${items}"`
    );
    assert.match(
      items,
      /🍉/,
      `expected ${scnId}'s watermelon item to carry the 🍉 glyph; got "${items}"`
    );
    assert.doesNotMatch(
      items,
      /\bunit\b/,
      `expected ${scnId}'s balanced runtime evidence obligation (the @unit arm) to be OMITTED from the reconciling items; got "${items}"`
    );
  }
);

// @SCN-LNT-005
Then(
  "the ledger reports the external scenario {string} as out-of-balance with a watermelon reconciling item for the guard {string}",
  function (scnId: string, guard: string) {
    // Row-scoped + has teeth: the external scenario's OWN verdict CELL reads
    // out-of-balance, and its reconciling-items CELL carries the level-less lint
    // watermelon item (🍉) for the external guard. Under the un-threaded seam the
    // guard is read from the tool's own package.json (where it is absent) → the
    // cell reads missing (∅), not the watermelon, so this reds.
    const { verdict, items } = rowCells(scnId);
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance for the external guard "${guard}"; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*Evidence Observation is passing but fabricated/,
      `expected ${scnId} to carry the lint watermelon reconciling item for the external guard "${guard}"; got "${items}"`
    );
    assert.match(
      items,
      /🍉/,
      `expected ${scnId}'s watermelon item to carry the 🍉 glyph; got "${items}"`
    );
  }
);
