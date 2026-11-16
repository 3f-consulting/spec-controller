// A text the inputs gave, as a code span fenced past its backticks; as JSON where no span can hold it.
export function quoted(text: string): string {
  if (text === "" || /[\r\n]/.test(text) || (text.startsWith(" ") && text.endsWith(" "))) return `\`${JSON.stringify(text)}\``;
  const fence = "`".repeat(Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length)) + 1);
  const padding = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${padding}${text}${padding}${fence}`;
}

export const firstLineOf = (message: string): string => message.replace(/^\s*\n/, "").split("\n")[0]!;

export const inCell = (text: string): string => quoted(text).replaceAll("|", "\\|");
