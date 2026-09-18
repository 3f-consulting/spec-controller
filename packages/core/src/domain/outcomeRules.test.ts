/**
 * Unit test for the CREDIT-SIDE, DEGENERATE and ROW-SHAPE outcome rules (@SCN-LDG-001, 3F-2204) —
 * the Class E rules extracted from the `reconcile` fold onto the concepts that own them.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describes carry @SCN-LDG-001, matching
 * features/ledger.feature, so a grep of the id returns both halves.
 *
 * These state WHAT an entry reconciles to, as opposed to WHERE it lands (`posting.test.ts`).
 *
 * ONE OF THESE PINS A PREVIOUSLY-UNGUARDED RULE. The suspense row's item ORDER — `broken` FIRST,
 * because a broken run's other suspense items are downstream noise — was asserted by NO test in
 * the repo: moving the broken arm to the end of `suspenseReconciliationsOf` left all 605 tests
 * green (found by plant during 3F-2204; only the byte-identity corpus caught it). The order is a
 * stated canon rationale, not an accident of assembly, so it is pinned here.
 *
 * Parent: (@SCN-LDG-001).
 */

import { describe, it, expect } from "vitest";

import {
  noEvidenceObligationReconciliationsOf,
  citesUnknownScenarioReconciliationsOf,
  suspenseReconciliationsOf,
  noScnCodeReconciliations,
} from "./qualityCheckReconciliation.js";
import { qualityCheckReconciliationsOf } from "./scenarioReconciliation.js";
import {
  evidenceObligationsOf,
  pendingItemsOf,
  type MeasuredEvidenceObservation,
} from "./journal.js";
import type {
  Scenario,
  RuntimeEvidenceObservation,
  GuardEvidenceObservation,
  QualityCheckReconciliation,
} from "../model.js";

const credit = (
  qualityCheck: RuntimeEvidenceObservation["qualityCheck"],
  scnId: string | null,
  extra: Partial<RuntimeEvidenceObservation> = {}
): RuntimeEvidenceObservation => ({ qualityCheck, scnId, status: "passed", ...extra });

describe("[SCN-LDG-001] the pending partition splits a scenario's obligations exactly", () => {
  const scenario: Scenario = {
    scnId: "SCN-AAA-001",
    evidenceObligations: [
      { qualityCheck: "unit" },
      { qualityCheck: "e2e", pending: true },
      { qualityCheck: "integration" },
    ],
  };

  it("names only the non-pending obligations, in document order", () => {
    expect(evidenceObligationsOf(scenario.evidenceObligations)).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("raises one Pending Item per deferred obligation", () => {
    expect(pendingItemsOf(scenario)).toEqual([{ qualityCheck: "e2e" }]);
  });

  /** The two are EXACT complements — nothing dropped, nothing counted twice. */
  it("partitions with no overlap and no loss", () => {
    expect(
      evidenceObligationsOf(scenario.evidenceObligations).length + pendingItemsOf(scenario).length
    ).toBe(scenario.evidenceObligations.length);
  });

  /** @SCN-PND-022 — the scenario-scope deferral owes no specific check. */
  it("raises a quality-check-less Pending Item for a scenario-scope deferral", () => {
    expect(pendingItemsOf({ scnId: "SCN-AAA-002", evidenceObligations: [{ pending: true }] })).toEqual(
      [{ qualityCheck: undefined }]
    );
  });
});

describe("[SCN-LDG-001] noEvidenceObligationReconciliationsOf lists credits at quality-checks with no evidence obligation", () => {
  const pairs = new Set(["SCN-AAA-001 unit"]);

  it("skips a credit at a NAMED pair — that one reconciles as a matched obligation", () => {
    expect(
      noEvidenceObligationReconciliationsOf("SCN-AAA-001", [credit("unit", "SCN-AAA-001")], pairs)
    ).toEqual([]);
  });

  it("lists a credit at a quality-check with NO evidence obligation, credit-only, carrying its locator", () => {
    const items = noEvidenceObligationReconciliationsOf(
      "SCN-AAA-001",
      [credit("e2e", "SCN-AAA-001", { locator: "tests/a.e2e.ts" })],
      pairs
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.outcome).toBe("no-evidence-obligation");
    expect(items[0]!.locator).toBe("tests/a.e2e.ts");
    // CREDIT-ONLY — a credit at a check the scenario never named reconciles against no obligation.
    expect(items[0]!.evidenceObligation).toBeUndefined();
    expect(items[0]!.evidenceObservation).toBeDefined();
  });
});

/**
 * WHAT A NO-EVIDENCE-OBLIGATION ITEM OMITS (@SCN-LDG-008) — the other half of the arm above, which
 * pins only what an item CARRIES. Both payload keys are spread CONDITIONALLY, so an item minted
 * from a credit with no value for one has no KEY for it, not a key holding `undefined`.
 *
 * `toStrictEqual` / `not.toHaveProperty` IS THE ASSERTION, not a style. `toEqual` reads
 * `{ staticCheck: undefined }` as equal to `{}`, and `toBeUndefined()` passes whether the key is
 * absent or present-holding-`undefined` — so an ALWAYS-spread `staticCheck` and an always-spread
 * `locator` both passed every assertion above. An assertion that passes both before and after the
 * fault is not an assertion.
 *
 * WHO PRODUCES A NAMELESS ONE. `fitnessCheckNameOf` reaches `undefined` only for a RUNTIME credit:
 * a static check's runnable handle and a measurement's bare check tag are each REQUIRED on their
 * own observation, so the handle fallback the rule documents is the last name a fitness credit has
 * rather than one it can lack. The case below that fallback is the runtime credit — it names a test
 * file instead and carries no check name at all. Its `locator` is optional, and `reconcile` is on
 * the core barrel with the field documented as omissible by a hand-built observation, so both
 * absences arrive together on one credit.
 */
describe("[SCN-LDG-008] a no-evidence-obligation item omits the keys its credit has no value for", () => {
  const pairs = new Set(["SCN-AAA-001 unit"]);

  it("omits BOTH the staticCheck and the locator key on a runtime credit from no test file", () => {
    const anonymous = credit("e2e", "SCN-AAA-001");
    const [item] = noEvidenceObligationReconciliationsOf("SCN-AAA-001", [anonymous], pairs);
    expect(item).toStrictEqual({
      qualityCheck: "e2e",
      outcome: "no-evidence-obligation",
      evidenceObservation: anonymous,
    });
    // Said twice on purpose: `toStrictEqual` reds an EXTRA key, `not.toHaveProperty` names WHICH
    // keys must be absent, so the intent survives a later rewrite of the object above.
    expect(item).not.toHaveProperty("staticCheck");
    expect(item).not.toHaveProperty("locator");
  });

  /**
   * THE FALLBACK ITSELF, and the absence beside it: an untagged static check is named by its
   * runnable handle — the only name it has — while its `locator` key stays absent, a guard being
   * read from a target's config rather than from a test file.
   */
  it("names an untagged static check by its runnable handle, and carries no locator key", () => {
    const untagged: GuardEvidenceObservation = {
      qualityCheck: "lint",
      scnId: "SCN-AAA-001",
      staticCheck: "lint:nobody-asked",
      exists: true,
      enforcedOverRealSource: true,
    };
    const [item] = noEvidenceObligationReconciliationsOf("SCN-AAA-001", [untagged], pairs);
    expect(item).toStrictEqual({
      qualityCheck: "lint",
      staticCheck: "lint:nobody-asked",
      outcome: "no-evidence-obligation",
      evidenceObservation: untagged,
    });
    expect(item).not.toHaveProperty("locator");
  });
});

/**
 * A RUNTIME credit's item names NO check, even when the credit arrived carrying a tag
 * (@SCN-LDG-008) — the one fixture that tells `fitnessCheckTagOf`'s guard apart from an
 * unconditional read of `checkTag`.
 *
 * WHY NO INTERFACE NAMES THIS SHAPE, AND WHY THAT IS THE POINT. `RuntimeEvidenceObservation` has
 * no `checkTag` field AT ALL — not optional, absent: only the two fitness observations carry one,
 * each as a required field of its own. So every type-legal runtime credit leaves
 * `observation.checkTag` `undefined` at runtime, where the guard and an unconditional
 * `return observation.checkTag` agree exactly. Read from inside this package alone the guard is
 * unreachable, and pinning it would be theatre.
 *
 * It is reachable from OUTSIDE, which is the honest ground and a weaker one than "a runtime credit
 * carrying a check tag". `reconcile` and the observation union are on the published core barrel;
 * TypeScript's width subtyping admits a richer object through a variable binding, and a JavaScript
 * consumer is unconstrained by the interface at all — so a runtime credit built by a caller from a
 * shape that also has a `checkTag` is a thing the published surface genuinely accepts. The
 * intersection annotation below STATES that: it is not a cast past the contract, it is the shape an
 * external caller may legally hand in. What the guard promises is that such a tag never becomes THE
 * CHECK THAT RAN on the item — a runtime credit is named by its test file, and a check name it
 * never had would send a reader to a check that never ran.
 *
 * WHY THIS ARM CITES @SCN-LDG-008 RATHER THAN @SCN-LNT-013, whose source comment sits on the very
 * spread this reds. @SCN-LNT-013 is about a FITNESS credit and the check its item NAMES, and the
 * guard is already true for a fitness credit — so no fitness fixture can tell the two readings
 * apart, and an arm under that id would assert what its Gherkin never says. The fixture must be a
 * RUNTIME credit by construction, and a runtime credit reaching a real row at a quality-check it
 * never raised is precisely @SCN-LDG-008's Rule — as @SCN-LNT-013's own Rule puts it, "Nothing
 * about that rule is fitness-specific".
 *
 * `toStrictEqual` + `not.toHaveProperty`, for the reason the block above gives: the mutant ADDS a
 * `staticCheck` key, and `toEqual` — or reading `item.staticCheck` and calling it undefined —
 * cannot see the difference between an absent key and one holding `undefined`.
 */
describe("[SCN-LDG-008] a runtime credit's item names no check, even one the credit arrived carrying", () => {
  it("withholds a checkTag a runtime credit arrived with rather than naming it the check that ran", () => {
    const taggedRuntime: RuntimeEvidenceObservation & { checkTag: string } = {
      qualityCheck: "integration",
      scnId: "SCN-AAA-001",
      status: "passed",
      checkTag: "complexity",
    };
    const [item] = noEvidenceObligationReconciliationsOf(
      "SCN-AAA-001",
      [taggedRuntime],
      new Set(["SCN-AAA-001 unit"])
    );

    expect(item).toStrictEqual({
      qualityCheck: "integration",
      outcome: "no-evidence-obligation",
      evidenceObservation: taggedRuntime,
    });
    expect(item).not.toHaveProperty("staticCheck");
    // The fixture cannot go vacuous by quietly losing the field: the tag IS on the credit and
    // rides through on `evidenceObservation`. It is kept out of the item's own naming alone.
    expect(taggedRuntime.checkTag).toBe("complexity");
  });
});

describe("[SCN-LDG-001] citesUnknownScenarioReconciliationsOf builds a phantom row's items", () => {
  it("posts one credit-only cites-unknown-scenario item per citing credit, in citation order", () => {
    const items = citesUnknownScenarioReconciliationsOf([
      credit("unit", "SCN-ZZZ-009", { locator: "tests/z1.test.ts" }),
      credit("integration", "SCN-ZZZ-009", { locator: "features/z2.feature" }),
    ]);
    expect(items.map((i) => i.outcome)).toEqual([
      "cites-unknown-scenario",
      "cites-unknown-scenario",
    ]);
    expect(items.map((i) => i.locator)).toEqual(["tests/z1.test.ts", "features/z2.feature"]);
    expect(items[0]!.evidenceObligation).toBeUndefined();
  });
});

/**
 * A phantom row's items carry ONLY the fields they have (@SCN-LDG-006). The two conditional
 * spreads in `citesUnknownScenarioReconciliationsOf` exist so an item minted from a credit that
 * lacks a where-to-fix has no `locator` KEY at all — not a key holding `undefined` — and the smart
 * constructor returns its fields unchanged, so what the spread decides is what the item is.
 *
 * `toStrictEqual` / `not.toHaveProperty` RATHER THAN `toEqual` IS THE ASSERTION, not a stylistic
 * preference. `toEqual` reads `{ locator: undefined }` as equal to `{}`, so it cannot tell a
 * conditional spread from an unconditional one — which is exactly how an always-spread `locator`
 * lived here unnoticed while the arm above was green. An assertion that passes both before and
 * after the fault is not an assertion.
 */
describe("[SCN-LDG-006] a phantom row's items carry only the fields the credit has", () => {
  /**
   * A MEASUREMENT can mint a phantom row too, and THE CHECK THAT RAN is the whole of what it can
   * offer a reader: it is emitted by whatever measured the step rather than read from a test
   * file, so it has no locator and its bare `checkTag` is the only name it has (@SCN-CIP-003).
   */
  it("carries a measured credit's bare check tag as the staticCheck, and no locator key", () => {
    const measured: MeasuredEvidenceObservation = {
      qualityCheck: "lint",
      scnId: "SCN-ZZZ-009",
      checkTag: "ci-run-time",
      measured: 42,
    };
    const [item] = citesUnknownScenarioReconciliationsOf([measured]);
    expect(item).toStrictEqual({
      qualityCheck: "lint",
      staticCheck: "ci-run-time",
      outcome: "cites-unknown-scenario",
      evidenceObservation: measured,
    });
    // Said twice on purpose: `toStrictEqual` reds an EXTRA key, `not.toHaveProperty` names WHICH
    // key must be absent, so the intent survives a later rewrite of the object above.
    expect(item).not.toHaveProperty("locator");
  });

  it("carries neither a locator nor a staticCheck key when the runtime credit has no locator", () => {
    const noLocator = credit("unit", "SCN-ZZZ-009");
    const [item] = citesUnknownScenarioReconciliationsOf([noLocator]);
    expect(item).toStrictEqual({
      qualityCheck: "unit",
      outcome: "cites-unknown-scenario",
      evidenceObservation: noLocator,
    });
    expect(item).not.toHaveProperty("locator");
    // A runtime credit reaches NEITHER staticCheck arm — the key is absent, not undefined.
    expect(item).not.toHaveProperty("staticCheck");
  });
});

/**
 * `locatorOf` DROPS a locator a fitness credit arrived carrying — the one fixture that can tell
 * its guard apart from an unconditional read.
 *
 * HOME: this pins the field-omission claim (@SCN-LDG-034, 3F-3407) — THE PHANTOM ROW'S KEY
 * SHAPE, one destination over from (@SCN-LDG-008)'s "a runtime credit's item names no check" arm
 * above. Fitness credits still exist and `locatorOf` still drops their locator exactly as this arm
 * proves — deleting it would remove live, mutation-motivated protection; leaving it uncited (the
 * state this arm sat in until now) would be a fabricated credit waiting to happen. HELPER-LEVEL
 * COVERAGE, not a literal restatement of that scenario's Gherkin: `citesUnknownScenarioReconciliationsOf`
 * is the SAME function its own `@integration` arm drives end to end (a fitness credit citing an
 * unknown scenario posts a `cites-unknown-scenario` item to the phantom row, carrying the check it
 * has a value for and no locator key) — this arm pins the same claim from inside the package,
 * where the width-subtyping construction below is available to state it precisely.
 *
 * TWO-HOP SHAPE RETIRED. The fixture used to carry `checkTag` alongside `staticCheck` — a route
 * that matched on both. `citesUnknownScenarioReconciliationsOf` matches on `staticCheck` alone
 * (`isStaticCheckObservation`, keyed off `qualityCheck` and the ABSENCE of `measured`), so
 * `checkTag` was dead weight on this fixture and is dropped.
 *
 * WHY NO INTERFACE NAMES THIS FIXTURE'S SHAPE, AND WHY THAT IS THE POINT. Neither fitness
 * observation names a `locator` AT ALL — not optional, absent: only `RuntimeEvidenceObservation`
 * has the field. So this credit cannot be written as a plain `GuardEvidenceObservation`, and every
 * type-legal fixture leaves `observation.locator` `undefined` at runtime, where the guard and an
 * unconditional `return observation.locator` agree exactly. Read from inside this package alone
 * the guard is unreachable, and pinning it would be theatre.
 *
 * It is reachable from OUTSIDE, which is the honest ground and a weaker one than "a lint
 * observation carrying a locator". `reconcile` and the observation union are on the published core
 * barrel, and TypeScript's width subtyping admits a richer object through a variable binding while
 * a JS consumer is unconstrained by the interface at all — so a fitness credit built by a caller
 * from a shape that also has a `locator` is a thing the published surface genuinely accepts. The
 * intersection annotation below STATES that: it is not a cast past the contract, it is the shape
 * an external caller may legally hand in. What the guard promises is that such a locator never
 * reaches the item, because a fitness credit is read from a target's config rather than a test
 * file and has no file to send a reader to (`locatorOf`'s own comment — "has no `locator` and
 * never will"). Without this example that promise is a comment, not a rule.
 *
 * `toStrictEqual` + `not.toHaveProperty`, for the reason the block above states: the mutant ADDS a
 * `locator` key, and `toEqual` — or reading `item.locator` and calling it undefined — cannot see
 * the difference between an absent key and one holding `undefined`.
 */
describe("[SCN-LDG-034] a fitness credit's item carries no locator, even when the credit carries one", () => {
  it("drops a locator a citing lint credit arrived with rather than stamping it on the item", () => {
    const guardWithLocator: GuardEvidenceObservation & { locator: string } = {
      qualityCheck: "lint",
      staticCheck: "lint:complexity",
      scnId: "SCN-ZZZ-009",
      exists: true,
      enforcedOverRealSource: true,
      locator: "packages/core/src/domain/fitnessChecks.ts",
    };
    const [item] = citesUnknownScenarioReconciliationsOf([guardWithLocator]);
    expect(item).toStrictEqual({
      qualityCheck: "lint",
      staticCheck: "lint:complexity",
      outcome: "cites-unknown-scenario",
      evidenceObservation: guardWithLocator,
    });
    // The credit still carries it — what is asserted is that the ITEM does not.
    expect(item).not.toHaveProperty("locator");
    expect(item!.evidenceObservation).toHaveProperty("locator");
  });
});

describe("[SCN-LDG-001] suspenseReconciliationsOf orders the suspense row's items", () => {
  const broken = credit("unit", "SCN-AAA-001", {
    broken: true,
    locator: "tests/broken.test.ts",
    message: "Failed to collect",
  });
  const uncited = credit("unit", null, { locator: "tests/orphan.test.ts" });
  const guard: GuardEvidenceObservation = {
    qualityCheck: "lint",
    staticCheck: "lint:nobody-asked",
    exists: true,
    enforcedOverRealSource: true,
  };

  /**
   * THE ORDER IS THE RULE — `broken` FIRST, whatever order the streams are handed in. This is the
   * assertion that was missing from the repo entirely: reordering the arms left every other test
   * green.
   */
  it("lists broken FIRST, then the uncited runtime credits, then the no-evidence-obligation static checks", () => {
    const items = suspenseReconciliationsOf([broken], [uncited], [guard]);
    expect(items.map((i) => i.outcome)).toEqual(["broken", "cites-no-scenario", "cites-no-scenario"]);
    expect(items[2]!.staticCheck).toBe("lint:nobody-asked");
  });

  /**
   * A broken item carries its WHERE-to-fix and WHAT-broke, and NO observation — a proof that never
   * ran is not an observed piece of evidence.
   */
  it("carries locator + message on a broken item, and no evidence observation", () => {
    const [item] = suspenseReconciliationsOf([broken], [], []);
    expect(item!.locator).toBe("tests/broken.test.ts");
    expect(item!.message).toBe("Failed to collect");
    expect(item!.evidenceObservation).toBeUndefined();
  });

  it("carries no locator on a no-evidence-obligation static check — a guard is read from config, not a test file", () => {
    const [item] = suspenseReconciliationsOf([], [], [guard]);
    expect(item!.locator).toBeUndefined();
    expect(item!.evidenceObservation).toBe(guard);
  });
});

/**
 * WHAT EACH SUSPENSE ARM OMITS (@SCN-LDG-007) — the other half of the arm above, which pins only
 * what an item CARRIES. The function's own rationale is that its three arms "carry different
 * payloads, each for a stated reason"; a payload whose ABSENCE nothing pins is a distinction the
 * suite cannot tell from an accident of assembly.
 *
 * `locator` and `message` are OPTIONAL on the observation, and each is spread CONDITIONALLY so the
 * key comes out absent rather than present-holding-undefined. `toEqual` cannot see that difference
 * — it reads `{ locator: undefined }` as `{}` — so an always-spread `locator` or `message` passed
 * every assertion above, `toBeUndefined()` included.
 *
 * WHO PRODUCES ONE. An absent `message` is a reader case outright: the vitest collection-failure
 * emit spreads `message` conditionally, so a runner reporting no message yields exactly this
 * observation. An absent `locator` is a CONTRACT case rather than a reader one — both of today's
 * readers always supply one (vitest falls back to `"(unknown vitest file)"`) — but `reconcile` is
 * on the core barrel and the field is documented as omitted by hand-built observations, so a
 * consumer constructing evidence directly is its producer.
 */
describe("[SCN-LDG-007] a suspense item omits the payload keys its observation has no value for", () => {
  it("omits BOTH the locator and the message key on a broken item that carries neither", () => {
    const silent = credit("unit", null, { broken: true, status: "failed" });
    const [item] = suspenseReconciliationsOf([silent], [], []);
    expect(item).toStrictEqual({ qualityCheck: "unit", outcome: "broken" });
    // Said twice on purpose: `toStrictEqual` reds an EXTRA key, `not.toHaveProperty` names WHICH
    // keys must be absent, so the intent survives a later rewrite of the object above.
    expect(item).not.toHaveProperty("locator");
    expect(item).not.toHaveProperty("message");
  });

  it("omits the locator key on an uncited runtime credit that came from no test file", () => {
    const anonymous = credit("integration", null);
    const [item] = suspenseReconciliationsOf([], [anonymous], []);
    expect(item).toStrictEqual({
      qualityCheck: "integration",
      outcome: "cites-no-scenario",
      evidenceObservation: anonymous,
    });
    expect(item).not.toHaveProperty("locator");
  });
});

describe("[SCN-LDG-001] qualityCheckReconciliationsOf degenerates a row to both-missing", () => {
  const anItem = (): QualityCheckReconciliation =>
    citesUnknownScenarioReconciliationsOf([credit("unit", "SCN-ZZZ-009")])[0]!;

  it("posts one both-missing item when the row reconciled to nothing on either side", () => {
    const items = qualityCheckReconciliationsOf([], [], []);
    expect(items.map((i) => i.outcome)).toEqual(["both-missing"]);
    // Blank on BOTH sides — neither a debit obligation nor a credit observation.
    expect(items[0]!.qualityCheck).toBeUndefined();
  });

  /**
   * THE PENDING CLAUSE (@SCN-PND-004) — an only-pending scenario reconciles to zero rows on both
   * sides and is NOT both-missing: it is balanced-with-pending.
   */
  it("does NOT degenerate when the row carries a Pending Item", () => {
    expect(qualityCheckReconciliationsOf([], [], [{ qualityCheck: "unit" }])).toEqual([]);
  });

  /**
   * @SCN-LDG-010, the twin — a zero-obligation scenario CITED by a stray credit already has a
   * no-evidence-obligation row, so it must fall through rather than post a degenerate item beside it. This is
   * why detection keys on rows-emitted, never on the obligation count.
   */
  it("does NOT degenerate when a no-evidence-obligation credit already produced a row", () => {
    const items = qualityCheckReconciliationsOf([], [anItem()], []);
    expect(items.map((i) => i.outcome)).toEqual(["cites-unknown-scenario"]);
  });
});

describe("[SCN-LDG-001] noScnCodeReconciliations builds the untagged row's debit-side item", () => {
  it("posts one scenario-scope no-scn-code item carrying a synthesised empty obligation", () => {
    const items = noScnCodeReconciliations();
    expect(items).toHaveLength(1);
    expect(items[0]!.outcome).toBe("no-scn-code");
    // SCENARIO-scope: with no code, no observation can link at ANY tier.
    expect(items[0]!.qualityCheck).toBeUndefined();
    // DEBIT-side (double-entry-manifesto line 39) — obligation exists, observation none.
    expect(items[0]!.evidenceObligation).toEqual({});
    expect(items[0]!.evidenceObservation).toBeUndefined();
  });
});
