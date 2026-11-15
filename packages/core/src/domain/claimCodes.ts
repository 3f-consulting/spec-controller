// A claim code as written: CLM, a feature code, and a number kept as written, so 001 stays 001.
export interface ClaimCode {
  readonly featureCode: string;
  readonly number: string;
}

export type ClaimCodeError =
  | {
      readonly kind: "foreign-claim-code";
      readonly claimCode: ClaimCode;
      readonly file: string;
      // The files tagged with the code's feature code: none, one, or several where the feature code is duplicated.
      readonly filesWithItsFeatureCode: readonly string[];
    }
  | { readonly kind: "no-feature-code"; readonly file: string }
  | { readonly kind: "duplicate-feature-code"; readonly featureCode: string; readonly files: readonly string[] }
  | {
      readonly kind: "several-claim-codes";
      readonly file: string;
      readonly title: string;
      readonly claimCodes: readonly ClaimCode[];
    }
  | { readonly kind: "claim-code-beside-clm-column"; readonly file: string; readonly title: string; readonly claimCode: ClaimCode };

// What the Repository port reads for allocate: a code-shaped word, where it was, and the commit when it came from history.
export interface ClaimCodeOccurrence {
  readonly text: string;
  readonly path: string;
  readonly line: number;
  readonly commit?: string;
}

export type HistoryBoundary =
  | { readonly kind: "complete" }
  | { readonly kind: "not-a-repository" }
  | { readonly kind: "shallow"; readonly before: string };

export interface AllocationAsked {
  readonly featureCode: string;
  readonly asNewFeatureCode: boolean;
}

export type Allocation =
  | {
      readonly kind: "allocated";
      readonly claimCode: ClaimCode;
      readonly highestSeen?: ClaimCodeOccurrence;
      readonly featureCodeAlreadyOnAFile: boolean;
    }
  | { readonly kind: "unknown-feature-code"; readonly featureCode: string; readonly featureCodes: readonly string[] };

const FEATURE_CODE_FORM = "[A-Z0-9]{2,5}";

const FEATURE_CODE = new RegExp(`^${FEATURE_CODE_FORM}$`);

const CITATION = new RegExp(`\\[CLM-(${FEATURE_CODE_FORM})-(\\d+)\\]`, "g");

const CLAIM_CODE = new RegExp(`^CLM-(${FEATURE_CODE_FORM})-(\\d+)$`);

// A code written under CLM, or under the retired SCN, anywhere in a line.
const CODE_IN_A_LINE = new RegExp(`(?:CLM|SCN)-(${FEATURE_CODE_FORM})-(\\d+)`, "g");

export function claimCodeCitationsIn(text: string): ClaimCode[] {
  return [...text.matchAll(CITATION)].map(([, featureCode, number]) => ({ featureCode: featureCode!, number: number! }));
}

// An absent word is no code.
export function claimCodeFrom(word: string | undefined): ClaimCode | undefined {
  const match = CLAIM_CODE.exec(String(word));
  return match === null ? undefined : { featureCode: match[1]!, number: match[2]! };
}

export const isFeatureCode = (word: string): boolean => FEATURE_CODE.test(word);

export const featureCodeOfFile = ({ fileTags }: { readonly fileTags: readonly string[] }): string | undefined => fileTags.find(isFeatureCode);

// An Outline whose Examples have a clm column is one claim for each row, named by its clm cell.
export const CLM_COLUMN = "clm";

export const hasClmColumn = (examples: readonly { readonly columns: readonly string[] }[]): boolean =>
  examples.some(({ columns }) => columns.includes(CLM_COLUMN));

const sameCode = (one: ClaimCode, other: ClaimCode): boolean => one.featureCode === other.featureCode && one.number === other.number;

// A feature file as the claim code check reads it: its tags above Feature:, and each scenario's tags, title and Examples blocks.
interface FileToCheck {
  readonly file: string;
  readonly fileTags: readonly string[];
  readonly scenarios: readonly {
    readonly tags: readonly string[];
    readonly title: string;
    readonly examples: readonly {
      readonly tags: readonly string[];
      readonly columns: readonly string[];
      readonly rows: readonly { readonly cells: readonly string[] }[];
    }[];
  }[];
}

type ScenarioToCheck = FileToCheck["scenarios"][number];

const codesIn = (words: readonly string[]): ClaimCode[] =>
  words.flatMap((word) => claimCodeFrom(word) ?? []).filter((code, at, codes) => codes.findIndex((other) => sameCode(code, other)) === at);

function filesByFeatureCode(features: readonly FileToCheck[]): ReadonlyMap<string, readonly string[]> {
  const files = new Map<string, string[]>();
  for (const feature of features) {
    const featureCode = featureCodeOfFile(feature);
    if (featureCode !== undefined) files.set(featureCode, [...(files.get(featureCode) ?? []), feature.file]);
  }
  return files;
}

// The cells of each Examples block's clm column: a block with none gives none, as a slice from -1 to 0 is empty.
const clmCellsIn = ({ examples }: ScenarioToCheck): string[] =>
  examples.flatMap(({ columns, rows }) => {
    const at = columns.indexOf(CLM_COLUMN);
    return rows.flatMap(({ cells }) => cells.slice(at, at + 1));
  });

// A claim code is carried by a scenario's tags or its clm cells, and belongs to its file's feature code either way.
function misfiledCodes(feature: FileToCheck, filesByCode: ReadonlyMap<string, readonly string[]>): ClaimCodeError[] {
  const carried = codesIn(feature.scenarios.flatMap((scenario) => [...scenario.tags, ...clmCellsIn(scenario)]));
  const featureCode = featureCodeOfFile(feature);
  if (featureCode === undefined) return carried.length === 0 ? [] : [{ kind: "no-feature-code", file: feature.file }];
  return carried
    .filter((claimCode) => claimCode.featureCode !== featureCode)
    .map((claimCode) => ({ kind: "foreign-claim-code", claimCode, file: feature.file, filesWithItsFeatureCode: filesByCode.get(claimCode.featureCode) ?? [] }));
}

function codesOnOneScenario(file: string, { tags, title, examples }: ScenarioToCheck): ClaimCodeError[] {
  if (hasClmColumn(examples)) {
    return codesIn([...tags, ...examples.flatMap((block) => block.tags)]).map((claimCode) => ({ kind: "claim-code-beside-clm-column", file, title, claimCode }));
  }
  const claimCodes = codesIn(tags);
  return claimCodes.length < 2 ? [] : [{ kind: "several-claim-codes", file, title, claimCodes }];
}

export function claimCodeErrorsOf(features: readonly FileToCheck[]): ClaimCodeError[] {
  const filesByCode = filesByFeatureCode(features);
  return [
    ...[...filesByCode].flatMap(([featureCode, files]): ClaimCodeError[] => (files.length < 2 ? [] : [{ kind: "duplicate-feature-code", featureCode, files }])),
    ...features.flatMap((feature) => misfiledCodes(feature, filesByCode)),
    ...features.flatMap(({ file, scenarios }) => scenarios.flatMap((scenario) => codesOnOneScenario(file, scenario))),
  ];
}

export const writtenClaimCode = ({ featureCode, number }: ClaimCode): string => `CLM-${featureCode}-${number}`;

// A number is written at least three digits wide.
const NUMBER_WIDTH = 3;

interface Seen {
  readonly number: number;
  readonly occurrence: ClaimCodeOccurrence;
}

// The highest number written under the feature code, CLM or SCN, and where; the occurrence's text becomes the code.
function highestSeen(featureCode: string, occurrences: readonly ClaimCodeOccurrence[]): Seen | undefined {
  let highest: Seen | undefined;
  for (const occurrence of occurrences) {
    for (const [code, codeFeature, number] of occurrence.text.matchAll(CODE_IN_A_LINE)) {
      if (codeFeature === featureCode && (highest === undefined || Number(number) > highest.number)) {
        highest = { number: Number(number), occurrence: { ...occurrence, text: code } };
      }
    }
  }
  return highest;
}

// One past the highest number the feature code has ever had, for a code a feature file has, or one asked for as new.
export function allocationOf({ featureCode, asNewFeatureCode }: AllocationAsked, featureCodes: readonly string[], occurrences: readonly ClaimCodeOccurrence[]): Allocation {
  const onAFile = featureCodes.includes(featureCode);
  if (!onAFile && !asNewFeatureCode) return { kind: "unknown-feature-code", featureCode, featureCodes: [...new Set(featureCodes)].sort() };
  const highest = highestSeen(featureCode, occurrences);
  const number = String((highest?.number ?? 0) + 1).padStart(NUMBER_WIDTH, "0");
  return {
    kind: "allocated",
    claimCode: { featureCode, number },
    ...(highest === undefined ? {} : { highestSeen: highest.occurrence }),
    featureCodeAlreadyOnAFile: asNewFeatureCode && onAFile,
  };
}
