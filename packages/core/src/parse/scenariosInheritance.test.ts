/**
 * Unit tests for the tags a scenario inherits from its Feature and Rule (@SCN-LDG-020), split out
 * of scenarios.test.ts under the max-lines ceiling (3F-3559).
 *
 * Bidirectional evidence: each describe carries the @SCN id of its scenario (Evidence Manifesto §9).
 */

import { describe, it, expect } from "vitest";
import {
  parseScenarios,
} from "./scenarios.js";
import { fitnessChecksOf } from "../domain/fitnessChecks.js";

/**
 * @unit for @SCN-LDG-020 (3F-1775) — the PARSED corpus is what CUCUMBER runs.
 *
 * Bidirectional evidence: the describe carries the @SCN-LDG-020 id matching
 * features/ledger.feature and the @integration steps in tests/steps/ledger.steps.ts.
 *
 * The corpus was read by a hand-rolled TAG-LINE SCAN that saw only the contiguous tag block
 * directly above a `Scenario:`. Gherkin does not work that way: a scenario INHERITS the tags of
 * its Feature and of any enclosing Rule, and cucumber applies them. A tier hoisted to the
 * Feature/Rule line — idiomatic, valid Gherkin — was therefore INVISIBLE, so its obligation was
 * never RAISED and its missing evidence could never reconcile `missing`: the run read BALANCED
 * while cucumber named a tier nothing proved. Extraction now comes from the real AST.
 */
describe("[SCN-LDG-020] a scenario's named tags include the ones it inherits from its Feature and Rule", () => {
  it("inherits an evidence tier from the FEATURE — the false-green that reads BALANCED today", () => {
    // THE HEADLINE. cucumber names unit AND integration of this scenario. The scan saw only
    // @unit, so the integration obligation was never RAISED — and an obligation that was never
    // raised can never reconcile `missing`.
    const source = `@AAA @integration
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;
    const [scenario] = parseScenarios(source);

    expect(scenario!.scnId).toBe("SCN-AAA-001");
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("inherits an evidence tier from an enclosing RULE", () => {
    const source = `@AAA
Feature: alpha

  @integration
  Rule: alpha behaves

    @unit @SCN-AAA-001
    Scenario: alpha works
      Given a thing
`;
    const [scenario] = parseScenarios(source);

    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("does NOT invent a phantom scenario from a tag block above a Rule — the over-read (operator: give it teeth)", () => {
    // THE SECOND BUG. Any non-tag line FLUSHED the accumulated block, so a tag block above a
    // `Rule:` was emitted AS IF it were a scenario. The corpus did not merely under-read — it
    // INVENTED. Exactly one real scenario lives here, and the AST knows it.
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    @SCN-AAA-002
    Scenario: alpha works
      Given a thing
`;
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(1);
    // The one real scenario, carrying its OWN id and the tier inherited from the Rule.
    expect(scenarios[0]!.scnId).toBe("SCN-AAA-002");
    expect(scenarios[0]!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });

  it("inherits a FITNESS obligation and a community deferral tag, like any other tag", () => {
    // Inheritance is not tier-only: EVERY tag inherits, exactly as cucumber resolves them. The
    // scenario beneath is STEPLESS; what raises the fitness obligation off the axis tag it
    // inherits is the configured row naming it, never the shape (@SCN-LNT-018).
    const fitnessSource = `@AAA @fitness
Feature: alpha

  @SCN-AAA-001
  Scenario: alpha stays inside its threshold
`;
    expect(parseScenarios(
      fitnessSource, [], fitnessChecksOf([{ scn: "SCN-AAA-001" }])
    )[0]!.evidenceObligations).toEqual([
      { qualityCheck: "fitness" },
    ]);

    // A deferral tag on the Feature defers every scenario beneath it — the whole-file @wip.
    const deferredSource = `@AAA @wip
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;
    expect(parseScenarios(deferredSource, ["wip"])[0]!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
    ]);
  });

  it("inherits an @SCN from the Rule — parity with cucumber, which inherits EVERY tag", () => {
    // Operator ruling: follow cucumber. Excluding @SCN would invent a rule cucumber does not
    // have. Both scenarios beneath therefore carry the inherited id — a corpus-authoring fault,
    // but a VISIBLE one (whether it should red is the deferred policy question, 3F-1774's sibling).
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    Scenario: alpha works
      Given a thing

    Scenario: alpha also works
      Given another thing
`;
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(2);
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-AAA-001", "SCN-AAA-001"]);
  });

  it("is BYTE-IDENTICAL on a file that uses no inheritance — the regression bar", () => {
    // The whole existing corpus is of this shape (verified: no .feature hoists a tier), so the
    // rewrite must not move a single obligation on it.
    const source = `@AAA
Feature: alpha

  @unit @integration @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  @fitness @SCN-AAA-002
  Scenario: beta stays inside its threshold
`;
    expect(parseScenarios(
      source, [], fitnessChecksOf([{ scn: "SCN-AAA-002" }])
    )).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }],
      },
      {
        scnId: "SCN-AAA-002",
        evidenceObligations: [{ qualityCheck: "fitness" }],
      },
    ]);
  });
  it("makes a duplicate scnId VISIBLE — two scenarios sharing an inherited @SCN are TWO scenarios, never deduped", () => {
    // THE OPERATOR'S GUARDRAIL (3F-1775). A hoisted @SCN is inherited by every scenario beneath
    // it, so two scenarios can carry one id. The parser must NOT quietly collapse them: if it did,
    // the unproven scenario would vanish and the run would read balanced. It emits BOTH — and the
    // CLI then REFUSES the corpus (exit 2), because evidence citing a duplicated id cannot be
    // attributed to either scenario and any verdict over it would be a guess.
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    Scenario: alpha works
      Given a thing

    Scenario: alpha also works, and NOTHING proves it
      Given another thing
`;
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(2);
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-AAA-001", "SCN-AAA-001"]);
  });

  it("THROWS on unparseable source — an empty corpus balances against anything, so it never returns one", () => {
    // The silent-empty-corpus is the false-green species itself: a debit side of zero balances
    // against any evidence. @SCN-CLI-016 refuses such a file at the CLI edge long before this, so
    // the throw is unreachable in a real run — it is the floor that stops a future caller
    // re-opening the hole quietly.
    expect(() => parseScenarios("not gherkin at all {{{")).toThrow(/not valid Gherkin/);
  });
});
