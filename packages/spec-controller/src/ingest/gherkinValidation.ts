import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

export interface GherkinParseError {
  file: string;
  message: string;
}

export function parseErrorsIn(file: string, source: string): GherkinParseError[] {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());

  try {
    parser.parse(source);
    return [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [{ file, message }];
  }
}

export class UnreadableFeatureCorpusError extends Error {
  readonly errors: readonly GherkinParseError[];

  constructor(errors: readonly GherkinParseError[]) {
    super(
      [
        "The feature corpus contains a file that could not be parsed as Gherkin:",
        ...errors.map(({ file, message }) => `${file}\n${message}`),
      ].join("\n")
    );
    this.name = "UnreadableFeatureCorpusError";
    this.errors = errors;
  }
}

export class MissingFeatureCorpusError extends Error {
  readonly directory: string;

  constructor(directory: string) {
    super(`The feature corpus directory does not exist: ${directory}`);
    this.name = "MissingFeatureCorpusError";
    this.directory = directory;
  }
}
