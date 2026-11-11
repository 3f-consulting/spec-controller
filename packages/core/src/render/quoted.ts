// A span cannot hold an empty text, a line break or a space at both edges, so such a text is quoted as JSON.
const holdsAsWritten = (text: string): boolean => text !== "" && !(text.startsWith(" ") && text.endsWith(" ")) && !/[\n\r]/.test(text);

const longestBacktickRun = (text: string): number => Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));

export function quoted(written: string): string {
  const text = holdsAsWritten(written) ? written : JSON.stringify(written);
  const fence = "`".repeat(longestBacktickRun(text) + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

export const inCell = (written: string): string => quoted(written).replaceAll("|", "\\|");
