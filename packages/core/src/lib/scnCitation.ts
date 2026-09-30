/**
 * The citation-form helper — the ONE owner of what a citation LOOKS LIKE in a Vitest
 * `describe`/`it` title. Sibling of `domain/featureCode.ts`, which owns the id GRAMMAR
 * (`SCN-<FFF>-<NNN>`, Evidence Manifesto §9A); this owns the wrapper that turns a
 * mention of that id into a citation.
 *
 * A citation is the BRACKETED token — `[SCN-<FFF>-<NNN>]`. Canon assigns the forms per
 * backend (evidence-manifesto.md): "The Vitest `describe`/`it` string includes
 * `[SCN-007]`; the Cucumber-JS step block carries a `// @SCN-007` marker comment." The
 * `@` form is Cucumber's marker and is NOT a Vitest citation here — deliberately, and
 * that exclusion is the rule's teeth: `@SCN-…` is how this repository writes every prose
 * cross-reference, in comments, headers and ticket references, so accepting it in a title
 * would leave the false-citation class open on the form most likely to appear by accident.
 *
 * Before this module the citation readers each carried their own sigil-OPTIONAL regex, so
 * any SCN-shaped token anywhere in a title was a citation whatever it was doing there, and
 * the runtime reader minted a phantom scenario from fixture data. Two copies of the answer is
 * how they drifted from canon and from each other, so there is one copy.
 */

import { SCN_ID_SOURCE } from "../domain/featureCode.js";

/**
 * The bracketed citation. Captures the bare code so callers get `SCN-<FFF>-<NNN>` with no
 * wrapper. Intentionally NOT anchored — a title carries the citation among prose — and
 * intentionally not `\b`-delimited, because the brackets are the delimiters.
 */
const SCN_CITATION = new RegExp(`\\[(${SCN_ID_SOURCE})\\]`);

/**
 * The FIRST bracketed scenario id cited in `text`, as a bare code, or null when `text`
 * cites none. An SCN-shaped token without its brackets is prose and yields null.
 */
export function parseScnCitation(text: string): string | null {
  const match = SCN_CITATION.exec(text);
  return match ? match[1]! : null;
}

