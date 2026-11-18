export class InputDoesNotParse extends Error {}

// What the parser makes of an input, or the input refused with what the parser said.
export function parsedBy<Parsed>(parse: () => Parsed): Parsed {
  try {
    return parse();
  } catch (error) {
    throw new InputDoesNotParse((error as Error).message, { cause: error });
  }
}
