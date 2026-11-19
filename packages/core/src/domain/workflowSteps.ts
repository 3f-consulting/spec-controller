export type ContinueOnError = boolean | "decided-by-the-run";

// A step of a CI workflow. identity, plumbing and writesStepRecord are the reader's to say.
export interface CiStep {
  readonly workflow: string;
  readonly job: string;
  readonly jobContinueOnError?: ContinueOnError;
  readonly name?: string;
  readonly uses?: string;
  readonly run?: string;
  readonly id?: string;
  readonly continueOnError?: ContinueOnError;
  // What the step is known by in its workflow, which a non-check names and an observation's place carries.
  readonly identity: string;
  readonly plumbing: boolean;
  readonly writesStepRecord: boolean;
}
