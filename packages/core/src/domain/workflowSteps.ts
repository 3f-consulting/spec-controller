export type FailureAllowed = boolean | "decided-by-the-run";

// A step of a CI workflow. identity, plumbing and writesStepRecord are the reader's to say.
export interface CiStep {
  readonly workflow: string;
  readonly job: string;
  readonly jobAllowsFailure?: FailureAllowed;
  readonly name?: string;
  readonly action?: string;
  readonly command?: string;
  readonly id?: string;
  readonly allowsFailure?: FailureAllowed;
  // What the step is known by in its workflow, which a non-check names and an observation's place carries.
  readonly identity: string;
  readonly plumbing: boolean;
  readonly writesStepRecord: boolean;
  // The folder the step's command runs in, from the target's folder: the step's own, else its job's.
  readonly workingDirectory?: string;
  // The variables the step sets for its command.
  readonly environment?: Readonly<Record<string, string>>;
}
