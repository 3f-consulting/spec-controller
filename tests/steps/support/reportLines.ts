import { entryText, shownEntry } from "./catalogue.js";

type HeadingLevel = 1 | 2 | 3;

export const headingLine = (level: HeadingLevel, code: string): string => `${"#".repeat(level)} ${entryText(code)}`;

export const showsHeading = (report: string, level: HeadingLevel, code: string): boolean =>
  report.split("\n").includes(headingLine(level, code));

const VERDICT_HEADLINES = [
  "balanced-headline",
  "out-of-balance-headline",
  "pending-headline",
  "unsound-headline",
  "scenario-code-errors-headline",
  "nothing-to-reconcile-headline",
] as const;

export type VerdictHeadlineEntry = (typeof VERDICT_HEADLINES)[number];

export interface VerdictLine {
  readonly line: string;
  readonly headline: VerdictHeadlineEntry;
  readonly exit: number;
}

// The renderer writes the verdict as `<headline> — <gloss> (<exit>)`.
export function verdictLineOn(line: string): VerdictLine | undefined {
  const headline = VERDICT_HEADLINES.find((code) => line.startsWith(`${entryText(code)} — `));
  const exit = /\(([^()]*)\)$/.exec(line)?.[1];
  const code = exit === undefined ? undefined : shownEntry(exit, "verdict-exit")?.["code"];
  if (headline === undefined || code === undefined || !/^\d+$/.test(code)) return undefined;
  return { line, headline, exit: Number(code) };
}

export const verdictLineOf = (report: string): VerdictLine | undefined =>
  report
    .split("\n")
    .map(verdictLineOn)
    .find((verdict) => verdict !== undefined);
