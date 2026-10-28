import { setWorldConstructor, World } from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";
import type { SpawnSyncReturns } from "node:child_process";

export interface ClaimReconciliation {
  scnId: string;
  kind: string;
  verdict: string;
}

export interface InheritedCodeRun {
  status: number | null;
  report: {
    ledger: { claimReconciliations: ClaimReconciliation[] };
    evidenceObligations: { untaggedScenarios: { feature: string; scenario: string }[] };
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
  scnId: string;
  kind: string;
  qualityCheckReconciliations: { outcome: string }[];
}

export interface GrammarRun {
  status: number;
  report: { ledger: { claimReconciliations: GrammarRow[] }; scenarioCodeErrors?: unknown[] };
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

export interface ArrangedTarget {
  readonly dir: string;
  readonly args: readonly string[];
  readonly named: string;
  readonly where: string;
}

export interface ExitZeroPair {
  readonly without: SpawnSyncReturns<string>;
  readonly with: SpawnSyncReturns<string>;
}

export interface SavedLedger {
  ledger: { claimReconciliations: { evidenceObservations: Record<string, unknown>[] }[] };
}

export interface ToolProvenance {
  insideARepository: Provenance;
  outsideEveryRepository: Provenance;
  throughASymlink: Provenance;
}

// A field a Given sets has no initialiser, so a step that reads it before its own scenario set it fails.
export class SpecControllerWorld extends World {
  readonly temporaryDirectories: string[] = [];
  readonly permissionsTaken: Array<() => void> = [];

  invocationArgs!: string[];
  invocationCwd: string | undefined;
  targetArgs!: string[];
  reportArgs!: string[];
  balanceResult!: SpawnSyncReturns<string>;
  hostResult!: SpawnSyncReturns<string>;
  retiredFlagResult!: SpawnSyncReturns<string>;
  balanceHelpAlone!: SpawnSyncReturns<string>;
  exitZeroPair: ExitZeroPair | undefined;
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
  scratch: string | undefined;

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
  inheritedCodeRun: InheritedCodeRun | undefined;
  nestedCorpus!: string;
  flatCorpus!: string;
  nestedRun: CorpusRun | undefined;
  flatRun: CorpusRun | undefined;
  sameNameJson: Record<string, unknown> | undefined;
  sameNameMarkdown!: string;
  grammarTarget!: { features: Record<string, string>; vitest?: unknown; cucumber?: unknown; ciSteps?: unknown };
  grammarRun!: GrammarRun;

  report!: string;
  savedJson!: SavedLedger;
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

  targetDir!: string;
  inputRow!: InputRow;
  aimedAt!: string;
  throughStdout!: boolean;
  inputsBefore!: ReadonlyMap<string, string>;
  namedOutput!: string;
  namedInput!: string;

  destination!: string;
  markdownSpec!: string;
  markdownPath: string | undefined;
  markdownBefore: string | undefined;
  sharedFile!: string;
  firstPath!: string;
  secondPath!: string;
  thirdPath!: string;
  sharedBefore: string | undefined;
  namedOutputs!: readonly [string, string];
  stdoutFile: string | undefined;
  linkPath!: string;
  linkTargetPath!: string;

  arranged!: Arrangement;
  reported!: ToolProvenance;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(SpecControllerWorld);
