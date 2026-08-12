/**
 * THE THRESHOLD REGISTRY — what ceiling a MEASURED fitness check is held to on a given scenario.
 *
 * The debit-side twin of `checkRegistry`, and the input that makes the measured axis possible at
 * all:
 *
 *     @SCN + bare check tag  ──thresholds──▶  the ceiling
 *     SCN-CIP-001  ci-run-time                75
 *
 * WHY THE CEILING IS AUTHORED HERE AND NOT CARRIED BY THE RUN. A static check decides pass from
 * fail itself and the ledger reconciles what it decided; its threshold is binary and never written
 * down. A measured check produces a NUMBER, and if the run supplied both the number and the bar it
 * was judged against, the runner would be grading its own homework — the ledger would transcribe a
 * verdict rather than reconcile one. Double entry wants the two sides independently sourced, so the
 * ceiling is the obligation's and the measurement is only ever a number.
 *
 * KEYED BY @SCN, THEN BY CHECK, and both halves are load-bearing. Keyed by the tag alone it could
 * not express what canon asks of this axis — several checks of one characteristic are several
 * stepless scenarios sharing the tag, told apart by @SCN, with ceilings of their own. Flat under
 * the @SCN it would re-open on the debit side the non-uniqueness @SCN-LNT-012 closed on the credit
 * side: a stepless scenario may carry more than one bare check, so one @SCN can owe two measured
 * obligations, and one number under it would answer for both — whichever was read first silently
 * setting the other's bar.
 *
 * PURE AND INJECTED — the registry arrives as data, read from the TARGET's own manifest at the app
 * edge (`specController.thresholds`). A ceiling means what the target says it means (@SCN-LNT-005);
 * resolved from spec-controller's own manifest it would answer for a repository the run never read.
 *
 * NOT A SECOND HOME FOR THE CORPUS. This says what a scenario's ceiling IS, never which scenarios
 * exist: the corpus stays the one place a fitness scenario is named, so a ceiling keyed against an
 * @SCN nobody wrote reaches no obligation, and an obligation whose ceiling nobody wrote reads loud
 * rather than unbounded (@SCN-CIP-002).
 */

/** The registry as the rule reads it — `@SCN` → bare check tag → its ceiling. */
export type ThresholdRegistry = ReadonlyMap<string, ReadonlyMap<string, number>>;

/** A ceiling is a finite, non-negative number. Zero is legal — canon's binary fitness function. */
function isCeiling(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Build a registry from a manifest's `{ "<@SCN>": { "<check>": <ceiling> } }` entries.
 *
 * BOTH KEYS ARE STORED BARE. A manifest written by hand will sooner or later spell either the way
 * a feature file does (`@SCN-CIP-001`, `@ci-run-time`), and both lookups match bare — so the `@` is
 * stripped once here rather than at every call site, where one reader would eventually forget and
 * the miss would be silent.
 *
 * MALFORMED ENTRIES ARE DROPPED, NOT TRUSTED AND NOT THROWN ON — the same defensive stance
 * `checkRegistryOf` and `resolveDeferralTags` take, and for a sharper reason here. A ceiling of
 * `NaN` fails every comparison, so `measured <= NaN` is false and an honestly-fast suite would read
 * `failing` with the blame on the suite rather than on the manifest. Throwing instead would turn one
 * bad character into a run that produces no verdict at all, which is loud nowhere; a dropped entry
 * leaves the obligation with no ceiling, which is loud on the ledger.
 */
export function thresholdsOf(entries: Readonly<Record<string, unknown>>): ThresholdRegistry {
  const registry = new Map<string, Map<string, number>>();
  for (const [scnKey, checks] of Object.entries(entries)) {
    const scnId = bare(scnKey);
    if (scnId === "" || typeof checks !== "object" || checks === null) continue;
    const ceilings = new Map<string, number>();
    for (const [checkKey, ceiling] of Object.entries(checks as Record<string, unknown>)) {
      const checkTag = bare(checkKey);
      if (checkTag === "" || !isCeiling(ceiling)) continue;
      ceilings.set(checkTag, ceiling);
    }
    if (ceilings.size > 0) registry.set(scnId, ceilings);
  }
  return registry;
}

function bare(key: string): string {
  return key.replace(/^@/, "").trim();
}

/**
 * The ceiling this scenario holds this check to, or `null` when the manifest names no such pair.
 *
 * `null` rather than a default, and the choice is the whole of @SCN-CIP-002. `Infinity` would put
 * every measurement under its bar and produce a green row for a check nobody set a bar for — the
 * watermelon this axis exists to refuse, manufactured by the engine. Zero would read as a ceiling
 * of zero, a far louder claim than "nobody set one", and would red a suite for taking any time at
 * all. The honest answer is that there is no rule, and the obligation carries that absence.
 */
export function thresholdFor(
  registry: ThresholdRegistry,
  scnId: string,
  checkTag: string
): number | null {
  return registry.get(scnId)?.get(checkTag) ?? null;
}

/**
 * The bare check tags this registry knows to be MEASURED — unique and sorted.
 *
 * The measured twin of `registeredCheckTags`, and the reason a measured check is visible to the
 * obligation rule at all. A measured check has no runnable script handle, so it never appears in
 * `checkRegistry`; were the obligation-raising tag set the registry's alone, a stepless scenario
 * tagged with one would raise nothing and the axis would be silent rather than wrong. The two sets
 * are unioned at the edge that reads both.
 */
export function measuredCheckTags(registry: ThresholdRegistry): string[] {
  const tags = new Set<string>();
  for (const ceilings of registry.values()) for (const tag of ceilings.keys()) tags.add(tag);
  return [...tags].sort();
}
