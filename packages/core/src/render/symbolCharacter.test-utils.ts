const PRINTABLE_ASCII_TAB_LETTER_NUMBER_PUNCTUATION_OR_SPACE = /^(?:[\t\x20-\x7e]|[\p{L}\p{N}\p{P}\p{Zs}])$/u;

export function symbolCharactersIn(text: string): string[] {
  return [...text].filter(
    (character) => character !== "\n" && !PRINTABLE_ASCII_TAB_LETTER_NUMBER_PUNCTUATION_OR_SPACE.test(character)
  );
}
