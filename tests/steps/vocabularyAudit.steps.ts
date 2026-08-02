/**
 * @SCN-VOC-001 step defs — the @integration arm of the closed-vocabulary audit.
 * Drives the REAL `audit:vocab` CLI over a fixture corpus (a banned
 * `supply` identifier + an all-approved identifier) and asserts the persisted
 * manifest CSV flags the banned name with its canonical replacement and leaves
 * the approved name unflagged — proving scan → classify → manifest over real
 * files on disk, not an in-memory re-run (the anti-watermelon rule).
 * // @SCN-VOC-001
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SURFACES } from "../../packages/spec-controller/static-checks/vocabAudit.js";

const VOCAB_FIXTURE_ROOT = "tests/fixtures/vocab";
let manifestCsv: string;
let matrixMd: string;

// @SCN-VOC-001
Given(
  "a fixture corpus carrying a banned word in an identifier and an approved word in another",
  function () {
    // tests/fixtures/vocab/buildSupply.ts (banned `supply`) +
    // tests/fixtures/vocab/render/scenarioLedger.ts (all-approved) — on disk.
  }
);

// @SCN-VOC-001
When("the vocabulary audit runs over the corpus", function () {
  const repoRoot = process.cwd();
  const outDir = mkdtempSync(join(tmpdir(), "spec-controller-voc001-"));
  const manifestPath = join(outDir, "manifest.csv");
  const argv = [
    join(repoRoot, "packages", "spec-controller", "static-checks", "vocabAuditCli.ts"),
    "--root",
    join(repoRoot, VOCAB_FIXTURE_ROOT),
    "--manifest",
    manifestPath,
  ];
  const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), argv, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.equal(
    result.status,
    0,
    `expected exit 0 running the audit; got ${result.status}\nstderr:\n${result.stderr}`
  );
  manifestCsv = readFileSync(manifestPath, "utf8");
});

/** Parse the manifest CSV into header-keyed row objects. */
function parseManifest(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  const header = lines[0]!.split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

// @SCN-VOC-001
Then("the manifest lists the banned name with its canonical replacement", function () {
  const rows = parseManifest(manifestCsv);
  const supplyRow = rows.find(
    (r) => r["current"] === "supply" && (r["symbol"] ?? "").includes("buildSupply")
  );
  assert.ok(
    supplyRow,
    `expected a manifest row flagging \`supply\` in buildSupply; got:\n${manifestCsv}`
  );
  assert.equal(
    supplyRow!["new"],
    "evidence observation",
    `expected the canonical replacement "evidence observation"; got "${supplyRow!["new"]}"`
  );
});

// @SCN-VOC-001
Then("the approved name is not flagged", function () {
  const rows = parseManifest(manifestCsv);
  const approved = rows.filter((r) => r["symbol"] === "renderScenarioLedger");
  assert.deepEqual(
    approved,
    [],
    `expected the all-approved name renderScenarioLedger to be unflagged; got:\n${JSON.stringify(approved)}`
  );
});

// @SCN-VOC-001
Given(
  'the corpus carries a bare "guard" identifier and a qualified "static guard" identifier',
  function () {
    // tests/fixtures/vocab/staticGuardVocabulary.ts — `runGuard` (bare) and
    // `runStaticGuard` (qualified) on disk.
  }
);

/** The manifest rows flagging the word `guard` inside the named symbol. */
function guardRowsFor(csv: string, symbol: string): Record<string, string>[] {
  return parseManifest(csv).filter(
    (r) => r["current"] === "guard" && (r["symbol"] ?? "").includes(symbol)
  );
}

// @SCN-VOC-001
Then('the bare "guard" is flagged for review, not rename', function () {
  const rows = guardRowsFor(manifestCsv, "runGuard").filter(
    // `runStaticGuard` contains `runGuard` as a substring only under a loose match;
    // pin the bare arm exactly so the qualified arm can never satisfy this assertion.
    (r) => r["symbol"] === "runGuard"
  );
  assert.ok(
    rows.length > 0,
    `expected a manifest row flagging bare \`guard\` in runGuard; got:\n${manifestCsv}`
  );
  assert.equal(
    rows[0]!["action"],
    "review",
    `a bare \`guard\` is the different word used alone, not necessarily a shortening, so it is flagged for REVIEW, never auto-renamed; got action "${rows[0]!["action"]}"`
  );
});

// @SCN-VOC-001
Then('the qualified "static guard" is not flagged', function () {
  const rows = guardRowsFor(manifestCsv, "runStaticGuard");
  assert.deepEqual(
    rows,
    [],
    `expected the qualified compound runStaticGuard to pass — \`static\` co-occurs, so \`guard\` is the blessed different word; got:\n${JSON.stringify(rows)}`
  );
});

// -------------------------------------------------------------------------
// @SCN-VOC-002 — coverage-matrix completeness (a zero-flag surface still a row)
// @SCN-VOC-002
// -------------------------------------------------------------------------

// @SCN-VOC-002
Given("a fixture corpus that flags a word on one surface only", function () {
  // tests/fixtures/vocab — carries flags on code/identifier surfaces but NONE on
  // json-keys / ci.yml / feature / step-defs (no such files in the corpus).
});

// @SCN-VOC-002
When("the vocabulary audit renders the coverage matrix over the corpus", function () {
  const repoRoot = process.cwd();
  const outDir = mkdtempSync(join(tmpdir(), "spec-controller-voc002-"));
  const matrixPath = join(outDir, "matrix.md");
  const argv = [
    join(repoRoot, "packages", "spec-controller", "static-checks", "vocabAuditCli.ts"),
    "--root",
    join(repoRoot, VOCAB_FIXTURE_ROOT),
    "--matrix",
    matrixPath,
  ];
  const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), argv, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.equal(result.status, 0, `expected exit 0; got ${result.status}\n${result.stderr}`);
  matrixMd = readFileSync(matrixPath, "utf8");
});

// @SCN-VOC-002
Then("the coverage matrix lists every scanned surface as a row", function () {
  for (const surface of SURFACES) {
    assert.ok(
      matrixMd.includes(`| ${surface} |`),
      `expected the coverage matrix to list surface "${surface}" as a row; matrix:\n${matrixMd}`
    );
  }
});

// @SCN-VOC-002
Then("a surface with zero flagged words is present with a zero count", function () {
  // json-keys is a scanned surface but the corpus has no JSON files → zero flags.
  const row = matrixMd.split("\n").find((l) => l.startsWith("| json-keys |"));
  assert.ok(row, `expected a json-keys row in the matrix; matrix:\n${matrixMd}`);
  const cells = row!.split("|").map((c) => c.trim());
  assert.equal(
    cells[2],
    "0",
    `expected the json-keys row to carry a zero flag count; row was: ${row}`
  );
});
