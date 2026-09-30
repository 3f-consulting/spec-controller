/**
 * The term-spelling helper — the ONE owner of what a term BARE is. Sibling of
 * `domain/featureCode.ts`, which owns the id grammar (`SCN-<FFF>-<NNN>`, Evidence Manifesto §9A),
 * and of `lib/scnCitation.ts`, which owns the bracketed citation form. This owns the sigil and
 * the whitespace around it.
 *
 * IT WAS SEVEN COPIES, SO ONE BUG WAS SEVEN BUGS. Every port that stores a hand-authored term as
 * a key spelled the same two lines the same wrong way — `value.replace(/^@/, "").trim()` — and
 * `^@` is anchored, so a leading space defeats it and the trim that follows removes the space and
 * leaves the sigil. A term a target typed as `"  @X"` was stored as `"@X"`
 * under a key no bare lookup ever asks for, and nothing redded: `thresholdFor` answered null, a
 * measurement row was dropped, a registry entry was absent, and all three are legitimate readings
 * of a key the manifest never named. The correction is not the reordering. It is that a rule this
 * small was hand-copied at all — `dry`'s "a rule stated twice is a rule obeyed in its laxest form"
 * with the laxest form being all seven.
 *
 * WHAT IS IN SCOPE, AND WHERE THE RULE STOPS. Whitespace AROUND a term is not part of it, at
 * either end and on both sides of the sigil — so `"  @X  "` and `"@ X"` both name `"X"`, and the
 * second trim is not sanitiser creep: under a leading trim alone, `"@ X"` would store `" X"`,
 * which is the same silent-miss class in a narrower spelling. After this, no input reaches storage
 * carrying whitespace or a sigil.
 *
 * WHAT IS DELIBERATELY OUT, STATED SO THE OMISSIONS ARE NOT SILENT. A doubled sigil (`"@@X"` →
 * `"@X"`) — a second `@` is a different spelling, not whitespace, and `/^@/` strips exactly one
 * per the pinned "strips only a leading @". An @ spelled INSIDE a term
 * (`"cucumber@e2e"`) — part of the name the target chose, and eating it would rename the pair to
 * one no lookup asks for. Whitespace INSIDE a term — a different term, not a differently-spelled
 * one. Case — not a whitespace question, and folding it would be a real semantic change.
 *
 * AN EMPTY ANSWER IS AN ANSWER. A value that is nothing but whitespace and a sigil bares to `""`,
 * which every caller already drops as it drops an empty one — rather than storing `"@"`, a key
 * nobody can ask for and a bar that could never be settled.
 */

/**
 * The term as its bare spelling names it — trimmed, its LEADING sigil removed, trimmed again.
 *
 * The order is the whole of it. Trimming first is what lets the anchor see the sigil at all;
 * trimming again is what stops a space between the sigil and the term riding into storage.
 */
export function bareTerm(value: string): string {
  return value.trim().replace(/^@/, "").trim();
}
