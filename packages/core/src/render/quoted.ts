// CommonMark strips one space from each edge of a span when both edges are spaces, and a span
// cannot hold an empty value or a line break, so such a text is quoted in its JSON form.
const holdsAsWritten = (text: string): boolean => text !== "" && !(text.startsWith(" ") && text.endsWith(" ")) && !/[\n\r]/.test(text);

const longestBacktickRun = (text: string): number => Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));

export function quoted(written: string): string {
  const text = holdsAsWritten(written) ? written : JSON.stringify(written);
  const fence = "`".repeat(longestBacktickRun(text) + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

// A table splits a cell at a pipe even inside a code span, unless the pipe is escaped.
export const inCell = (written: string): string => quoted(written).replaceAll("|", "\\|");
