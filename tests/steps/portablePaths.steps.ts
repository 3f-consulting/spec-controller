import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

let targetRepo: string;
let foreignCwd: string;
let outDir: string;
let markdown: string;
let jsonText: string;

function writeTargetReports(repo: string): void {
  const vitestLocator = join(repo, "src", "widget.test.ts");
  writeFileSync(
    join(repo, "vitest.json"),
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

  const cucumberLocator = join(repo, "features", "sample.feature");
  writeFileSync(
    join(repo, "cucumber.json"),
    JSON.stringify([
      {
        uri: cucumberLocator,
        elements: [{ tags: [{ name: "@smoke" }], steps: [{ result: { status: "passed" } }] }],
      },
    ])
  );
}

Given(
  "a target repo outside the run's working directory whose Vitest and Cucumber reports carry absolute test-file locators under that repo",
  function () {
    targetRepo = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-rpt016-target-")));
    mkdirSync(join(targetRepo, "features"), { recursive: true });

    writeFileSync(
      join(targetRepo, "features", "sample.feature"),
      [
        "@TGT",
        "Feature: a portable-paths fixture target",
        "",
        "  Rule: the target names a unit scenario",
        "",
        "    @unit @SCN-TGT-001",
        "    Scenario: the target names a unit-level scenario",
        "      Given the target repo's source",
        "",
      ].join("\n")
    );

    writeTargetReports(targetRepo);

    foreignCwd = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-rpt016-cwd-")));
    outDir = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-rpt016-out-")));
  }
);

When(
  "balance reconciles it from a foreign working directory and saves the reconciliation in markdown and JSON",
  function () {
    const repoRoot = process.cwd();
    const mdPath = join(outDir, "spec-reconciliation.md");
    const jsonPath = join(outDir, "spec-reconciliation.json");
    const argv = [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", join(targetRepo, "features"),
      "--vitest", join(targetRepo, "vitest.json"),
      "--cucumber", join(targetRepo, "cucumber.json"),
      "--target", "cross-repo-target",
      "--format", `md:${mdPath}`,
      "--format", `json:${jsonPath}`,
    ];
    const result = spawnSync(NODE, argv, {
      cwd: foreignCwd,
      encoding: "utf8",
    });
    assert.equal(
      result.error,
      undefined,
      `expected the CLI subprocess to run; it failed to spawn: ${result.error?.message}`
    );
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

Then(
  "the saved reconciliation, in both markdown and JSON, carries none of the target's absolute paths — the evidence-observation locators are repo-relative and the input paths record relative to the target root",
  function () {
    assert.ok(
      !markdown.includes(targetRepo),
      `expected the persisted markdown to carry NONE of the target's absolute paths "${targetRepo}"; got:\n${markdown}`
    );
    assert.ok(
      !jsonText.includes(targetRepo),
      `expected the persisted JSON to carry NONE of the target's absolute paths "${targetRepo}"; got:\n${jsonText}`
    );

    assert.ok(
      markdown.includes("src/widget.test.ts"),
      `expected the markdown to carry the repo-relative locator "src/widget.test.ts"; got:\n${markdown}`
    );
    const parsed = JSON.parse(jsonText) as {
      runProvenance?: { inputs?: Record<string, string> };
      ledger?: { scenarioReconciliations: Array<{ scnId: string; kind?: string; qualityCheckReconciliations: Array<{ outcome: string; locator?: string }> }> };
    };
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
    const suspense = (parsed.ledger?.scenarioReconciliations ?? []).find((s) => s.kind === "suspense-scenario");
    assert.ok(suspense, `expected a suspense-scenario row carrying the uncited evidence observations; got:\n${jsonText}`);
    const locators = suspense!.qualityCheckReconciliations
      .filter((o) => o.outcome === "cites-no-scenario" && typeof o.locator === "string")
      .map((o) => o.locator!);
    assert.ok(
      locators.length > 0 && locators.every((l) => !l.startsWith("/")),
      `expected the suspense-row evidence observation locators to be repo-relative (none absolute); got ${JSON.stringify(locators)}`
    );
  }
);

After({ tags: "@SCN-RPT-016" }, function () {
  for (const d of [targetRepo, foreignCwd, outDir]) {
    if (d && existsSync(d)) rmSync(d, { recursive: true, force: true });
  }
});
