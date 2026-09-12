/**
 * The TARGET's `specController.*` configuration, read into the registry, bars and mints the
 * reconciler takes — the `resolve*` family, moved here from the app's ingest edge (3F-3087).
 *
 * WHY THEY LIVE IN THE ENGINE. Every one of them is a pure function of a manifest object
 * somebody else already read off disk, and every one of them is the ONE reading of the key it
 * names — `checkRegistryOf`, `thresholdsOf` and `bareTerm` are all core's, so the reader and the
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
 * DEFENSIVE THROUGHOUT, AND THAT IS THE FAMILY'S STANCE RATHER THAN FIVE LOCAL CHOICES. Config
 * is data from outside: a missing, non-object or array-shaped value resolves EMPTY, and a
 * malformed entry is dropped by the registry factory rather than thrown. A check that throws on
 * a typo produces no verdict at all.
 */

import { bareTerm } from "../lib/bareTerm.js";
import { checkRegistryOf, type CheckRegistry } from "../domain/checkRegistry.js";
import { thresholdsOf, type ThresholdIndex } from "../domain/thresholds.js";
import { fitnessChecksOf, type FitnessCheckIndex } from "../domain/fitnessChecks.js";

/** Whether a value read out of a manifest is a block of named fields, rather than a list or scalar. */
function isBlock(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The scripts the TARGET configures AS static checks (@SCN-USG-009, 3F-2495) — read from
 * `specController.staticChecks`, EXTENDING the prefix discovery above.
 *
 * WHY A CONFIGURATION AND NOT A RENAME. `tsc --noEmit` is static analysis on any reading and reds
 * the build on a violation, and no prefix recognises it. Renaming the script fixes one repository;
 * a client's scripts are not ours to rename, so the tool has to be able to be TOLD.
 *
 * EXTENDS, NEVER REPLACES — the `resolveDeferralTags` contract one function up, and for the same
 * reason: a target cannot un-recognise a check the convention already finds. Bare script names
 * (no `@`-stripping — these are manifest keys, not tags); non-string / non-array config ignored
 * defensively, consistent with the deferral-tag reader.
 *
 * It widens only the DISCOVERY direction. The named-obligation observer never consulted the
 * prefixes, so any named check always reconciled; what this buys is finding a check NOBODY
 * cites — the unattributed check, which was invisible exactly when it was unattributed.
 */
export function resolveStaticChecks(packageJson: {
  specController?: { staticChecks?: unknown };
}): readonly string[] {
  const configured = packageJson.specController?.staticChecks;
  if (!Array.isArray(configured)) return [];
  return [...new Set(configured.filter((name): name is string => typeof name === "string"))];
}

/**
 * The TARGET's check registry (@SCN-LNT-005) — `specController.checkRegistry`, read as
 * `script handle → bare check tag` through the engine's own `checkRegistryOf`.
 *
 * IT IS THE TARGET'S, AND THAT IS THE WHOLE POINT. spec-controller reconciles a tree that is
 * usually not its own, and a bare check tag means what the target says it means. Resolved from the
 * tool's own manifest instead, a target registering nothing raises no fitness obligation at all,
 * and one registering the same word for a different script credits the wrong row — so the registry
 * travels with the scripts and the CI config it is read alongside, and every one of them comes from
 * `--package-json`.
 *
 * The third of this family's `specController.*` resolvers, and defensive like the two above it: a
 * missing, non-object or array-shaped config resolves EMPTY, and a malformed entry is dropped by
 * `checkRegistryOf` rather than thrown. There is no starter set — unlike deferral tags there is no
 * built-in a target would inherit, and a registry entry the target did not write would put a
 * fitness obligation on its books under a word it never used.
 *
 * Where a registry is AUTHORED is still open (the registry-home question, increment D); this key is
 * the seam it is read from today, and the corpus check reads it through THIS function so the
 * words it calls grammar are exactly the tags the obligation rule raises against.
 */
export function resolveCheckRegistry(packageJson: {
  specController?: { checkRegistry?: unknown };
}): CheckRegistry {
  const configured = packageJson.specController?.checkRegistry;
  if (typeof configured !== "object" || configured === null || Array.isArray(configured)) {
    return checkRegistryOf({});
  }
  return checkRegistryOf(configured as Record<string, unknown>);
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
 * The fourth of this family's `specController.*` resolvers, and defensive like the three above it: a
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
 * The sixth of this family's `specController.*` resolvers, and defensive like the five above it: a
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
