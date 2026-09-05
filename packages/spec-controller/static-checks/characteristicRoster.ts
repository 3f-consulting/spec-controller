/**
 * THE FAULT RULE over the characteristics a target's manifest NAMES (@SCN-CHR-001, @SCN-CHR-004,
 * 3F-2996).
 *
 * ONE QUESTION, ASKED OF EVERY CHARACTERISTIC A TARGET NAMES: does the portfolio roster carry
 * this word? A registry entry naming one it does not carry has MINTED a characteristic — and
 * until this rule existed, the same line that minted it was the line that certified it, because
 * the legal set was read out of the very file the entry was written into.
 *
 * THE MESSAGE NAMES THE WORD, THE MANIFEST KEY AND THE ENTRY, and all three are load-bearing. An
 * author who has just added a check has made TWO edits — a script and a registry entry — and
 * "your registry is wrong" leaves them to work out which of the two is at fault. The key says
 * where to look; the entry says which line.
 *
 * NOT A NEAR-MATCH COURTESY. A word the roster does not carry is never resolved to the roster
 * word it resembles, and the message never names that word either. The mint is the act being
 * surfaced, and quietly reading it as something else would hide exactly what this exists to make
 * visible — the same reason `checkTagOfScript` answers `null` for an unregistered handle rather
 * than inventing a tag from the handle's shape.
 *
 * PURE, AND THE ROSTER IS INJECTED. Every characteristic spec-controller itself names is already
 * a portfolio word, so this rule is green over this tree by construction and a passing build is
 * consistent with it being broken in either direction. It is proven against constructed input
 * instead — `exemptionFaults`' stance (@SCN-VOC-016), for its reason.
 *
 * THE TARGET IS READ THROUGH THE ENGINE'S OWN REGISTRY, which is what keeps this check from
 * disagreeing with the tier-tag floor: `floorCheckTags` derives its legal set from the same
 * resolver, so bounding what a target may NAME bounds the floor derivatively, with the judgement
 * in one reader rather than two. It also inherits `bareTerm` normalisation for free (3F-2976).
 */

import { PORTFOLIO_CHECK_CHARACTERISTICS } from "@3f-consulting/spec-controller-core";
import type {
  CheckRegistry,
  FitnessCheckRegistry,
  ThresholdRegistry,
} from "@3f-consulting/spec-controller-core/internal";

/** The manifest key a registry entry's characteristic was carried by. */
const CHECK_REGISTRY_KEY = "specController.checkRegistry";

/** The manifest key a threshold entry's characteristic was carried by. */
const THRESHOLDS_KEY = "specController.thresholds";

/** The manifest key a CONVERTED check's row carries its characteristic on (@SCN-CHR-005, 3F-3138). */
const FITNESS_CHECKS_KEY = "specController.fitnessChecks";

/**
 * EVERY PLACE A TARGET MAY NAME A CHARACTERISTIC, and it is a LIST because the failure mode here
 * is a source silently not read (@SCN-CHR-005).
 *
 * A SOURCE NOBODY READS REDS NOTHING, ANYWHERE, BY CONSTRUCTION — which is what makes it unlike
 * every other fault this module reports: an unrostered word is loud, a stale mint is loud, and a
 * key nobody consults is a green about words nobody looked at. So the places are written down
 * once, `namedCharacteristics` is held to reaching all of them, and the verdict says how many it
 * read.
 *
 * MINTS ARE NOT A MEMBER. A mint does not NAME a characteristic a check asserts; it states why a
 * word the roster does not carry is needed, which answers the fault rather than feeding it.
 * Listing it here would hold every mint to the roster, refusing the words the key exists to admit.
 */
export const CHARACTERISTIC_SOURCE_KEYS = [
  CHECK_REGISTRY_KEY,
  THRESHOLDS_KEY,
  FITNESS_CHECKS_KEY,
] as const;

/** The manifest key a mint was carried by — the SECOND act, never the line that adds the check. */
const MINTED_KEY = "specController.mintedCharacteristics";

/** One characteristic a target names, and the manifest entry that named it. */
export interface NamedCharacteristic {
  /** The bare characteristic (`complexity`). */
  readonly characteristic: string;
  /** The manifest key that carried it (`specController.checkRegistry`). */
  readonly key: string;
  /** The entry within that key — the script handle, for the registry. */
  readonly entry: string;
}

/**
 * The mints a target states (@SCN-CHR-003) — bare characteristic → the reason stated for it, or
 * `null` where the target stated none this reader could take.
 *
 * A KEY WHOSE ONLY PURPOSE IS TO SAY A PORTFOLIO WORD IS BEING MINTED. It is a SECOND act, never
 * the same line that adds the check, which is what makes it a route out of the fault rather than
 * the fault under another name.
 */
export type MintedCharacteristics = ReadonlyMap<string, string | null>;

/** One mint that states a reason, and so admits the word it names. */
export interface AdmittedMint {
  readonly characteristic: string;
  readonly reason: string;
}

/** One characteristic the roster does not carry, and where the manifest named it. */
export interface CharacteristicFault {
  readonly characteristic: string;
  readonly key: string;
  readonly entry: string;
  readonly message: string;
}

/**
 * The characteristics the target's check registry names, in the registry's own order.
 *
 * THE REGISTRY IS THE CREDIT SIDE — where a static check's characteristic is written down, keyed
 * by the runnable script handle. Both manifest spellings reach the same place: `checkRegistryOf`
 * has already read the bare string form and the `{ check, scn }` object form into one entry
 * (3F-2994's citation seam), so this reader sees the CHARACTERISTIC and never the spelling.
 */
export function registryCharacteristics(registry: CheckRegistry): NamedCharacteristic[] {
  return [...registry].map(([handle, entry]) => ({
    characteristic: entry.check,
    key: CHECK_REGISTRY_KEY,
    entry: handle,
  }));
}

/**
 * The characteristics the target's thresholds name, in the registry's own order (@SCN-CHR-002).
 *
 * THE MEASURED SIDE IS NAMED SOMEWHERE ELSE, AND IS NAMED ALL THE SAME. A measured check has no
 * runnable script handle — nothing invokes it — so `checkRegistry` can never carry it, and the
 * only place it is ever named is here. A rule reading the registry alone would therefore leave
 * `ci-run-time` and `mutation` mintable at will: the fault this slice closes, surviving in the
 * half of the config nobody looked at.
 *
 * THE TWO SOURCES STAY TWO, exactly as the obligation rule reads them (@SCN-STG-009,
 * `obligationTags`). What is added is that ONE roster judges both — so neither source answers for
 * the other, and a clean registry does not absolve the thresholds.
 *
 * ONE ENTRY PER @SCN AND CHECK PAIR, never per @SCN and never per word. A stepless scenario may
 * carry more than one bare check (@SCN-LNT-012), so one @SCN can name two characteristics, and a
 * reader flattening to the @SCN would judge whichever it read first and green the other. This is
 * also why the pairs are not taken from `measuredCheckTags`, which is unique-and-sorted by design:
 * the remedy here is a manifest LINE, so a word minted under two @SCNs is two edits.
 *
 * A PAIR WHOSE BAR COULD NOT BE READ IS STILL A PAIR THE TARGET NAMED (@SCN-MUT-003). `thresholdsOf`
 * keeps such a key with `null` beside it, because the NAMING is what makes a check measured and the
 * missing bar is @SCN-CIP-002's complaint. Dropping it here would hand back exactly the false-green
 * an author earns by mistyping the number beside a minted word.
 */
export function thresholdCharacteristics(thresholds: ThresholdRegistry): NamedCharacteristic[] {
  return [...thresholds].flatMap(([scnId, bars]) =>
    [...bars.keys()].map((characteristic) => ({
      characteristic,
      key: THRESHOLDS_KEY,
      entry: scnId,
    })),
  );
}

/**
 * The characteristics the target's CONFIGURED FITNESS ROWS name, in the rows' own order
 * (@SCN-CHR-005, 3F-3138).
 *
 * NEITHER OF THE OTHER TWO EVER CARRIES ONE. A converted check is not discovered as a runnable
 * script handle — it is a scenario that ran, carrying its own tag line — so the registry cannot
 * hold it, and a STATIC converted row names no bar so the thresholds cannot either. Its row is the
 * only place its characteristic is written, which makes a reading that stops at the first two this
 * file's own fault, reached by moving one word one key sideways.
 *
 * THE @SCN IS THE ENTRY, as the script handle is on the registry's side and the @SCN on the
 * thresholds'. The remedy is a manifest LINE, so a word mistyped on two rows is two edits.
 *
 * THE BAR IS NOT ASKED ABOUT. Whether a row is measured decides which STREAM credits the check and
 * says nothing about whether its word is a portfolio word; a reading that saw only the static rows
 * would leave every converted MEASURED check mintable at will — @SCN-CHR-002's fault, one key over.
 */
export function fitnessCheckCharacteristics(
  fitnessChecks: FitnessCheckRegistry,
): NamedCharacteristic[] {
  return [...fitnessChecks].map(([scnId, row]) => ({
    characteristic: row.characteristic,
    key: FITNESS_CHECKS_KEY,
    entry: scnId,
  }));
}

/**
 * Everything this target names, gathered from every place it may name one (@SCN-CHR-005).
 *
 * ONE ASSEMBLY, AND THAT IS THE WHOLE OF WHY IT EXISTS. Readers spread over a caller's argument
 * list are as many chances to add a fourth source and reach only three — and a source nobody reads
 * reds nothing, anywhere, by construction. So the gathering has one home, a pin holds it to
 * `CHARACTERISTIC_SOURCE_KEYS`, and the verdict counts that same list rather than a number somebody
 * keeps in step by hand. Order is the manifest's, source by source, because an author reading a red
 * is reading their own file top to bottom.
 */
export function namedCharacteristics(
  registry: CheckRegistry,
  thresholds: ThresholdRegistry,
  fitnessChecks: FitnessCheckRegistry,
): NamedCharacteristic[] {
  return [
    ...registryCharacteristics(registry),
    ...thresholdCharacteristics(thresholds),
    ...fitnessCheckCharacteristics(fitnessChecks),
  ];
}

/** What a minted characteristic's message says. */
function mintMessage(named: NamedCharacteristic): string {
  return (
    `"${named.characteristic}" is not a characteristic the portfolio roster carries. ` +
    `${named.key}'s "${named.entry}" entry names it, which MINTS a characteristic: the roster ` +
    `ships from @3f-consulting/spec-controller-core and arrives with this target's pinned ` +
    `version, so a word written into this manifest is not thereby a word the portfolio carries. ` +
    `Name a characteristic the roster does carry, or state in ${MINTED_KEY} why this target ` +
    `needs a word the portfolio has not named.`
  );
}

/** What a mint stating no reason says. */
function reasonlessMintMessage(characteristic: string): string {
  return (
    `"${characteristic}" is minted with no reason stated. ${MINTED_KEY}'s "${characteristic}" ` +
    `entry carries nothing against it, and an entry with nothing written against it is a config ` +
    `line again — which is the fault a mint exists to be the way out of, so it admits nothing. ` +
    `State why this target needs a word the portfolio roster does not carry, or delete the entry.`
  );
}

/**
 * The remedy both staleness arms end in, stated once because it IS one remedy (@SCN-CHR-004).
 *
 * A mint that licenses nothing is deleted, whichever way it stopped licensing — which is why the
 * two arms are one Rule and one scenario. The DIAGNOSIS differs and is the sentence before this
 * one: told only "delete it", an author cannot tell whether their check went away or their word
 * arrived, and those are different things to have happened.
 */
function staleMintRemedy(characteristic: string): string {
  return (
    `Delete ${MINTED_KEY}'s "${characteristic}" entry — an entry that reds nothing sits on as ` +
    `standing permission for the next characteristic that happens to match it, and the route ` +
    `only ratchets while every mint is licensing something.`
  );
}

/**
 * The places this message tells an author to look, read off the read set rather than restated.
 *
 * A LIST WRITTEN TWICE FALLS OUT OF STEP, and here it would do so silently: the staleness VERDICT
 * already reads whatever `namedCharacteristics` gathered, so a sentence naming two of three sources
 * would send an author to the wrong places about a decision that had read all of them.
 */
function namingKeysProse(): string {
  const keys = [...CHARACTERISTIC_SOURCE_KEYS];
  return `${keys.slice(0, -1).join(", ")} or ${keys[keys.length - 1]}`;
}

/** What a mint nothing in the target's own manifest names any more says. */
function unusedMintMessage(characteristic: string): string {
  return (
    `"${characteristic}" is minted with a reason, but no ${namingKeysProse()} entry names it ` +
    `any more, so this mint is not what makes anything legal. ` +
    staleMintRemedy(characteristic)
  );
}

/** What a mint the portfolio roster has since carried says. */
function supersededMintMessage(characteristic: string): string {
  return (
    `"${characteristic}" is minted with a reason, but the portfolio roster now carries the word ` +
    `itself, so this mint licenses nothing the roster does not already carry. ` +
    staleMintRemedy(characteristic)
  );
}

/**
 * The reason a mint states, or `""` where it states none this reader can take.
 *
 * ONE READING OF WHAT A STATED REASON IS, and it is here rather than at the edge because this rule
 * is pure and is asked the question over constructed input as well as over a manifest. Blank space
 * is not a reason however it arrived.
 */
function reasonOf(mints: MintedCharacteristics, characteristic: string): string {
  return (mints.get(characteristic) ?? "").trim();
}

/**
 * The mints this target states a reason for — the ones that admit the word they name (@SCN-CHR-003).
 *
 * EXPORTED SO THE VERDICT PRINTS THEM WITHOUT RE-DECIDING THEM. Every mint is named on every run,
 * green included, and a caller filtering the map itself would be a second reading of which entries
 * count as mints — the disagreement between readers this whole slice exists to stop.
 */
export function admittedMints(mints: MintedCharacteristics): AdmittedMint[] {
  return [...mints.keys()]
    .filter((characteristic) => reasonOf(mints, characteristic) !== "")
    .map((characteristic) => ({ characteristic, reason: reasonOf(mints, characteristic) }));
}

/**
 * Why this mint licenses nothing, or `null` where it still does (@SCN-CHR-004).
 *
 * THE ROSTER IS ASKED FIRST, and where both descriptions are true only the stronger is printed: a
 * word the portfolio carries could never need this mint again, whereas one nothing names today may
 * be named tomorrow by the check being written this afternoon.
 *
 * BOTH SOURCES COUNT AS NAMING IT, because a measured check has no runnable script handle and the
 * thresholds are the only place it is ever named (@SCN-CHR-002). A staleness reading that saw only
 * the registry would red every measured mint the moment it was made — the route closed for exactly
 * the checks with no handle to be named by.
 */
function stalenessOf(
  characteristic: string,
  roster: readonly string[],
  namedWords: ReadonlySet<string>,
): string | null {
  if (roster.includes(characteristic)) return supersededMintMessage(characteristic);
  if (!namedWords.has(characteristic)) return unusedMintMessage(characteristic);
  return null;
}

/**
 * The mints that are no longer what makes anything legal (@SCN-CHR-004).
 *
 * THE RATCHET, WITHOUT WHICH THE ROUTE IS THE SELF-CERTIFYING ROSTER WITH AN EXTRA STEP. A mint
 * records that a word the portfolio had not named was needed AT THE TIME IT WAS WRITTEN. The check
 * that needed it can be deleted, and the roster can carry the word since; either way the entry reds
 * nothing by construction, so nothing notices, and it sits on as licence for the next characteristic
 * that happens to match it. This is the shape `lint:exempt-data-floor` already ratchets under
 * (@SCN-VOC-017), reached here by the same route: the set can then only shrink.
 *
 * ASKED ONLY OF MINTS THAT ARE MINTS. A reasonless entry admits nothing, so whether it still
 * licenses something is a question about a thing that never licensed anything — and the module's
 * rule is one fault per ENTRY, so a second finding on that one line would name one remedy twice and
 * make the count of faults a count of readings rather than of edits.
 */
function staleMintFaults(
  named: readonly NamedCharacteristic[],
  roster: readonly string[],
  mints: MintedCharacteristics,
): CharacteristicFault[] {
  const namedWords = new Set(named.map((one) => one.characteristic));
  return admittedMints(mints).flatMap((mint) => {
    const message = stalenessOf(mint.characteristic, roster, namedWords);
    return message === null
      ? []
      : [{ characteristic: mint.characteristic, key: MINTED_KEY, entry: mint.characteristic, message }];
  });
}

/**
 * The characteristics named here that neither the portfolio roster carries nor a mint admits, the
 * mints that state no reason (@SCN-CHR-003), and the mints that license nothing (@SCN-CHR-004).
 *
 * ONE FAULT PER ENTRY, NOT PER WORD. The remedy is per-entry — a manifest line to change — so a
 * message naming a minted word once would hide the second place it has to be fixed.
 *
 * A MINT ADMITS THE WORD IT NAMES, NEVER THE FILE IT SITS IN. Membership is asked per
 * characteristic, so a target minting one word does not thereby license the off-roster entry
 * beside it — one config line certifying the rest of the manifest is the fault this slice closes,
 * wearing the key that exists to be the way out of it.
 *
 * A REASONLESS MINT REDS ON ITS OWN ACCOUNT, AND THAT IS WHY THE OFF-ROSTER FAULT STANDS BESIDE IT.
 * The author believes they have already covered the word, so an off-roster complaint alone leaves
 * them with no way to see why their route did not open; and the mint key is judged in its own right
 * rather than only as a defence raised against some other entry, so a reasonless line cannot sit
 * unread as standing permission for the next entry that matches it. Two findings, one remedy, and
 * the second is what stops the first being baffling.
 *
 * AND A MINT THAT IS STILL A MINT IS ASKED WHETHER IT IS STILL LOAD-BEARING. The off-roster arm
 * above bounds what a target may NAME; the stale arm bounds how long a mint may go on licensing it.
 * Without the second the route is the self-certifying roster with an extra step — the words are
 * held to the portfolio on the day a mint is written, and never again.
 */
export function characteristicFaults(
  named: readonly NamedCharacteristic[],
  roster: readonly string[] = PORTFOLIO_CHECK_CHARACTERISTICS,
  mints: MintedCharacteristics = new Map(),
): CharacteristicFault[] {
  const unadmitted = named
    .filter(
      (one) => !roster.includes(one.characteristic) && reasonOf(mints, one.characteristic) === "",
    )
    .map((one) => ({
      characteristic: one.characteristic,
      key: one.key,
      entry: one.entry,
      message: mintMessage(one),
    }));

  const reasonless = [...mints.keys()]
    .filter((characteristic) => reasonOf(mints, characteristic) === "")
    .map((characteristic) => ({
      characteristic,
      key: MINTED_KEY,
      entry: characteristic,
      message: reasonlessMintMessage(characteristic),
    }));

  return [...unadmitted, ...reasonless, ...staleMintFaults(named, roster, mints)];
}
