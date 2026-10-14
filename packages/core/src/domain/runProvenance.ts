/** Each input path the run read, keyed by the name of the flag that supplied it, in camelCase. */
export type RunInputs = Readonly<Partial<Record<string, string>>>;

export const INPUT_FLAGS: readonly { key: string; flag: string }[] = [
  { key: "features", flag: "--features" },
  { key: "vitest", flag: "--vitest" },
  { key: "pytest", flag: "--pytest" },
  { key: "cucumber", flag: "--cucumber" },
  { key: "ci", flag: "--ci" },
  { key: "packageJson", flag: "--package-json" },
  { key: "ciSteps", flag: "--ci-steps" },
];

export interface RunContext {
  readonly target: string;
  readonly inputs: RunInputs;
  readonly runStart: Date;
  readonly sourceSha: string | null;
  readonly toolSha?: string | null;
  readonly toolVersion?: string;
  readonly root?: string;
  readonly strict?: boolean;
}

export interface ProvenanceObject {
  readonly target: string;
  readonly sourceSha: string | null;
  readonly toolSha: string | null;
  readonly toolVersion: string;
  readonly runTimestamp: string;
  readonly inputs: RunInputs;
  readonly strict?: boolean;
}
