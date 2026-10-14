export class FeatureSourceNotGherkin extends Error {
  constructor(parserError: Error) {
    super(parserError.message, { cause: parserError });
  }
}
