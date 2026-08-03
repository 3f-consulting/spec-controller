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
import {
  BLOCKED_VOCABULARY_ROWS,
  VENDORED_TABLE_PATH,
  type BlockedVocabularyRow,
} from "../../packages/spec-controller/static-checks/blockedVocabulary.js";

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

// -------------------------------------------------------------------------
// @SCN-VOC-010 — the enforced term set is the vendored canon table's adopted rows
// @SCN-VOC-010
// -------------------------------------------------------------------------

/**
 * The two terms this arm plants, NAMED rather than picked by position.
 *
 * Reading "the first adopted row" out of the table would make the corpus depend on row
 * ORDER, so a re-ordered table would silently change what the scenario proves. Naming
 * them keeps the premise checkable: the `Given` asserts the vendored table records these
 * exact statuses before anything is planted, so a table that stopped saying so fails at
 * the premise instead of quietly proving something else.
 */
const VOC010_ADOPTED_TERM = "budget";
/**
 * `undeclared` replaced `undemanded` here at 3F-2342. The `undemanded` row was ADOPTED by
 * that ticket once 3F-2300 finished renaming the outcome handle, so it is enforced now and
 * this arm's deferred half would have failed at its own `Given` — loudly, on the asserted
 * premise, which is the behaviour that made the swap safe to make rather than a silent
 * green. `undeclared` is the same shape one row up: a term on a still-deferred row (3F-2329
 * pays it) that is independently APPROVED, so its green means "the deferral holds" rather
 * than "the word is merely unrecognised".
 */
const VOC010_DEFERRED_TERM = "undeclared";

/** Both terms in NAME position — the discriminating mode, where an unapproved word flags. */
const VOC010_PLANT_PATH = "src/vendoredTerms.ts";
const VOC010_PLANT =
  "export const complexityBudget = 1;\nexport const undeclaredOutcome = 2;\n";

/** The vendored row carrying `term`, or undefined — the premise each assertion below states. */
function vendoredRowFor(term: string): BlockedVocabularyRow | undefined {
  return BLOCKED_VOCABULARY_ROWS.find((row) => row.terms.includes(term));
}

// @SCN-VOC-010
Given(
  "the vendored blocked-vocabulary table marks one term adopted and another deferred",
  function () {
    // THE PREMISE, ASSERTED. Both halves of this scenario are read off the committed
    // table, so if the table stopped recording these statuses the arm must fail HERE —
    // never pass on a corpus that no longer demonstrates anything.
    const adopted = vendoredRowFor(VOC010_ADOPTED_TERM);
    assert.ok(
      adopted,
      `the vendored table must carry a row for \`${VOC010_ADOPTED_TERM}\`; it carries ` +
        `${BLOCKED_VOCABULARY_ROWS.length} row(s)`
    );
    assert.equal(
      adopted!.status,
      "adopted",
      `\`${VOC010_ADOPTED_TERM}\` must be recorded ADOPTED for this arm to prove anything; ` +
        `the table records "${adopted!.status}"`
    );
    const deferred = vendoredRowFor(VOC010_DEFERRED_TERM);
    assert.ok(
      deferred,
      `the vendored table must carry a row for \`${VOC010_DEFERRED_TERM}\`; it carries ` +
        `${BLOCKED_VOCABULARY_ROWS.length} row(s)`
    );
    assert.equal(
      deferred!.status,
      "deferred",
      `\`${VOC010_DEFERRED_TERM}\` must be recorded DEFERRED — the half that makes the status ` +
        `column mean anything; the table records "${deferred!.status}"`
    );

    const dir = mkdtempSync(join(tmpdir(), "spec-controller-voc010-"));
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, VOC010_PLANT_PATH), VOC010_PLANT);
    gitIn(dir, "init", "-q", "-b", "main");
    gitIn(dir, "add", VOC010_PLANT_PATH);
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
    corpusRoot = dir;
  }
);

// @SCN-VOC-010
When("the vocabulary audit runs over a corpus carrying both terms", function () {
  auditRun = spawnAudit(corpusRoot, "--manifest", "manifest.csv");
});

// @SCN-VOC-010
Then("the adopted term is flagged", function () {
  const rows = parseManifest(manifestCsv()).filter(
    (r) => r["current"] === VOC010_ADOPTED_TERM && r["file"] === VOC010_PLANT_PATH
  );
  assert.ok(
    rows.length > 0,
    `the vendored table records \`${VOC010_ADOPTED_TERM}\` ADOPTED, so a planted usage must ` +
      `reach the manifest; it did not:\n${manifestCsv()}`
  );
});

// @SCN-VOC-010
Then("the deferred term is not flagged", function () {
  // CONTROL PROBE — the plant's presence is proven by the assertion above, which reads the
  // SAME file. So an absent row here is the audit's verdict on a term it really scanned,
  // never a corpus that failed to land.
  const rows = parseManifest(manifestCsv()).filter((r) => r["current"] === VOC010_DEFERRED_TERM);
  assert.deepEqual(
    rows,
    [],
    `the vendored table records \`${VOC010_DEFERRED_TERM}\` DEFERRED, so it must NOT be ` +
      `enforced — a parser that enforced every row would red this tree on 2,272 occurrences; ` +
      `got:\n${JSON.stringify(rows)}`
  );
});

// -------------------------------------------------------------------------
// @SCN-VOC-011 — a table row with no adoption status reds the build
// @SCN-VOC-011
// -------------------------------------------------------------------------

/**
 * The row this arm blanks, NAMED rather than picked by position — the @SCN-VOC-010
 * reasoning, for the same reason: reading "the first row" would make the assertion depend
 * on table ORDER, so a re-ordered table would silently change what the scenario proves.
 */
const VOC011_BLANKED_ROW = "budget";

/** What the real `lint:blocked-vocabulary` CLI did over the table it was pointed at. */
let statusCheckRun: { status: number | null; stdout: string; stderr: string };

/** The planted table — a COPY, so the run never mutates the repository it runs inside. */
let plantedTablePath: string;

/**
 * Drive the REAL check over `tablePath` and return the whole run.
 *
 * A real spawn of the real CLI, never an in-memory re-run of `checkAdoptionStatuses` — the
 * anti-watermelon rule. An in-memory re-run would green even if the CLI never called the
 * check, exited 0 on a fault, or printed a sentence naming nothing.
 */
function spawnStatusCheck(tablePath: string): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const repoRoot = process.cwd();
  const argv = [
    join(repoRoot, "packages", "spec-controller", "static-checks", "lintBlockedVocabularyCli.ts"),
    "--table",
    tablePath,
  ];
  const result = spawnSync(join(repoRoot, "node_modules", ".bin", "tsx"), argv, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** The vendored table's markdown with `term`'s Adoption status cell emptied. */
function tableWithBlankedStatus(markdown: string, term: string): string {
  const planted = markdown
    .split("\n")
    .map((line) => {
      const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
      if (cells.length !== 5) return line;
      if (!cells[0]!.toLowerCase().includes(term)) return line;
      cells[3] = "  ";
      return `|${cells.join("|")}|`;
    })
    .join("\n");
  assert.notEqual(planted, markdown, `the plant must change the \`${term}\` row`);
  return planted;
}

// @SCN-VOC-011
Given(
  "the vendored blocked-vocabulary table carries a row with no adoption status",
  function () {
    // THE CONTROL, RUN FIRST. The vendored table as committed must PASS, so the red below
    // can only come from the blanked cell. Without this, a check that reds on everything
    // and a check that reds on the right thing are indistinguishable — and a silently
    // broken check looks exactly like a valid table.
    const control = spawnStatusCheck(VENDORED_TABLE_PATH);
    assert.equal(
      control.status,
      0,
      `the vendored table as committed must PASS the status check, so that the red this ` +
        `scenario asserts can only come from the blanked cell; it exited ${control.status}\n` +
        `stdout:\n${control.stdout}\nstderr:\n${control.stderr}`
    );
    // THE PREMISE, ASSERTED. The blanked row must exist and must be triaged BEFORE the
    // plant, or the scenario would be blanking nothing and proving nothing.
    const before = BLOCKED_VOCABULARY_ROWS.find((row) => row.terms.includes(VOC011_BLANKED_ROW));
    assert.ok(
      before,
      `the vendored table must carry a row for \`${VOC011_BLANKED_ROW}\`; it carries ` +
        `${BLOCKED_VOCABULARY_ROWS.length} row(s)`
    );
    assert.notEqual(before!.status, null, `\`${VOC011_BLANKED_ROW}\` must be triaged before the plant`);

    const dir = mkdtempSync(join(tmpdir(), "spec-controller-voc011-"));
    plantedTablePath = join(dir, "blockedVocabulary.md");
    writeFileSync(
      plantedTablePath,
      tableWithBlankedStatus(readFileSync(VENDORED_TABLE_PATH, "utf8"), VOC011_BLANKED_ROW)
    );
  }
);

// @SCN-VOC-011
When("the blocked-vocabulary status check runs", function () {
  statusCheckRun = spawnStatusCheck(plantedTablePath);
});

// @SCN-VOC-011
Then("it reds naming the row that has no status", function () {
  assert.notEqual(
    statusCheckRun.status,
    0,
    `a row with no adoption status enforces nothing, so it must RED; the check exited 0\n` +
      `stdout:\n${statusCheckRun.stdout}`
  );
  const said = `${statusCheckRun.stdout}${statusCheckRun.stderr}`;
  assert.ok(
    said.includes(VOC011_BLANKED_ROW),
    `the red must name WHICH row, not "the table is invalid"; it never said ` +
      `\`${VOC011_BLANKED_ROW}\`:\n${said}`
  );
  assert.ok(
    said.includes("no adoption status"),
    `the red must name WHAT is missing from that row; it did not:\n${said}`
  );
  assert.ok(
    said.includes("1 row(s)"),
    `only the blanked row must red — every other row of the vendored table is triaged, so a ` +
      `wider red would mean the check is not reading the cell it claims to:\n${said}`
  );
});

// -------------------------------------------------------------------------
// @SCN-VOC-013 — the Gherkin tag line: author-chosen vocabulary vs the tag grammar
// @SCN-VOC-013
// -------------------------------------------------------------------------

/** The planted feature file, TRACKED so git returns it to the audit. */
const VOC013_FEATURE_PATH = "features/tag-shapes.feature";

/**
 * ONE tag line carrying every shape the measured tree actually contains — the retired tag
 * `@ci-performance` beside the four protected shapes. They share a line deliberately: the
 * red half and the four green halves must be produced by the SAME walk over the SAME line,
 * or each could be true of a different code path.
 */
const VOC013_FEATURE = [
  "@TGT",
  "Feature: a corpus whose tag lines carry every measured shape",
  "",
  "  Rule: the shapes coexist on one tag line",
  "",
  "    @unit @lint=guard:domain-purity @ci-performance @SCN-TGT-001",
  "    Scenario: the shapes coexist",
  "      Given a step",
  "",
].join("\n");

// @SCN-VOC-013
Given(
  "a feature corpus whose tag lines carry a retired term alongside a scenario id, a feature code, a tier tag and a lint handle",
  function () {
    const dir = mkdtempSync(join(tmpdir(), "spec-controller-voc013-"));
    mkdirSync(join(dir, "features"));
    writeFileSync(join(dir, VOC013_FEATURE_PATH), VOC013_FEATURE);
    gitIn(dir, "init", "-q", "-b", "main");
    gitIn(dir, "add", VOC013_FEATURE_PATH);
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

    // CONTROL PROBE — the premise, asserted rather than assumed. Four of this scenario's
    // five assertions are NEGATIVE, and a corpus git never returned would satisfy every one
    // of them for the wrong reason. (The positive assertion below reads the SAME file, so it
    // is the running control that the file was scanned at all.)
    const tracked = gitIn(dir, "ls-files", "--cached", "--others", "--exclude-standard")
      .split("\n")
      .filter((l) => l !== "");
    assert.ok(
      tracked.includes(VOC013_FEATURE_PATH),
      `git must return the planted feature file; it returned:\n${tracked.join("\n")}`
    );

    corpusRoot = dir;
  }
);

/** The manifest rows the planted feature file produced, whatever their surface. */
function voc013Rows(): Record<string, string>[] {
  return parseManifest(manifestCsv()).filter((r) => r["file"] === VOC013_FEATURE_PATH);
}

// @SCN-VOC-013
Then("the retired term on the tag line is flagged", function () {
  // THE WHOLE POINT, and the ONLY assertion a plant can make: the tree carries zero retired
  // terms on tag lines, so a green run over it proves nothing — the surface returned zero
  // either way. `pnpm audit:vocab` also always exits 0, so its status is no evidence here.
  const rows = voc013Rows().filter((r) => r["current"] === "ci");
  assert.ok(
    rows.length > 0,
    `the retired tag \`@ci-performance\` sits on a Gherkin tag line and must reach the ` +
      `manifest; the audit reported:\n${manifestCsv()}`
  );
  assert.equal(
    rows[0]!["new"],
    "ci-run-time",
    `the retired tag renames to the canon \`ci-run-time\`; got "${rows[0]!["new"]}"`
  );
});

// @SCN-VOC-013
Then("the scenario id is not flagged", function () {
  const rows = voc013Rows().filter((r) => (r["symbol"] ?? "").toUpperCase().includes("SCN"));
  assert.deepEqual(
    rows,
    [],
    `an @SCN-<FFF>-<NNN> id is an ID scheme, not vocabulary, and must earn no row; got:\n` +
      `${JSON.stringify(rows)}`
  );
});

// @SCN-VOC-013
Then("the feature-code header tag is not flagged", function () {
  const rows = voc013Rows().filter((r) => (r["symbol"] ?? "").toUpperCase() === "TGT");
  assert.deepEqual(
    rows,
    [],
    `the @<FFF> feature-code header tag is the same ID scheme one slot up — allocated in ` +
      `featureCodes.ts's REGISTRY — and must earn no row; got:\n${JSON.stringify(rows)}`
  );
});

// @SCN-VOC-013
Then("the tier tag is not flagged", function () {
  const rows = voc013Rows().filter((r) => r["current"] === "unit");
  assert.deepEqual(
    rows,
    [],
    `a tier tag is Gherkin grammar (scnTags.ts's own isTierTag) and must earn no row; got:\n` +
      `${JSON.stringify(rows)}`
  );
});

// @SCN-VOC-013
Then("the lint handle value is not flagged", function () {
  // The measured one. `guard` is a FULL_TERM_ONLY word and `domain` / `purity` are not among
  // its ruled qualifiers, so a SCANNED handle would flag as `bare-different-word` — a row
  // per handle across the tree. 3F-1929 ruled the handle a value; 3F-1852 owns them.
  const rows = voc013Rows().filter(
    (r) => r["current"] === "guard" || (r["symbol"] ?? "").includes("guard")
  );
  assert.deepEqual(
    rows,
    [],
    `an @lint=<handle> value is a CI script name, not vocabulary, and must earn no row; ` +
      `got:\n${JSON.stringify(rows)}`
  );
});
