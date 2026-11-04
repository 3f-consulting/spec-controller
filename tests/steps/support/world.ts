import { setWorldConstructor, World } from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";
import type { SpawnSyncReturns } from "node:child_process";
import type { ClaimReconciliationsSection } from "./reportClaimReconciliations.js";
import type { ScenarioName } from "./scenarioName.js";

export interface ClaimReconciliation {
  claim: string;
  kind: string;
  verdict: string;
}

export interface InheritedCodeRun {
  status: number | null;
  report: ClaimReconciliationsSection<ClaimReconciliation> & {
    scenarioCodes: { untaggedScenarios: ScenarioName[] };
  };
}

export interface PointedAt {
  readonly features?: string;
  readonly manifest?: string;
  readonly workflows?: string;
  readonly vitest?: string;
}

export interface InputRow {
  readonly file: string;
  readonly pointedAt: PointedAt;
  readonly subject: string;
  readonly arrange?: (target: string) => void;
}

export interface CommandRun {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ReportedRun {
  readonly features: string;
  readonly packageJson: string;
  readonly ci: string;
  readonly reports: string;
  readonly cited: string;
  readonly citingClass: string;
  readonly citingTest: string;
}

export interface CorpusRun {
  status: number | null;
  report: Record<string, unknown>;
}

export interface GrammarRow {
  claim: string;
  kind: string;
  qualityCheckReconciliations: { outcome?: string; evidenceObservations?: { outcome: string }[] }[];
}

export interface GrammarRun {
  status: number;
  report: ClaimReconciliationsSection<GrammarRow> & { errors?: { scenarioCodes?: unknown[] } };
}

export interface RoomCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

export interface Room {
  readonly where: string;
  readonly start: RoomCommand;
  readonly ownHead: string | null;
}

export interface Provenance {
  readonly toolSha: string;
  readonly toolVersion: string;
}

export interface Arrangement {
  readonly insideARepository: Room;
  readonly outsideEveryRepository: Room;
  readonly throughASymlink: Room;
  readonly toolCheckoutHead: string;
  readonly packedVersion: string;
}

export interface FitnessTarget {
  features: string;
  ci: string;
  packageJson: string;
}

// The data file's entry a refusal is expected to show, by its code, with the values the step knows.
export type ExpectedEntry = readonly [code: string, values: Readonly<Record<string, string>>];

export interface ArrangedTarget {
  readonly dir: string;
  readonly args: readonly string[];
  readonly named: string;
  readonly where: string;
  readonly refusal?: ExpectedEntry;
  readonly more?: readonly ArrangedTarget[];
}

export interface ExitZeroPair {
  readonly without: SpawnSyncReturns<string>;
  readonly with: SpawnSyncReturns<string>;
}

export type SavedLedger = ClaimReconciliationsSection<{ qualityCheckReconciliations: { evidenceObservations?: Record<string, unknown>[] }[] }>;

export interface ToolProvenance {
  insideARepository: Provenance;
  outsideEveryRepository: Provenance;
  throughASymlink: Provenance;
}

// Every declared field is an own property holding undefined until a step sets it, so the proxy the
// constructor returns can refuse a read of one this scenario never set. A field left empty on purpose
// holds null.
export class SpecControllerWorld extends World {
  readonly temporaryDirectories: string[] = [];
  readonly permissionsTaken: Array<() => void> = [];

  invocationArgs!: string[];
  invocationCwd: string | null = null;
  targetArgs!: string[];
  reportArgs!: string[];
  balanceResult!: SpawnSyncReturns<string>;
  moreBalanceResults: readonly (readonly [ArrangedTarget, SpawnSyncReturns<string>])[] = [];
  hostResult!: SpawnSyncReturns<string>;
  retiredFlagResult!: SpawnSyncReturns<string>;
  balanceHelpAlone!: SpawnSyncReturns<string>;
  exitZeroPair!: ExitZeroPair | null;
  run!: CommandRun;

  repository!: string;
  copy!: string;
  answer!: SpawnSyncReturns<string>;
  answerAlone!: SpawnSyncReturns<string>;

  storeRoot!: string;
  storeParent!: string;
  runDir!: string;
  storeBefore!: ReadonlyMap<string, string>;
  earlierRunLink!: string;
  filesBefore!: Map<string, string>;
  rootBefore!: { exists: boolean; isFile: boolean; bytes: string | undefined };
  invocation!: readonly string[];
  savedReport!: string;
  reRendered!: SpawnSyncReturns<string>;
  refusalCwd!: string;
  storeScratch!: string;
  storedRunTargetDir!: string;
  storedRunInputsBefore!: ReadonlyMap<string, string>;

  missingPath!: string;
  unknownCommand!: string;
  unparseableReport!: string;
  unparseableFeature!: string;
  unreadableSavedReport!: string;
  uncitedJsonPath!: string;
  noCorpusTargets!: { shape: string; root: string }[];
  noCorpusRuns!: { shape: string; stdout: string }[];
  flagOutOfPlace!: string;
  argumentNamed!: string;
  modifiersGiven!: string[];

  reportedRun!: ReportedRun;
  citedScenario!: string;
  citingLocator!: string;
  notAReport!: string;
  target!: ArrangedTarget;

  ancestor!: string;
  inheritedCodeRun!: InheritedCodeRun | null;
  nestedCorpus!: string;
  flatCorpus!: string;
  nestedRun!: CorpusRun | null;
  flatRun!: CorpusRun | null;
  sameNameJson!: Record<string, unknown> | null;
  sameNameMarkdown!: string;
  grammarTarget!: { features: Record<string, string>; vitest?: unknown; cucumber?: unknown; ciSteps?: unknown };
  grammarRun!: GrammarRun;

  report!: string;
  savedJson!: SavedLedger;
  verdictExit = 1;
  fitnessTarget!: FitnessTarget;
  siblingStatus!: number | null;

  corpusCwd!: string;
  markdownDestination!: string;
  jsonDestination!: string;
  targetRepo!: string;
  foreignCwd!: string;
  outDir!: string;
  markdown!: string;
  jsonText!: string;

  destinationTargetDir!: string;
  destinationScratch!: string;
  inputRow!: InputRow;
  aimedAt!: string;
  throughStdout!: boolean;
  destinationInputsBefore!: ReadonlyMap<string, string>;
  namedOutput!: string;
  namedInput!: string;

  destination!: string;
  markdownSpec!: string;
  markdownPath!: string | null;
  markdownBefore!: string | null;
  sharedFile!: string;
  firstPath!: string;
  secondPath!: string;
  thirdPath!: string;
  sharedBefore!: string | null;
  namedOutputs!: readonly [string, string];
  stdoutFile!: string | null;
  linkPath!: string;
  linkTargetPath!: string;

  arranged!: Arrangement;
  reported!: ToolProvenance;

  constructor(options: IWorldOptions) {
    super(options);
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && Object.hasOwn(target, prop) && Reflect.get(target, prop) === undefined) {
          throw new Error(`${prop} was read before this scenario set it`);
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }
}

setWorldConstructor(SpecControllerWorld);
