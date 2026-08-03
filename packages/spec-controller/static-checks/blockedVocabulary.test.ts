/**
 * Unit coverage for the vendored canon table and the derivation that turns it into the
 * enforced word set — the @unit arm of @SCN-VOC-010
 * (features/vocabulary-audit.feature).
 *
 * WHAT THIS FILE HAS TO PROVE, and why the obvious test is not enough. Asserting that
 * `budget` reds would pass just as well against the hand-maintained set this scenario
 * replaces — a copy that AGREES with canon proves nothing about where the words came
 * from. So the load-bearing assertions here are the two that only a DERIVATION can
 * satisfy: a synthetic table with a word that appears nowhere in this codebase produces
 * that word in the enforced set, and the same table's deferred row does not.
 *
 * The mirror half is equally load-bearing. "An adopted row reds" alone would still pass
 * if the parser enforced EVERY row — which would red this tree on the 2,272 occurrences
 * of the rows the operator deferred. The deferred / not-applicable rows are therefore
 * asserted ABSENT from the enforced set, by name.
 *
 * SELF-EXEMPT. This file passes the retired vocabulary to the classifier, so it is listed
 * in `vocabAuditCli.ts`'s `SELF_EXEMPT_PATHS` alongside `vocabAudit.test.ts` — the same
 * meta-mention exemption (operator ruling 2026-07-02).
 */

import { describe, it, expect } from "vitest";
import {
  BLOCKED_VOCABULARY_ROWS,
  bannedWordsOf,
  parseBlockedVocabulary,
} from "./blockedVocabulary.js";
import { classifyWords, decomposeName } from "./vocabAudit.js";
import { BANNED_WORDS } from "./vocabWordSets.js";

/**
 * A table of two rows and two nonsense words, so a green here can only come from parsing.
 * Neither word occurs anywhere in this repository, so neither can be in any hand-written
 * set — which is the entire point of using them.
 */
const SYNTHETIC_TABLE = `
Some prose above the table, which the parser must skip.

| Never write | Always write | Why | Adoption status | Matcher |
|---|---|---|---|---|
| frobnicate / frobnicated | \`fettle\` | a throwaway adopted row | adopted — 3F-0001 | whole-word |
| quuxify | \`fettle\` | a throwaway deferred row | deferred 2026-08-03 — 3F-0002 | whole-word |
| plughward (of anything) | \`fettle\` | a throwaway inapplicable row | not-applicable — no model here | n/a |

Some prose below it too.
`;

describe("[SCN-VOC-010] parseBlockedVocabulary — the vendored table is the source", () => {
  it("[SCN-VOC-010] reads every row's terms, status and matcher out of the markdown", () => {
    const rows = parseBlockedVocabulary(SYNTHETIC_TABLE);
    expect(rows.map((r) => r.status)).toEqual(["adopted", "deferred", "not-applicable"]);
    expect(rows[0]!.terms).toEqual(["frobnicate", "frobnicated"]);
    expect(rows[0]!.matcher).toBe("whole-word");
    expect(rows[1]!.terms).toEqual(["quuxify"]);
    expect(rows[2]!.matcher).toBe("none");
  });

  it("[SCN-VOC-010] drops a term's parenthetical sense-qualifier, keeping the word", () => {
    // Canon qualifies several rows by sense — "(of work items)", "(bare noun, …)". The
    // qualifier is a note to the reader; the matcher gets the word.
    const rows = parseBlockedVocabulary(SYNTHETIC_TABLE);
    expect(rows[2]!.terms).toEqual(["plughward"]);
  });

  it("[SCN-VOC-010] keeps the deferral's date and ticket, so the debt is visible", () => {
    const rows = parseBlockedVocabulary(SYNTHETIC_TABLE);
    expect(rows[1]!.statusNote).toContain("2026-08-03");
    expect(rows[1]!.statusNote).toContain("3F-0002");
    expect(rows[2]!.statusNote).toContain("no model here");
  });
});

describe("[SCN-VOC-010] bannedWordsOf — adopted rows only", () => {
  it("[SCN-VOC-010] an ADOPTED whole-word row's terms enter the enforced set", () => {
    // THE load-bearing derivation assertion: `frobnicate` exists in no code-side list
    // anywhere, so it can only have arrived here by being parsed out of the table.
    const banned = bannedWordsOf(parseBlockedVocabulary(SYNTHETIC_TABLE));
    expect(banned.has("frobnicate")).toBe(true);
    expect(banned.has("frobnicated")).toBe(true);
  });

  it("[SCN-VOC-010] a DEFERRED row's terms do NOT — the half that makes the status mean something", () => {
    const banned = bannedWordsOf(parseBlockedVocabulary(SYNTHETIC_TABLE));
    expect(banned.has("quuxify")).toBe(false);
  });

  it("[SCN-VOC-010] a NOT-APPLICABLE row's terms do not either", () => {
    const banned = bannedWordsOf(parseBlockedVocabulary(SYNTHETIC_TABLE));
    expect(banned.has("plughward")).toBe(false);
  });
});

describe("[SCN-VOC-010] the vendored table as committed", () => {
  it("[SCN-VOC-010] parses, and every row carries a triaged status", () => {
    expect(BLOCKED_VOCABULARY_ROWS.length).toBeGreaterThan(0);
    for (const row of BLOCKED_VOCABULARY_ROWS) {
      expect(row.status, row.terms.join("/")).not.toBeNull();
      expect(row.terms.length, row.terms.join("/")).toBeGreaterThan(0);
    }
  });

  it("[SCN-VOC-010] derives exactly the operator-adopted plain words, and nothing else", () => {
    // The four adopted rows are 3F-2281's. Two of them are matcher EXCEPTIONS — the
    // phrase-adjacency arms — so they are adopted WITHOUT joining the plain banned set;
    // that split is what "canon owns which, code owns how" means in one assertion.
    const derived = [...bannedWordsOf(BLOCKED_VOCABULARY_ROWS)].sort();
    expect(derived).toEqual(
      ["budget", "demand", "demanded", "demander", "demanding", "demands"].sort()
    );
  });

  it("[SCN-VOC-010] every derived word is what the engine actually enforces", () => {
    // No second list: the set the classifier consults CONTAINS the derived set, so a
    // table edit cannot fail to reach the engine.
    for (const word of bannedWordsOf(BLOCKED_VOCABULARY_ROWS)) {
      expect(BANNED_WORDS.has(word), word).toBe(true);
    }
  });

  it("[SCN-VOC-010] the deferred and not-applicable terms are absent from the enforced set", () => {
    // Named individually rather than derived from the same table that produced them —
    // a loop over `status !== "adopted"` would agree with a broken parser by construction.
    for (const word of [
      "declare",
      "declared",
      "declaring",
      "declares",
      "undeclared",
      "undemanded",
      "guard",
      "tree",
      "subtree",
      "root",
      "branch",
    ]) {
      expect(BANNED_WORDS.has(word), word).toBe(false);
    }
  });

  it("[SCN-VOC-010] records WHY the work-item row is not-applicable rather than deferred", () => {
    // A deferral books debt; this row must never be paid here, so the distinction is
    // recorded in the table rather than left to a reader's memory.
    const row = BLOCKED_VOCABULARY_ROWS.find((r) => r.terms.includes("subtree"));
    expect(row).toBeDefined();
    expect(row!.status).toBe("not-applicable");
    expect(row!.statusNote.length).toBeGreaterThan(0);
  });

  it("[SCN-VOC-010] the matcher exceptions are recorded as such, not folded to whole-word", () => {
    const matchers = new Map(
      BLOCKED_VOCABULARY_ROWS.map((r) => [r.terms.join("/"), r.matcher] as const)
    );
    const phraseRow = [...matchers].find(([terms]) => terms.includes("staticguard"));
    expect(phraseRow?.[1], `rows: ${[...matchers.keys()].join(" ; ")}`).toBe("phrase-adjacency");
    const guardRow = [...matchers].find(([terms]) => terms === "guard");
    expect(guardRow?.[1]).toBe("qualifier-gated");
  });
});

describe("[SCN-VOC-010] end to end through the classifier", () => {
  it("[SCN-VOC-010] an adopted term reds a planted usage", () => {
    const v = classifyWords(decomposeName("complexityBudget"), "name").find(
      (w) => w.word === "budget"
    )!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
  });

  it("[SCN-VOC-010] a deferred term does not", () => {
    // NAME mode is the discriminating one: an unapproved word flags `unknown` there, so
    // this green is a positive approval rather than an accident of prose mode.
    expect(classifyWords(decomposeName("undemandedOutcome"), "name").every((v) => !v.flagged)).toBe(
      true
    );
  });

  it("[SCN-VOC-010] a not-applicable term does not either — the git and CLI senses stay green", () => {
    expect(classifyWords(decomposeName("repoRoot"), "name").every((v) => !v.flagged)).toBe(true);
  });
});
