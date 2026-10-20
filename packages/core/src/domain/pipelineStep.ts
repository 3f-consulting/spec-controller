export interface UsedAction {
  readonly name: string;
  readonly owner: string;
  readonly repository: string;
}

export type PipelineStepAction =
  | { readonly command: string }
  | { readonly action: UsedAction };

export type WorkflowStep = {
  readonly job: string;
  readonly identity: string;
  readonly id?: string;
  readonly writesStepRecord: boolean;
  readonly abortsJob: boolean;
} & PipelineStepAction;

export type PipelineStep = { readonly sourceIndex: number } & WorkflowStep;
