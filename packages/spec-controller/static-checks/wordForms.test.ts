/**
 * The @unit arm of @SCN-VOC-018 (features/vocabulary-audit.feature) — the homograph rule.
 *
 * Its own file rather than `vocabAudit.test.ts`'s, for the reason the engine split too: that
 * file sits at a `max-lines` exception, and an exception buys no headroom.
 */

import { describe, it, expect } from "vitest";
import { GRAMMAR_CONTEXT, RETIRED } from "../../../tests/fixtures/vocab/retiredTerms.js";
import { homographSense } from "./wordForms.js";
import { auditSegments, scanFile } from "./vocabAudit.js";

/** Which lines of a TypeScript source the audit reports the homograph verb on. */
function verbLinesFlaggedIn(source: string): number[] {
  const segments = scanFile("packages/core/src/domain/brandedShape.ts", source);
  return auditSegments(segments)
    .manifest.filter((row) => row.current === RETIRED.homographVerb)
    .map((row) => row.line);
}

describe("[SCN-VOC-018] a retired word that is also an external tool's grammar", () => {
  // Both directions asserted. A matcher that always answered "grammar" passes the two
  // grammar cases alone, and that failure greens a retired word forever with nothing
  // saying so — the asymmetry the Rule states.
  it("reads the verb as grammar when the TypeScript ambient keyword follows", () => {
    expect(homographSense([RETIRED.homographVerb, GRAMMAR_CONTEXT.tsGrammarQualifier], 0))
      .toBe("grammar");
  });

  it("reads the verb as vocabulary when no such keyword follows", () => {
    expect(homographSense([RETIRED.homographVerb, "an", "evidence", "obligation"], 0))
      .toBe("vocabulary");
  });

  it("reads the third person as vocabulary, though its stem is the reserved keyword", () => {
    expect(homographSense([RETIRED.homographVerbThirdPerson, "an", "evidence", "obligation"], 0))
      .toBe("vocabulary");
  });

  it("keeps an inflection vocabulary even IN the qualifier position — only the exact spelling can be grammar", () => {
    // The case that discriminates. With the third person followed by ordinary prose, a rule
    // that let the inflection reach the qualifier answers "vocabulary" anyway and looks
    // right. Put the qualifier itself after it and the two rules part: only the exact
    // spelling the table names is the keyword, and this is the guard that stops the
    // reserved-word STEM lookup greening the whole family.
    expect(
      homographSense(
        [RETIRED.homographVerbThirdPerson, GRAMMAR_CONTEXT.tsGrammarQualifier],
        0,
      ),
    ).toBe("vocabulary");
  });

  it("reads the noun as grammar when the compiler-option parent co-occurs", () => {
    expect(homographSense([GRAMMAR_CONTEXT.compilerOptionParent, "options", RETIRED.homographNoun], 2))
      .toBe("grammar");
  });

  it("reads the noun as vocabulary in prose", () => {
    expect(homographSense(["the", "pending", RETIRED.homographNoun], 2)).toBe("vocabulary");
  });

  it("rules on nothing else — a word with no homograph row gets no verdict", () => {
    expect(homographSense(["scenario"], 0)).toBeNull();
  });

  // The TypeScript-source half of the same asymmetry (3F-2432). A code region yields one
  // segment per name, so the qualifier is never in the judged sequence — asserted through the
  // audit rather than through `homographSense`, because a unit call that hands the matcher a
  // ready-made sequence cannot see that extraction never builds one.
  it("reads the verb as grammar in TypeScript source, where the keyword is the next name on the line", () => {
    const ambient = `${RETIRED.homographVerb} ${GRAMMAR_CONTEXT.tsGrammarQualifier} brandKey: unique symbol;`;

    expect(verbLinesFlaggedIn(`export ${ambient}\n${ambient}\n`)).toEqual([]);
  });

  it("keeps the verb as a bare name in TypeScript source vocabulary, no keyword following it", () => {
    // The direction that must NOT move. Same file kind, same lone judged sequence — only the
    // neighbour differs, so a lookahead that answered grammar whenever the sequence ran out
    // would green the retired verb wherever it is written as a bare name.
    const source = `const ${RETIRED.homographVerb} = outcome;\n`;

    expect(verbLinesFlaggedIn(source)).toEqual([1]);
  });

  it("gives a nested config key its key path, so the co-occurrence qualifier is reachable", () => {
    // Without the path the key is judged alone and the parent is not in the sequence at
    // all, so no co-occurrence rule can see it.
    const content = `{\n  "compilerOptions": {\n    "${RETIRED.homographNoun}": true\n  }\n}\n`;
    const keys = scanFile("tsconfig.json", content).filter((s) => s.mode === "name").map((s) => s.text);

    expect(keys).toContain(`compilerOptions.${RETIRED.homographNoun}`);
  });
});
