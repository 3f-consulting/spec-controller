// CommonMark strips one space from each edge of a span when both edges are spaces, and a span
// cannot hold an empty value or a line break; enclosing quotes would read as quoting.
const spanHoldsAsWritten = (text: string): boolean =>
  text !== "" &&
  !(text.startsWith(" ") && text.endsWith(" ")) &&
  !/[\n\r]/.test(text) &&
  !(text.startsWith('"') && text.endsWith('"'));

export function codeSpan(written: string): string {
  const text = spanHoldsAsWritten(written) ? written : JSON.stringify(written);
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longestRun + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}
