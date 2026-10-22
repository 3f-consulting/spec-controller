export type RunInputs = Readonly<Partial<Record<string, string>>>;

export interface RunInputName {
  readonly name: string;
  readonly flag: string;
}

export interface RunInput extends RunInputName {
  readonly path?: string;
}

export interface RunContext {
  readonly target: string;
  readonly inputs: readonly RunInput[];
  /** The corpus directory the run examined, whether named by flag or by default. */
  readonly corpus: string;
  readonly runStart: Date;
  readonly sourceSha: string | null;
  /** The name of the target's origin, read only when no --target was given. */
  readonly targetOrigin?: string;
  readonly toolSha?: string | null;
  readonly toolVersion?: string;
  readonly root?: string;
  readonly strict?: boolean;
}

export interface ProvenanceObject {
  readonly target: string;
  readonly targetOrigin?: string;
  readonly sourceSha: string | null;
  readonly toolSha: string | null;
  readonly toolVersion: string;
  readonly runTimestamp: string;
  readonly inputs: RunInputs;
  readonly corpus: string;
  readonly strict?: boolean;
}
