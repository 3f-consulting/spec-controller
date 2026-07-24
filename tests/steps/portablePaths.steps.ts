/**
 * Step definitions for the cross-repo portable-paths scenario (@SCN-RPT-016).
 *
 * @SCN-RPT-016 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 * This arm exercises the WHOLE CLI binary as a subprocess from a cwd that is NOT the
 * target repo — the cross-repo case the prior cwd-stripping leaked. A temp TARGET repo is
 * built with Vitest / Cucumber reports whose locators are ABSOLUTE paths under that repo;
 * the CLI is run from a foreign temp cwd and persists spec-reconciliation.md + .json. The
 * persisted artefacts must carry NONE of the target's absolute paths — the
 * evidence-observation locators collapse to repo-relative and the input paths record
 * relative to the target root. Anti-watermelon: the real argv → resolveTargetRoot →
 * renderers → disk path runs; a CLI that relativized against cwd (the bug) REDS because
 * the target's paths aren't under the foreign cwd, so they leak verbatim.
 *
 * Self-contained module-level variables + distinct step text (Cucumber registers globally).
 *
 * Evidence: @SCN-RPT-016 — portable paths for cross-repo reconcile.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The temp TARGET repo (outside the run cwd) and the foreign cwd the CLI runs from.
let targetRepo: string;
let foreignCwd: string;
let outDir: string;
let markdown: string;
let jsonText: string;

// @SCN-RPT-016
Given(
  "a target repo outside the run cwd whose Vitest and Cucumber reports carry absolute test-file locators under that repo",
  function () {
    // realpath so the path matches what the CLI derives (macOS /var → /private/var); a
    // NON-git temp dir, so resolveTargetRoot falls back to dirname(--features) = targetRepo.
    targetRepo = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-rpt016-target-")));
    mkdirSync(join(targetRepo, "features"), { recursive: true });

    // A minimal declared corpus — one @SCN-tagged scenario so runReconcile produces a balance.
    writeFileSync(
      join(targetRepo, "features", "sample.feature"),
      [
        "@TGT",
        "Feature: a portable-paths fixture target",
        "",
        "  Rule: the target declares a unit scenario",
        "",
        "    @unit @SCN-TGT-001",
        "    Scenario: the target declares a unit-level scenario",
        "      Given the target repo's source",
        "",
      ].join("\n")
    );

    // Vitest report: an ABSOLUTE test-file locator under the target repo. One attributed
    // assertion (SCN-TGT-001) + one carrying no @SCN → a cites-no-scenario evidence observation
    // whose absolute locator surfaces in the report (the leak vector).
    const vitestLocator = join(targetRepo, "src", "widget.test.ts");
    writeFileSync(
      join(targetRepo, "vitest.json"),
      JSON.stringify({
        testResults: [
          {
            name: vitestLocator,
            assertionResults: [
              { fullName: "[SCN-TGT-001] the target unit scenario is proven", status: "passed" },
              { fullName: "an ordinary unit test carrying no @SCN id", status: "passed" },
            ],
          },
        ],
      })
    );

    // Cucumber report: an ABSOLUTE feature uri under the target repo, one @smoke element
    // carrying no @SCN → a cites-no-scenario evidence observation whose absolute locator surfaces too.
    const cucumberLocator = join(targetRepo, "features", "sample.feature");
    writeFileSync(
      join(targetRepo, "cucumber.json"),
      JSON.stringify([
        {
          uri: cucumberLocator,
          elements: [{ tags: [{ name: "@smoke" }], steps: [{ result: { status: "passed" } }] }],
        },
      ])
    );

    // A foreign cwd — NOT the target repo, NOT spec-controller — so the reconcile is genuinely
    // cross-repo (cwd ≠ target), reproducing the leak the fix closes.
    foreignCwd = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-rpt016-cwd-")));
    outDir = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-rpt016-out-")));
  }
);

// @SCN-RPT-016
When(
  "the real CLI reconciles it from a foreign cwd and persists the markdown and JSON reports",
  function () {
    const repoRoot = process.cwd();
    const mdPath = join(outDir, "spec-reconciliation.md");
    const jsonPath = join(outDir, "spec-reconciliation.json");
    const argv = [
      join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
      "--features", join(targetRepo, "features"),
      "--vitest", join(targetRepo, "vitest.json"),
      "--cucumber", join(targetRepo, "cucumber.json"),
      "--target", "cross-repo-target",
      "--format", `md:${mdPath}`,
      "--format", `json:${jsonPath}`,
    ];
    const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), argv, {
      cwd: foreignCwd,
      encoding: "utf8",
    });
    assert.equal(
      result.error,
      undefined,
      `expected the CLI subprocess to run; it failed to spawn: ${result.error?.message}`
    );
    // [3F-1460] fix-to-canon (3F-1414): balance is now an unconditional CI gate, so this
    // out-of-balance fixture exits 1 (the report is still written IN FULL first). Pure
    // exit-expectation flip 0->1; every content/path assertion is unchanged.
    assert.equal(
      result.status,
      1,
      `expected the CLI to exit 1 (out-of-balance); got exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
    assert.ok(existsSync(mdPath) && existsSync(jsonPath), `expected both reports persisted in ${outDir}`);
    markdown = readFileSync(mdPath, "utf8");
    jsonText = readFileSync(jsonPath, "utf8");
  }
);

// @SCN-RPT-016
Then(
  "the persisted spec-reconciliation.md and spec-reconciliation.json carry none of the target's absolute paths — the evidence-observation locators are repo-relative and the input paths record relative to the target root",
  function () {
    // The load-bearing assertion: NEITHER surface may carry the target repo's absolute
    // prefix. On the cwd-stripping bug the target's paths aren't under the foreign cwd, so
    // relativizeToRoot keeps them verbatim → the prefix leaks → this REDS.
    assert.ok(
      !markdown.includes(targetRepo),
      `expected the persisted markdown to carry NONE of the target's absolute paths "${targetRepo}"; got:\n${markdown}`
    );
    assert.ok(
      !jsonText.includes(targetRepo),
      `expected the persisted JSON to carry NONE of the target's absolute paths "${targetRepo}"; got:\n${jsonText}`
    );

    // Positive teeth — the paths are PRESENT, just relativized (proving relativisation
    // happened, not that the locators simply vanished).
    // Evidence-observation locator: the absolute .../src/widget.test.ts collapses to the
    // repo-relative "src/widget.test.ts".
    assert.ok(
      markdown.includes("src/widget.test.ts"),
      `expected the markdown to carry the repo-relative locator "src/widget.test.ts"; got:\n${markdown}`
    );
    const parsed = JSON.parse(jsonText) as {
      runProvenance?: { inputs?: Record<string, string> };
      ledger?: { scenarioReconciliations: Array<{ scnId: string; kind?: string; qualityCheckReconciliations: Array<{ outcome: string; locator?: string }> }> };
    };
    // Input paths record relative to the target root ("features", "vitest.json"), not absolute.
    assert.equal(
      parsed.runProvenance?.inputs?.features,
      "features",
      `expected runProvenance.inputs.features "features" (relative to the target root); got ${JSON.stringify(parsed.runProvenance?.inputs)}`
    );
    assert.equal(
      parsed.runProvenance?.inputs?.vitest,
      "vitest.json",
      `expected runProvenance.inputs.vitest "vitest.json" (relative to the target root); got ${JSON.stringify(parsed.runProvenance?.inputs)}`
    );
    // The uncited-credit locators now live on the SUSPENSE row — they are
    // repo-relative too (the where-to-fix survives the detail-into-rows move, ruling Q5).
    const suspense = (parsed.ledger?.scenarioReconciliations ?? []).find((s) => s.kind === "suspense-scenario");
    assert.ok(suspense, `expected a suspense-scenario row carrying the uncited credits; got:\n${jsonText}`);
    const locators = suspense!.qualityCheckReconciliations
      .filter((o) => o.outcome === "cites-no-scenario" && typeof o.locator === "string")
      .map((o) => o.locator!);
    assert.ok(
      locators.length > 0 && locators.every((l) => !l.startsWith("/")),
      `expected the suspense-row credit locators to be repo-relative (none absolute); got ${JSON.stringify(locators)}`
    );
  }
);

After({ tags: "@SCN-RPT-016" }, function () {
  for (const d of [targetRepo, foreignCwd, outDir]) {
    if (d && existsSync(d)) rmSync(d, { recursive: true, force: true });
  }
});
