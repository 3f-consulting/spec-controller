export function cellSafe(text: string): string {
  return text.replace(/\s+/g, " ").replace(/[\\|]/g, "\\$&").trim();
}

// GFM splits a cell at a pipe even inside a code span, but a backslash in a span is literal.
const SPAN_OR_ESCAPED = /(`+)[\s\S]*?(?<!`)\1(?!`)|[\\|]/g;

export function cellSafeKeepingCodeSpans(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(SPAN_OR_ESCAPED, (found) => (found.startsWith("`") ? found.replace(/\|/g, "\\|") : `\\${found}`));
}
