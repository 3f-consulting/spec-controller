/**
 * The tier-tag floor static check logic (the @unit-testable core).
 *
 * spec-controller reconciles on evidence tiers but did not require its OWN
 * scenarios to NAME one — a tier-less scenario yields no evidence obligation
 * and slips silently. This static check closes that (the cobbler's shoes): every
 * scenario under features/ carrying an @SCN-<FFF>-<NNN> must NAME at least one
 * TIER tag, UNLESS it is PARKED — carrying one of the deferral tags the TARGET configures
 * (@SCN-STG-008). This module names no community tag; see `isParked`.
 *
 * What counts as a tier (LOAD-BEARING): @unit / @integration / @e2e /
 * @performance, their `pending` variants (@unitpending / @integrationpending /
 * … — a <tier>pending NAMES the tier, deferred), AND bare @lint
 * (the style-lint check, one registered fitness check among many — the retired
 * @lint=<guard> form satisfies nothing, @SCN-LNT-007). The static check REFUSES
 * the =<guard> form: it raises no Evidence Obligation, so accepting it would call a scenario
 * tiered while it owed nothing at all. Exempt: a PARKED scenario ONLY (@SCN-STG-008).
 *
 * A FIFTH WAY TO SATISFY THE FLOOR, AND IT IS A TAG AND ONLY A TAG (@SCN-STG-005): a scenario
 * carrying a REGISTERED bare check tag (`@complexity`, `@typecheck`, `@vocab`) names its
 * fitness check, steps or none. This line used to add "AND IT IS A SHAPE AS WELL AS A TAG",
 * requiring the scenario to be STEPLESS; that half is retired (3F-3126) — steps say how a row
 * was written, the registered tag says which axis it is on. The check-tag set is INJECTED, like
 * the deferral set — see `lintScnTags`.
 *
 * AND ONE CHECK PER FITNESS SCENARIO (@SCN-STG-007). The floor asks whether a scenario names a
 * tier; this asks whether it names too many. Canon allows a fitness scenario ONE check — one run
 * is one credit — so a second registered bare check tag reds, naming both, on any unparked
 * scenario the registry's words appear on. It is the corpus-side twin of @SCN-LNT-008, which
 * enforces the same rule from the credit side.
 *
 * The feature-file SOURCES are INJECTED (not read from disk here) so the logic is
 * unit-tested in isolation over feature-strings; the CLI (lintScnTagsCli.ts)
 * provides the real sources by reading features/ over the real tree.
 *
 * @SCN-STG-001 — features/scn-tags.feature.
 */

/** A feature file's source, tagged with its slug for naming offenders. */
export interface FeatureFileSource {
  /** The feature-file basename (slug), used to name an offending scenario. */
  slug: string;
  /** The raw Gherkin source text of the feature file. */
  source: string;
}

/**
 * A single scn-tags lint finding.
 *
 * THREE KINDS, NOT ONE, because they are three faults with three different fixes
 * (@SCN-STG-002): `missing-tier-tag` says *add a tier*, `unrecognised-tag` says *this
 * tag means nothing here*, and `multiple-check-tags` says *split this into two scenarios*
 * (@SCN-STG-007). Collapsing any two would print one fault's remedy at the other's author —
 * which is precisely how `@untit` stayed invisible.
 */
export interface ScnTagsViolation {
  kind: "missing-tier-tag" | "unrecognised-tag" | "multiple-check-tags";
  message: string;
}

/** The result of an scn-tags lint run. */
export interface ScnTagsResult {
  ok: boolean;
  violations: ScnTagsViolation[];
}

/** The quality-check tiers whose bare (and `pending`) forms NAME a tier. */
const QUALITY_CHECKS = ["unit", "integration", "e2e", "performance"] as const;

/** A scenario code is `SCN-<FFF>-<NNN>` (matches ingest's parseScenarioCodes). */
const SCN_PATTERN = /^SCN-[A-Z0-9]+-\d+$/;

/**
 * True when a bare tag (no leading @) NAMES an evidence tier: a plain
 * quality-check (`unit`/`integration`/`e2e`/`performance`), a `<qc>pending`
 * variant, or bare `lint`.
 *
 * BARE `lint` STAYS, AND THE `lint=<guard>` CLAUSE IS GONE (@SCN-LNT-007, 3F-2567). They looked
 * like one rule and were two. The retired `lint=<guard>` FORM raises no obligation any more, so
 * recognising it here would grant the tier floor to a tag that names nothing — a scenario could
 * spell it, satisfy the floor, and owe nothing at all, which is precisely the silent hole this
 * floor exists to close. Dropped, `@lint=foo` is an unrecognised tag and `lint:scn-tags` reds it.
 * BARE `lint` is a different thing and is now MORE load-bearing than before: `@lint` is a
 * registered fitness check in its own right — the style-lint one, a flat peer of `@complexity`
 * (@SCN-LNT-010) — so removing this clause too would red every scenario that names it.
 *
 * EXPORTED for `vocabAudit.ts` (@SCN-VOC-013, 3F-2313), which needs the same answer to
 * decide what on a Gherkin tag line is GRAMMAR rather than authored vocabulary. It is
 * imported rather than copied on purpose: a second tier list over there would agree with
 * this one by diligence and then drift — the agreeing-by-copy @SCN-VOC-008 removed for
 * `.gitignore` and @SCN-VOC-010 for the canon table. This module imports nothing, so the
 * dependency is one-way and cycle-free.
 */
export function isTierTag(bare: string): boolean {
  if (bare === "lint") return true;
  for (const qc of QUALITY_CHECKS) {
    if (bare === qc || bare === `${qc}pending`) return true;
  }
  return false;
}

/**
 * Does this scenario carry a PARKING tag — a member of the target's deferral set (@SCN-STG-008)?
 *
 * NO TAG IS NAMED HERE, AND THAT IS THE RULE. `@wip` is a Cucumber convention this guard does not
 * own, and a check that bakes it in governs by a word it has no authority over: a project parking
 * with `@skip` had its deliberate deferral read as a fault, and one parking with `@parked` could
 * not be governed at all without renaming its corpus. The set is the TARGET's, injected, and the
 * community default is supplied at the CLI from the application layer's starter set — so a target
 * configuring nothing still parks with `@wip` while this module still names no community tag.
 *
 * THE SAME SET ANSWERS THE GRAMMAR QUESTION, which is what the old `const WIP` could not do: the
 * resolved set already arrived here for `unrecognisedTagViolations` and the floor then consulted a
 * hard-coded word instead, so a `@skip` scenario was recognised as a legitimate deferral and failed
 * for the deferral it had legitimately named. One set, two readings, no way for them to drift.
 */
function isParked(scenario: ParsedScenario, deferrals: ReadonlySet<string>): boolean {
  return scenario.tags.some((tag) => deferrals.has(tag));
}

/** The tier tags a near-miss is measured against, bare. */
const TIER_TAGS: readonly string[] = [
  ...QUALITY_CHECKS,
  ...QUALITY_CHECKS.map((qc) => `${qc}pending`),
  "lint",
];

/** Levenshtein distance, capped by nothing — the strings here are tag-length. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * The tier an unrecognised tag was probably meant to be, or undefined when none is
 * close. A COURTESY, never the verdict (@SCN-STG-002): the tag reds whether or not a
 * suggestion is found, so a wrong guess costs a poor message and nothing else.
 *
 * Distance 2 rather than 1 catches the drop-plus-transpose shapes (`@untegration`);
 * wider than that and `@e2e` starts attracting every short tag in the tree.
 */
function nearestTier(bare: string): string | undefined {
  let best: string | undefined;
  let bestDistance = 3;
  for (const tier of TIER_TAGS) {
    const distance = editDistance(bare.toLowerCase(), tier);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = tier;
    }
  }
  return best;
}

/**
 * The bare tag a group-prefixed tag should have been (@SCN-STG-004), or undefined when the tag
 * carries no value to strip a group from.
 *
 * `fitness=complexity` spells into the tag what the model already holds. There is no
 * `behavioural=unit`, so there is no `fitness=complexity` (canon 2026-08-07, the bare-tags
 * Correction) — and the author's intent survives the mistake intact: drop the group and what is
 * left is the tag they wanted.
 *
 * NO LIST OF GROUP NAMES IS CONSULTED, because there is nothing to list. The words a codebase
 * might reach for are not enumerable, and a list of the ones canon happens to name would green the
 * first one nobody thought of. The retired `lint=<handle>` form DOES reach here now (3F-2567 took
 * its `isTierTag` clause away), and it is served correctly by the same rule: the group is dropped
 * and the message names what is left. That it reds at all is the point — the form obliges nothing.
 */
function groupPrefixedMember(bare: string): string | undefined {
  return /^[^=]+=(.+)$/.exec(bare)?.[1];
}

/**
 * Why an unrecognised tag is unrecognised, and what to write instead — the clause following
 * `carries @<tag>,` in the message.
 *
 * TWO SHAPES, ONE VERDICT. A group-prefixed tag (@SCN-STG-004) resembles no tier, so edit distance
 * has nothing to offer it; what it has instead is a legible intent, and the message names the bare
 * tag rather than leaving the author to work it out. Every other unrecognised tag falls back to the
 * near-miss courtesy, which stays a courtesy and never the verdict (@SCN-STG-002).
 */
function unrecognisedTagFault(bare: string): string {
  const member = groupPrefixedMember(bare);
  if (member !== undefined) {
    return (
      `which spells a group into the tag — a check is named bare, its group living in the ` +
      `model — so this should have been @${member}`
    );
  }
  const suggestion = nearestTier(bare);
  return (
    `which is neither an evidence tier nor a recognised deferral tag` +
    (suggestion === undefined ? "" : ` — did you mean @${suggestion}?`)
  );
}

/** A scenario parsed from a feature source: its title and its own tag block. */
interface ParsedScenario {
  title: string;
  /** The scenario's own tags, bare (no leading @), in document order. */
  tags: string[];
}

/**
 * Parse each `Scenario:` / `Scenario Outline:` in a feature source together with
 * its own tag block — the contiguous tag lines immediately preceding the keyword
 * (blank lines tolerated, mirroring ingest's extractFeatureCode). Only genuine
 * TAG LINES contribute (a line whose first non-blank char is `@` and whose every
 * whitespace-separated token is a tag).
 */
function parseScenarios(source: string): ParsedScenario[] {
  const lines = source.split(/\r?\n/);
  const scenarios: ParsedScenario[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const match = /^Scenario(?: Outline)?:\s*(.*)$/.exec(line);
    if (match === null) continue;
    const tags: string[] = [];
    for (let j = i - 1; j >= 0; j--) {
      const prev = lines[j]!.trim();
      if (prev === "") continue;
      if (!prev.startsWith("@")) break;
      const tokens = prev.split(/\s+/);
      if (!tokens.every((t) => t.startsWith("@"))) break;
      for (const token of tokens.slice().reverse()) tags.unshift(token.slice(1));
    }
    scenarios.push({ title: match[1]!.trim(), tags });
  }
  return scenarios;
}

/**
 * The tags on one scenario that are not part of the grammar at all (@SCN-STG-002) —
 * neither the `@SCN` id, nor a tier, nor a member of the recognised deferral set.
 *
 * A SEPARATE FUNCTION, not an inlined loop, because the two questions this module now
 * asks have no shared state beyond the tag block: the floor asks about each tag on it.
 *
 * A GROUP-PREFIXED CHECK TAG IS NOT ONE OF THEM (@SCN-STG-004). `fitness=complexity` is no tier,
 * no deferral tag and no registered check — the registry names checks BARE — so it arrives here
 * whatever the registry holds, and `unrecognisedTagFault` names the tag it should have been.
 *
 * A REGISTERED CHECK TAG IS GRAMMAR WHEREVER IT SITS, steps or none (@SCN-STG-005) — the
 * registry is what says the word means something here, and the scenario's shape says nothing
 * about that. A stepped scenario riding one still reds, but as TIER-LESS, which is the fault it
 * has: telling an author "this tag means nothing here" about a tag that names a real check is
 * the same wrong-message failure @SCN-STG-002 split the two kinds to avoid.
 */
function unrecognisedTagViolations(
  feature: FeatureFileSource,
  scenario: ParsedScenario,
  scnId: string,
  recognised: ReadonlySet<string>,
  checks: ReadonlySet<string>
): ScnTagsViolation[] {
  const violations: ScnTagsViolation[] = [];
  for (const tag of scenario.tags) {
    if (SCN_PATTERN.test(tag) || isTierTag(tag) || recognised.has(tag) || checks.has(tag)) continue;
    violations.push({
      kind: "unrecognised-tag",
      message:
        `Feature "${feature.slug}" scenario @${scnId} ("${scenario.title}") carries ` +
        `@${tag}, ${unrecognisedTagFault(tag)}`,
    });
  }
  return violations;
}

/**
 * The ONE-CHECK rule, from the corpus side (@SCN-STG-007) — an unparked scenario carrying two
 * registered bare check tags, named with both.
 *
 * ONE CHECK PER FITNESS SCENARIO is canon (`fitness-functions.md`). @SCN-LNT-008 already
 * enforces it from the CREDIT side — one run is not evidence for two scenarios, and the runner-up
 * reads missing — but that arm only sees two scenarios reaching one check. The fault running the
 * other way is invisible to it: two runs citing one scenario are two honest credits, and nothing
 * about them says the corpus is wrong. So it is caught here, where the author is looking at the
 * file and the fix is one line.
 *
 * IT DOES NOT MAKE THE MODEL'S SOUNDNESS OPTIONAL. A registry mapping two handles onto one check
 * reaches the same collision with no corpus fault for this to see, which is why @SCN-LNT-012 stamps
 * each credit with its own bare tag as well. Mechanism and model, not one or the other.
 *
 * REGISTERED, AND NOTHING ABOUT SHAPE (3F-3126). An UNREGISTERED word names no check at all, so it
 * cannot be the second one; its fault is that it means nothing here, and `unrecognisedTagViolations`
 * says so with the near-miss courtesy. What is no longer asked is whether the scenario is STEPLESS.
 *
 * WHY THAT PRECONDITION WENT, since it was defended rather than incidental. It used to read
 * `if (!scenario.stepless) return []`, on the argument that a STEPPED scenario riding two check
 * tags has a different fault — it names no tier — so telling it "two checks" would send the author
 * to delete a tag when what they owe is a tier. That argument was DOWNSTREAM OF THE FLOOR: it holds
 * only while `satisfiesTierFloor` reds a stepped check-tagged row as tier-less, and 3F-3133 has
 * stopped it doing that. The floor reads the tag too now, so such a row names its tier fine and
 * its only remaining fault is that it claims two checks — the message the old defence called a
 * misdirection is the correct one, and the argument dissolved rather than losing.
 *
 * WHAT SURVIVES THE ARGUMENT IS THE CANON, UNCHANGED: one run is one credit, and a scenario
 * claiming two owes evidence it cannot tell apart. Steps are a fact about how a row is written;
 * the registered tag is the claim about which axis it is on (3F-3115, which moved the engine's
 * `fitnessObligationsOf` onto the tag alone for the same reason). An author who wrote two check
 * tags on one scenario meant two scenarios however they wrote it.
 *
 * BOTH TAGS NAMED. The author has to choose which scenario keeps which check, and a message naming
 * one of them has already chosen for them. In document order, so the message reads like the line.
 *
 * AND THE REMEDY NAMES NO SHAPE (3F-3133). It read "Split it into one stepless scenario per
 * check", which was sound only while the tier floor redded a stepped check-tagged row as
 * tier-less — an author who split into two STEPPED rows would have been sent back by the floor.
 * The floor reads the tag now, so both halves of the split are admissible however they are
 * written, and an instruction to strip the steps would be this rule prescribing the very shape
 * 3F-3097 exists to stop assuming.
 *
 * ASKED OF UNPARKED SCENARIOS ONLY, like the floor rather than like the grammar question — which
 * is the reverse of how it first shipped (operator ruling, 3F-2655). The original reading was that
 * a parking tag defers what a scenario OWES and so has nothing to say about what it IS, and that
 * the split is the same edit whenever it happens. Both readings agree about the edit; they
 * disagree about whether an author who has already said "not yet" should be made to do it now,
 * and canon says no: parking is a SKIP-SIGNAL, and out of scope is not a place where some
 * questions still get asked. The caller enforces this by POSITION — see `lintScnTags` — so this
 * function never has to know what parking is.
 *
 * AND THE SKIP IS NOT AN ERASURE. Unpark the scenario and the same two tags red again, unchanged;
 * `@SCN-STG-007`'s fourth When/Then pair is that assertion. What parking buys is time.
 */
function multipleCheckTagViolations(
  feature: FeatureFileSource,
  scenario: ParsedScenario,
  scnId: string,
  checks: ReadonlySet<string>
): ScnTagsViolation[] {
  const carried = scenario.tags.filter((tag) => checks.has(tag));
  if (carried.length < 2) return [];
  return [
    {
      kind: "multiple-check-tags",
      message:
        `Feature "${feature.slug}" scenario @${scnId} ("${scenario.title}") carries ` +
        `${carried.length} check tags — ` +
        `${carried.map((tag) => `@${tag}`).join(", ")} — but a fitness scenario names ONE ` +
        `check: one run is one credit, and a scenario claiming two owes evidence it cannot ` +
        `tell apart. Split it into one scenario per check.`,
    },
  ];
}

/**
 * Does this scenario name an evidence tier (@SCN-STG-005)?
 *
 * TWO WAYS, AND THE SECOND IS A TAG AND ONLY A TAG. A behavioural scenario names one of the tier
 * tags `isTierTag` knows. A FITNESS scenario names none of them: once the technique leaves the tag
 * (`@lint=lint:complexity` → `@complexity`), the check tag is all it carries. So a scenario
 * carrying a registered bare check tag satisfies the floor on that alone — without which the
 * corpus sweep writes a scenario per CI check and every one reds.
 *
 * WHETHER IT HAS STEPS IS NOT ASKED (3F-3126). This route used to require the scenario to be
 * STEPLESS, defended as STEPLESS IS THE DISCRIMINATOR HERE, NOT THE TAG: letting a stepped
 * scenario ride a bare check tag would put a whole-system characteristic on the tier of an example
 * it was never about, name-match's own fault in a shorter spelling. That defence is retired.
 * Steplessness was a CORRELATE of having nothing to exemplify, never the thing itself, and
 * 3F-3097 converts fitness checks to real step definitions — so a floor keyed on the correlate
 * reds the first conversion for writing exactly the shape the obligation rule asks for. Steps say
 * how a row was written; the REGISTERED tag is the claim about which axis it is on (3F-3115, which
 * moved `fitnessObligationsOf` onto the tag alone for the same reason).
 *
 * SO THE FLOOR AND THE OBLIGATION RULE ASK ONE QUESTION OF ONE SET, which is the invariant the
 * Rule preamble required before either had met it. Both read
 * `registeredCheckTags(checkRegistry) ∪ measuredCheckTags(thresholds)` off the target's own
 * package.json (`lintScnTagsCli`; `parse/targetCorpus`), and now both ask exactly `tag ∈ set`:
 * this floor admits precisely the scenarios the engine raises a fitness obligation for. Neither
 * the tier-named evidence-free row nor the obligated row this floor refuses is constructible.
 *
 * WHAT STOOD HERE UNTIL THIS COMMIT WAS AN INTERIM RECORD, AND IT IS RETIRED BY BEING SETTLED
 * (3F-3115 wrote it, 3F-3126 closes it). It said this floor was DELIBERATELY THE STRICTER OF THE
 * TWO; that what the retired MUST-AGREE sentence feared could not happen because this floor's
 * condition was a strict SUBSET of the engine's; and that THE SURVIVING DISAGREEMENT RAN THE OTHER
 * WAY and was fail-loud — a stepped check-tagged row redding here by name. The subset is now an
 * equality and there is no disagreement left to be loud about, so all three go together rather
 * than one of them being left to read as still true.
 *
 * WHAT THE REGISTRY STILL DOES IS UNCHANGED, and it is now the whole of the route: an
 * UNREGISTERED word names no check, satisfies nothing, and reds twice — once as a tag that means
 * nothing here, once as a scenario that named no tier. That negative pair is what makes the pass
 * above the injected set's doing rather than a floor that stopped looking.
 */
function satisfiesTierFloor(scenario: ParsedScenario, checks: ReadonlySet<string>): boolean {
  if (scenario.tags.some(isTierTag)) return true;
  return scenario.tags.some((tag) => checks.has(tag));
}

/**
 * Lint the feature sources for the tier-tag floor: every scenario carrying an
 * @SCN must NAME a tier tag unless it is PARKED. Returns a LintResult-shaped
 * `{ ok, violations }` — an empty `violations` (and `ok: true`) means the tree
 * satisfies the floor; each violation names a tier-less unparked @SCN scenario.
 *
 * `deferralTags` — the target's PARKING set (@SCN-STG-008) — is INJECTED and defaults to NONE, so
 * this module holds no community tag of its own. It is read TWICE, and the two readings are why
 * there is one parameter rather than two: as GRAMMAR (`unrecognisedTagViolations` — a deferral tag
 * means something here) and as a SKIP (`isParked` — a parked scenario is out of the floor's
 * scope). It used to be read only the first way while the floor asked a hard-coded `wip`, which
 * is how a `@skip` scenario came to be recognised as a legitimate deferral and then failed for it.
 * "Defaults to the community set" is the CLI's job, from the application layer's starter list.
 *
 * `checkTags` — the target's REGISTERED bare check tags (@SCN-STG-005) — is INJECTED and defaults
 * to none, exactly as the deferral set is, and for the same reason: which words name a check is
 * the target's own answer, not this module's. Inferred from shape instead — any bare tag a
 * STEPLESS scenario carries — a typo would satisfy the floor and raise no obligation; inferred
 * from a `lint:` prefix, `typecheck` would be missed (3F-2495). The shape belongs to that rejected
 * reading and to nothing this module still does: no rule here asks about steps (3F-3126), and the
 * private reader that answered it is retired (3F-3134). A target that has registered nothing
 * behaves exactly as it did before, which is what lets this land ahead of the sweep that uses it.
 */
export function lintScnTags(
  features: readonly FeatureFileSource[],
  deferralTags: readonly string[] = [],
  checkTags: readonly string[] = []
): ScnTagsResult {
  const violations: ScnTagsViolation[] = [];
  const deferrals = new Set(deferralTags);
  const checks = new Set(checkTags);
  for (const feature of features) {
    for (const scenario of parseScenarios(feature.source)) {
      const scnId = scenario.tags.find((t) => SCN_PATTERN.test(t));
      if (scnId === undefined) continue; // no @SCN tag — not checked

      // The GRAMMAR question, asked before the floor and independently of it: a
      // scenario can name a tier AND carry a typo, and the typo is the interesting half.
      violations.push(...unrecognisedTagViolations(feature, scenario, scnId, deferrals, checks));

      // PARKED IS OUT OF SCOPE, FULL STOP — for the one-check rule below as well as the floor
      // (@SCN-STG-008 for the floor, @SCN-STG-007 for the one-check rule; operator ruling
      // 3F-2655). The set is the target's; see `isParked`.
      //
      // ITS POSITION IS THE RULE. Below the grammar arm, so a parked scenario's tags are still
      // read for well-formedness — parking defers what a scenario OWES and what SHAPE it must
      // have, never whether its tags are spelled right, and this very set is what lets that arm
      // recognise the parking tag, so excusing it would hide a typo behind one more tag. Above
      // everything else, because out of scope is not a place where some questions still get asked.
      if (isParked(scenario, deferrals)) continue;

      // The ONE-CHECK question (@SCN-STG-007) — a scenario whose tags name a check twice is two
      // scenarios written as one, whatever else it carries. Asked of UNPARKED scenarios only, like
      // the floor under it rather than like the grammar arm above it.
      violations.push(...multipleCheckTagViolations(feature, scenario, scnId, checks));

      if (satisfiesTierFloor(scenario, checks)) continue;
      violations.push({
        kind: "missing-tier-tag",
        message:
          `Feature "${feature.slug}" scenario @${scnId} ("${scenario.title}") names ` +
          `no evidence tier and is not parked — every @SCN scenario must name at least ` +
          `one tier (@unit/@integration/@e2e/@performance, a <tier>pending variant, or ` +
          `@lint=<guard>), or a registered bare check tag, unless it carries one of the ` +
          `deferral tags this target configures.`,
      });
    }
  }
  return { ok: violations.length === 0, violations };
}
