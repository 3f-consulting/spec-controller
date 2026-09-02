/**
 * Ingest the target's quality-check inputs — the IMPURE reads behind the balance
 * command (split out of the old cli.ts). Reads evidence
 * obligations from the repo's feature files, observed evidence from the Vitest +
 * Cucumber result JSON, and the static-check evidence from the CI config + package.json,
 * turning each into the engine's in-memory model. The orchestration (arg parsing, the
 * output plan/write, main) stays in cli-balance/cli.ts; these are the file reads it calls.
 *
 * Configurable input paths (no adapter registry in v1 — the readers are named, not
 * registered). Missing result files are tolerated: their evidence is simply absent
 * (the scenario reconciles as missing for that level). The static check kind reads
 * `--ci` (a workflow file or a directory of them, default `.github/workflows`) +
 * `package.json` to observe each fitness check the corpus cites.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { discoverFeatures } from "./ingestScenarios.js";
import {
  parseScenarios,
  countScnOccurrences,
  parseUntaggedScenarios,
  proseOnlyCodes,
} from "@3f-consulting/spec-controller-core";
import { UnreadableFeatureCorpusError, type GherkinParseError } from "./gherkinValidation.js";
import { DEFAULT_DEFERRAL_TAGS } from "../deferralTags.js";
import {
  evidenceObligations,
  type EvidenceObligations,
  type UntaggedScenario,
} from "@3f-consulting/spec-controller-core";
import {
  parseVitestEvidenceObservations,
  type VitestJsonReport,
} from "@3f-consulting/spec-controller-core";
import {
  parseCucumberEvidenceObservations,
  type CucumberJsonReport,
} from "@3f-consulting/spec-controller-core";
import { checkStaticEvidenceObligations } from "@3f-consulting/spec-controller-core";
import { runningStaticChecks } from "@3f-consulting/spec-controller-core";
// The citation seam (@SCN-LNT-005) — the registry read, the corpus hop, and the two composed.
// Core-internal rather than public: where a target's registry is AUTHORED is still open (the
// registry-home question, increment D), so the seam's shape is not a v1 contract yet.
import {
  bareTerm,
  checkRegistryOf,
  registeredCheckTags,
  fitnessCitations,
  citationOfScript,
  parseTaggedScenarios,
  thresholdsOf,
  measuredCheckTags,
  parseMeasuredEvidenceObservations,
  type CheckRegistry,
  type FitnessCitations,
  type ScriptCitation,
  type ThresholdRegistry,
} from "@3f-consulting/spec-controller-core/internal";
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
import { evidenceReconciliationOf } from "@3f-consulting/spec-controller-core";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
// The mutation-ratchet library, reached for the RECORD half of a bar that names a gate
// (@SCN-MUT-012): its conventional record name, its reader, and the floor a gate's own figures
// imply. Through the barrel, which is the surface a consumer holds.
import {
  gateRecordFor,
  killFloorOf,
  MalformedRecordError,
  parseGateRecords,
  RECORD_FILE,
  type MutationGateRecord,
} from "../mutation-ratchet/index.js";
import type {
  Scenario,
  RuntimeQualityCheck,
  EvidenceObservation,
  EvidenceReconciliation,
} from "@3f-consulting/spec-controller-core";

/**
 * The per-input FALLBACK quality-check for each JS-ecosystem result source — the
 * source→quality-check mapping, SET at the CLI edge rather than hardcoded in the core
 * parsers / countRuntimeEvidenceObservationKinds. A second ecosystem (pytest / JUnit) sets its own here (or
 * via an adapter); the core never assumes a mapping. No CLI override flag yet — that
 * earns its place at the second ecosystem, not now.
 */
const VITEST_QUALITY_CHECK: RuntimeQualityCheck = "unit";
const CUCUMBER_QUALITY_CHECK: RuntimeQualityCheck = "integration";

/**
 * The static-check script-prefix convention set — which package.json script names the
 * running-guard observer (`runningStaticChecks`) recognises as static checks, SET at the
 * CLI edge rather than hardcoded in the core parser. `lint:*` is an earlier internal tool's own convention;
 * `guard:*` is an adopter's repository's (four `guard:*` guards run in an adopter's repository's CI). A third convention adds its
 * prefix here; the core never assumes the set. No CLI override flag yet — that earns its place
 * at a third ecosystem, not now (mirrors the VITEST_QUALITY_CHECK stance above).
 * `qualityCheck: "lint"` (the static-check axis name) is unchanged — this is the script prefix,
 * not the axis.
 *
 * A HEURISTIC FOR FINDING CHECKS, NEVER THE DEFINITION OF ONE (@SCN-USG-009, 3F-2495). Membership
 * is a property of the CHECK — does it analyse source without executing it — so a target whose
 * gate this set misses configures it by name via `specController.staticChecks` (below) rather than
 * renaming its scripts to our convention, which is not a thing the tool can ask of a client.
 */
const GUARD_SCRIPT_PREFIXES: readonly string[] = ["lint:", "guard:"];

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
 * The third of this edge's `specController.*` resolvers, and defensive like the two above it: a
 * missing, non-object or array-shaped config resolves EMPTY, and a malformed entry is dropped by
 * `checkRegistryOf` rather than thrown. There is no starter set — unlike deferral tags there is no
 * built-in a target would inherit, and a registry entry the target did not write would put a
 * fitness obligation on its books under a word it never used.
 *
 * Where a registry is AUTHORED is still open (the registry-home question, increment D); this key is
 * the seam it is read from today, and the tier-tag floor reads it through THIS function so the
 * floor admits exactly the tags the obligation rule raises against.
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
 * The fourth of this edge's `specController.*` resolvers, and defensive like the three above it: a
 * missing, non-object or array-shaped config resolves EMPTY, and a malformed entry is dropped by
 * `thresholdsOf` rather than thrown. There is no starter set: a ceiling the target did not write
 * would hold its suites to a bar nobody chose.
 *
 * AND A BAR MAY NAME A MUTATION GATE INSTEAD OF A FIGURE (@SCN-MUT-012, 3F-2788). A number in a
 * manifest is a number somebody has to re-derive after every sweep that moves it. So the VALUE may
 * be a reference to a gate whose record already holds the counts, and it is substituted for that
 * gate's kill floor HERE — before `thresholdsOf` is called, so what reaches the registry is the
 * number it has always taken and `packages/core` keeps knowing nothing about records, gates or
 * YAML. That containment is the whole reason this seam is at the edge rather than in the engine.
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
  /** The TARGET's tree, which every record path below is joined onto (@SCN-LNT-005). */
  root: string
): ThresholdRegistry {
  const configured = packageJson.specController?.thresholds;
  if (!isBlock(configured)) return thresholdsOf({});
  return thresholdsOf(withGateReferencesResolved(configured, killFloorReaderFor(root)));
}

/**
 * The TARGET's MINTED characteristics (@SCN-CHR-003) — `specController.mintedCharacteristics`,
 * read as `bare characteristic → the reason stated for it`.
 *
 * THE ROUTE OUT, AND WHY IT NEEDS A KEY OF ITS OWN. A consumer whose legitimate characteristic
 * canon has not yet named must be able to name it, or the portfolio roster stops being a shared
 * vocabulary and becomes a gate on delivery — the choice would be between minting silently and
 * waiting for a canon change, and neither is acceptable. What makes this a route rather than the
 * fault under another name is that it is a SECOND act: a differently-named key whose only purpose
 * is to say a portfolio word is being minted, never the same line that adds the check. A flag
 * beside the registry entry would be one edit, in the place the author was already editing.
 *
 * The fifth of this edge's `specController.*` resolvers, and defensive like the four above it: a
 * missing, non-object or array-shaped config resolves EMPTY, and no shape of entry throws — config
 * is data from outside, and a check that throws on a typo produces no verdict at all. There is no
 * starter set: a mint the target did not write would license a word nobody chose.
 *
 * A REASON THIS CANNOT READ LEAVES THE KEY, NEVER DROPS IT. Anything that is not a string is not a
 * reason, and the entry survives with `null` beside it — `thresholdsOf`'s stance with a bar it
 * cannot read (@SCN-MUT-003), for its reason. Dropping the key would hand the author an off-roster
 * complaint about a word whose mint entry is sitting right there, which is the one message that
 * cannot help them; keeping it lets the rule say the mint states no reason.
 *
 * WHITESPACE AROUND EITHER SIDE IS NOT PART OF IT. The characteristic goes through `bareTerm`, so
 * `@flakiness` names what `flakiness` names (3F-2976) and this is not a second reading of what a
 * term BARE is; the reason is trimmed for the same reason, and for no more than that — whether a
 * reason is a REASON is `characteristicFaults`' judgement and is made in one place.
 */
export function resolveMintedCharacteristics(packageJson: {
  specController?: { mintedCharacteristics?: unknown };
}): ReadonlyMap<string, string | null> {
  const configured = packageJson.specController?.mintedCharacteristics;
  if (!isBlock(configured)) return new Map();
  return new Map(
    Object.entries(configured).map(([characteristic, reason]) => [
      bareTerm(characteristic),
      typeof reason === "string" ? reason.trim() : null,
    ])
  );
}

/** Whether a value read out of a manifest is a block of named fields, rather than a list or scalar. */
function isBlock(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A bar naming a mutation gate rather than a figure.
 *
 * THE RECORD'S NAME MAY BE STATED AND OTHERWISE DEFAULTS, which is `ratchetCli`'s asymmetry applied
 * unchanged and for its reason: the record's name belongs to whoever owns the record, so the
 * conventional one stands in and a project filing its bars elsewhere writes it over.
 */
interface MutationGateReference {
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
type KillFloorReader = (reference: MutationGateReference) => number | null;

/**
 * A refusal met with an absent bar rather than let out of this edge.
 *
 * NOTHING IS THROWN OUT OF HERE, and that is the stance rather than caution. A refusal that escapes
 * costs the whole run its verdict over one bad character in a file nobody may even be reading — a
 * fault that is loud nowhere, where an absent bar is loud on the ledger. It is `thresholdsOf`'s own
 * stance for a malformed entry, applied to the half of a bar that now lives in a second file.
 *
 * TWO CLASSES AND NO MORE. The record library normalises every fault it can see — the YAML parser's
 * own included — into `MalformedRecordError` precisely so a caller catches all of them by catching
 * one; beside it sits the read that never got as far as a record. A bare catch would swallow a
 * defect in this edge as well, and answer it with the same silent absence.
 */
function orNoBar<T>(read: () => T): T | null {
  try {
    return read();
  } catch (cause) {
    if (cause instanceof MalformedRecordError || isReadRefusal(cause)) return null;
    throw cause;
  }
}

/** A filesystem refusal — the record was not there, or could not be opened. */
function isReadRefusal(cause: unknown): boolean {
  return cause instanceof Error && typeof (cause as NodeJS.ErrnoException).code === "string";
}

/**
 * A reader over ONE resolution pass's records.
 *
 * EACH RECORD IS OPENED ONCE, WHICH IS WHY THIS IS A CLOSURE AND NOT A FUNCTION PER REFERENCE. A
 * manifest may name several gates of one record, and a reader opening it per entry would let two
 * references answer for two different states of the same file — a rewrite landing mid-pass, a gate
 * present for one and gone for the next. One read makes the pass's bars one reading of one record.
 *
 * THE REFUSAL IS REMEMBERED TOO. Cacheing only the successes would re-open an absent or unreadable
 * record per reference, which is the same disagreement by the other door — and the likelier door,
 * since a record being rewritten is unreadable for exactly the window that matters.
 *
 * THE SUBTRACTION IS THE RECORD'S, NOT THIS EDGE'S. `killFloorOf` spends the allowance; an edge
 * computing `detected - slack` itself would be a second place holding a fact about the record.
 */
function killFloorReaderFor(root: string): KillFloorReader {
  const opened = new Map<string, Map<string, MutationGateRecord> | null>();
  return (reference) => {
    const recordFile = reference.recordFile ?? RECORD_FILE;
    if (!opened.has(recordFile)) {
      opened.set(
        recordFile,
        orNoBar(() => parseGateRecords(readFileSync(join(root, recordFile), "utf8"), recordFile))
      );
    }
    const records = opened.get(recordFile);
    if (records == null) return null;
    return orNoBar(() => killFloorOf(gateRecordFor(reference.mutationGate, records, recordFile)));
  };
}

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
    // nobody could read. What must never be written here is a number of this edge's choosing.
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
 * The runnable script handles the OBLIGATION-side observer is asked about — the reader that carries
 * exists-but-unwired, and so the only one able to produce a watermelon.
 *
 * THE REGISTRY'S INVERSE, NARROWED BY THE CORPUS. A fitness obligation names the BARE check tag its
 * stepless scenario carries, which is not a script and would be observed as one nobody wrote; the
 * runnable handle for it is what the registry maps onto that tag. A handle joins only when the
 * corpus actually carries a scenario for its check, because a registered check nobody wrote a
 * scenario for is the UNCITED case — it must reach no row and surface in suspense, not be asked
 * about here as though something obliged it.
 *
 * A SECOND SOURCE STOOD HERE and is gone with the by-name route (3F-2590): the corpus's named
 * HANDLES, from the retired `@lint=<handle>` form. That form raises no obligation at all now
 * (@SCN-LNT-007), so the set it contributed is empty by construction — and every bare check a
 * fitness obligation names is a REGISTERED tag, which the old filter dropped anyway.
 *
 * It doubles as the no-double-observe key: the running-check stream drops whatever appears here,
 * because a check this reader covers already carries the authoritative exists / enforced detail.
 */
function observedCheckHandles(
  registry: CheckRegistry,
  citations: FitnessCitations
): Set<string> {
  const handles = new Set<string>();
  for (const [handle, entry] of registry) {
    if (citations.has(entry.check)) handles.add(handle);
  }
  return handles;
}

/**
 * The target's feature corpus as ONE run reads it — the obligations it raises, the runnable check
 * handles those obligations reach, and the `@SCN` a run of any handle cites.
 *
 * THE THREE ARE ONE READING, which is why they are produced together. All three are derived from
 * the same bytes and the same registry, and the fault they exist to foreclose is precisely their
 * disagreeing: a citation resolved against a corpus the ledger was not built from names a row
 * nobody wrote (@SCN-LNT-009), and a handle set derived from a second discovery observes checks the
 * obligations never asked about. Returning them separately would leave a caller free to assemble
 * them from different reads.
 *
 * EVERY INPUT IS THE TARGET'S (@SCN-LNT-005). `registry` came from the target's manifest and the
 * sources from the target's features directory, so a bare check tag means what that target says it
 * means and the scenario carrying it is one that target wrote.
 */
interface TargetCorpus {
  /** The `@SCN`-carrying scenarios, with their evidence obligations raised. */
  scenarios: Scenario[];
  /** The runnable script handles the obligation-side observer is asked about. */
  checkHandles: ReadonlySet<string>;
  /**
   * What a run of this script handle cites — the bare check tag it IS and the `@SCN` carrying that
   * check — or `null` where the seam reaches none. Both terms, because the `@SCN` picks the ROW and
   * the tag picks which of that row's fitness obligations the credit answers (@SCN-LNT-012).
   */
  citedScn: (script: string) => ScriptCitation | null;
}

function readTargetCorpus(
  featuresDir: string | undefined,
  deferralTags: readonly string[],
  registry: CheckRegistry,
  thresholds: ThresholdRegistry
): TargetCorpus {
  const checkTags = registeredCheckTags(registry);
  const sources = featureSources(featuresDir);
  // THE OBLIGATION-RAISING TAG SET IS THE UNION (@SCN-CIP-001); the CITATION hop below is the
  // registry's alone. A measured check has no runnable script handle — nothing invokes
  // `ci-run-time` — so it can never be registered, and a corpus read against the registry's tags
  // alone would raise nothing for it. It equally has no business in `fitnessCitations`, which
  // answers "which scenario does a run of this HANDLE cite": a measured credit arrives already
  // citing, because canon puts the check-to-scenario mapping in the runner that measures.
  const obligationTags = [...new Set([...checkTags, ...measuredCheckTags(thresholds)])];
  const scenarios = sources.flatMap((source) =>
    parseScenarios(source, deferralTags, obligationTags, thresholds)
  );
  const citations = fitnessCitations(
    sources.flatMap((source) => parseTaggedScenarios(source)),
    checkTags
  );
  return {
    scenarios,
    checkHandles: observedCheckHandles(registry, citations),
    citedScn: (script) => citationOfScript(script, registry, citations),
  };
}

/**
 * The reconciler's resolved input paths — the CLI options threaded to the readers.
 * Every path is optional; a missing result file is tolerated (its evidence is
 * simply absent). `packageJson` is the EXTERNALLY-SPECIFIED package.json the static
 * (guard) reader reads `exists` from (the --package-json seam, @SCN-LNT-005):
 * default the tool's own cwd `package.json`; set it to reconcile ANOTHER repo's
 * static checks — required to render the historical watermelon correctly.
 */
export interface ReconcileOptions {
  features?: string;
  vitest?: string;
  cucumber?: string;
  ci?: string;
  packageJson?: string;
  /**
   * The measurement artefact (@SCN-CIP-003) — the number each measured check posted, and
   * the credit side of every measured fitness check. Optional like the other result files: absent,
   * it contributes nothing, and each measured obligation it would have answered reads `missing`.
   */
  measurements?: string;
}

/** Read + JSON-parse a file if present, else return undefined. */
function readJsonIfPresent<T>(path: string | undefined): T | undefined {
  if (!path || !existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/**
 * Resolve the recognised deferral-tag set for the target (@SCN-PND-021) — the single-sourced
 * starter constant `DEFAULT_DEFERRAL_TAGS` EXTENDED by the target `package.json`'s
 * `specController.deferralTags`. Config EXTENDS, never replaces: a project cannot un-recognise a
 * built-in (`@wip` always defers). Configured tags are bare names, `@`-stripped, consistent with
 * `DEFAULT_DEFERRAL_TAGS`; non-string / non-array config is ignored defensively. The set is the
 * impure edge's to build (it reads the `package.json` off disk); the core parser stays pure — it
 * takes the union as the injected `deferralTags` param.
 */
export function resolveDeferralTags(packageJson: {
  specController?: { deferralTags?: unknown };
}): readonly string[] {
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
  return [...new Set([...DEFAULT_DEFERRAL_TAGS, ...extras])];
}

/**
 * The discovered feature corpus's SOURCES — read once so the two readings a citing run needs (the
 * obligations, and the corpus hop's `check tag → @SCN`) are taken from the same bytes. Two
 * discoveries could disagree about the corpus, and a citation resolved against a corpus the ledger
 * was not built from is exactly the phantom-row fault (@SCN-LNT-009).
 */
function featureSources(featuresDir: string | undefined): string[] {
  const features =
    featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  return features.map((f) => readFileSync(f.path, "utf8"));
}

function scenariosFromFeatures(
  featuresDir: string | undefined,
  deferralTags: readonly string[] = DEFAULT_DEFERRAL_TAGS
): Scenario[] {
  return featureSources(featuresDir).flatMap((source) => parseScenarios(source, deferralTags));
}

/**
 * The feature corpus's UNTAGGED half (@SCN-LDG-021, 3F-1774) — the scenarios `parseScenarios`
 * discards because they carry no `@SCN`. They are REAL scenarios: cucumber runs them, so each
 * owns a real Evidence Obligation — but the obligation has no code for an Evidence Observation to
 * link to, so it can never be discharged. `reconcile` gives each its own out-of-balance row
 * (`no-scn-code`); before this read they were invisible to the ledger, and a run whose only fault
 * was an untagged scenario printed "N scenario(s) carry no @SCN tag" and exited 0 BALANCED.
 *
 * Each is handled by its `<feature> : <scenario>` locator — the SAME locator the untagged warning
 * prints — because a bare scenario name is not unique across the corpus, and the row must say
 * where to go.
 */
function untaggedScenariosFromFeatures(featuresDir: string | undefined): string[] {
  const features =
    featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  return features.flatMap((f) =>
    parseUntaggedScenarios(readFileSync(f.path, "utf8")).map(
      (scenario) => `${f.slug}.feature : ${scenario}`
    )
  );
}

/**
 * The feature corpus's INTEGRITY CHECKPOINT (@SCN-CLI-016, 3F-1767) — validate every discovered
 * `.feature` with the REAL Gherkin parser and report the files it cannot read.
 *
 * The feature corpus is the ledger's DEBIT side, and it used to be read by a tag-line scan that
 * never consulted a parser — so a malformed tag line silently deleted its scenario, and a corrupt
 * spec could read BALANCED. A file the parser rejects is one cucumber would refuse to run: the
 * CLI halts on it (exit 2) rather than reconciling a corpus that is a fiction.
 *
 * THIS IS NOW THE CATCH SITE, NOT THE CALL SITE (@SCN-GPG-001, 3F-2817). The validation moved
 * into `discoverFeatures`, which REFUSES an unreadable corpus rather than returning one, so every
 * corpus reader inherits the refusal instead of each restating it. What is left here is the
 * translation back into the list this CLI edge already prints — same files, same order, same
 * verbatim parser messages, so `balance`'s behaviour is unchanged. Anything that is not a corpus
 * refusal is not ours to interpret and rethrows.
 */
export function featureCorpusParseErrors(featuresDir: string | undefined): GherkinParseError[] {
  try {
    if (featuresDir !== undefined) discoverFeatures(featuresDir);
    else discoverFeatures();
    return [];
  } catch (err) {
    if (err instanceof UnreadableFeatureCorpusError) return [...err.errors];
    throw err;
  }
}

/**
 * The `@SCN` ids the feature corpus CARRIES MORE THAN ONCE (@SCN-LDG-020's guardrail, 3F-1775).
 *
 * An `@SCN` identifies exactly ONE scenario — that is the whole basis of attributing evidence to
 * it. If two scenarios carry the same id, a test citing it could be proving EITHER, and the tool
 * cannot know which: the corpus is ambiguous, and any verdict over it is a guess.
 *
 * WHY THIS EXISTS. Tag inheritance made this reachable: an `@SCN` hoisted to a `Feature:`/`Rule:`
 * is inherited by every scenario beneath it (cucumber does this, so we do — parity). Left
 * unhandled, ONE passing test then marked EVERY scenario sharing that id `balanced`, including
 * scenarios nothing proves — a BALANCED-WHEN-BROKEN run, exit 0. A new silent false-green,
 * introduced by the very fix that closed the last one.
 *
 * Refused at the edge (exit 2) rather than reconciled, under the Rule already shipped for the
 * observed side and the corrupt corpus (@SCN-CLI-014/015/016): an input the tool cannot read is a
 * usage error, never a verdict. Whether hoisting an `@SCN` is an authoring fault worth a richer
 * diagnostic is the deferred policy question (3F-1774's sibling); refusing to reconcile a corpus we
 * cannot read is not a policy — it is the floor.
 */
export function featureCorpusDuplicateScnIds(featuresDir: string | undefined): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const scenario of scenariosFromFeatures(featuresDir)) {
    if (seen.has(scenario.scnId)) duplicates.add(scenario.scnId);
    seen.add(scenario.scnId);
  }
  return [...duplicates].sort();
}

/**
 * Read the target's `feature-code → slug` map over the same `discoverFeatures` corpus
 * (@SCN-RPT-006) — each coded feature file's `@<FFF>` header (`featureCode`)
 * mapped to its filename `slug`, the full feature name. This is the mapping
 * `scenariosFromFeatures` discards (it keeps only the parsed scenarios). A sibling read to
 * the balance, threaded to `renderMarkdown` (via `writeOutputs`) as the 5th sibling arg
 * (markdown-only — the by-feature cut is markdown-only, so it is NOT serialised to JSON).
 * Uncoded files (`featureCode === null`) are omitted, so the by-feature emitter falls
 * back to the bare `FFF` for any id whose code no file registers. One-prefix-one-file holds
 * by invariant (`lintFeatureCodes` flags a duplicate code), so the map is unambiguous.
 */
export function readFeatureNames(featuresDir?: string): Map<string, string> {
  const features =
    featuresDir !== undefined ? discoverFeatures(featuresDir) : discoverFeatures();
  const map = new Map<string, string>();
  for (const f of features) {
    if (f.featureCode !== null) map.set(f.featureCode, f.slug);
  }
  return map;
}

/**
 * Read the scenario-corpus census over the discovered feature files (the same
 * `discoverFeatures` corpus `scenariosFromFeatures` reads): sum the raw @SCN
 * occurrences (`countScnOccurrences`) and the scenario count
 * (`parseScenarios(...).length`) across every file, and build the `EvidenceObligations`
 * sibling (@SCN-RPT-008). Also collects the UNTAGGED scenarios
 * (@SCN-RPT-014) — `parseUntaggedScenarios` per file, each paired with its feature-file
 * locator, sorted by (feature, scenario). Read alongside the balance in `main()` and
 * threaded to the renderers via `writeOutputs`; `runReconcile` stays unchanged.
 */
export function readEvidenceObligations(features?: string): EvidenceObligations {
  const featureFiles =
    features !== undefined ? discoverFeatures(features) : discoverFeatures();
  let raw = 0;
  let scenarioCount = 0;
  const untagged: UntaggedScenario[] = [];
  const sources: string[] = [];
  for (const f of featureFiles) {
    const source = readFileSync(f.path, "utf8");
    sources.push(source);
    raw += countScnOccurrences(source);
    scenarioCount += parseScenarios(source).length;
    for (const scenario of parseUntaggedScenarios(source)) {
      untagged.push({ feature: `${f.slug}.feature`, scenario });
    }
  }
  untagged.sort(
    (a, b) => a.feature.localeCompare(b.feature) || a.scenario.localeCompare(b.scenario)
  );
  // The prose-only codes are a CROSS-CORPUS difference (a code tagged in any file isn't
  // dangling), so it reads all sources at once — not per-file like the others.
  return evidenceObligations(raw, scenarioCount, untagged, proseOnlyCodes(sources));
}

/**
 * Parse the target's RUNTIME observations ONCE — the tag-derived, per-tier observation set
 * (@SCN-RPT-017 / 3F-1452 FULL UNIFY) fed to BOTH the reconciler and the runtime census, so the
 * two can never disagree. Each source's FALLBACK quality-check is set at the CLI edge
 * (vitest⇒unit, cucumber⇒integration); the parsers DERIVE the level from the cited scenario's tier
 * tag (@SCN-LDG-011 / 3F-1434), using the fallback only for an untagged scenario. A missing report
 * contributes nothing. Root-relative so a phantom-scenario row's where-to-fix stays portable.
 */
function parseRuntimeObservations(opts: ReconcileOptions, root: string | undefined): EvidenceObservation[] {
  const out: EvidenceObservation[] = [];
  const vitestReport = readJsonIfPresent<VitestJsonReport>(opts.vitest);
  if (vitestReport) out.push(...parseVitestEvidenceObservations(vitestReport, VITEST_QUALITY_CHECK, root));
  const cucumberReport = readJsonIfPresent<CucumberJsonReport>(opts.cucumber);
  if (cucumberReport) out.push(...parseCucumberEvidenceObservations(cucumberReport, CUCUMBER_QUALITY_CHECK, root));
  return out;
}

/**
 * Reconcile obligation-vs-observation evidence into the Ledger for a target tree, from a SINGLE parse of
 * the runtime observations (@SCN-RPT-017 / 3F-1452 FULL UNIFY). The runtime evidence-observation
 * VIEWS (Test volume, the evidence grid) are no longer counted here: they are FOLDS the renderers
 * derive off THIS Ledger's posted credits (@SCN-RPT-010 / 3F-2103 — the runtime census is retired),
 * so they cannot drift from the verdict (they ARE the same rows). This function's job is now just
 * to produce the balance.
 */
export function runReconcile(opts: ReconcileOptions): EvidenceReconciliation {
  // Read the target's package.json ONCE — its `specController.*` config supplies the deferral-tag
  // extension (@SCN-PND-021), the check registry (@SCN-LNT-005) and the configured check names
  // (@SCN-USG-009), and its `scripts` back the `exists` read. The disk read stays at this impure
  // edge; the core parsers take the resolved values as injected params, staying pure.
  const pkgPath = opts.packageJson ?? "package.json";
  const packageJson =
    readJsonIfPresent<
      PackageJsonScripts & {
        specController?: {
          deferralTags?: unknown;
          staticChecks?: unknown;
          checkRegistry?: unknown;
          thresholds?: unknown;
        };
      }
    >(pkgPath) ?? {};
  // The TARGET repo root — the credit locators are made relative to it, so a phantom-scenario row's
  // where-to-fix (ruling Q5) stays portable in a banked artefact, and a bar naming a mutation gate
  // finds that target's record rather than this tool's own (@SCN-MUT-012). Resolved BEFORE the
  // corpus because the bars are read against it.
  const root = resolveTargetRoot({ features: opts.features });

  const corpus = readTargetCorpus(
    opts.features,
    resolveDeferralTags(packageJson),
    resolveCheckRegistry(packageJson),
    resolveThresholds(packageJson, root)
  );

  // `--ci` names a workflow FILE or a DIRECTORY of them, and defaults to the directory
  // (@SCN-USG-006, 3F-2238): a pipeline split across files enforces its checks just as one
  // file does, and reading only ci.yml both invents watermelons for named checks enforced
  // elsewhere and drops uncited ones off the books entirely. Path semantics carry the
  // file-vs-directory distinction, so one flag stays one flag and an explicit file is still
  // a narrowing (@SCN-USG-008).
  const ciPath = opts.ci ?? ".github/workflows";
  const ciSources = ciSourcePathsOf(ciPath).map((path) => readFileSync(path, "utf8"));

  // The feature corpus is BOTH halves: the @SCN-tagged scenarios AND the untagged ones
  // (@SCN-LDG-021). An untagged scenario cannot be linked to an observation, so it reconciles
  // `no-scn-code` on its own out-of-balance row — never silently dropped from the debit side.
  // THE CONCEPT, BUILT BY ITS OWN FACTORY (3F-2233) — the app no longer assembles a Ledger and
  // leaves someone downstream to total it. The two axis GATES are always on at this edge: the CLI
  // threads both the runtime-observation and the static-check reads.
  return evidenceReconciliationOf(
    corpus.scenarios,
    // Parse the runtime observations ONCE — the SAME set feeds both the reconciler and the census.
    [
      ...parseRuntimeObservations(opts, root),
      ...checkObservations(corpus, ciSources, packageJson),
      // THE THIRD STREAM (@SCN-CIP-003) — the measurements, which arrive already citing. They are
      // read here rather than folded into `checkObservations` because that function's two observers
      // both read the target's CONFIG; a measurement is a fact about a run, and the only thing the
      // three share is the axis they ride.
      ...parseMeasuredEvidenceObservations(readJsonIfPresent(opts.measurements) ?? {}),
    ],
    untaggedScenariosFromFeatures(opts.features),
    true,
    true
  );
}

/**
 * The COMPLETE static stream `reconcile` consumes, from the two observers that produce it.
 *
 * The OBLIGATION-side reader answers for every check the corpus obliges (`corpus.checkHandles`),
 * carrying the authoritative exists / enforced-over-real-source detail — and so the only one able
 * to report the watermelon, since a check that runs nowhere is exactly what the other observer
 * filters out. Both the `exists` read and the CI read come from the TARGET (@SCN-LNT-005): a check
 * present in another repository's package.json and absent from its CI is the watermelon there
 * exactly as it is here, and reading either from spec-controller's own tree would answer for a
 * repository this run never looked at.
 *
 * The RUNNING-check observer then adds every running CI check the first did not cover — the static
 * analogue of a runner emitting every test result, so nothing a gate runs is off the books. The
 * exclusion is what keeps them from double-observing one check; the survivors cite no scenario, and
 * `reconcile` folds them into the suspense row (@SCN-USG-001), which is where an unattributed check
 * is meant to surface.
 */
function checkObservations(
  corpus: TargetCorpus,
  ciSources: readonly string[],
  packageJson: PackageJsonScripts & { specController?: { staticChecks?: unknown } }
): EvidenceObservation[] {
  const obligated = [...corpus.checkHandles];
  return [
    ...(obligated.length > 0
      ? checkStaticEvidenceObligations(obligated, ciSources, packageJson, corpus.citedScn)
      : []),
    ...runningStaticChecks(
      ciSources,
      packageJson,
      GUARD_SCRIPT_PREFIXES,
      // The target's own configurations (@SCN-USG-009) — the checks its gates run under names our
      // conventions do not reach. Read here, at the edge that already owns the prefix set, so the
      // core still assumes neither.
      resolveStaticChecks(packageJson)
    ).filter((o) => !corpus.checkHandles.has(o.staticCheck)),
  ];
}

// The static-check kind-counts are no longer read as a parallel census (@SCN-USG-001 / 3F-2118):
// the former `readStaticEvidenceObservationCounts` re-built the static check observations and
// re-derived the running / uncited split from a second read of the CI config. That counting now
// FOLDS onto the Ledger the reconciler already produced (`staticObservationTally`, an internal
// domain fold the renderers apply), so it cannot drift from the verdict — it counts the SAME posted
// static-check credits `runReconcile` banked. The census read is deleted, not relocated.
