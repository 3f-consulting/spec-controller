export type PipelineStepAction =
  | { readonly runs: string }
  | { readonly uses: string };

export type PipelineStep = {
  readonly sourceIndex: number;
  readonly jobId: string;
  readonly identity: string;
  readonly id?: string;
  readonly env: readonly string[];
  readonly abortsJob: boolean;
} & PipelineStepAction;
