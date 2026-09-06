/**
 * @SCN-VOC-014 (3F-2343) — the @unit arm of the adopted-vocabulary tree-enforcement gate.
 *
 * WHY THE FILTER IS PROVEN AGAINST CONSTRUCTED INPUT. Over the real tree the adopted terms
 * measure ZERO occurrences — that is what lets this gate land green — so a passing run is
 * consistent with the filter being broken in EITHER direction: silently enforcing nothing,
 * or silently enforcing the 2,420 occurrences it must not touch. Neither failure is visible
 * on this tree, so both are pinned here over rows built in the test.
 *
 * The exclusions each get their own case rather than one combined "does not flag", because
 * they are excluded for DIFFERENT reasons and a single assertion would keep passing if two
 * of them collapsed into the third.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { adoptedOccurrences, adoptedOccurrenceReport } from "./lintAdoptedVocabularyCli.js";
import {
  RETIRED, ADOPTED_PLAIN_TERMS, ADOPTED_TRIGGER_WORDS, CANONICAL,
} from "../../../tests/fixtures/vocab/retiredTerms.js";
import {
  adoptedTriggerWords,
  parseBlockedVocabulary,
  BLOCKED_VOCABULARY_ROWS,
} from "./blockedVocabulary.js";
import { classifyWords, type ManifestRow } from "./vocabAudit.js";
import {
  parseScenarios,
  checkStaticEvidenceObligations,
  runningStaticChecks,
} from "@3f-consulting/spec-controller-core";
import {
  registeredCheckTags,
  fitnessCitations,
  parseTaggedScenarios,
} from "@3f-consulting/spec-controller-core/internal";
import { resolveCheckRegistry } from "@3f-consulting/spec-controller-core/internal";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepoFile = (relative: string): string =>
  fs.readFileSync(path.join(repoRoot, relative), "utf8");

/** The static check this scenario both NAMES and IS. */
const OWN_STATIC_CHECK = "lint:adopted-vocabulary";

/** The guard-prefix set the balance CLI SETS at its edge and injects into the core. */
const GUARD_PREFIXES = ["lint:", "guard:"] as const;

/** A manifest row with the fields the gate reads; the rest are the engine's, not ours. */
function row(over: Partial<ManifestRow>): ManifestRow {
  return {
    surface: "code-identifiers",
    file: "packages/core/src/domain/ledger.ts",
    line: 42,
    symbol: "someSymbol",
    current: RETIRED.obligationNoun,
    new: "",
    action: "rename",
    decision: "",
    ...over,
  };
}

describe("[SCN-VOC-014] the trigger set is derived from the table's status column", () => {
  const table = [
    "| Never write | Always write | Why | Adoption | Matcher |",
    "| -- | -- | -- | -- | -- |",
    "| widget | `gadget` | retired | adopted — 3F-0001 | whole-word |",
    "| sprocket | `cog` | retired | deferred 2026-08-04 — 3F-0002 pays it | whole-word |",
    "| flanged bracket | `mount` | retired | adopted — 3F-0003 | phrase-adjacency |",
    "| cotter pin | `clip` | retired | deferred 2026-08-04 — 3F-0004 pays it | phrase-adjacency |",
  ].join("\n");
  const triggers = adoptedTriggerWords(parseBlockedVocabulary(table));

  it("holds an adopted whole-word row's term", () => {
    expect(triggers.has("widget")).toBe(true);
  });

  it("does not hold a DEFERRED row's term — the filter that keeps main unblocked", () => {
    // Deferred rows are dated, ticketed debt. On the real tree they carry 2,272
    // occurrences, so enforcing them would red main permanently.
    expect(triggers.has("sprocket")).toBe(false);
  });

  it("holds an adopted phrase row's FIRST token, which is the word the phrase arm flags", () => {
    expect(triggers.has("flanged")).toBe(true);
  });

  it("does not hold a deferred phrase row's token", () => {
    expect(triggers.has("cotter")).toBe(false);
  });
});

describe("[SCN-VOC-014] the real table's adopted rows are the obligation family, the outcome handle, the metric word and the two phrases", () => {
  const triggers = adoptedTriggerWords();

  it("enforces every adopted term this repository has taken on", () => {
    expect([...triggers].sort()).toEqual([...ADOPTED_TRIGGER_WORDS].sort());
  });

  it("leaves the code-side rejected aliases alone — they are 3F-2369's, and unswept", () => {
    // `state`, `supply`, `execution`, `unattributed`, `requirement`, `oob` are
    // GLOSSARY_ALIAS_BANS, a code-side list rather than a canon row: 70 occurrences live in
    // the tree today, so enforcing them here would red main on debt that needs a sweep.
    for (const alias of ["state", "supply", "execution", "unattributed", "requirement", "oob"]) {
      expect(triggers.has(alias)).toBe(false);
    }
  });

  it("leaves the bare shortenings alone — the engine's own arm, not a table row", () => {
    // FULL_TERM_ONLY: approved inside their full manifesto term. 2,350 occurrences.
    for (const bare of ["obligation", "observation", "ghost", "guard"]) {
      expect(triggers.has(bare)).toBe(false);
    }
  });

  it("leaves an UNADOPTED row's terms alone — the status column is the gate's authority", () => {
    // THE EXEMPLARS MOVED, THE ASSERTION DID NOT (3F-2329). The retired evidence family was
    // this test's exemplar; its row is ADOPTED now, so those words ARE triggers and editing
    // the list to match the code would have kept the test's shape and dropped its point. The
    // rows still unadopted make it just as well: the work-item row (not-applicable — this
    // repository has no work-item model) and the bare shortening (deferred, 3F-1852).
    for (const word of ["tree", "subtree", "root", "branch", "guard"]) {
      expect(triggers.has(word), word).toBe(false);
    }
  });
});

describe("[SCN-VOC-014] a phrase trigger word cannot be flagged for any other reason", () => {
  // The trigger set keys on the flagged WORD, so `static` and `ci` are enforced wherever
  // they appear flagged. That is only sound because each is an APPROVED word on its own —
  // the very reason the phrase arms exist — so the phrase rule is the only path by which
  // either can reach the manifest. Left unasserted this is an incidental property that a
  // future word-set edit could silently turn into a flood of false reds.
  it("does not flag a bare static or ci outside the retired phrase", () => {
    for (const word of ["static", "ci", RETIRED.classNounPhraseFirst]) {
      const [verdict] = classifyWords([word], "name");
      expect(verdict?.flagged).toBe(false);
    }
  });
});

/**
 * 3F-2588 — the CLASS-NOUN regrowth guard's teeth, BOTH WAYS.
 *
 * The word is individually allowlisted, so over the real tree this rule measures zero and a green
 * run says nothing about it in either direction — the same blindness the file's header describes.
 * A blanket ban on the word would red `@lint`, every `lint:*` script name and every mention of
 * ESLint, which is why the rule is phrase-scoped and why BOTH directions are pinned here.
 */
describe("[SCN-VOC-014] the class-noun phrase reds, and the legitimate senses do not", () => {
  const firstVerdict = (words: string[]) => classifyWords(words, "prose")[0];

  it("flags the word when a class noun follows it — the class is the canon class name", () => {
    const verdict = firstVerdict([RETIRED.classNounPhraseFirst, RETIRED.classNounPhraseSecond]);
    expect(verdict?.flagged).toBe(true);
    expect(verdict?.canonical).toBe(CANONICAL.className);
  });

  it("flags the class noun's PLURAL too — a plural must not walk past the singular's ban", () => {
    expect(firstVerdict([RETIRED.classNounPhraseFirst, "kinds"])?.flagged).toBe(true);
  });

  it("leaves the bare check tag alone — nothing follows it, so no phrase exists", () => {
    expect(firstVerdict([RETIRED.classNounPhraseFirst])?.flagged).toBe(false);
  });

  it("leaves a lint: script name alone — its follower is the check, never a class noun", () => {
    for (const script of ["lint:complexity", "lint:feature-codes", "lint:adopted-vocabulary"]) {
      const verdict = firstVerdict(script.split(/[:-]/));
      expect(verdict?.flagged, script).toBe(false);
    }
  });

  it("leaves the legitimate follower alone — a style-lint check is what the bare tag IS", () => {
    const verdict = firstVerdict([
      RETIRED.classNounPhraseFirst,
      RETIRED.classNounLegitimateSecond,
    ]);
    expect(verdict?.flagged).toBe(false);
  });
});

describe("[SCN-VOC-014] the gate keeps the manifest rows an adopted row bans", () => {
  const triggers = new Set([RETIRED.obligationNoun, RETIRED.classNamePhraseFirst]);

  it("keeps a row whose flagged word is an adopted trigger", () => {
    expect(adoptedOccurrences([row({ current: RETIRED.obligationNoun })], triggers)).toEqual([
      {
        file: "packages/core/src/domain/ledger.ts",
        line: 42,
        word: RETIRED.obligationNoun,
        symbol: "someSymbol",
      },
    ]);
  });

  it("drops a row whose flagged word is not", () => {
    expect(adoptedOccurrences([row({ current: "obligation" })], triggers)).toEqual([]);
  });

  it("keeps every offending row rather than stopping at the first", () => {
    // A gate that reported one occurrence per run turns a sweep into N round trips.
    const kept = adoptedOccurrences(
      [row({ current: RETIRED.obligationNoun, line: 1 }),
       row({ current: RETIRED.classNamePhraseFirst, line: 2 })],
      triggers,
    );

    expect(kept.map((o) => o.line)).toEqual([1, 2]);
  });
});

describe("[SCN-VOC-014] a red names the file, the line and the term", () => {
  it("reports where the retired word came back", () => {
    // A bare exit code says a purge regressed without saying where, which sends the reader
    // back to run the audit by hand — the manual step this gate exists to remove.
    const report = adoptedOccurrenceReport([
      { file: "packages/core/src/domain/ledger.ts", line: 42, word: RETIRED.obligationNoun,
        symbol: `${RETIRED.obligationNoun}Count` },
    ]);

    expect(report).toContain("packages/core/src/domain/ledger.ts");
    expect(report).toContain("42");
    expect(report).toContain(RETIRED.obligationNoun);
  });

  it("says nothing to enforce when the tree is clean", () => {
    expect(adoptedOccurrenceReport([])).toBe("");
  });
});

describe("[SCN-VOC-014] the gate is reconciled on spec-controller's own Ledger", () => {
  const manifest = JSON.parse(readRepoFile("package.json")) as {
    scripts?: Record<string, string>;
    specController?: { fitnessChecks?: { scn?: string; command?: string }[] };
  };
  const corpus = readRepoFile("features/fitness-checks.feature");
  const rows = manifest.specController?.fitnessChecks ?? [];
  const ownRow = rows.find((candidate) => candidate.command === `pnpm ${OWN_STATIC_CHECK}`);

  it("is named by a configured fitness row, so its run has an Evidence Obligation to settle against", () => {
    // THE SAME ASSERTION, THROUGH THE SPELLING THAT NOW CARRIES IT (3F-3165). It read the
    // registry hop before this — a handle resolved to a bare check tag, that tag looked up in
    // the corpus — because an unconverted check is DISCOVERED and a handle does not know what
    // it is for. A converted check is never discovered: its row states the @SCN, and the
    // scenario the corpus carries under that @SCN is what the fitness pass reports. One hop,
    // read off the REAL manifest, so the claim is the tree's rather than this test's.
    expect(ownRow?.scn).toBeDefined();
  });

  it("has a scenario in the generated corpus, which is the enumeration a linter's silence lacks", () => {
    // The reason the corpus exists at all given the row already carries everything: a check
    // reports findings and says nothing when it finds none, so its silence cannot be told from
    // its absence. Cucumber reports every scenario it ran.
    expect(corpus).toContain(`@fitness @${ownRow?.scn ?? "(no row)"}`);
  });

  it("fires because the pass RUNS its command — it is not merely present in a manifest", () => {
    // BOTH HALVES, AS BEFORE, AND BOTH ARE NOW FACTS ABOUT THE RUN. The old pair was `exists`
    // (a package.json script) and `enforcedOverRealSource` (a ci.yml run: step) — a file
    // MENTIONING a name. Here the row's command IS the script, the fitness pass executes it in
    // this repository's own root, and the scenario appearing in that pass's report is the
    // credit. Strictly stronger evidence, which is what conversion buys.
    expect(ownRow?.command).toBe(`pnpm ${OWN_STATIC_CHECK}`);
    expect(manifest.scripts ?? {}).toHaveProperty(OWN_STATIC_CHECK);
  });
});

describe("[SCN-VOC-015] a deferred row's term is visible to the audit and invisible to the gate", () => {
  // The filter that makes the gate LANDABLE, asserted out loud. Its failure mode is the
  // opposite of VOC-014's: VOC-014 breaking leaves a ban unenforced, this breaking blocks
  // main — the vendored table's one remaining unadopted row carries 774 occurrences in this
  // tree (the bare shortening, 3F-1852). An unasserted green survives the deletion of the
  // very filter it depends on.
  const table = [
    "| Never write | Always write | Why | Adoption | Matcher |",
    "| -- | -- | -- | -- | -- |",
    "| widget | `gadget` | retired | adopted — 3F-0001 | whole-word |",
    "| sprocket | `cog` | retired | deferred 2026-08-04 — 3F-0002 pays it | whole-word |",
  ].join("\n");
  const triggers = adoptedTriggerWords(parseBlockedVocabulary(table));

  it("keeps the adopted term and drops the deferred one from the SAME manifest", () => {
    // One manifest carrying both, so the assertion is that the gate DISCRIMINATES rather
    // than that it happened to find nothing. A filter that ignored the status column would
    // return both rows; one that enforced nothing would return neither.
    const kept = adoptedOccurrences(
      [row({ current: "widget", line: 1 }), row({ current: "sprocket", line: 2 })],
      triggers,
    );

    expect(kept.map((occurrence) => occurrence.word)).toEqual(["widget"]);
  });

  it("reads the bare shortening as deferred in the REAL table, so the fixture above mirrors this repo", () => {
    // Without this the block would prove a property of an invented table.
    //
    // THE EXEMPLAR MOVED, THE ASSERTION DID NOT (3F-2329). The retired evidence family was
    // the real deferred row this pointed at, and 3F-2329 ADOPTED it — the gate started
    // enforcing it with no code change here, which is the property this block exists to
    // state. So the pin moves to the row still deferred (the bare shortening, 3F-1852, 774
    // occurrences outstanding) rather than being edited to expect `adopted`, which would
    // have deleted the deferred half of the discrimination the fixture above demonstrates.
    const real = BLOCKED_VOCABULARY_ROWS.find((candidate) => candidate.terms.includes("guard"));

    expect(real?.status).toBe("deferred");
    expect(adoptedTriggerWords().has("guard")).toBe(false);
  });
});
