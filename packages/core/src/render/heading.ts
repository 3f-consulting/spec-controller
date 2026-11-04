export type HeadingLevel = 1 | 2 | 3;

export const markdownHeading = (level: HeadingLevel, words: string): string => `${"#".repeat(level)} ${words}`;
