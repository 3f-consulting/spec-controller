/**
 * Unit coverage for the vendored canon table and the derivation that turns it into the
 * enforced word set — the @unit arm of @SCN-VOC-010
 * (features/vocabulary-audit.feature).
 *
 * WHAT THIS FILE HAS TO PROVE, and why the obvious test is not enough. Asserting that
 * a retired term reds would pass just as well against the hand-maintained set this scenario
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
 * NOT EXEMPT. This file passes the retired vocabulary to the classifier, but takes it from
 * `tests/fixtures/vocab/retiredTerms.ts` rather than inlining it, so it is audited like any
 * other code (3F-2378).
 */

import { describe, it, expect } from "vitest";
import {
  RETIRED, RETIRED_COMPOSITE, ADOPTED_PLAIN_TERMS,
} from "../../../tests/fixtures/vocab/retiredTerms.js";
import {
  BLOCKED_VOCABULARY_ROWS,
  bannedWordsOf,
  checkAdoptionStatuses,
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
    // Four adopted rows are 3F-2281's; the outcome handle joined at 3F-2342 when 3F-2300
    // finished renaming the outcome handle to `no-evidence-obligation`. Two of the adopted
    // rows are matcher EXCEPTIONS — the phrase-adjacency arms — so they are adopted WITHOUT
    // joining the plain banned set; that split is what "canon owns which, code owns how"
    // means in one assertion.
    const derived = [...bannedWordsOf(BLOCKED_VOCABULARY_ROWS)].sort();
    expect(derived).toEqual([...ADOPTED_PLAIN_TERMS].sort());
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

/**
 * A table whose every row is triaged — the CONTROL for the faulted tables below.
 *
 * Each fault case is this table with ONE cell changed, so a red can only come from that
 * cell. Without the control, a check that reds on everything and a check that reds on the
 * right thing are indistinguishable — which is the same "all clear vs I did not run"
 * confusion @SCN-VOC-011 exists to remove.
 */
const TRIAGED_TABLE = `
| Never write | Always write | Why | Adoption status | Matcher |
|---|---|---|---|---|
| frobnicate | \`fettle\` | a throwaway adopted row | adopted — 3F-0001 | whole-word |
| quuxify | \`fettle\` | a throwaway deferred row | deferred 2026-08-03 — 3F-0002 | whole-word |
| plughward (of anything) | \`fettle\` | a throwaway inapplicable row | not-applicable — no model here | n/a |
`;

/** The same table with the named row's Adoption status cell replaced. */
function withStatus(term: string, cell: string): string {
  const replaced = TRIAGED_TABLE.split("\n").map((line) => {
    if (!line.startsWith(`| ${term} `)) return line;
    const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|");
    cells[3] = ` ${cell} `;
    return `|${cells.join("|")}|`;
  });
  const table = replaced.join("\n");
  expect(table, `the plant must change ${term}'s row`).not.toBe(TRIAGED_TABLE);
  return table;
}

/** The faults a table produces, by kind — the assertion shape every case below shares. */
function faultKinds(markdown: string): string[] {
  return checkAdoptionStatuses(parseBlockedVocabulary(markdown)).map((f) => f.kind);
}

/** The one fault a single-fault table produces — asserted to be exactly one first. */
function soleFault(markdown: string) {
  const faults = checkAdoptionStatuses(parseBlockedVocabulary(markdown));
  expect(faults.map((f) => f.message)).toHaveLength(1);
  return faults[0]!;
}

describe("[SCN-VOC-011] checkAdoptionStatuses — the table is a triage record", () => {
  it("[SCN-VOC-011] THE CONTROL: a table whose every row is triaged produces no fault", () => {
    // Run FIRST and asserted separately, because a silently-broken check and a valid table
    // look identical from the outside. Every red below is this table minus one cell.
    expect(faultKinds(TRIAGED_TABLE)).toEqual([]);
  });

  it("[SCN-VOC-011] a row with NO status reds, naming that row and what is missing", () => {
    const fault = soleFault(withStatus("frobnicate", ""));
    expect(fault.kind).toBe("no-status");
    expect(fault.row).toBe("frobnicate");
    // "which row" and "what is missing" — never "the table is invalid".
    expect(fault.message).toContain("frobnicate");
    expect(fault.message).toContain("no adoption status");
  });

  it("[SCN-VOC-011] a row with an UNRECOGNISED status reds, quoting the cell back", () => {
    // A cell the DERIVATION cannot classify enforces nothing, exactly as a blank one does,
    // so it must not be a quieter failure than a blank one.
    const fault = soleFault(withStatus("frobnicate", "probably fine"));
    expect(fault.kind).toBe("unrecognised-status");
    expect(fault.row).toBe("frobnicate");
    expect(fault.message).toContain("probably fine");
  });

  it("[SCN-VOC-011] a DEFERRED row naming no ticket reds — an intention, not a decision", () => {
    const fault = soleFault(withStatus("quuxify", "deferred 2026-08-03"));
    expect(fault.kind).toBe("deferral-without-ticket");
    expect(fault.row).toBe("quuxify");
    expect(fault.message).toContain("quuxify");
    expect(fault.message).toContain("ticket");
  });

  it("[SCN-VOC-011] a DEFERRED row naming no date reds too — undated debt never resurfaces", () => {
    const fault = soleFault(withStatus("quuxify", "deferred — 3F-0002"));
    expect(fault.kind).toBe("deferral-without-date");
    expect(fault.message).toContain("date");
  });

  it("[SCN-VOC-011] the date is not accepted as the ticket, nor the ticket as the date", () => {
    // `2026-08-03` is a hyphenated handle-shaped token; a ticket pattern loose enough to
    // accept it would green every dated deferral that names nobody.
    expect(faultKinds(withStatus("quuxify", "deferred 2026-08-03"))).toEqual([
      "deferral-without-ticket",
    ]);
    expect(faultKinds(withStatus("quuxify", "deferred — 3F-0002"))).toEqual([
      "deferral-without-date",
    ]);
  });

  it("[SCN-VOC-011] an ADOPTED or NOT-APPLICABLE row needs no ticket or date", () => {
    // Only a deferral books debt somebody must come back for. Requiring a ticket of the
    // other two verdicts would turn the check into paperwork and it would be switched off.
    expect(faultKinds(withStatus("frobnicate", "adopted"))).toEqual([]);
    expect(faultKinds(withStatus("plughward", "not-applicable"))).toEqual([]);
  });

  it("[SCN-VOC-011] a table nothing parses out of reds rather than reporting all clear", () => {
    // "Every row is triaged" is vacuously true of no rows, so a lost header or a changed
    // column count would exit 0 while checking nothing — a check that cannot tell "all
    // clear" from "I did not run" is the failure this scenario exists to remove.
    expect(faultKinds("no table here at all")).toEqual(["no-rows"]);
  });
});

describe("[SCN-VOC-011] the vendored table as committed", () => {
  it("[SCN-VOC-011] passes the check — every canon row has been triaged", () => {
    expect(checkAdoptionStatuses(BLOCKED_VOCABULARY_ROWS).map((f) => f.message)).toEqual([]);
  });

  it("[SCN-VOC-011] each of the two remaining deferrals names its date and its ticket", () => {
    // The two still owed: the retired-evidence-credit family (3F-2329) and the bare
    // shortening (3F-1852). The third — the outcome handle — was ALSO deferred on
    // 2026-08-03 and was PAID at 3F-2342, so it is `adopted` now and carries no deferral
    // note; the count moves down as debt is settled. Asserted as a COUNT and per-row, so a
    // table that quietly dropped one fails here.
    const deferred = BLOCKED_VOCABULARY_ROWS.filter((r) => r.status === "deferred");
    expect(deferred).toHaveLength(2);
    for (const row of deferred) {
      expect(row.statusNote, row.terms.join("/")).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(row.statusNote, row.terms.join("/")).toMatch(/3F-\d+/);
    }
  });
});

describe("[SCN-VOC-010] end to end through the classifier", () => {
  it("[SCN-VOC-010] an adopted term reds a planted usage", () => {
    const composite = decomposeName(RETIRED_COMPOSITE.metricIdentifier);
    const v = classifyWords(composite, "name").find((w) => w.word === RETIRED.metric)!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
  });

  it("[SCN-VOC-010] a deferred term does not", () => {
    // NAME mode is the discriminating one: an unapproved word flags `unknown` there, so
    // this green is a positive approval rather than an accident of prose mode.
    //
    // The example term is `undeclared`, not the retired outcome handle: 3F-2342 ADOPTED that
    // row, so it is enforced now and would red here. `undeclared` is the same shape one row
    // up — a term on a still-deferred row (3F-2329 pays it) that is independently APPROVED,
    // so its green says "the deferral holds", not "the word happens to be unknown".
    expect(classifyWords(decomposeName("undeclaredOutcome"), "name").every((v) => !v.flagged)).toBe(
      true
    );
  });

  it("[SCN-VOC-010] a not-applicable term does not either — the git and CLI senses stay green", () => {
    expect(classifyWords(decomposeName("repoRoot"), "name").every((v) => !v.flagged)).toBe(true);
  });
});
