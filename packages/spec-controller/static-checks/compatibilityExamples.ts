/**
 * THE COMPATIBILITY PAGE'S OWN EXAMPLES, RUN THROUGH THE READER THAT PAGE CLAIMS SUPPORT FROM
 * (@SCN-FIT-015, 3F-3175).
 *
 * `doc/compatibility.md` is a COMMITMENT: it names the configuration mechanisms a consumer may
 * build on, for how long, and what would break them. It shipped on 2026-09-05 and was falsified
 * the same day — two worked examples named entries this repository had deleted, and one promise
 * about a mechanism with "no replacement designed" outlived the replacement shipping. A commitment
 * page with nothing reconciling it to the tree is the single-entry fault this product is named for,
 * one level up.
 *
 * ═══ TWO QUESTIONS, BECAUSE ONE OF THEM ALONE IS VACUOUS AND THAT WAS MEASURED ═══
 *
 * The obvious check — *every manifest key the page names exists in our `package.json`* — is wrong.
 * The page CORRECTLY documents `checkRegistry` as supported for consumers who have not migrated,
 * while our own manifest no longer uses it at all; a check comparing the page against our usage
 * reds the moment we become the exemplar we are trying to be, and a check that reds for doing the
 * right thing is a check somebody deletes.
 *
 * THE SHAPE QUESTION — does the reader still accept this? — is the honest replacement for it, and
 * on its own it is not enough. Built first and run against the page as it stood: **clean, exit 0**,
 * over a page whose two worked examples both named scenarios this repository had deleted. The
 * resolvers accept any well-formed entry, because they are reading a CONSUMER's manifest and have
 * no opinion about whose scenarios it cites. So the shape question is real — it is what fails the
 * day the reader stops honouring a documented mechanism — and it says nothing at all about the
 * staleness this check was built for.
 *
 * THE CITATION QUESTION is what has teeth today: every `@SCN` the page names ANYWHERE, under a
 * feature code this repository has allocated, must exist in this repository's corpus. Both of the
 * page's stale examples fail it, and so does the substitute the ticket proposed for one of them.
 *
 * THE WHOLE PAGE, NOT ONLY ITS CONFIGURATION BLOCKS. The two questions have different scopes on
 * purpose. Whether a shape still resolves is a question about a configuration, so it is asked of
 * the blocks. Whether a cited scenario exists is a question about a CITATION, and a citation in a
 * paragraph goes stale exactly as fast as one inside a fence — the `--measurements` example cites a
 * scenario in a block this file otherwise ignores, and it would be an odd commitment page that
 * checked the code in its fences and not the one in its prose.
 *
 * THE FEATURE CODE IS WHAT SAYS WHOSE SCENARIO IT IS, and that qualifier is load-bearing rather
 * than a softening. A page written for consumers has to be able to show a configuration in the
 * READER'S terms — `SCN-CHK-004` is theirs, this tree has never had it, and requiring it to exist
 * here would make the page unable to illustrate anything it does not itself run. `SCN-CPX-006` is a
 * different thing entirely: `CPX` is allocated in `featureCodes.ts`, so the page is making a claim
 * about THIS tree, and a claim about this tree is exactly what can go stale. The registry is the
 * right source rather than the corpus, because a code stays allocated after its feature file is
 * deleted — reading the corpus instead would quietly stop checking a whole feature's citations the
 * moment that feature was retired.
 *
 * THE RESIDUAL, STATED: somebody could green a red by renaming a cited code to a foreign one. That
 * is a deliberate evasion rather than a gap a reader falls into, and the page reads visibly worse
 * for it.
 *
 * AND IT IS NOT THE NAIVE CHECK WEARING A DIFFERENT HAT. The naive form asks whether our MANIFEST
 * still uses a documented key, which our migration deliberately stopped doing. This asks whether
 * our CORPUS still holds a scenario the page cites, which our migration has no business changing
 * without the page changing with it. One reds for migrating; the other reds for migrating and
 * leaving the page behind.
 *
 * SCRIPT HANDLES ARE DELIBERATELY OUT, and this is a stated residual rather than an oversight. The
 * `staticChecks` example names `static-check:domain-purity` ON PURPOSE — the entry exists to
 * illustrate a naming convention this repository does not use — so a handle-must-exist rule would
 * need an exception mechanism for the one block whose whole point is to be foreign. A handle can
 * therefore go stale beside a live `@SCN` and this check will not say so.
 *
 * ═══ ONE RULE FOR WHAT COUNTS AS A CONFIGURATION BLOCK ═══
 *
 * A fenced block is a manifest block when its text contains `"specController"`. Nothing else.
 *
 * The tempting rule reads the fence language — ```jsonc is configuration, ```json is not. It
 * happens to be true of today's four blocks and it fails SILENTLY the first time somebody writes a
 * configuration block as ```json, which is the same class of quiet drift the page is in trouble
 * for. Reading the key instead means the `--measurements` document shape is out of scope by not
 * mentioning `specController`, rather than by a rule about its fence that a later author has to
 * know.
 *
 * ═══ PER-ENTRY, NEVER PER-BLOCK ═══
 *
 * "The block resolves to something non-empty" would green a two-entry block one of whose entries
 * the reader silently drops — and the resolvers DO drop silently, by design (a malformed entry is
 * dropped rather than thrown, so one bad line in a consumer's manifest does not take their build
 * down). That leniency is right for a consumer's tree and useless as an assertion, so every key the
 * block writes is checked back against the map the reader returns.
 *
 * AND A DOCUMENTED KEY THIS FILE DOES NOT KNOW IS ITSELF A VIOLATION. That is what keeps the check
 * honest as the surface grows: documenting a fifth `specController` key without wiring its reader
 * here reds the pass, rather than adding an unchecked promise nobody notices.
 *
 * ═══ THE RECORD READER SOURCES NOTHING, ON PURPOSE ═══
 *
 * Two of the four resolvers take a `KillFloorReader`, because a bar may name a mutation gate
 * instead of a figure. This file hands them one that answers `null` to everything. The question
 * here is *does the reader still accept this shape*, never *does this repository's mutation record
 * carry that gate* — and the resolvers' own contract makes that safe: a reference they cannot
 * source leaves no bar but keeps the entry, so the entry still has to resolve and only the bar's
 * number goes unread. Sourcing the gate for real would couple a documentation check to a nightly
 * artefact and give it a second way to red that has nothing to do with the page.
 *
 * ═══ PURE — no `fs`, no `process`, no paths ═══
 *
 * The markdown arrives as a string and the findings leave as data. `compatibilityExamplesCli.ts` is
 * the only part that knows where the page lives or what an exit code is.
 *
 * Parent: 3F-3154 — the compatibility commitment went stale the day after it shipped.
 */

import {
  bareTerm,
  resolveCheckRegistry,
  resolveFitnessChecks,
  resolveStaticChecks,
  resolveThresholds,
  type KillFloorReader,
} from "@3f-consulting/spec-controller-core/internal";

/** The `specController` key every block on the page is recognised by. */
const CONFIG_ROOT = "specController";

/**
 * The record reader that sources nothing.
 *
 * Named rather than inlined so the docblock above has something to point at: a reader answering
 * `null` is a decision about what this check is asking, not an omission somebody should later
 * "fix" by wiring the real record in.
 */
const NO_RECORD: KillFloorReader = () => null;

/** A fenced block on the page, with the line its opening fence sits on. */
export interface DocBlock {
  /** 1-based line of the opening fence — what a reader needs to find it. */
  readonly line: number;
  /** The block's body, fences excluded. */
  readonly source: string;
}

/** One thing wrong with the page, addressed by line. */
export interface Finding {
  readonly line: number;
  readonly message: string;
}

/** How one documented `specController` key is authored, and how the reader answers about it. */
interface DocumentedKey {
  /**
   * The entries a block writes under this key, in the order it writes them — `null` for an entry
   * whose own key is unreadable.
   *
   * THE `null` IS WHY THIS IS NOT JUST A LIST OF STRINGS, and it closes a hole this check had.
   * Filtering unreadable entries out here would derive the authored side from the same shape the
   * reader derives the resolved side from, so a row whose `scn` is a number would be absent from
   * BOTH and the two would agree that nothing was written. Measured: an example with `"scn": 21`
   * greened. An entry the block wrote and the reader cannot address is a violation, and saying so
   * needs the entry to survive as far as the comparison.
   */
  readonly authored: (configured: unknown) => readonly (string | null)[];
  /** The entries the product's own reader still accepts, given the whole config object. */
  readonly resolved: (packageJson: object) => ReadonlySet<string>;
}

/** The keys of an object-shaped config value, or none where the value is not one. */
function objectKeys(configured: unknown): readonly (string | null)[] {
  if (typeof configured !== "object" || configured === null || Array.isArray(configured)) return [];
  return Object.keys(configured as Record<string, unknown>);
}

/** Each element of an array-shaped config value, `null` where it is not a string. */
function arrayStrings(configured: unknown): readonly (string | null)[] {
  if (!Array.isArray(configured)) return [];
  return configured.map((entry) => (typeof entry === "string" ? entry : null));
}

/** The `scn` each configured fitness row names, `null` for a row that names none readably. */
function rowScns(configured: unknown): readonly (string | null)[] {
  if (!Array.isArray(configured)) return [];
  return configured
    .map((row) =>
      typeof row === "object" && row !== null ? (row as Record<string, unknown>)["scn"] : undefined
    )
    .map((scn) => (typeof scn === "string" ? scn : null));
}

/**
 * THE DOCUMENTED SURFACE — one entry per `specController` key `doc/compatibility.md` states is
 * supported, and the reader that supports it.
 *
 * A table rather than a branch, because the only thing that differs between four keys is which two
 * functions to call. A `switch` here would grow a fifth arm of logic for a fifth key; a row cannot.
 */
const DOCUMENTED_KEYS: Readonly<Record<string, DocumentedKey>> = {
  checkRegistry: {
    authored: objectKeys,
    resolved: (packageJson) => new Set(resolveCheckRegistry(packageJson).keys()),
  },
  thresholds: {
    authored: objectKeys,
    resolved: (packageJson) => new Set(resolveThresholds(packageJson, NO_RECORD).keys()),
  },
  staticChecks: {
    authored: arrayStrings,
    resolved: (packageJson) => new Set(resolveStaticChecks(packageJson)),
  },
  fitnessChecks: {
    authored: rowScns,
    resolved: (packageJson) => new Set(resolveFitnessChecks(packageJson, NO_RECORD).keys()),
  },
};

/**
 * `SCN-<FFF>-<NNN>` wherever it appears — as a key, as a `scn` field's value, in a paragraph, bare
 * or sigilled.
 *
 * SCANNED OVER TEXT rather than walked over a parsed shape, because a code can sit in four
 * different places depending on which key a block writes, and in prose that is not a block at all.
 * A scan knows none of those positions and cannot be surprised by a fifth.
 */
const SCN_IN_SOURCE = /\bSCN-[A-Z0-9]+-\d+\b/g;

/** Every scenario code this text names, deduplicated, in the order it names them. */
export function citedCodes(source: string): readonly string[] {
  return [...new Set(source.match(SCN_IN_SOURCE) ?? [])];
}

/** The `<FFF>` of a scenario code — `SCN-CPX-006` is `CPX`. */
function featureCodeOf(scnCode: string): string {
  return scnCode.split("-")[1] ?? "";
}

/** What this repository can be held to about a scenario code the page names. */
export interface Corpus {
  /** Every `<FFF>` this repository has allocated — `featureCodes.ts`' registry. */
  readonly featureCodes: ReadonlySet<string>;
  /** Every `@SCN` a scenario in `features/` currently carries. */
  readonly scenarioCodes: ReadonlySet<string>;
}

/**
 * Every fenced block on the page that states a `specController` configuration.
 *
 * The fence's info string is not read — see the docblock. A block is recognised by naming the key,
 * so a configuration written under any fence is checked and the `--measurements` document shape is
 * out of scope by not naming it.
 */
export function manifestBlocksOf(markdown: string): DocBlock[] {
  const lines = markdown.split("\n");
  const blocks: DocBlock[] = [];
  let openedAt: number | null = null;
  let body: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (!line.startsWith("```")) {
      if (openedAt !== null) body.push(line);
      continue;
    }
    if (openedAt === null) {
      openedAt = index + 1;
      body = [];
      continue;
    }
    const source = body.join("\n");
    if (source.includes(`"${CONFIG_ROOT}"`)) blocks.push({ line: openedAt, source });
    openedAt = null;
  }
  return blocks;
}

/**
 * Read a block's jsonc as a `package.json` fragment would be read — or throw.
 *
 * NARROW ON PURPOSE, WITH A LOUD FAILURE INSTEAD OF A PARSER. Whole-line `//` comments go, and so
 * does a trailing comma before a closing brace or bracket; nothing else about jsonc is honoured. A
 * comment sitting after code on the same line therefore fails to parse, and the caller reports that
 * as a violation naming the block's line — which tells the author to move the comment onto its own
 * line. A string-aware state machine would handle that case and would fail QUIETLY on the ones it
 * got wrong, which is the trade this check exists to refuse.
 *
 * The fragment is wrapped in braces because the page writes `"specController": { … }` as it would
 * appear INSIDE a `package.json`, which is the form a consumer copies.
 */
export function configOf(source: string): object {
  const uncommented = source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  const withoutTrailingCommas = uncommented.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(`{${withoutTrailingCommas}}`) as object;
}

/** Every scenario code the page names, of OURS, that the corpus does not hold. */
function uncitable(markdown: string, corpus: Corpus): Finding[] {
  const findings: Finding[] = [];
  const reported = new Set<string>();
  for (const [index, line] of markdown.split("\n").entries()) {
    for (const code of citedCodes(line)) {
      if (reported.has(code)) continue;
      if (!corpus.featureCodes.has(featureCodeOf(code))) continue;
      if (corpus.scenarioCodes.has(code)) continue;
      reported.add(code);
      findings.push({
        line: index + 1,
        message: `this page names ${code}, whose feature code this repository has allocated, and no scenario in features/ carries it — the page makes a claim about this tree that stopped being true. Cite a scenario that exists, or write the example in the reader's own feature code.`,
      });
    }
  }
  return findings;
}

/** Every entry this block writes that its reader does not answer for. */
function unresolvedIn(block: DocBlock): Finding[] {
  let packageJson: object;
  try {
    packageJson = configOf(block.source);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [
      {
        line: block.line,
        message: `this ${CONFIG_ROOT} block does not parse — ${detail}. Only whole-line // comments and trailing commas are honoured, so move any same-line comment onto its own line.`,
      },
    ];
  }
  const configured = (packageJson as Record<string, unknown>)[CONFIG_ROOT];
  return Object.entries(objectOf(configured)).flatMap(([key, value]) =>
    droppedUnder(key, value, packageJson, block.line)
  );
}

/** Every entry a block writes under ONE documented key that its reader does not answer for. */
function droppedUnder(key: string, value: unknown, packageJson: object, line: number): Finding[] {
  const documented = DOCUMENTED_KEYS[key];
  if (documented === undefined) {
    return [
      {
        line,
        message: `the page documents ${CONFIG_ROOT}.${key} and this check knows no reader for it — wire one into DOCUMENTED_KEYS, or the promise is unchecked.`,
      },
    ];
  }
  const resolved = documented.resolved(packageJson);
  return documented
    .authored(value)
    .filter((entry) => entry === null || !resolved.has(bareTerm(entry)))
    .map((entry) => ({
      line,
      message:
        entry === null
          ? `${CONFIG_ROOT}.${key} writes an entry the reader cannot address at all — it is silently dropped, and the page is showing a consumer a shape to copy that would lose them a check.`
          : `${CONFIG_ROOT}.${key} documents "${entry}" and the reader does not accept it — the page promises a shape this tool no longer reads.`,
    }));
}

/** A config value as a keyed object, or empty where it is not one. */
function objectOf(configured: unknown): Record<string, unknown> {
  if (typeof configured !== "object" || configured === null || Array.isArray(configured)) return {};
  return configured as Record<string, unknown>;
}

/**
 * Everything wrong with the page's configuration examples, in the order they appear on it.
 *
 * An empty answer means every block the page states is supported was handed to the reader that
 * supports it and came back whole, AND every scenario of ours the page names is one this repository
 * still has. Findings are grouped by question rather than interleaved by line — a run reporting
 * both is reporting two different kinds of staleness, and reading them apart is the point.
 *
 * THE CORPUS ARRIVES AS AN ARGUMENT, so this file reads no directory and the edge that knows where
 * `features/` is stays the only thing that does — the stance `lintScnTags` already takes with the
 * same set.
 */

export function compatibilityFindings(markdown: string, corpus: Corpus): Finding[] {
  return [...manifestBlocksOf(markdown).flatMap(unresolvedIn), ...uncitable(markdown, corpus)];
}
