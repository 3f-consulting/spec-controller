/**
 * Unit test for the @lint static-guard SATISFIED path.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it carry the
 * @SCN-LNT-001 id matching features/lint-reconciliation.feature, so a grep of the
 * id returns both halves of the pair.
 *
 * It reconciles spec-controller's OWN lint:feature-codes guard against its REAL,
 * checked-out .github/workflows/ci.yml + package.json (NOT a fixture — acceptance
 * condition 1): the guard's command is genuinely a CI `run:` step over the real
 * tree, so the static evidenceObligation reconciles BALANCED. Asserts REAL reconcile
 * output, not a hand-seeded fixture (evidence-manifesto §11A).
 *
 * Parent: @SCN-LNT-001.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { reconcile } from "./reconcile.js";
import { checkStaticEvidenceObligations } from "../parse/checkStaticEvidenceObligations.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { Scenario, EvidenceObservation } from "../model.js";

/** spec-controller's own, real wired guard — the dogfood subject (package.json script). */
const REAL_GUARD = "lint:feature-codes";

describe("[SCN-LNT-001] a @lint scenario whose guard is wired into CI over the real source is reported as balanced", () => {
  it("reconciles the static evidenceObligation BALANCED when the guard's command is a CI run step over spec-controller's real tree", () => {
    // Read spec-controller's OWN, REAL CI config + package.json (cwd is the repo root
    // under `pnpm test`) — the genuinely-wired guard, not a planted fixture.
    const root = process.cwd();
    const ciSource = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    ) as PackageJsonScripts;

    const scenarios: Scenario[] = [
      { scnId: "SCN-LNT-001", evidenceObligations: [{ qualityCheck: "lint", guard: REAL_GUARD }] },
    ];
    const evidenceObservations = checkStaticEvidenceObligations([REAL_GUARD], ciSource, packageJson);

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LNT-001");

    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "lint", guard: REAL_GUARD, outcome: "satisfied" },
    ]);
  });
});

/**
 * The PLANTED watermelon — a guard that EXISTS (a package.json script) and is
 * fixture-green, but whose command is NOT a CI run: step over the real source, so
 * it guards nothing. This is the classic 609-violations-while-green failure class
 * made detectable (the slice's headline).
 *
 * Acceptance bar (operator, non-negotiable): the detector must CATCH the watermelon
 * over a PLANTED FIXTURE — not merely assert the outcome. So this drives the real
 * `checkStaticEvidenceObligations` DETECTOR over a planted fixture `ci.yml` (where the guard's command
 * is ABSENT) + a planted package.json (where the guard EXISTS), and asserts the
 * reconciler reports `watermelon`. The fixture is
 * TEST-ONLY — `lint:planted-watermelon` is never a real in-repo guard; spec-controller
 * cannot keep a permanent real watermelon in-repo (LNT-001 holds the real-source
 * SATISFIED attestation; this holds the planted-watermelon CAUGHT attestation).
 */
const PLANTED_GUARD = "lint:planted-watermelon";

describe("[SCN-LNT-002] a @lint scenario whose guard is fixture-green but not wired into CI is reported as the watermelon", () => {
  it("reconciles the static evidenceObligation as watermelon when the detector reads a planted exists-but-unwired guard", () => {
    // A planted CI config that wires OTHER steps but NOT the guard's command — the
    // coarse watermelon (guard absent from CI entirely). A reputable structural
    // parse (not a line-scan) reads it; the guard's command is genuinely absent.
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
    // A planted package.json where the guard EXISTS as a script (fixture-green) —
    // so `exists` is true but `enforcedOverRealSource` is false: the watermelon.
    const plantedPackageJson: PackageJsonScripts = {
      scripts: {
        [PLANTED_GUARD]: "tsx scripts/planted-watermelon.ts",
        test: "vitest run",
        typecheck: "tsc --noEmit",
      },
    };

    const scenarios: Scenario[] = [
      { scnId: "SCN-LNT-002", evidenceObligations: [{ qualityCheck: "lint", guard: PLANTED_GUARD }] },
    ];
    // Drive the real DETECTOR over the planted fixture — assert it reads the
    // watermelon precursor (exists, NOT enforced), not a hand-seeded evidenceObservation.
    const evidenceObservations = checkStaticEvidenceObligations([PLANTED_GUARD], plantedCi, plantedPackageJson);
    expect(evidenceObservations).toEqual([
      {
        qualityCheck: "lint", guard: PLANTED_GUARD,
        exists: true,
        enforcedOverRealSource: false,
      },
    ]);

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LNT-002");

    // The watermelon: out-of-balance, carrying exactly the present-but-not-enforced
    // -over-real-source reconciling item (level-less static kind). Under a detector
    // that fails to catch the watermelon (the static branch reporting balanced), the
    // verdict flips to balanced and the item vanishes — so this has teeth.
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      {
        qualityCheck: "lint", guard: PLANTED_GUARD,
        outcome: "watermelon",
      },
    ]);
    expect(scenario?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint", guard: PLANTED_GUARD,
        outcome: "watermelon",
      },
    ]);
  });
});

/**
 * The ABSENT guard — a @lint scenario names a guard that does not exist at all: no
 * package.json script, no CLI, no CI run step. It is a required ledger entry that
 * was never recorded — missing — GENUINELY DIFFERENT from the
 * watermelon (a guard that EXISTS but is unenforced). Outcome parity with the runtime
 * kind's missing path.
 *
 * This drives the real `checkStaticEvidenceObligations` DETECTOR over a planted fixture where the named
 * guard is absent from BOTH the package.json AND the CI config — so it reports
 * exists:false, enforcedOverRealSource:false — and asserts the reconciler reports
 * missing. The fixture is TEST-ONLY (`lint:absent-guard` is never a
 * real in-repo guard).
 */
const ABSENT_GUARD = "lint:absent-guard";

describe("[SCN-LNT-003] a @lint scenario whose named guard does not exist is reported as missing", () => {
  it("reconciles the static evidenceObligation as missing when the detector reads a guard absent from both package.json and CI", () => {
    // A planted CI config that wires OTHER steps but never the named guard, plus a
    // planted package.json that defines OTHER scripts but not the named guard — so
    // the guard is genuinely absent from BOTH inputs. The detector reports
    // exists:false (distinct from the watermelon's exists:true).
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

    const scenarios: Scenario[] = [
      { scnId: "SCN-LNT-003", evidenceObligations: [{ qualityCheck: "lint", guard: ABSENT_GUARD }] },
    ];
    // Drive the real DETECTOR over the planted fixture — assert it reads the absent
    // guard (exists:false, NOT enforced), not a hand-seeded evidenceObservation.
    const evidenceObservations = checkStaticEvidenceObligations([ABSENT_GUARD], plantedCi, plantedPackageJson);
    expect(evidenceObservations).toEqual([
      {
        qualityCheck: "lint", guard: ABSENT_GUARD,
        exists: false,
        enforcedOverRealSource: false,
      },
    ]);

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LNT-003");

    // Required-but-missing: out-of-balance, carrying exactly the missing
    // reconciling item (level-less static kind). Under the earlier coarse else
    // (the absent guard folded into watermelon) the
    // item's outcome reads the WATERMELON instead, so this has teeth.
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      {
        qualityCheck: "lint", guard: ABSENT_GUARD,
        outcome: "missing",
      },
    ]);
    expect(scenario?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint", guard: ABSENT_GUARD,
        outcome: "missing",
      },
    ]);
  });
});

/**
 * The KIND-AXIS multi-evidenceObligation proof — the kind-axis analogue of
 * LDG-004 (the multi-LEVEL proof). A single declared scenario carries BOTH a
 * runtime evidenceObligation (@unit) AND a static evidenceObligation (@lint=<guard>); reconcile
 * reconciles each KIND independently, keyed by (kind, [level]). With the unit
 * result green but the guard not wired into CI, the runtime evidenceObligation balances
 * (omitted from the reconciling items) while the static evidenceObligation is the
 * watermelon — so the scenario is out-of-balance carrying ONLY the static item.
 * This proves `kind` is a real second AXIS orthogonal to level, not a collapsed
 * single per-scenario verdict.
 *
 * The static arm drives the real `checkStaticEvidenceObligations` DETECTOR over a planted fixture
 * (guard exists but is unwired); the runtime arm is a green evidenceObservation. Asserts
 * REAL reconcile output, not a hand-seeded fixture (evidence-manifesto §11A). The
 * reconciler already reconciles each evidenceObligation independently (the per-kind map
 * shipped with the runtime spine + the @lint kind), so this is green on first run
 * — its TEETH are proven by mutation: collapsing the per-kind reconcile so one
 * kind is dropped reds the independence assertions below (PR body records the run).
 *
 * Parent: @SCN-LNT-004.
 */
const UNWIRED_GUARD = "lint:unwired-guard";

describe("[SCN-LNT-004] a scenario requiring both a @unit test and an unwired @lint guard reconciles each kind independently", () => {
  it("reconciles the runtime evidenceObligation balanced (omitted from the reconciling items) AND the static evidenceObligation as the watermelon, order-independent — not collapsed to one verdict", () => {
    // A planted CI config that wires the test step but NOT the guard's command,
    // plus a planted package.json where the guard EXISTS as a script — so the real
    // detector reports exists:true, enforcedOverRealSource:false (the watermelon).
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
        [UNWIRED_GUARD]: "tsx scripts/unwired-guard.ts",
        test: "vitest run",
      },
    };

    // ONE scenario, TWO kinds of evidenceObligation: a runtime @unit + a static @lint guard.
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-LNT-004",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "lint", guard: UNWIRED_GUARD },
        ],
      },
    ];
    // Independent evidenceObservations of the two kinds: a GREEN runtime result + the
    // planted-watermelon guard read through the real detector.
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LNT-004", status: "passed" },
      ...checkStaticEvidenceObligations([UNWIRED_GUARD], plantedCi, plantedPackageJson),
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LNT-004");

    // The scenario is out-of-balance — the static watermelon holds it out, even
    // though the runtime kind balances.
    expect(scenario?.verdict).toBe("out-of-balance");

    // INDEPENDENCE PER KIND: BOTH outcomes appear in the full evidenceObligations list,
    // each reconciled on its own axis — the runtime balanced AND the static
    // watermelon. arrayContaining + length 2 asserts membership order-independently
    // (no ranking claimed) and that it is NOT a single collapsed verdict.
    expect(scenario?.qualityCheckReconciliations).toEqual(
      expect.arrayContaining([
        { qualityCheck: "unit", outcome: "satisfied" },
        {
          qualityCheck: "lint", guard: UNWIRED_GUARD,
          outcome: "watermelon",
        },
      ])
    );
    expect(scenario?.qualityCheckReconciliations).toHaveLength(2);

    // The balanced runtime evidenceObligation is OMITTED from the reconciling items; only
    // the non-balanced static watermelon remains.
    expect(scenario?.reconcilingItems).toEqual([
      {
        qualityCheck: "lint", guard: UNWIRED_GUARD,
        outcome: "watermelon",
      },
    ]);
  });
});
