/**
 * The TARGET's `specController.*` configuration, read into the rows, bars and mints the
 * reconciler takes — the `resolve*` family, moved here from the app's ingest edge (3F-3087).
 *
 * WHY THEY LIVE IN THE ENGINE. Every one of them is a pure function of a manifest object
 * somebody else already read off disk, and every one of them is the ONE reading of the key it
 * names — `thresholdsOf`, `fitnessChecksOf` and `bareTerm` are all core's, so the reader and the
 * thing it reads through belonged on the same side of the package boundary. Sitting at the app
 * edge they were the reason a PUBLISHED module imported core's unpublished `/internal` subpath,
 * which is the fault 3F-3086 repairs; nothing about reading a parsed manifest ever needed the
 * edge that produced it.
 *
 * WHAT THE EDGE STILL OWES THEM, AND WHY IT IS A PARAMETER. Two of these readings depend on
 * something the engine must not know: the deferral-tag STARTER SET is product policy the
 * application layer single-sources (`DEFAULT_DEFERRAL_TAGS`), and a bar naming a mutation gate
 * needs that gate's record read off the target's tree. Both arrive as arguments — the starter
 * set as data, the record as a `KillFloorReader` closure the edge builds — so the engine keeps
 * knowing nothing about files, records or ratchets (@SCN-EPG-001, and 3F-2841's pattern: a
 * project-owned term arrives as an input).
 *
 * DEFENSIVE THROUGHOUT, AND THAT IS THE FAMILY'S STANCE RATHER THAN LOCAL CHOICES PER RESOLVER.
 * Config is data from outside: a missing, non-object or array-shaped value resolves EMPTY, and a
 * malformed entry is dropped by the reading function it is handed to rather than thrown. A check
 * that throws on a typo produces no verdict at all.
 */

import { bareTerm } from "../lib/bareTerm.js";
import { thresholdsOf, type ThresholdIndex } from "../domain/thresholds.js";
import { fitnessChecksOf, type FitnessCheckIndex } from "../domain/fitnessChecks.js";
// THE FOUR CANON TIERS, read from the ledger's own enumeration rather than restated here
// (@SCN-USG-019). A second list of the same four would agree by coincidence, and this axis's
// whole argument is that a list of names is the drift.
import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";

/** Whether a value read out of a manifest is a block of named fields, rather than a list or scalar. */
function isBlock(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The steps the TARGET names NON-CHECKS (@SCN-USG-015, 3F-3343) — `specController.notChecks`, read
 * as the fully-qualified `<workflow file>:<job id>:<step name>` entries the target wrote.
 *
 * IT IS THE CONSUMER'S OWN LIST, and that is the whole reason it may exist at all. Not everything
 * that is not a behavioural runner is a fitness check — a checkout, a dependency install, a deploy
 * — and this axis's standing rule is that a list of check NAMES is the drift. A list of the
 * consumer's own STEPS is the opposite thing: it is about their pipeline, it is written once, and
 * nothing in this tree has an opinion about what is on it.
 *
 * The seventh of this family's `specController.*` resolvers, and defensive like the six above it:
 * a missing or non-array value resolves EMPTY and a non-string entry is dropped rather than
 * thrown. Deduplicated, as the configured-static-check list beside it is, so a target that wrote
 * one line twice is reported one line — the account below is per ENTRY, and the same entry twice
 * is one thing the consumer said.
 *
 * WHAT AN ENTRY MEANS IS NOT DECIDED HERE. This reader takes the list off the manifest; matching it
 * against a pipeline, and saying which entries matched nothing, is `parse/stepExclusions`.
 */
export function resolveNotChecks(packageJson: {
  specController?: { notChecks?: unknown };
}): readonly string[] {
  const configured = packageJson.specController?.notChecks;
  if (!Array.isArray(configured)) return [];
  return [...new Set(configured.filter((entry): entry is string => typeof entry === "string"))];
}

/**
 * A bar naming a mutation gate rather than a figure.
 *
 * THE RECORD'S NAME MAY BE STATED AND OTHERWISE DEFAULTS, and the reason is whose the name is: the
 * record belongs to whoever owns the record, so the conventional one stands in and a project filing
 * its bars elsewhere writes it over.
 */
export interface MutationGateReference {
  readonly mutationGate: string;
  readonly recordFile?: string;
}

/** The reference a manifest value states, or `null` where it states none. */
function gateReferenceOf(value: unknown): MutationGateReference | null {
  if (!isBlock(value)) return null;
  const gate = value["mutationGate"];
  if (typeof gate !== "string" || gate.trim() === "") return null;
  const recordFile = value["recordFile"];
  return typeof recordFile === "string"
    ? { mutationGate: gate, recordFile }
    : { mutationGate: gate };
}

/** The kill floor a reference names, or `null` where the record cannot supply it. */
export type KillFloorReader = (reference: MutationGateReference) => number | null;

/**
 * One check's entry with any gate reference in it replaced by the number that gate's record implies.
 *
 * VALUE-ONLY AND DIRECTION-BLIND. The key beside the number is the comparison, and this reads none
 * of them: a ceiling naming a gate resolves exactly as a floor does. The engine has no opinion
 * about which checks are floors (@SCN-LNT-005), so a target authoring a mutation ceiling is wrong
 * out loud rather than quietly overruled here.
 */
function barWithGateResolved(bar: unknown, killFloor: KillFloorReader): unknown {
  if (!isBlock(bar)) return bar;
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(bar)) {
    const reference = gateReferenceOf(value);
    // `null` where the record could not supply the floor — the value the engine already reads as
    // no bar, so a reference this could not source is indistinguishable downstream from an entry
    // nobody could read. What must never be written here is a number of this reader's choosing.
    resolved[key] = reference === null ? value : killFloor(reference);
  }
  return resolved;
}

/**
 * The manifest's threshold entries, with every gate reference in them substituted.
 *
 * NO RECORD IS OPENED FOR A MANIFEST THAT NAMES NO GATE, which is what keeps this inert for every
 * target that has never banked one — the two live `@ci-run-time` ceilings included.
 */
function withGateReferencesResolved(
  entries: Record<string, unknown>,
  killFloor: KillFloorReader
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [scnKey, checks] of Object.entries(entries)) {
    if (!isBlock(checks)) {
      resolved[scnKey] = checks;
      continue;
    }
    const bars: Record<string, unknown> = {};
    for (const [checkKey, bar] of Object.entries(checks)) {
      bars[checkKey] = barWithGateResolved(bar, killFloor);
    }
    resolved[scnKey] = bars;
  }
  return resolved;
}

/**
 * The TARGET's authored CEILINGS (@SCN-CIP-001) — `specController.thresholds`, read as
 * `@SCN → bare check tag → ceiling` through the engine's own `thresholdsOf`.
 *
 * The DEBIT side of the measured fitness check, and the reason the axis can reconcile at all. A
 * static check decides pass from fail itself; a measured one produces a number, and the bar that
 * number is held against has to come from somewhere the run cannot reach — otherwise the runner
 * grades its own homework and the ledger transcribes a verdict rather than reconciling one.
 *
 * IT IS THE TARGET'S, for the same reason the registry is (@SCN-LNT-005): a suite's acceptable
 * wall-clock is a property of the repository being reconciled and of the runner class it runs on,
 * never of the tool doing the reconciling. Read from `--package-json` alongside the scripts, the CI
 * config and the registry, so every input to a target's verdict came from that target.
 *
 * The third of this family's `specController.*` resolvers, and defensive like the two above it: a
 * missing, non-object or array-shaped config resolves EMPTY, and a malformed entry is dropped by
 * `thresholdsOf` rather than thrown. There is no starter set: a ceiling the target did not write
 * would hold its suites to a bar nobody chose.
 *
 * AND A BAR MAY NAME A MUTATION GATE INSTEAD OF A FIGURE (@SCN-MUT-012, 3F-2788). A number in a
 * manifest is a number somebody has to re-derive after every sweep that moves it. So the VALUE may
 * be a reference to a gate whose record already holds the counts, and it is substituted for that
 * gate's kill floor HERE — before `thresholdsOf` is called, so what reaches the index is the
 * number it has always taken. THE READER IS INJECTED, which is what keeps the engine knowing
 * nothing about records, gates or YAML now that the substitution lives inside it: the app edge
 * opens the target's record and hands in a closure, and this function only ever asks it for a
 * number (3F-3087).
 *
 * AND A REFERENCE THIS CANNOT SOURCE LEAVES NO BAR, NEVER A NUMBER (@SCN-MUT-013). A reference is a
 * bar living in a second file, so it can go missing four ways a typed one never could — and each
 * has a lenient reading that hands back a green nobody earned. All four are refused the same way,
 * which is `barOf`'s own way with an entry it cannot read: the key survives with nothing beside it,
 * so the check stays MEASURED and the complaint arrives from the missing-bar arm (@SCN-CIP-002)
 * rather than from the tag grammar, about a check nobody wrote.
 */
export function resolveThresholds(
  packageJson: { specController?: { thresholds?: unknown } },
  /**
   * The reader over the TARGET's records, built by the edge that knows where that tree is
   * (@SCN-LNT-005). One reader per resolution pass, so a manifest naming several gates of one
   * record reads that record once.
   */
  killFloor: KillFloorReader
): ThresholdIndex {
  const configured = packageJson.specController?.thresholds;
  if (!isBlock(configured)) return thresholdsOf({});
  return thresholdsOf(withGateReferencesResolved(configured, killFloor));
}

/**
 * Resolve the recognised deferral-tag set for the target (@SCN-PND-021) — the app's single-sourced
 * starter set EXTENDED by the target `package.json`'s `specController.deferralTags`. Config
 * EXTENDS, never replaces: a project cannot un-recognise a built-in (`@wip` always defers).
 * Configured tags are bare names, `@`-stripped, consistent with the starter set; non-string /
 * non-array config is ignored defensively. `parseScenarios` then takes the union as its injected
 * `deferralTags` param.
 *
 * THE STARTER SET ARRIVES AS AN ARGUMENT AND IS NOT THE ENGINE'S TO HOLD (3F-3087). Which
 * community tags defer is product policy — an evolvable list of strings the application layer
 * single-sources as `DEFAULT_DEFERRAL_TAGS` — and a core-held copy would be a second statement of
 * it. So the union is computed here, where the config read is, and the policy is handed in.
 */
export function resolveDeferralTags(
  packageJson: {
    specController?: { deferralTags?: unknown };
  },
  /** The application layer's starter set — the built-ins a target's config may only extend. */
  starterTags: readonly string[]
): readonly string[] {
  const configured = packageJson.specController?.deferralTags;
  const extras = Array.isArray(configured)
    ? configured
        .filter((tag): tag is string => typeof tag === "string")
        // Through the ONE reading of what a term bare is (@SCN-TRM-001). This port had no trim at
        // all, so `"@wip  "` failed as well as `"  @wip"`, and a term that is nothing but
        // whitespace and a sigil is dropped here as an empty one already is.
        .map(bareTerm)
        .filter((tag) => tag !== "")
    : [];
  // Union: the starter set FIRST (extends, never replaces — a project cannot un-recognise a
  // built-in), then the configured extras; de-duplicated to keep the set clean.
  return [...new Set([...starterTags, ...extras])];
}


/**
 * The TARGET's CONFIGURED FITNESS ROWS (@SCN-LNT-018) — `specController.fitnessChecks`, read as
 * `@SCN → the characteristic that scenario asserts` through the engine's own `fitnessChecksOf`.
 *
 * THE DEBIT SIDE OF A CONVERTED CHECK. A converted scenario carries `@fitness` and nothing about
 * its subject, so the characteristic it owes comes from here — and from the row whose `scn` is that
 * scenario's own, which is what removes the registry hop an unconverted static check needs.
 *
 * IT IS THE TARGET'S, for the reason the check registry and the ceilings are (@SCN-LNT-005): a
 * characteristic means what the target says it means, and a row resolved from this tool's own
 * manifest would put an obligation on a target's books under a word it never wrote.
 *
 * The fifth of this family's `specController.*` resolvers, and defensive like the four above it: a
 * missing or wrongly-shaped config resolves EMPTY, and a malformed row is dropped by
 * `fitnessChecksOf` rather than thrown. There is no starter set: a target that has converted
 * nothing owes nothing on this route, which is what keeps the reading inert on an unswept corpus.
 *
 * AND A ROW'S BAR MAY NAME A MUTATION GATE INSTEAD OF A FIGURE, EXACTLY AS A THRESHOLD ENTRY'S MAY
 * (@SCN-MUT-012, 3F-3152). The row is the second place a target can author a bar, so it is the
 * second place the same substitution has to happen — through the SAME reader and the same
 * value-only, direction-blind replacement `resolveThresholds` calls, applied to the row before
 * `fitnessChecksOf` reads it. A converted row and a threshold entry cannot then come to disagree
 * about what a target wrote, which is the argument `fitnessCheckOf` already makes for reading the
 * bar through `barOf` rather than through a grammar of its own.
 *
 * A REFERENCE THIS CANNOT SOURCE STILL LEAVES NO BAR, NEVER A NUMBER (@SCN-MUT-013). What comes
 * back is `null` beside the key, which is what keeps the row MEASURED with nothing to hold it to —
 * the shape @SCN-CIP-002 reports, and the same reading the threshold route reaches.
 */
export function resolveFitnessChecks(
  packageJson: {
    specController?: { fitnessChecks?: unknown };
  },
  /**
   * The reader over the TARGET's records, built by the edge that knows where that tree is
   * (@SCN-LNT-005) — the same argument `resolveThresholds` takes, for the same reason.
   */
  killFloor: KillFloorReader
): FitnessCheckIndex {
  const configured = packageJson.specController?.fitnessChecks;
  if (!Array.isArray(configured)) return fitnessChecksOf(configured);
  return fitnessChecksOf(
    (configured as readonly unknown[]).map((row) => barWithGateResolved(row, killFloor))
  );
}

/**
 * WHAT A TARGET'S RUNNER BLOCK YIELDED — the entries keyed by a canon tier, and the keys that are
 * not one (@SCN-USG-019).
 *
 * TWO HALVES RATHER THAN ONE RECORD, because the two are used for opposite things and neither may
 * be reached for the other. `tiers` is what a recognition can be run against; `unrecognisedKeys` is
 * what the report has to SAY, and it recognises nothing by construction — there is no tier for it
 * to be the runner of. Returning one record and filtering downstream would leave every caller free
 * to honour a key the block's closure rules out, which is the fault this partition forecloses.
 */
export interface ResolvedRunners {
  /** The runner named for each canon tier the block names one for — `null` where it says it has none. */
  readonly tiers: Readonly<Record<string, string | null>>;
  /** The block's keys that are not one of the four canon tiers, in the order the manifest wrote them. */
  readonly unrecognisedKeys: readonly string[];
}

/**
 * The TARGET's BEHAVIOURAL RUNNERS (@SCN-USG-011, 3F-3343) — `specController.runners`, read as
 * `tier → the name of the binary that tier's suite runs under`.
 *
 * THE SMALL CLOSED THING, NAMED, so the open one can be inferred. The set of names a quality check
 * might go by is unbounded and belongs to the consumer; the set of behavioural runners is one per
 * tier tag and the tiers are canon. Naming the closed set and deriving the rest is the move the
 * `@fitness` collapse already made one level in (3F-3139), and it cannot go stale by omission.
 *
 * IT IS THE TARGET'S, for the reason the check registry and the ceilings are (@SCN-LNT-005): which
 * command runs a repository's unit suite is a fact about that repository, and a runner resolved
 * from this tool's own manifest would answer for a pipeline this run never looked at.
 *
 * The sixth of this family's `specController.*` resolvers, and defensive like the five above it: a
 * missing, non-object or array-shaped config resolves EMPTY, and an entry whose value is neither a
 * runner's NAME nor `null` is dropped rather than thrown. A manifest naming no runners is not an
 * error — it is a `new-client`, which is the state this axis is sold on.
 *
 * A NULL IS KEPT, AND IT IS THE THIRD STATE (@SCN-USG-016, 3F-3343). `"performance": null` is
 * something the target SAID — we have no performance suite — and a tier the block omits is
 * something it never said. Dropping the null folds the first into the second and loses a fact we
 * were given, in the one direction nothing downstream can recover: after the fold, silence and a
 * stated absence are indistinguishable. Nothing else in this reader's contract moves — a null
 * recognises no step, exactly as a missing key recognises none — so the ONLY place the two can be
 * told apart is this return value and the report rendered off it.
 *
 * THE KEY SET IS CLOSED, AND THE PARTITION IS THIS READER'S (@SCN-USG-019, 3F-3343). The block is
 * keyed by TIER and the tiers are canon, which is exactly what makes the whole inversion possible:
 * the closed set is named because it is enumerable, and the open one is inferred from what is left.
 * A key outside the four is therefore not a runner for anything, and both obvious answers to it are
 * wrong. HONOURING it is the smuggling the closure forbids — `"lint": "eslint"` is a consumer taking
 * their own checks out of discovery one key at a time, and it reinstates the silence this axis
 * exists to remove. DROPPING it silently is the same class of fault one layer along: the consumer
 * wrote something, believes it took effect, and has no line anywhere to correct it from. So the key
 * is partitioned out of the runners AND handed back to be named, and the run is not aborted over it.
 *
 * THE FOUR TIERS ARE READ, NEVER RESTATED. `RUNTIME_QUALITY_CHECKS` is the ledger's own enumeration
 * of the runtime tiers; a second copy here would agree with it by coincidence, and a list of names
 * is the drift this ticket is about.
 *
 * THE PARTITION IS ON THE KEY AND THE DEFENSIVE DROP IS ON THE VALUE, and the two are different
 * questions kept apart. A canon tier whose value is neither a runner's NAME nor `null` is malformed
 * config and is dropped, which is this family's stance about data from outside. A key that is not a
 * tier at all is not malformed — there is no tier for any value of it to name a runner for — so its
 * value is beside the point and the key is the fact worth reporting, whatever it was set to.
 */
export function resolveRunners(packageJson: {
  specController?: { runners?: unknown };
}): ResolvedRunners {
  const configured = packageJson.specController?.runners;
  if (!isBlock(configured)) return { tiers: {}, unrecognisedKeys: [] };
  const isTier = (key: string): boolean =>
    (RUNTIME_QUALITY_CHECKS as readonly string[]).includes(key);
  return {
    tiers: Object.fromEntries(
      Object.entries(configured).filter(
        (entry): entry is [string, string | null] =>
          isTier(entry[0]) && (typeof entry[1] === "string" || entry[1] === null)
      )
    ),
    unrecognisedKeys: Object.keys(configured).filter((key) => !isTier(key)),
  };
}

/**
 * THE specController.* KEYS THIS READER HAS RETIRED (@SCN-USG-021, @SCN-USG-022) — the top-level
 * keys a manifest carries whose reading this tool has removed, in the order the manifest wrote
 * them.
 *
 * NAMED, NOT SILENTLY GONE. Retiring a route is not the same act as never having had one: a
 * consumer who wrote `checkRegistry` once, when it was read, believes it still routes their
 * checks. Ceasing to read it without saying so leaves them holding a manifest that no longer
 * does what they think, with nothing on the report to correct it from — the same fault as a
 * dropped step, reached from the retirement side rather than the discovery side.
 *
 * APPEND-ONLY, the family's own append-only key set (RUNTIME_QUALITY_CHECKS beside it). A key
 * retires once and is never re-read; the set only grows as this reader retires more of them
 * (`checkRegistry` first, 3F-3398; `staticChecks` second, 3F-3399 — the tiebreak
 * `parse/runningStaticChecks.ts`'s `handleOf` used to settle among several invoked scripts,
 * 3F-3396 deleted).
 *
 * DEFENSIVE LIKE THE READERS ABOVE IT: a missing or non-object `specController` names no
 * retired key, never throws.
 */
const RETIRED_SPEC_CONTROLLER_KEYS = ["checkRegistry", "staticChecks"] as const;

export function resolveRetiredKeys(packageJson: { specController?: unknown }): readonly string[] {
  const configured = packageJson.specController;
  if (!isBlock(configured)) return [];
  return Object.keys(configured).filter((key) =>
    (RETIRED_SPEC_CONTROLLER_KEYS as readonly string[]).includes(key)
  );
}
