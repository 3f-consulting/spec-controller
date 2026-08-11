/**
 * THE GHERKIN TAG GRAMMAR — what on a `.feature` tag line is STRUCTURE rather than authored
 * vocabulary (@SCN-VOC-013, 3F-2313). Pure string rules: no segments, no surfaces, no I/O.
 *
 * `vocabAudit.ts` → `scanFile` used to skip every `.feature` line whose trimmed form began
 * with `@`, WHOLESALE. Defensible for an ID scheme, and exactly WRONG for a term whose
 * canonical form IS A TAG: the retired timing tag → `@ci-run-time` is a TAG rename, so the surface
 * most worth policing was the only one that was invisible (3F-2289 planted the retired tag
 * there and got NO manifest row, while the same token in a comment, an identifier, a string
 * and a doc all fired).
 *
 * WHY ITS OWN MODULE. `vocabAudit.ts` carries a `max-lines` exception frozen at 790 and an
 * exception buys no headroom, so this could not live there — the same pressure that split
 * `vocabAuditTagLines.test.ts` off the unit file. It is a good seam independently: this file
 * answers "what is a tag?" over strings, and the scanner answers "what does the audit read?"
 * over segments. Keeping the split at strings is also what avoids a type cycle back into
 * `vocabAudit.ts`.
 *
 * @SCN-VOC-013 — features/vocabulary-audit.feature.
 */

// `isTierTag` is the ONE answer to "what is a tier tag?", and it lives in `scnTags.ts`
// because that is the check whose job it is. Imported, never copied — a second list here
// would agree by diligence and then drift, the agreeing-by-copy @SCN-VOC-008 removed for
// `.gitignore` and @SCN-VOC-010 for the canon table. `scnTags.ts` imports nothing, so the
// dependency is one-way and cycle-free.
import { isTierTag } from "./scnTags.js";

/**
 * The `<FFF>` FEATURE-CODE SLOT — 2–5 uppercase alphanumerics (Evidence Manifesto §9A).
 *
 * ONE source for both patterns below, because they are two readings of the same slot and a
 * second literal would be a second answer to "what is a feature code?". `featureCodes.ts`
 * holds the REGISTRY (which codes exist, against which slug) and `lint:feature-codes` holds
 * them unique; this file only needs the SHAPE. Importing that module was the alternative and
 * is rejected: it pulls `../src/ingest/ingestScenarios.js` — the app — into a pure rules
 * module for a five-character regex, and its `CODE_PATTERN` is not exported anyway.
 */
const FEATURE_CODE = "[A-Z0-9]{2,5}";

/**
 * Structural scenario-ID tokens (`@SCN-FFF-NNN`) — an ID scheme, not vocabulary.
 *
 * Applied by `scanFile` as a BLANKING over the whole file before a single line is split,
 * which is why no arm below matches an id: one can never arrive. See `isStructuralTag`.
 */
export const SCN_TOKEN_RE = new RegExp(`@?SCN-${FEATURE_CODE}-\\d+`, "g");

/** A whole bare tag that IS a feature-code header tag — the `<FFF>` slot alone. */
const FEATURE_CODE_RE = new RegExp(`^${FEATURE_CODE}$`);

/**
 * The tag shapes that are GRAMMAR — never vocabulary (@SCN-VOC-013).
 *
 * Grammar is THREE shapes here, MEASURED over every tracked `.feature` file rather than
 * guessed — and the scenario id is deliberately NOT one of them:
 *
 *  1. `<FFF>` (57 occurrences) — the feature-code header tag: the same ID scheme as a
 *     scenario id, one slot up, since it IS the `<FFF>` inside every id. The second-largest
 *     category on this surface, and the one the ticket's taxonomy missed entirely.
 *  2. a TIER tag (359) — `isTierTag`, IMPORTED from `scnTags.ts` rather than copied. It once
 *     also recognised the `lint=<handle>` FORM; 3F-2567 deleted that clause, so a retired
 *     `@lint=<handle>` tag is now held green by the VALUE-DROP below instead — its KEY is bare
 *     `lint`, which IS a tier tag (a registered check). Re-measured by mutation, 3F-2624.
 *  3. `wip` (6) — scnTags' scenario-scope exemption. Not a tier, so `isTierTag` says no, but
 *     unambiguously Gherkin grammar. Named explicitly rather than left to pass because `wip`
 *     happens to be an unknown word in prose mode: a green nobody chose is not a green.
 *
 * `SCN-<FFF>-<NNN>` HAS NO ARM HERE, ON PURPOSE. `SCN_TOKEN_RE` blanks every scenario id at
 * the top of `scanFile`, before a single line is split, so an id can never reach this
 * function. An arm for it would be UNREACHABLE code that no mutation could kill — the
 * measurement said so: deleting a `SCN_TAG_RE` arm from an earlier draft of this function
 * left the whole @unit suite green. Unreachable code that looks like a safeguard is worse
 * than none, because it reads as one. The id's exemption is the BLANKING, it is asserted
 * against the blanking in `vocabAuditTagLines.test.ts`, and that is the only true statement.
 *
 * Everything else is AUTHOR-CHOSEN and meets the vocabulary. An unrecognised tier tag lands
 * there by construction — the "unknown tier tag is a useful error" the ticket asked for,
 * arriving with no second check. Judging the closed tier SET itself stays `lint:scn-tags`'.
 */
function isStructuralTag(bare: string): boolean {
  if (FEATURE_CODE_RE.test(bare)) return true;
  if (bare === "wip") return true;
  return isTierTag(bare);
}

/**
 * A line's tags, or `null` when it is not a tag line at all (@SCN-VOC-013).
 *
 * EVERY token must start with `@` — `scnTags.ts` → `parseScenarios`'s existing definition,
 * reused rather than re-invented. The old `trim().startsWith("@")` was looser and swallowed a
 * PROSE line that merely OPENS with a tag reference; two such lines live in
 * `tests/fixtures/pending-tags/` and were silently unscanned until now.
 */
export function tagLineTokens(trimmed: string): string[] | null {
  const tokens = trimmed.split(/\s+/);
  return tokens.every((token) => token.startsWith("@")) ? tokens : null;
}

/**
 * The AUTHOR-CHOSEN tags on a tag line, in order — everything `isStructuralTag` rejects,
 * with the leading `@` and any `=value` removed (@SCN-VOC-013). The caller turns these into
 * PROSE-mode segments; this function knows nothing about segments or surfaces.
 *
 * THE VALUE OF A `key=value` TAG IS DROPPED, unconditionally: a `key=value` tag's value names
 * a THING (a CI script, an owner, a flag setting), and a name of a thing is a value, not
 * vocabulary (3F-1929's ruling; 3F-1852 owns the script handles). The KEY survives and is
 * judged as a bare tag.
 *
 * WHAT THIS RULE IS DOING, RE-MEASURED (3F-2624). It used NOT to be what kept a retired
 * `@lint=<handle>` tag green — `isTierTag` recognised that whole token, so the tag was grammar
 * with or without this line, and a mutation probe said so. 3F-2567 deleted that clause and the
 * two rules SWAPPED: the token now arrives here, its KEY (`lint`) is a tier tag and its VALUE is
 * dropped by this rule. Probed again on 2026-08-11 — removing the value-drop reds the retired
 * form's case.
 *
 * It remains load-bearing for a `key=value` tag whose key is NOT a tier — `@owner=…`,
 * `@flag:x=…` — of which this tree has ZERO today. That is why it is ALSO pinned by a unit case
 * over a synthetic non-tier key: the retired-form case cannot speak for a key that must itself
 * be judged. Kept rather than deferred because the alternative is a scanner that reads a script
 * name as prose the first time someone writes a valued tag whose key is not a tier.
 *
 * THE CALLER READS THESE IN PROSE MODE, NOT NAME MODE, which is the taxonomy's other ruling.
 * Only `unknown` is mode-gated; banned words, bare-shortenings, `bare-different-word`,
 * `entry-domain` and all three retired-phrase arms fire in BOTH modes — so prose reaches
 * every retired term, which is this Rule's whole purpose, while NAME would buy only
 * `unknown`: a question about whether a tag is a legitimate community tag (`lint:scn-tags`'
 * ground) at the price of a permanent false positive per deliberately-meaningless fixture
 * tag. Every other line of a `.feature` is prose-scanned too, so NAME here would also red a
 * word on the tag line and green the same word in the scenario title one line below it.
 */
export function authoredTags(tokens: readonly string[]): string[] {
  const authored: string[] = [];
  for (const token of tokens) {
    const key = token.slice(1).split("=")[0] ?? "";
    if (key === "" || isStructuralTag(key)) continue;
    authored.push(key);
  }
  return authored;
}
