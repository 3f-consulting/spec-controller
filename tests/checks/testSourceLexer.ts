/**
 * Reading ONE LINE of test source as code-versus-string (@SCN-SSM-007, 3F-2367).
 *
 * WHY THIS EXISTS AS A MODULE. The scn-subissue gate finds test blocks by counting
 * braces, and counting characters answers the wrong question: a `{` inside a title
 * string is not block structure. Both helpers here answer the same one question —
 * which characters on this line are code, and which are inside a string — so they
 * live together rather than each sitting beside its own caller.
 *
 * A LEXER FOR ONE LINE, DELIBERATELY. State resets at each newline; the caller's
 * brace depth does not. A template literal spanning lines is therefore read as
 * unterminated and its trailing braces are dropped for that line. No test title in
 * the corpus takes that shape, and carrying quote state across lines would change how
 * every unbalanced line is read — a far wider change than the fault being closed.
 *
 * WHAT IT DOES NOT SEE, SAID OUT LOUD. Braces inside a regex literal or a line comment
 * read as code, exactly as they did before. A backtick nested inside an interpolation
 * closes the template literal early. Neither shape appears in the corpus this gate
 * reads, and a lexer's name promises more than this one delivers — so the limits are
 * named here rather than discovered later.
 */

/**
 * True when the line's first non-space character opens a string — the line is DATA,
 * not a test call. The gate's own fixtures embed `describe(...)` text as strings, so
 * this keeps the scanners off them.
 */
export function isQuotedStringLiteralLine(body: string): boolean {
  const t = body.trim();
  return t.startsWith('"') || t.startsWith("'") || t.startsWith("`");
}

/** The string delimiters this lexer tracks. */
const QUOTES = ['"', "'", "`"];

/**
 * The `{` and `}` on a line that actually nest CODE, in source order.
 *
 * The fault it removes: a describe whose title is a template literal with an
 * interpolation emits `{`, `}`, `{` when read as characters, and the middle one takes
 * the caller's depth back below the block it just opened — closing the describe on its
 * own opening line and orphaning every `it` beneath from the cite it inherits. A
 * plain-quoted title naming an object shape does the same. Neither brace nests
 * anything.
 *
 * INTERPOLATIONS NEED NO SPECIAL CASE, and that is why this stays one small loop. A
 * `${…}` opens and closes inside the string, so its braces are balanced there and
 * dropping them wholesale — as this does, along with every other in-string brace —
 * leaves the enclosing depth exactly where it was. Only the delimiter that opened the
 * string closes it, so a quote of another kind inside it passes through untouched.
 */
export function structuralBraces(line: string): string[] {
  const braces: string[] = [];
  let quote: string | undefined;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;

    // An escape consumes whatever follows it, inside a string or out.
    if (ch === "\\") {
      i += 1;
      continue;
    }

    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      continue;
    }

    if (QUOTES.includes(ch)) quote = ch;
    else if (ch === "{" || ch === "}") braces.push(ch);
  }

  return braces;
}
