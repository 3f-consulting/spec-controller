/**
 * @SCN-VOC-016 (3F-2378) — the @unit arm of the data-floor gate.
 *
 * WHY BOTH ARMS ARE PROVEN AGAINST CONSTRUCTED INPUT. Once the relocation lands there is no
 * code file left on the exempt list and no stale entry either, so a passing run over the
 * real tree is consistent with either check being broken. Both are pinned here over lists
 * built in the test; the @integration arm then proves the real list satisfies them.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isPureDataPath, exemptionFaults } from "./lintExemptDataFloorCli.js";
import type { ExemptionKind } from "./selfExempt.js";

/** A one-entry exempt list, so each case says exactly which kind it is testing. */
const listOf = (path: string, why: ExemptionKind): ReadonlyMap<string, ExemptionKind> =>
  new Map([[path, why]]);
const PURE: ExemptionKind = { kind: "pure-data", note: "test" };
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
const OWN_STATIC_CHECK = "lint:exempt-data-floor";

/** The guard-prefix set the balance CLI SETS at its edge and injects into the core. */
const GUARD_PREFIXES = ["lint:", "guard:"] as const;

describe("[SCN-VOC-016] a pure-data path is one whose banned words can only be mentions", () => {
  it("accepts the shapes that hold definitions rather than live vocabulary", () => {
    // A markdown table, a Gherkin specification, the fixture corpus, and the step
    // definitions binding that specification. Each names retired words to SAY WHAT IS
    // BANNED; none can use one as its own vocabulary.
    expect(isPureDataPath("packages/spec-controller/static-checks/blockedVocabulary.md")).toBe(true);
    expect(isPureDataPath("packages/spec-controller/static-checks/renameTargets.md")).toBe(true);
    expect(isPureDataPath("features/vocabulary-audit.feature")).toBe(true);
    expect(isPureDataPath("tests/fixtures/vocab/retiredTerms.ts")).toBe(true);
    expect(isPureDataPath("tests/steps/vocabularyAudit.steps.ts")).toBe(true);
  });

  it("refuses a code file, which is the whole point of the floor", () => {
    // These are the shapes that can hold a USE behind a mention — the 3F-2300 blind spot.
    expect(isPureDataPath("packages/spec-controller/static-checks/vocabAudit.ts")).toBe(false);
    expect(isPureDataPath("packages/spec-controller/static-checks/vocabWordSets.ts")).toBe(false);
    expect(isPureDataPath("packages/spec-controller/static-checks/vocabAudit.test.ts")).toBe(false);
    expect(isPureDataPath("packages/core/src/domain/ledger.ts")).toBe(false);
  });

  it("judges by path, never by how much data the file happens to contain", () => {
    // A content heuristic ("mostly data?") is the judgement a reviewer cannot enforce and
    // that drifts as the file grows — which is how a mixed file earned an exemption in the
    // first place. A `.test.ts` full of corpora is still code.
    expect(isPureDataPath("tests/fixtures/vocab/buildSupply.ts")).toBe(true);
    expect(isPureDataPath("packages/spec-controller/static-checks/blockedVocabulary.test.ts")).toBe(false);
  });
});

describe("[SCN-VOC-016] a code file on the exempt list is a fault", () => {
  it("names the offending path and says it is code", () => {
    const code = "packages/spec-controller/static-checks/vocabAudit.ts";
    const faults = exemptionFaults(listOf(code, PURE), new Map([[code, 8]]));

    expect(faults).toHaveLength(1);
    expect(faults[0]?.kind).toBe("code-file-exempt");
    expect(faults[0]?.path).toBe("packages/spec-controller/static-checks/vocabAudit.ts");
  });

  it("passes a list of pure-data paths that each cover a mention", () => {
    // The green arm. A gate that reds on everything is as useless as one that reds on
    // nothing, and only the pair says the judgement is being made.
    const table = "packages/spec-controller/static-checks/blockedVocabulary.md";
    const faults = exemptionFaults(listOf(table, PURE), new Map([[table, 25]]));

    expect(faults).toEqual([]);
  });

  it("allows a CODE file only as a named residual naming the ticket that frees it", () => {
    // The operator's ruling: never a blanket exemption to preserve a code file. A residual
    // is the shape a DEFERRED canon row already has — debt that names who pays it.
    const code = "packages/spec-controller/static-checks/vocabAudit.ts";
    const residual: ExemptionKind = { kind: "residual", pending: "3F-2392", note: "test" };

    expect(exemptionFaults(listOf(code, residual), new Map([[code, 8]]))).toEqual([]);
  });
});

describe("[SCN-VOC-017] an exemption covering no banned word is stale", () => {
  it("reds an entry whose file holds nothing, so the floor can only shrink", () => {
    // An exemption covering nothing reds nothing BY CONSTRUCTION, so without this it sits
    // on as licence for the next file that happens to match the path.
    const table = "packages/spec-controller/static-checks/blockedVocabulary.md";
    const faults = exemptionFaults(listOf(table, PURE), new Map([[table, 0]]));

    expect(faults).toHaveLength(1);
    expect(faults[0]?.kind).toBe("stale-entry");
  });

  it("names the pending ticket when the stale entry is a residual", () => {
    // A stale residual is worse than a stale pure-data entry: it claims someone still owes
    // work that is in fact already done, so the red must say which ticket to close.
    const code = "packages/spec-controller/static-checks/vocabAudit.ts";
    const residual: ExemptionKind = { kind: "residual", pending: "3F-2392", note: "test" };
    const faults = exemptionFaults(listOf(code, residual), new Map([[code, 0]]));

    expect(faults[0]?.kind).toBe("stale-entry");
    expect(faults[0]?.message).toContain("3F-2392");
  });
});

describe("[SCN-VOC-016] the gate is reconciled on spec-controller's own Ledger", () => {
  const ciSource = readRepoFile(".github/workflows/ci.yml");
  const packageJson = JSON.parse(readRepoFile("package.json")) as {
    scripts?: Record<string, string>;
    specController?: { checkRegistry?: unknown };
  };
  const featureSource = readRepoFile("features/vocabulary-audit.feature");

  it("is named by a scenario, so its run has an Evidence Obligation to settle against", () => {
    // THE SAME ASSERTION, THROUGH THE SPELLING THAT NOW CARRIES IT (3F-2589). This used to
    // read the retired @lint=<handle> form, where a scenario named the check by spelling the
    // runnable handle back at the tool. Under the one posting rule the corpus names a check
    // by a BARE tag, and which tag a handle IS comes from this repository's own registry — so
    // both hops are read from the REAL manifest and the REAL feature file here. A missing
    // registry entry now fails this exactly as a missing tag does, which is strictly more
    // than the handle-spelling read could see.
    const registry = resolveCheckRegistry(packageJson);
    const checkTag = registry.get(OWN_STATIC_CHECK)?.check;
    expect(checkTag).toBeDefined();

    // Read through the CORPUS HOP itself (`fitnessCitations`) rather than through the corpus's
    // obligation set: it answers the sharper question — which scenario carries this check — and
    // so fails on a tag that reaches no stepless scenario as well as on one that is absent. The
    // journal-side named-handle derivation this replaced was the by-name route's, and went with it
    // (3F-2590).
    const citations = fitnessCitations(
      parseTaggedScenarios(featureSource),
      registeredCheckTags(registry),
    );

    expect([...citations.keys()]).toContain(checkTag);
  });

  it("exists as a script AND is enforced over real source — it fires, it is not merely present", () => {
    expect(checkStaticEvidenceObligations([OWN_STATIC_CHECK], [ciSource], packageJson)).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: OWN_STATIC_CHECK,
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("is one of the running static checks the observer emits into the evidence stream", () => {
    expect(
      runningStaticChecks([ciSource], packageJson, GUARD_PREFIXES).map((o) => o.staticCheck),
    ).toContain(OWN_STATIC_CHECK);
  });
});
