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
 *
 * Titles are PLAIN strings, not template literals (the parseTestBlocks brace-tracking
 * lesson, 3F-2366).
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { adoptedOccurrences, adoptedOccurrenceReport } from "./lintAdoptedVocabularyCli.js";
import {
  RETIRED, ADOPTED_PLAIN_TERMS, ADOPTED_TRIGGER_WORDS,
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
import { staticCheckEvidenceObligationsOf } from "@3f-consulting/spec-controller-core/internal";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepoFile = (relative: string): string =>
  fs.readFileSync(path.join(repoRoot, relative), "utf8");

/** The static check this scenario both declares and is. */
const OWN_STATIC_CHECK = "lint:adopted-vocabulary";

/** The guard-prefix set the balance CLI declares at its edge and injects into the core. */
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

  it("leaves the deferred declare family alone until 3F-2329 adopts it", () => {
    for (const word of ["declare", "declared", "declaring", "declares", "undeclared"]) {
      expect(triggers.has(word)).toBe(false);
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
    for (const word of ["static", "ci"]) {
      const [verdict] = classifyWords([word], "name");
      expect(verdict?.flagged).toBe(false);
    }
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
  const ciSource = readRepoFile(".github/workflows/ci.yml");
  const packageJson = JSON.parse(readRepoFile("package.json")) as {
    scripts?: Record<string, string>;
  };
  const featureSource = readRepoFile("features/vocabulary-audit.feature");

  it("is named by a scenario, so its run has an Evidence Obligation to settle against", () => {
    const named = staticCheckEvidenceObligationsOf(parseScenarios(featureSource));

    expect([...named]).toContain(OWN_STATIC_CHECK);
  });

  it("exists as a script AND is enforced over real source — it fires, it is not merely present", () => {
    expect(checkStaticEvidenceObligations([OWN_STATIC_CHECK], ciSource, packageJson)).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: OWN_STATIC_CHECK,
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("is one of the running static checks the observer emits into the evidence stream", () => {
    const running = runningStaticChecks(ciSource, packageJson, GUARD_PREFIXES).map(
      (observation) => observation.staticCheck,
    );

    expect(running).toContain(OWN_STATIC_CHECK);
  });
});

describe("[SCN-VOC-015] a deferred row's term is visible to the audit and invisible to the gate", () => {
  // The filter that makes the gate LANDABLE, asserted out loud. Its failure mode is the
  // opposite of VOC-014's: VOC-014 breaking leaves a ban unenforced, this breaking blocks
  // main — the vendored table's unadopted rows carry 2,272 occurrences in this tree, the
  // `declare` family alone 1,212 across 133 files (3F-2329). An unasserted green survives
  // the deletion of the very filter it depends on.
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

  it("reads `declare` as deferred in the REAL table, so the fixture above mirrors this repo", () => {
    // Without this the block would prove a property of an invented table. The real row is
    // deferred with 1,212 occurrences outstanding, which is exactly why the gate must not
    // enforce it yet — and why it will start to, with no code change, when 3F-2329 lands.
    const real = BLOCKED_VOCABULARY_ROWS.find((candidate) =>
      candidate.terms.includes("declare"),
    );

    expect(real?.status).toBe("deferred");
    expect(adoptedTriggerWords().has("declare")).toBe(false);
  });
});
