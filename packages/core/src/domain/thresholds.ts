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

/**
 * A BAR a measurement is held to — the number, and the side of it that satisfies.
 *
 * The registry's value is this rather than the number alone, because a number cannot carry a
 * comparison and "91.87" says nothing until somebody says which side of it passes. The direction is
 * half of the bar, so it is authored in the same manifest entry as the number and cannot disagree
 * with the number it qualifies.
 *
 * SPARSE, AND ABSENT MEANS AT-MOST (@SCN-MUT-001). A bare-number entry sets no comparison at all,
 * so the bar it produces holds exactly what it held before this direction existed — which is what
 * lets the two live `@ci-run-time` rows keep saying what they already say without a sweep somebody
 * has to get right. A `false` here would be the same sentence in a term every existing row would
 * have to grow.
 */
export interface ThresholdBar {
  /** The number the measurement is compared against. */
  threshold: number;
  /** The bar is a FLOOR — `measured >= threshold`. Absent on an ordinary ceiling. */
  atLeast?: true;
}

/**
 * The registry as the rule reads it — `@SCN` → bare check tag → the bar it is held to.
 *
 * THE BAR IS NULLABLE AND THE TAG IS NOT (@SCN-MUT-003). A manifest entry makes two claims — that
 * this scenario holds this check, and what bar it holds it to — and only the second can fail to
 * read. An entry whose value this cannot read keeps its key here with a `null` beside it, so the
 * check stays measured and the missing bar is reported by the arm that exists for exactly that
 * (@SCN-CIP-002) rather than by the tag grammar complaining about a check nobody wrote.
 */
export type ThresholdRegistry = ReadonlyMap<string, ReadonlyMap<string, ThresholdBar | null>>;

/** A bar's number is finite and non-negative. Zero is legal — canon's binary fitness function. */
function isCeiling(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * The bar a manifest entry authors, or `null` where it authors none this reads (@SCN-MUT-002).
 *
 * TWO FORMS, ONE OF WHICH NAMES ITS COMPARISON. A bare number is read at-most and carries nothing
 * else, so the entries already written that way keep saying what they say. An object names the
 * comparison with the KEY beside the number — `atLeast` or `atMost` — which is what makes an
 * entry in this form unwritable without a direction, and leaves no third value anybody has to
 * validate or that could come to mean something surprising. `atMost` is the explicit long form of
 * the bare number and is deliberately recognised though it adds nothing: a recognised set of one
 * is not a set, and it is the set an unrecognised entry is unrecognised AGAINST.
 *
 * A RECOGNISED KEY IS NOT A LICENCE FOR THE VALUE BESIDE IT. Both forms reach the same number
 * reading, so a floor of `NaN` is dropped exactly as a ceiling of `NaN` is — `measured >= NaN` is
 * false, and a bar nothing can clear reds an honest suite and blames the suite.
 */
function barOf(entry: unknown): ThresholdBar | null {
  if (isCeiling(entry)) return { threshold: entry };
  if (typeof entry !== "object" || entry === null) return null;
  const named = entry as Record<string, unknown>;
  const floor = "atLeast" in named;
  // Neither key, or both at once — an entry naming no comparison this recognises, and no bar this
  // can hold anything to (@SCN-MUT-003). Both at once is a contradiction rather than more
  // information: whichever key were read first would silently settle it.
  if (floor === "atMost" in named) return null;
  const number = floor ? named["atLeast"] : named["atMost"];
  if (!isCeiling(number)) return null;
  return floor ? { threshold: number, atLeast: true } : { threshold: number };
}

/**
 * Build a registry from a manifest's `{ "<@SCN>": { "<check>": <bar> } }` entries.
 *
 * BOTH KEYS ARE STORED BARE. A manifest written by hand will sooner or later spell either the way
 * a feature file does (`@SCN-CIP-001`, `@ci-run-time`), and both lookups match bare — so the `@` is
 * stripped once here rather than at every call site, where one reader would eventually forget and
 * the miss would be silent.
 *
 * A MALFORMED BAR IS DROPPED, NOT TRUSTED AND NOT THROWN ON — the same defensive stance
 * `checkRegistryOf` and `resolveDeferralTags` take, and for a sharper reason here. A ceiling of
 * `NaN` fails every comparison, so `measured <= NaN` is false and an honestly-fast suite would read
 * `failing` with the blame on the suite rather than on the manifest. Throwing instead would turn one
 * bad character into a run that produces no verdict at all, which is loud nowhere; a dropped bar
 * leaves the obligation with no ceiling, which is loud on the ledger.
 *
 * WHAT IS DROPPED IS THE BAR, NEVER THE CHECK (@SCN-MUT-003). The key still names a pair the target
 * authored, and that naming is the whole of what makes a check MEASURED — a measured check has no
 * script handle, so this registry's key set is the only place the tag is known at all. Dropping the
 * key with the value would take the obligation down with the bar: the stepless scenario carrying
 * that tag would raise nothing, and the only complaint left would come from the tag grammar, about
 * a check nobody wrote rather than about a bar nobody authored. So a value this cannot read is kept
 * as `null` — indistinguishable, to every reader downstream, from a pair the manifest never named,
 * which is the honest reading of both.
 *
 * A KEY THAT NAMES NO CHECK IS STILL DROPPED WHOLE. An empty tag names no pair, so there is no
 * check to hold measured and nothing to report a missing bar against.
 */
export function thresholdsOf(entries: Readonly<Record<string, unknown>>): ThresholdRegistry {
  const registry = new Map<string, Map<string, ThresholdBar | null>>();
  for (const [scnKey, checks] of Object.entries(entries)) {
    const scnId = bare(scnKey);
    if (scnId === "" || typeof checks !== "object" || checks === null) continue;
    const bars = new Map<string, ThresholdBar | null>();
    for (const [checkKey, entry] of Object.entries(checks as Record<string, unknown>)) {
      const checkTag = bare(checkKey);
      if (checkTag === "") continue;
      bars.set(checkTag, barOf(entry));
    }
    if (bars.size > 0) registry.set(scnId, bars);
  }
  return registry;
}

function bare(key: string): string {
  return key.replace(/^@/, "").trim();
}

/**
 * The BAR this scenario holds this check to, or `null` when there is none to read — the manifest
 * named no such pair, or it named the pair and authored no bar this could read (@SCN-MUT-003). The
 * two arrive here as one answer on purpose: a reader deciding what to do about a missing bar has
 * the same thing to say either way, and telling them apart would be an invitation to say something
 * different about one of them.
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
): ThresholdBar | null {
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
  for (const bars of registry.values()) for (const tag of bars.keys()) tags.add(tag);
  return [...tags].sort();
}
