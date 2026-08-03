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
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { SURFACES } from "../../packages/spec-controller/static-checks/vocabAudit.js";

const VOCAB_FIXTURE_ROOT = "tests/fixtures/vocab";
let matrixMd: string;

/**
 * The corpus the shared `When` drives the CLI over — set by each scenario's `Given`.
 *
 * The `When` step text is shared by every scenario in this feature, so the root cannot be
 * baked into it: @SCN-VOC-001/002 drive the on-disk fixture corpus, @SCN-VOC-008 drives a
 * throwaway git repository built by its own `Given`, and @SCN-VOC-009 drives a directory
 * that is deliberately NOT one. Each `Given` states its own root, so no scenario inherits a
 * leftover from the one before it.
 */
let corpusRoot: string;

/** What the last shared `When` observed — read by the success arms AND by the refusal arm. */
let auditRun: AuditRun;

/** The on-disk fixture corpus, absolute — the root @SCN-VOC-001/002 audit. */
function fixtureCorpusRoot(): string {
  return join(process.cwd(), VOCAB_FIXTURE_ROOT);
}

/**
 * One real CLI run, observed whole: the exit status, both streams, and the artefact path it
 * was asked to write to.
 *
 * The shape exists because @SCN-VOC-009 asserts on a run that must NOT succeed, so the
 * exit-0 assertion cannot live in the spawn any more — it moves to `artefactOf`, where the
 * success arms read their artefact. Nothing is weakened: a non-zero exit still fails
 * @SCN-VOC-001/002/008, just one call later and with the same sentence.
 */
type AuditRun = {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly outPath: string;
};

/**
 * Drive the REAL CLI over `root`, asking it for one artefact, and return the whole run.
 *
 * A real spawn over real files on disk, never an in-memory re-run of the engine — the
 * anti-watermelon rule, and the only thing that proves the CLI's own file-selection. The
 * artefact directory is FRESH per run, so "the audit emitted nothing" is a readable
 * property of the directory rather than a guess about leftovers.
 */
function spawnAudit(root: string, flag: "--manifest" | "--matrix", outName: string): AuditRun {
  const repoRoot = process.cwd();
  const outDir = mkdtempSync(join(tmpdir(), "spec-controller-vocab-out-"));
  const outPath = join(outDir, outName);
  const argv = [
    join(repoRoot, "packages", "spec-controller", "static-checks", "vocabAuditCli.ts"),
    "--root",
    root,
    flag,
    outPath,
  ];
  const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), argv, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    outPath,
  };
}

/** The artefact a SUCCESSFUL run wrote — the exit-0 expectation asserted before the read. */
function artefactOf(run: AuditRun): string {
  assert.equal(
    run.status,
    0,
    `expected exit 0 running the audit; got ${run.status}\nstderr:\n${run.stderr}`
  );
  return readFileSync(run.outPath, "utf8");
}

/** The manifest the shared `When` produced — read only by the arms that expect a scan. */
function manifestCsv(): string {
  return artefactOf(auditRun);
}

// @SCN-VOC-001
Given(
  "a fixture corpus carrying a banned word in an identifier and an approved word in another",
  function () {
    // tests/fixtures/vocab/buildSupply.ts (banned `supply`) +
    // tests/fixtures/vocab/render/scenarioLedger.ts (all-approved) — on disk.
    corpusRoot = fixtureCorpusRoot();
  }
);

// @SCN-VOC-001
// @SCN-VOC-008
// @SCN-VOC-009
When("the vocabulary audit runs over the corpus", function () {
  auditRun = spawnAudit(corpusRoot, "--manifest", "manifest.csv");
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
  const rows = parseManifest(manifestCsv());
  const supplyRow = rows.find(
    (r) => r["current"] === "supply" && (r["symbol"] ?? "").includes("buildSupply")
  );
  assert.ok(
    supplyRow,
    `expected a manifest row flagging \`supply\` in buildSupply; got:\n${manifestCsv()}`
  );
  assert.equal(
    supplyRow!["new"],
    "evidence observation",
    `expected the canonical replacement "evidence observation"; got "${supplyRow!["new"]}"`
  );
});

// @SCN-VOC-001
Then("the approved name is not flagged", function () {
  const rows = parseManifest(manifestCsv());
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
  const rows = guardRowsFor(manifestCsv(), "runGuard").filter(
    // `runStaticGuard` contains `runGuard` as a substring only under a loose match;
    // pin the bare arm exactly so the qualified arm can never satisfy this assertion.
    (r) => r["symbol"] === "runGuard"
  );
  assert.ok(
    rows.length > 0,
    `expected a manifest row flagging bare \`guard\` in runGuard; got:\n${manifestCsv()}`
  );
  assert.equal(
    rows[0]!["action"],
    "review",
    `a bare \`guard\` is the different word used alone, not necessarily a shortening, so it is flagged for REVIEW, never auto-renamed; got action "${rows[0]!["action"]}"`
  );
});

// @SCN-VOC-001
Then('the qualified "static guard" is not flagged', function () {
  const rows = guardRowsFor(manifestCsv(), "runStaticGuard");
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
  corpusRoot = fixtureCorpusRoot();
});

// @SCN-VOC-002
When("the vocabulary audit renders the coverage matrix over the corpus", function () {
  matrixMd = artefactOf(spawnAudit(corpusRoot, "--matrix", "matrix.md"));
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

// -------------------------------------------------------------------------
// @SCN-VOC-008 — the audit scans the project git tracks, never build output
// @SCN-VOC-008
// -------------------------------------------------------------------------

/** The planted file's path inside the throwaway corpus — TRACKED, so git returns it. */
const VOC008_TRACKED_PATH = "src/buildSupply.ts";
/** The same word again under a gitignored directory — git must NOT return it. */
const VOC008_IGNORED_PATH = "dist/buildSupply.ts";
/** One source, planted twice — the same banned `supply` in both locations. */
const VOC008_PLANT = 'export function buildSupply(): string {\n  return "supply";\n}\n';

/** Run git inside the throwaway corpus, failing loudly rather than silently. */
function gitIn(dir: string, ...args: string[]): string {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" });
}

// @SCN-VOC-008
Given(
  "a corpus carrying a banned word in a tracked file and the same word under a gitignored path",
  function () {
    const dir = mkdtempSync(join(tmpdir(), "spec-controller-voc008-"));
    mkdirSync(join(dir, "src"));
    mkdirSync(join(dir, "dist"));
    // A REAL .gitignore read by REAL git — the whole point of the arm. Nothing here
    // re-implements ignore semantics; the corpus states them and git applies them.
    writeFileSync(join(dir, ".gitignore"), "dist/\n");
    writeFileSync(join(dir, VOC008_TRACKED_PATH), VOC008_PLANT);
    writeFileSync(join(dir, VOC008_IGNORED_PATH), VOC008_PLANT);
    gitIn(dir, "init", "-q", "-b", "main");
    gitIn(dir, "add", ".gitignore", VOC008_TRACKED_PATH);
    gitIn(
      dir,
      "-c",
      "user.email=corpus@example.invalid",
      "-c",
      "user.name=corpus",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-q",
      "-m",
      "corpus"
    );

    // CONTROL PROBE — the fixture's premise, asserted rather than assumed. Without it
    // an absent `dist/` row could mean the audit skipped it OR that the plant never
    // landed, and those two look identical in the manifest.
    assert.ok(
      existsSync(join(dir, VOC008_IGNORED_PATH)),
      `the gitignored plant must exist ON DISK, or its absence from the manifest proves nothing`
    );
    const tracked = gitIn(dir, "ls-files", "--cached", "--others", "--exclude-standard")
      .split("\n")
      .filter((l) => l !== "");
    assert.ok(
      tracked.includes(VOC008_TRACKED_PATH),
      `git must return the tracked plant; it returned:\n${tracked.join("\n")}`
    );
    assert.ok(
      !tracked.includes(VOC008_IGNORED_PATH),
      `git must NOT return the gitignored plant; it returned:\n${tracked.join("\n")}`
    );

    corpusRoot = dir;
  }
);

// @SCN-VOC-008
Then("the tracked occurrence is reported", function () {
  const rows = parseManifest(manifestCsv()).filter(
    (r) => r["current"] === "supply" && r["file"] === VOC008_TRACKED_PATH
  );
  assert.ok(
    rows.length > 0,
    `expected the banned word in the TRACKED file ${VOC008_TRACKED_PATH} to be reported; manifest:\n${manifestCsv()}`
  );
});

// @SCN-VOC-008
Then("the occurrence under the gitignored path is not", function () {
  const rows = parseManifest(manifestCsv()).filter((r) => (r["file"] ?? "").startsWith("dist/"));
  assert.deepEqual(
    rows,
    [],
    `the audit scans the project git tracks, so the same word under the gitignored ${VOC008_IGNORED_PATH} must never reach the manifest; got:\n${JSON.stringify(rows)}`
  );
});

// -------------------------------------------------------------------------
// @SCN-VOC-009 — outside a git work tree the audit refuses to scan rather than guess
// @SCN-VOC-009
// -------------------------------------------------------------------------

/** A banned `supply`, planted so the refusal is a REFUSAL and not merely an empty tree. */
const VOC009_PLANT_PATH = "src/buildSupply.ts";
const VOC009_PLANT = 'export function buildSupply(): string {\n  return "supply";\n}\n';

// @SCN-VOC-009
Given("a corpus directory that is not inside a git work tree", function () {
  const dir = mkdtempSync(join(tmpdir(), "spec-controller-voc009-"));
  mkdirSync(join(dir, "src"));
  // PLANTED ON PURPOSE. An empty directory would make the empty manifest ambiguous: nothing
  // to report and refusing to report are the same absence. With a banned word sitting in it,
  // the only way to emit no manifest is to have refused.
  writeFileSync(join(dir, VOC009_PLANT_PATH), VOC009_PLANT);

  // CONTROL PROBE — the fixture's PREMISE, asserted rather than assumed. `mkdtemp` writes
  // under $TMPDIR, which on macOS is a symlinked path resolving through /private/var; a
  // stray repository anywhere above it would make this directory a work tree after all and
  // the scenario would then pass for entirely the wrong reason. Ask git, once, here.
  const probe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.notEqual(
    probe.status,
    0,
    `the fixture root ${dir} must NOT be inside a git work tree, or this scenario proves nothing; ` +
      `git answered "${probe.stdout.trim()}" with status ${probe.status}`
  );

  corpusRoot = dir;
});

// @SCN-VOC-009
Then("it reports that it cannot determine the project's file set", function () {
  const output = auditRun.stdout + auditRun.stderr;
  // REAL OUTPUT, not merely an exit code. A CLI copied to, or invoked through, a path that
  // does not match `import.meta.url` no-ops silently and still exits 0/1 for its own
  // reasons (lived on 3F-2324) — so the message itself is the proof the tool ran and ruled.
  assert.ok(
    output.includes("cannot determine the project's file set"),
    `the audit must name the ACTUAL problem — it could not determine the project's file set — ` +
      `never a bare "scan failed"; it printed:\n${output}`
  );
  assert.ok(
    output.includes(corpusRoot),
    `the audit must name the ROOT IT TRIED (${corpusRoot}), so the operator knows which path ` +
      `is not in a work tree; it printed:\n${output}`
  );
});

// @SCN-VOC-009
Then("it exits non-zero without emitting a manifest", function () {
  assert.notEqual(
    auditRun.status,
    0,
    `a precondition failure exits NON-ZERO — distinct from a successful scan, which stays exit 0 ` +
      `however many words it flags; got ${auditRun.status}\nstdout:\n${auditRun.stdout}`
  );
  assert.ok(
    !existsSync(auditRun.outPath),
    `no manifest may exist at ${auditRun.outPath} — NOT EVEN AN EMPTY ONE, which anything reading ` +
      `the file afterwards cannot tell apart from a clean scan`
  );
  // The artefact directory is created fresh per run, so an empty listing is the strongest
  // available statement: no manifest, no matrix, nothing partially written.
  assert.deepEqual(
    readdirSync(dirname(auditRun.outPath)),
    [],
    `the audit must emit NO artefact at all when it refuses to scan`
  );
});
