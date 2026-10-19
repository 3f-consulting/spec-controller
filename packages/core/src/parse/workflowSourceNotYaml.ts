export class WorkflowSourceNotYaml extends Error {
  constructor(parserError: Error) {
    super(parserError.message, { cause: parserError });
  }
}
