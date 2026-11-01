// CommonMark strips one space from each edge of a span when both edges are spaces, and a span
// cannot hold an empty value or a line break; enclosing quotes would read as quoting.
const spanHoldsAsWritten = (text: string): boolean =>
  text !== "" &&
  !(text.startsWith(" ") && text.endsWith(" ")) &&
  !/[\n\r]/.test(text) &&
  !(text.startsWith('"') && text.endsWith('"'));

const longestBacktickRun = (text: string): number =>
  Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));

export function codeSpan(written: string): string {
  const text = spanHoldsAsWritten(written) ? written : JSON.stringify(written);
  const fence = "`".repeat(longestBacktickRun(text) + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

// A closing fence is at least as long as the opening one, so no shorter run inside closes it.
export function fencedBlockLines(info: string, text: string): readonly string[] {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(text) + 1));
  return [`${fence}${info}`, ...text.split("\n"), fence];
}
