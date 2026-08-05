/**
 * CLI entry point for the vendored table's triage record — `pnpm lint:blocked-vocabulary`
 * (@SCN-VOC-011, 3F-2331), features/vocabulary-audit.feature.
 *
 * WHAT IT IS FOR. @SCN-VOC-010 made the enforced word set a DERIVATION of
 * `blockedVocabulary.md`, and gave each row an adoption status so an unadopted canon row
 * can stay out of the enforced set without being dropped from the table. That is what lets
 * this repository ship green against a canon table whose unadopted rows carry 2,272
 * occurrences — and it is also the obvious way to smuggle a row past everybody: leave the
 * status cell out and the row enforces nothing, in silence. This check is the half that
 * makes the deferral honest. Every row must carry exactly one of `adopted` / `deferred` /
 * `not-applicable`, and a `deferred` row must name the ticket that pays it and the date it
 * was deferred. A DEFERRAL WITHOUT A TICKET IS AN INTENTION, NOT A DECISION.
 *
 * IT READS THE PARSER'S VERDICT, IT DOES NOT RE-READ THE CELL. The status a row is judged
 * on is the one `parseBlockedVocabulary` produced, so a cell the DERIVATION cannot classify
 * is exactly the cell that reds. A second interpretation here could green a cell the
 * derivation had already given up on — the disagreement this whole slice exists to remove.
 *
 * WHY THE NAME CARRIES THE `lint:` PREFIX, WHICH IS NOT COSMETIC. `runningStaticChecks`
 * observes a CI script only when its name carries an observed prefix (`lint:` / `guard:`).
 * A name outside that set would run in CI while being structurally invisible to
 * spec-controller's own ledger — a real quality check kept off the books. The
 * `@lint=lint:blocked-vocabulary` tag on @SCN-VOC-011 is then what keeps it out of the
 * suspense row as an uncited static check. Observed AND NAMED is what balances
 * (the @SCN-CPX-003 precedent, 3F-2318).
 *
 * FLAGS: `--table <path>` reads a table other than the vendored one. CI passes nothing, so
 * the gate is always the committed table; the flag exists so the @integration arm can plant
 * a fault in a COPY rather than mutate the repository it is running inside.
 */

import { readFileSync } from "node:fs";
import {
  VENDORED_TABLE_PATH,
  checkAdoptionStatuses,
  parseBlockedVocabulary,
  type AdoptionStatus,
  type BlockedVocabularyRow,
} from "./blockedVocabulary.js";

/** `--table <path>`, or the vendored table when nothing is asked for. */
function tablePathFrom(argv: readonly string[]): string {
  const at = argv.indexOf("--table");
  if (at === -1) return VENDORED_TABLE_PATH;
  const given = argv[at + 1];
  if (given === undefined) {
    console.error("blocked-vocabulary lint: --table needs a path");
    process.exit(2);
  }
  return given;
}

/** `4 adopted, 3 deferred, 1 not-applicable` — the triage record, counted not asserted. */
function tally(rows: readonly BlockedVocabularyRow[]): string {
  const order: readonly AdoptionStatus[] = ["adopted", "deferred", "not-applicable"];
  return order
    .map((status) => `${rows.filter((row) => row.status === status).length} ${status}`)
    .join(", ");
}

const tablePath = tablePathFrom(process.argv.slice(2));
const rows = parseBlockedVocabulary(readFileSync(tablePath, "utf8"));
const faults = checkAdoptionStatuses(rows);

if (faults.length === 0) {
  console.log(
    `blocked-vocabulary lint: OK — all ${rows.length} row(s) of ${tablePath} carry a triaged ` +
      `adoption status (${tally(rows)}), and every deferral names its ticket and its date.`
  );
  process.exit(0);
}

console.error(
  `blocked-vocabulary lint: FAILED — ${faults.length} row(s) of ${tablePath} do not say what ` +
    `this repository decided about them. A row with no status is indistinguishable from one ` +
    `deliberately deferred, and a deferral with no ticket is an intention, not a decision:`
);
for (const fault of faults) {
  console.error(`  ${fault.message}`);
}
console.error("");
console.error(
  "  Fix: give every row exactly one of `adopted` / `deferred` / `not-applicable` in its " +
    "Adoption status cell, and give every deferral the date it was deferred and the ticket " +
    "that pays it."
);
process.exit(1);
