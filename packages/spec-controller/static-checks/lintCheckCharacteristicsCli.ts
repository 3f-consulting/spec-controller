/**
 * THE CHECK-CHARACTERISTIC GATE — the words a target uses to name its checks, held to the
 * portfolio roster (@SCN-CHR-001, @SCN-CHR-002, @SCN-CHR-003, 3F-2996).
 *
 * THE TARGET IS READ THROUGH THE ENGINE'S OWN RESOLVERS, never a fresh read of
 * `specController.*`. `floorCheckTags` derives the tier-tag floor's legal set from
 * `resolveCheckRegistry` and `resolveThresholds`, so bounding what those resolvers may return
 * bounds the floor derivatively — with the judgement in ONE reader rather than two. A second
 * reader deciding independently which words name a check is the fault `floorCheckTags`' own header
 * exists to avoid, and it would be a strange thing to reintroduce in the check that exists to stop
 * lists disagreeing. It also inherits `bareTerm` normalisation for free (3F-2976): a manifest
 * spelling `@complexity` or `@mutation` resolves without a second reading of what a term BARE is.
 *
 * EVERY SOURCE IS READ, AND THEY STAY SEPARATE (@SCN-CHR-002, @SCN-CHR-005). A measured check has
 * no runnable script handle, so the registry can never carry it and `specController.thresholds` is
 * the only place it is named; a CONVERTED check is not discovered as a handle either, and names its
 * characteristic on its own configured row. A gate reading the registry alone would leave
 * `ci-run-time` and `mutation` mintable at will, and one stopping at the first two would leave
 * every converted check the same way — the fault surviving in the part of the config nobody looked
 * at. `registeredCheckTags`, `measuredCheckTags` and `floorCheckTags` are untouched: what is added
 * is that ONE roster judges what all three may name.
 *
 * AND THE SOURCES ARE COUNTED OUT LOUD, on the happy path (@SCN-CHR-005). The failure mode this
 * check has that its own faults do not is a source silently not read: it reds nothing, anywhere, so
 * the verdict names the places it reached rather than leaving a green to be read as covering the
 * manifest. `CHARACTERISTIC_SOURCE_KEYS` is the one list the reading and this sentence both take.
 *
 * THE WIRING LANDED AS ONE COMMIT, AND THAT IS WHY (@SCN-CHR-005). A `lint:`-prefixed script is
 * discovered as a running static check by `GUARD_SCRIPT_PREFIXES`, so one landing ahead of its
 * registry entry cites nothing, posts to suspense and reds `lint:self-balance`; symmetrically a
 * stepless fitness scenario landing ahead of the check that settles it reconciles `missing`. So
 * the `lint:check-characteristics` script, its registry entry, the CI step and the scenario are a
 * single commit — no subset of them is green. The `@integration` arms still reach this CLI
 * directly via `tsx` with their cwd set to a planted target — `runGuardInTarget`'s shape, which
 * judges a tree the script would not reach.
 *
 * THE MINT ROUTE, AND WHY ITS ROLL IS PRINTED BEFORE THE VERDICT (@SCN-CHR-003). A consumer whose
 * legitimate characteristic canon has not yet named must be able to name it, or the shared roster
 * becomes a gate on delivery. `specController.mintedCharacteristics` is that route: a SECOND act, in
 * a key whose only purpose is to say a portfolio word is being minted, and it carries a REASON —
 * an entry with nothing written against it is a config line again, which is the fault. Every mint
 * and its reason is printed on EVERY run, green included and red included, because a quiet
 * exception is how fourteen tags grew over a month without one red.
 *
 * THE GREEN LINE IS NOT BARE, AND THAT IS THE POINT OF IT. It states how many characteristics
 * were held, and it states the LIMIT: this check holds the WORDS to the roster and does not judge
 * whether a characteristic was EARNED. A quiet green is how fourteen tags grew over a month
 * without one red, so what the check does not establish is said on the happy path rather than
 * left to be inferred.
 */

import { existsSync, readFileSync } from "node:fs";

import { killFloorReaderFor } from "../src/ingest/ingestQualityChecks.js";
import {
  resolveCheckRegistry,
  resolveFitnessChecks,
  resolveMintedCharacteristics,
  resolveThresholds,
} from "@3f-consulting/spec-controller-core/internal";
import {
  admittedMints,
  CHARACTERISTIC_SOURCE_KEYS,
  characteristicFaults,
  namedCharacteristics,
  type AdmittedMint,
  type NamedCharacteristic,
} from "./characteristicRoster.js";

/** The target's own `package.json` — the manifest whose named characteristics are judged. */
export interface TargetManifest {
  specController?: {
    checkRegistry?: unknown;
    thresholds?: unknown;
    fitnessChecks?: unknown;
    mintedCharacteristics?: unknown;
  };
}

/**
 * Everything this manifest names, gathered from every place it may name one (@SCN-CHR-005).
 *
 * THE TARGET'S OWN TREE IS THE CWD, so `.` is the root every threshold record path is joined onto
 * — the same argument `floorCheckTags` passes, for the same reason.
 *
 * EXPORTED SO THE READING IS PINNABLE APART FROM THE PRINTING. A rule that reaches three sources is
 * worth nothing while the check still hands it two, and that inertness is silent: the verdict would
 * go on greening a manifest whose rows nobody read. So the CALL SITE is what the @unit arm holds,
 * not only the rule behind it.
 */
export function targetNamedCharacteristics(manifest: TargetManifest): NamedCharacteristic[] {
  return namedCharacteristics(
    resolveCheckRegistry(manifest),
    resolveThresholds(manifest, killFloorReaderFor(".")),
    resolveFitnessChecks(manifest, killFloorReaderFor(".")),
  );
}

/**
 * The target's `package.json`, or an empty object where there is none.
 *
 * Read BARE-RELATIVE from the working directory, which is what makes the cwd the target: the
 * `@integration` arm plants a tree and runs this from inside it, exactly as `lintScnTagsCli`
 * is driven for @SCN-STG-005.
 */
function targetPackageJson(): TargetManifest {
  if (!existsSync("package.json")) return {};
  return JSON.parse(readFileSync("package.json", "utf8")) as TargetManifest;
}

/** Read the target's manifest, judge the characteristics it names, and exit on the verdict. */
export function runCheckCharacteristicsLint(): void {
  const manifest = targetPackageJson();
  const named = targetNamedCharacteristics(manifest);
  const mints = resolveMintedCharacteristics(manifest);
  // The roster is left at its default — the portfolio's, which is the only one a real target is
  // judged against. Naming it here would be a second statement of a default stated once.
  const faults = characteristicFaults(named, undefined, mints);
  const admitted = admittedMints(mints);

  // NAMED ON EVERY RUN, GREEN INCLUDED, and printed BEFORE the verdict so it is read whichever
  // way the verdict goes. A quiet exception is how fourteen tags grew over a month without one
  // red, so the exception is loud on the happy path rather than surfacing only when something
  // else has already failed.
  for (const line of mintRoll(admitted)) console.log(line);

  if (faults.length === 0) {
    console.log(
      `check-characteristics lint: OK — ${named.length} characteristic(s) named across all ` +
        `${CHARACTERISTIC_SOURCE_KEYS.length} of the places a target may name one ` +
        `(${CHARACTERISTIC_SOURCE_KEYS.join(", ")}), and ` +
        `${admitted.length} mint(s) stated, every one either a word the portfolio roster ` +
        `carries or a mint carrying its reason. This holds the WORDS to the roster; it does not ` +
        `judge whether a characteristic was EARNED — canon's admission test asks whether an ` +
        `existing characteristic already names the property a check asserts, and no check can ` +
        `answer that. It does not judge whether a MINT was earned either.`,
    );
    return;
  }

  console.error(
    `check-characteristics lint: FAILED — ${faults.length} fault(s) in the characteristics this ` +
      `target names:`,
  );
  for (const fault of faults) console.error(`  ${fault.message}`);
  process.exitCode = 1;
}

/**
 * The mints this target states, each with the reason stated for it. Empty where it states none.
 *
 * IT REPORTS WHAT IS STATED, AND JUDGES NOTHING. The roll once said each entry was "admitted
 * because this target states why it needs the word" — which is untrue of exactly the entry a
 * reader most needs the truth about, because a STALE mint carries a reason too and so appears
 * here on the same run the verdict below is redding it. The roll then asserted admission two
 * lines above a refusal of the same word (3F-2996 review). In the check whose whole subject is a
 * mechanism reading reconciled when it is not, an output contradicting its own verdict is that
 * fault wearing this check's uniform.
 *
 * SO THE STANDING JUDGEMENT HAS ONE HOME — the verdict. Stating it twice is what let the two
 * disagree; the roll's job is visibility (every mint named on every run, green included), and
 * naming a word is not the same act as blessing it.
 */
function mintRoll(mints: readonly AdmittedMint[]): string[] {
  if (mints.length === 0) return [];
  return [
    `check-characteristics lint: ${mints.length} mint(s) stated — characteristic(s) the ` +
      `portfolio roster does not carry, each with the reason this target states for it. ` +
      `Whether a mint still licenses anything is the verdict below:`,
    ...mints.map((mint) => `  "${mint.characteristic}" — ${mint.reason}`),
  ];
}

// Run only when invoked as the script, so the @unit arm can import the helpers above without the
// gate judging a tree as a side effect of the import (the lintExemptDataFloorCli convention).
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) runCheckCharacteristicsLint();
