/**
 * The Gherkin VALIDATOR — the feature corpus's integrity checkpoint (@SCN-CLI-016, 3F-1767).
 *
 * WHY THIS EXISTS. The feature corpus is the ledger's DEBIT side, and it was read by a
 * hand-rolled TAG-LINE SCAN (`parseScenarios`) that never looked for a `Scenario:` header at
 * all: a scenario EXISTED purely because an `@SCN-FFF-NNN` tag line did. So a
 * malformed tag line simply STOPPED BEING A TAG LINE, and its scenario ceased to exist —
 * silently. One stray character, in a file cucumber itself rejects, deleted a failing row and
 * turned an out-of-balance run (exit 1) into a clean BALANCED (exit 0). A dropped scenario
 * cannot even reconcile `missing`, because it was never raised to be missing: the run reads
 * CLEANER THAN REALITY. That is the false-green this tool exists to prevent, aimed at itself.
 *
 * THE FIX (this slice). VALIDATE every feature file with the REAL Gherkin parser — the same one
 * cucumber uses. A file the parser rejects is an input the tool CANNOT READ, and the CLI refuses
 * it: exit 2, halting before reconciling (@SCN-CLI-014/015's Rule — "an input the tool cannot read
 * is a usage error, never a verdict" — extended from the OBSERVATION side to the OBLIGATION side).
 *
 * VALIDATION IS HALF THE STORY. This decides whether a feature file can be READ at all; the corpus
 * is then EXTRACTED from the same real AST by `parseScenarios` (@SCN-LDG-020, 3F-1775), so the
 * scenarios spec-controller reconciles carry exactly the tags cucumber gives them — Feature/Rule
 * tag inheritance included. One reading of the file, not two.
 *
 * PURE: `string → parse errors`. No fs, no process — the file READ lives beside it at the ingest
 * edge, as it does for every other input.
 *
 * WHY IT LIVES IN THE APP, NOT CORE. Core's barrel is the v1 contract surface downstream consumers
 * build on. Since 3F-3449 nothing reds when a symbol is added there — the guard that reconciled it
 * both directions is gone — so keeping it narrow is a discipline rather than a gate. This validator
 * is an INGEST concern (it decides whether an input can be read at all), not part of the
 * reconciliation contract, so it belongs with the other readers at the app edge and the v1 surface
 * stays untouched.
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
 * cucumber would refuse to RUN, so a scenario corpus built from it would be a FICTION — which is
 * precisely how a corrupt spec used to read balanced.
 *
 * A parse failure is reported, never thrown: the CLI edge routes it to stderr + exit 2 (the
 * shared typed-error surface), so it can never reach Node's default exit 1 and masquerade as an
 * out-of-balance verdict (@SCN-CLI-014's collision, on the obligation side).
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

/**
 * The corpus-level REFUSAL (@SCN-GPG-001, 3F-2817). A parse failure is reported per file by
 * `parseErrorsIn` above; this is how a reader of the WHOLE corpus says no.
 *
 * WHY IT CARRIES EVERY FILE. The balance CLI already names every unparseable file it found
 * (@SCN-CLI-016), and a refusal raised at the first bad one would silently narrow that message —
 * a behaviour change dressed as an implementation detail. So the discovery collects the corpus
 * and refuses ONCE, carrying the lot in discovery order.
 *
 * The rendered message is the parser's words, per file, verbatim: a reader must be told WHAT
 * broke by the parser rather than by our paraphrase of it.
 */
export class UnreadableFeatureCorpusError extends Error {
  readonly errors: readonly GherkinParseError[];

  constructor(errors: readonly GherkinParseError[]) {
    super(
      [
        "The feature corpus contains a file that could not be parsed as Gherkin:",
        ...errors.map(({ file, message }) => `${file}\n${message}`),
      ].join("\n")
    );
    this.name = "UnreadableFeatureCorpusError";
    this.errors = errors;
  }
}

/**
 * The corpus-level ABSENCE refusal (@SCN-CLI-017, 3F-3345) — sibling to the parse refusal above,
 * and deliberately the same shape: the reader refuses ONCE, and each command decides what the
 * refusal means for it.
 *
 * WHY A TYPED ERROR RATHER THAN AN EMPTY CORPUS. The obvious fix is for `discoverFeatures` to hand
 * back `[]` when the directory is not there, and that would decide for every reader that absence
 * is empty. Typed, each caller decides: `balance` reads it as no corpus (@SCN-CLI-017), and any
 * other reader still meets a refusal. (The second command this guarded, `tags`, left at 3F-3635.)
 *
 * IT CARRIES THE DIRECTORY because the report is owed the name of what it examined — "I found no
 * record" and "I found no regression" must never wear one word (3F-2947), and a consumer told
 * their corpus is empty deserves to know which directory was read to reach that.
 */
export class MissingFeatureCorpusError extends Error {
  /** The directory that is not there — as resolved, so a reader can print the path examined. */
  readonly directory: string;

  constructor(directory: string) {
    super(`The feature corpus directory does not exist: ${directory}`);
    this.name = "MissingFeatureCorpusError";
    this.directory = directory;
  }
}
