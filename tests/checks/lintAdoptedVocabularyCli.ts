/**
 * The TREE-ENFORCEMENT gate — `lint:adopted-vocabulary` (@SCN-VOC-014, 3F-2343).
 *
 * The third vocabulary check, with a subject neither sibling has. `audit:vocab` says what
 * is in the tree and exits 0 however much it finds — it is a report, and its one non-zero
 * exit is reserved for "I could not scan" (@SCN-VOC-009), a distinction that must not be
 * collapsed. `lint:blocked-vocabulary` says the vendored table's triage is honest — every
 * row carries a status, every deferral names a ticket (@SCN-VOC-011). Neither says the
 * TREE OBEYS THE TRIAGE, so an adopted word could regrow silently, and one nearly did:
 * 3F-2340's comment rewrite brought back a term from an adopted row, caught by a hand-run
 * manifest diff rather than by CI. A purge only a human diff protects is honour.
 *
 * A FILTER, NOT A SECOND ENGINE. The classification is `vocabAudit`'s — this module reads
 * its manifest rows and keeps the ones an ADOPTED canon row bans (`isAdoptedOccurrence`).
 * The file set is `vocabAuditCli`'s `scanFiles` — git's answer minus the audit's own
 * machinery — so the self-exempt blind spot is inherited from @SCN-VOC-008 rather than
 * restated, and there is no second answer to "what is the project" to drift from the
 * first. Both re-implementations are the agreeing-by-copy this feature has removed twice.
 *
 * Parent: 3F-2343.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { auditFiles, type ManifestRow } from "./vocabAudit.js";
import { adoptedTriggerWords } from "./blockedVocabulary.js";
import {
  gitWorkTreeAnswer,
  insideWorkTree,
  notAWorkTreeMessage,
  scanFiles,
} from "./vocabAuditCli.js";

/** One adopted-row occurrence the gate reds on. */
export interface AdoptedOccurrence {
  file: string;
  line: number;
  /** The flagged word. */
  word: string;
  /** The containing name/token it came from. */
  symbol: string;
}

/**
 * The manifest rows an adopted canon row bans, in the engine's own order.
 *
 * A row counts when its flagged WORD is an adopted trigger (`adoptedTriggerWords`, derived
 * from the canon table's status column). Keying on the word rather than the flag reason is
 * what keeps `vocabAudit.ts` untouched — it is frozen at its `max-lines` exception, and an
 * exception buys no headroom — and it is sound because each phrase trigger is an approved
 * word on its own, so the phrase arm is the only path by which it can reach the manifest.
 * The @unit arm pins that, rather than leaving it an incidental property.
 *
 * Pure over injected rows so the @unit arm can prove the filter without a tree: which rows
 * survive is the gate's entire judgement, and over the real tree it is unobservable today
 * (the adopted terms measure ZERO occurrences, which is why the gate can land green at
 * all). A green run is therefore consistent with this filter being broken in either
 * direction — so it is proven against constructed input, not inferred from a passing build.
 */
export function adoptedOccurrences(
  rows: readonly ManifestRow[],
  triggers: ReadonlySet<string>,
): AdoptedOccurrence[] {
  return rows
    .filter((row) => triggers.has(row.current.toLowerCase()))
    .map((row) => ({ file: row.file, line: row.line, word: row.current, symbol: row.symbol }));
}

/**
 * What the operator is told when the gate reds — the DELIVERABLE, not decoration. The exit
 * code says a retired word came back; this says WHICH, WHERE, and what to write instead, so
 * the red is actionable without re-running the audit by hand. Pure, so the @unit arm can
 * pin that the file, the line and the term all appear.
 */
export function adoptedOccurrenceReport(occurrences: readonly AdoptedOccurrence[]): string {
  if (occurrences.length === 0) return "";
  const lines = [
    `adopted-vocabulary lint: FAILED — ${occurrences.length} occurrence(s) of a retired term ` +
      `this repository has ADOPTED are back in the tracked tree:`,
  ];
  for (const found of occurrences) {
    lines.push(`  ${found.file}:${found.line} — "${found.word}" in ${found.symbol}`);
  }
  lines.push(
    "Each is a row marked `adopted` in tests/checks/blockedVocabulary.md; that row's " +
      '"Always write" cell names what to write instead. A deferred row would not appear here.',
  );
  return lines.join("\n");
}

/** Read a `--flag value` pair from argv, or undefined when the flag is absent. */
function flag(argv: string[], name: string): string | undefined {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return undefined;
  const value = argv[at + 1];
  return value !== undefined && !value.startsWith("--") ? value : undefined;
}

/**
 * The gate. Asks git what the project is under `--root` (default the working directory,
 * i.e. the repository in CI), classifies it with the audit engine, and reds on the
 * occurrences an adopted canon row bans.
 *
 * The work-tree precondition is @SCN-VOC-009's, reused rather than restated: outside a work
 * tree there is no honest file set, and scanning anyway would report a clean tree for a
 * directory the gate could not read — a false green, which is worse here than in the audit
 * because this one gates a build.
 */
export function runAdoptedVocabularyLint(argv: string[]): void {
  const root = flag(argv, "root") ?? ".";

  if (!insideWorkTree(gitWorkTreeAnswer(root))) {
    console.error(notAWorkTreeMessage(root));
    process.exitCode = 2;
    return;
  }

  const relPaths = scanFiles(root);
  const files = relPaths.map((path) => ({ path, content: readFileSync(join(root, path), "utf8") }));
  const { manifest } = auditFiles(files);
  const found = adoptedOccurrences(manifest, adoptedTriggerWords());

  if (found.length === 0) {
    console.log(
      `adopted-vocabulary lint: OK — no adopted retired term occurs in the ${relPaths.length} ` +
        `file(s) git reports for the project (the audit's own machinery excluded).`,
    );
    return;
  }

  console.error(adoptedOccurrenceReport(found));
  process.exitCode = 1;
}

// Run only when invoked as the script, so the @unit arm can import the pure helpers above
// without the gate scanning a tree as a side effect of the import.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) runAdoptedVocabularyLint(process.argv.slice(2));
