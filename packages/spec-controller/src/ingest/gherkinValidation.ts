/**
 * The Gherkin VALIDATOR — the declared corpus's integrity checkpoint (@SCN-CLI-016, 3F-1767).
 *
 * WHY THIS EXISTS. The declared corpus is the ledger's DEBIT side, and it was read by a
 * hand-rolled TAG-LINE SCAN (`parseScenarios`) that never looked for a `Scenario:` header at
 * all: a scenario was "declared" purely because an `@SCN-FFF-NNN` tag line existed. So a
 * malformed tag line simply STOPPED BEING A TAG LINE, and its scenario ceased to exist —
 * silently. One stray character, in a file cucumber itself rejects, deleted a failing row and
 * turned an out-of-balance run (exit 1) into a clean BALANCED (exit 0). A dropped scenario
 * cannot even reconcile `missing`, because it was never declared to be missing: the run reads
 * CLEANER THAN REALITY. That is the false-green this tool exists to prevent, aimed at itself.
 *
 * THE FIX (this slice). VALIDATE every feature file with the REAL Gherkin parser — the same one
 * cucumber uses. A file the parser rejects is an input the tool CANNOT READ, and the CLI refuses
 * it: exit 2, halting before reconciling (@SCN-CLI-014/015's Rule — "an input the tool cannot read
 * is a usage error, never a verdict" — extended from the OBSERVED side to the DECLARED side).
 *
 * VALIDATED, NOT YET EXTRACTED. `parseScenarios` is unchanged: the corpus is still read by the
 * tag-line scan, and only its WELL-FORMEDNESS is checked here. So the tool does not yet reconcile
 * the same corpus cucumber runs — the tag scan ignores Gherkin's Feature/Rule TAG INHERITANCE, so
 * even a cleanly-parsing file can be read differently by the two. Validation cannot close that;
 * AST-based extraction is the follow-up (3F-1776). Claiming parity here would be a lie the tests
 * do not back.
 *
 * PURE: `string → parse errors`. No fs, no process — the file READ lives beside it at the ingest
 * edge, as it does for every other input.
 *
 * WHY IT LIVES IN THE APP, NOT CORE. Core's barrel is the FROZEN v1 contract surface, guarded
 * both directions by @SCN-API-001 — a symbol added there reds CI. This validator is an INGEST
 * concern (it decides whether an input can be read at all), not part of the reconciliation
 * contract downstream consumers build on, so it belongs with the other readers at the app edge
 * and the frozen surface stays untouched.
 */

import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

/** A Gherkin parse failure: the file could not be read as Gherkin at all. */
export interface GherkinParseError {
  /** The offending file, as supplied (the operator's locator — what to go and fix). */
  file: string;
  /** The parser's own message, verbatim — WHAT broke, in the parser's words. */
  message: string;
}

/**
 * Validate one `.feature` source with the real Gherkin parser. Returns the parse errors it
 * reports — empty when the file is well-formed Gherkin.
 *
 * The parser is authoritative BY CONSTRUCTION: it is cucumber's own. A file it rejects is one
 * cucumber would refuse to RUN, so a declared corpus built from it would be a FICTION — which is
 * precisely how a corrupt spec used to read balanced.
 *
 * A parse failure is reported, never thrown: the CLI edge routes it to stderr + exit 2 (the
 * shared typed-error surface), so it can never reach Node's default exit 1 and masquerade as an
 * out-of-balance verdict (@SCN-CLI-014's collision, on the declared side).
 *
 * @SCN-CLI-016 (3F-1773).
 */
export function parseErrorsIn(file: string, source: string): GherkinParseError[] {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());

  try {
    parser.parse(source);
    return [];
  } catch (err) {
    // The parser raises a CompositeParserException carrying every error it found; its message
    // is the operator's actionable payload (line, column, and what it expected). Reported
    // verbatim — the tool must not paraphrase the parser and risk describing a fault wrongly.
    const message = err instanceof Error ? err.message : String(err);
    return [{ file, message }];
  }
}
