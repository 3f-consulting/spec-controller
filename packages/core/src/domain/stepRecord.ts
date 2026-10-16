interface StepRecordEntry {
  readonly outcome?: string;
  readonly conclusion?: string;
}

export type StepRecord = Readonly<Record<string, StepRecordEntry>>;
