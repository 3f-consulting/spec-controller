export type ContinueOnError = boolean | "decided-by-the-run";

// A step of a CI workflow. plumbing and writesStepRecord are the reader's to say.
export interface CiStep {
  readonly workflow: string;
  readonly job: string;
  readonly jobContinueOnError?: ContinueOnError;
  readonly name?: string;
  readonly uses?: string;
  readonly run?: string;
  readonly id?: string;
  readonly continueOnError?: ContinueOnError;
  readonly plumbing: boolean;
  readonly writesStepRecord: boolean;
}

// A step is known by its name, else the action it uses, else the first line of its command: a step with no action has one.
export function stepIdentityOf({ name, uses, run }: CiStep): string {
  return name ?? uses ?? run!.split("\n").map((line) => line.trim()).find((line) => line !== "") ?? "";
}
