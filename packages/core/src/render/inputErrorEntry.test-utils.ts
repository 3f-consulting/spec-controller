// An entry under Errors in the inputs is a list line ending in the entry's words, whatever lead opens it.
export const isEntryOf =
  (words: string) =>
  (line: string): boolean =>
    line.startsWith("- ") && line.endsWith(` ${words}`);

export const entryOf = (words: string): string => {
  const matcher = {
    asymmetricMatch: (actual: unknown): boolean => typeof actual === "string" && isEntryOf(words)(actual),
    toString: (): string => "EntryOf",
    toAsymmetricMatcher: (): string => `EntryOf<${words}>`,
  };
  return matcher as unknown as string;
};
