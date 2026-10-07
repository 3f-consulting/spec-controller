import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

import { APP_MESSAGES, AppMessage } from "../messages.js";

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
        APP_MESSAGES[AppMessage.FeatureCorpusUnparseable](),
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
    super(APP_MESSAGES[AppMessage.FeatureCorpusDirectoryMissing](directory));
    this.name = "MissingFeatureCorpusError";
    this.directory = directory;
  }
}
