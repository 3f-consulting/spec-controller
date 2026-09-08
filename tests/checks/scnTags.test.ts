/**
 * @SCN-STG-001 — the ONE planted-violation arm of the tier-tag floor engine (3F-3235 / 3F-3218).
 * One corpus carrying an instance of every kind this module detects and a passing row for every
 * route it admits, and ONE expect over the whole returned verdict — which pins detection, message,
 * offender and ORDER together, where the thirty arms this replaces each saw one row at a time.
 *
 * WHY @SCN-STG-001 AND NOT ONE OF THE SIX THIS FILE ALSO CREDITED. An arm credits exactly one
 * scenario, so one arm spends six citations, and the choice is the module's subject rather than a
 * preference: this file's whole verdict IS the tier-tag floor's — `scnTags.ts` names @SCN-STG-001
 * in its own header, the Feature is titled for the floor, and @SCN-STG-001's own Gherkin is the
 * whole-corpus shape ("it runs over a features tree ... it fails, naming the offending scenario").
 * The other six name ROUTES through that verdict, and every one of them is exercised below.
 *
 * SO @SCN-STG-005 IS SETTLED BY REMOVAL, WHICH 3F-3234 DEFERRED HERE. That code drew five `@unit`
 * observations from this file and none anywhere else once `lintScnTagsCli.test.ts` was cut down to
 * @SCN-STG-009 — measured with `parseVitestEvidenceObservations`, the reader `balance:self` uses.
 * With this arm citing @SCN-STG-001 it falls to zero, so its `@unit` tag comes off in the same
 * commit; its `@integration` tier and its cucumber evidence are untouched. The same holds for
 * @SCN-STG-002, -003, -004, -007 and -008. Nothing retires.
 *
 * THE REGISTRIES ARE INJECTED, NEVER HARD-CODED — the module holds no deferral tag and no check
 * tag of its own, so a corpus that stopped handing them in would prove something the check does not
 * claim. The two WITHHELD runs are what make that a measurement: byte-for-byte the same corpus with
 * one set emptied, and the rows that passed on the set's account go red. Without them, "the
 * injected set admitted this" and "the check stopped asking" look identical.
 *
 * THE REAL REPOSITORY IS NOT READ HERE, which is Ruling B rather than an omission: @SCN-FIT-008
 * runs `pnpm lint:scn-tags` over the real corpus on every CI run and every `pnpm verify`, and it
 * was proved to REACH this module — made to report a violation that is not there, the row reds.
 */

import { describe, expect, it } from "vitest";

import { lintScnTags, type ScnTagsViolation } from "./scnTags.js";

/** The target's PARKING set, as `resolveDeferralTags` hands it over — no member is this module's. */
const DEFERRALS = ["parked"];

/** The target's check registry, BARE — `typecheck` carries no prefix on purpose (3F-2495). */
const CHECKS = ["complexity", "typecheck"];

/**
 * One corpus, every rule. Fifteen rows: one breach of each kind the engine detects, one passing
 * row for each route it admits, and one scenario carrying no @SCN at all — which it must not look
 * at. Written as one feature so the verdict's ORDER is the file's order.
 */
const CORPUS = `@TGT
Feature: a planted corpus carrying one breach of every rule the tier floor enforces

  @unit @SCN-TGT-001
  Scenario: it names a tier by the ordinary route
    Given the target source

  @integrationpending @SCN-TGT-002
  Scenario: it names a tier by the pending variant, deferred
    Given the target source

  @lint @SCN-TGT-003
  Scenario: it names the bare style-lint check
    Given the target source

  @unit @parked @SCN-TGT-004
  Scenario: a tiered scenario also carrying the deferral tag the target configured
    Given the target source

  @SCN-TGT-005
  Scenario: it names no tier and is not parked
    Given the target source

  @lint=lint:scn-tags @SCN-TGT-006
  Scenario: it spells the retired guard-named lint form
    Given the target source

  @unit @untit @SCN-TGT-007
  Scenario: it names a tier and carries a typo beside it
    Given the target source

  @unit @wibble @SCN-TGT-008
  Scenario: it carries a tag that resembles no tier at all
    Given the target source

  @unit @fitness=complexity @SCN-TGT-009
  Scenario: it spells the group into a check tag
    Given the target source

  @complexity @SCN-TGT-010
  Scenario: a stepped scenario naming its check and no tier
    Given the target source

  @typecheck @SCN-TGT-011
  Scenario: a stepless scenario naming its check

  @complexity @typecheck @SCN-TGT-012
  Scenario: an unparked scenario claiming two checks
    Given the target source

  @parked @SCN-TGT-013
  Scenario: a tier-less scenario the target has parked
    Given the target source

  @parked @untit @complexity @typecheck @SCN-TGT-014
  Scenario: a parked scenario claiming two checks with a typo beside them
    Given the target source

  Scenario: a scenario carrying no @SCN id at all
    Given the target source
`;

const FEATURES = [{ slug: "planted", source: CORPUS }];

/**
 * A withheld run's findings as `<kind> <offender>`. The MESSAGES are already pinned verbatim by
 * the resolved verdict below; what a withheld run has to say is WHICH rows stop being admitted,
 * and saying it in one line per finding keeps that legible.
 */
const offenders = (violations: readonly ScnTagsViolation[]): string[] =>
  violations.map((v) => `${v.kind} ${/@SCN-TGT-\d+/.exec(v.message)?.[0] ?? "(unnamed)"}`);

describe("[SCN-STG-001] the scn-tags tier-tag floor over an injected corpus, whole verdict", () => {
  it("[SCN-STG-001] names every offender in the planted corpus and admits every legitimate route through it — then stops admitting the rows the withheld registry was carrying", () => {
    expect({
      resolved: lintScnTags(FEATURES, DEFERRALS, CHECKS),
      withNoDeferralsInjected: offenders(lintScnTags(FEATURES, [], CHECKS).violations),
      withNoChecksInjected: offenders(lintScnTags(FEATURES, DEFERRALS, []).violations),
    }).toEqual({
      resolved: {
        ok: false,
        violations: [
          {
            kind: "missing-tier-tag",
            message:
              'Feature "planted" scenario @SCN-TGT-005 ("it names no tier and is not parked") ' +
              "names no evidence tier and is not parked — every @SCN scenario must name at " +
              "least one tier (@unit/@integration/@e2e/@performance, a <tier>pending variant, " +
              "or @lint=<guard>), or a word that names a check here, unless it carries one of " +
              "the deferral tags this target configures.",
          },
          {
            kind: "unrecognised-tag",
            message:
              'Feature "planted" scenario @SCN-TGT-006 ("it spells the retired guard-named ' +
              'lint form") carries @lint=lint:scn-tags, which spells a group into the tag — a ' +
              "check is named bare, its group living in the model — so this should have been " +
              "@lint:scn-tags",
          },
          {
            kind: "missing-tier-tag",
            message:
              'Feature "planted" scenario @SCN-TGT-006 ("it spells the retired guard-named ' +
              'lint form") names no evidence tier and is not parked — every @SCN scenario must ' +
              "name at least one tier (@unit/@integration/@e2e/@performance, a <tier>pending " +
              "variant, or @lint=<guard>), or a word that names a check here, unless it " +
              "carries one of the deferral tags this target configures.",
          },
          {
            kind: "unrecognised-tag",
            message:
              'Feature "planted" scenario @SCN-TGT-007 ("it names a tier and carries a typo ' +
              'beside it") carries @untit, which is neither an evidence tier nor a recognised ' +
              "deferral tag — did you mean @unit?",
          },
          {
            kind: "unrecognised-tag",
            message:
              'Feature "planted" scenario @SCN-TGT-008 ("it carries a tag that resembles no ' +
              'tier at all") carries @wibble, which is neither an evidence tier nor a ' +
              "recognised deferral tag",
          },
          {
            kind: "unrecognised-tag",
            message:
              'Feature "planted" scenario @SCN-TGT-009 ("it spells the group into a check ' +
              'tag") carries @fitness=complexity, which spells a group into the tag — a check ' +
              "is named bare, its group living in the model — so this should have been " +
              "@complexity",
          },
          {
            kind: "multiple-check-tags",
            message:
              'Feature "planted" scenario @SCN-TGT-012 ("an unparked scenario claiming two ' +
              'checks") carries 2 check tags — @complexity, @typecheck — but a fitness ' +
              "scenario names ONE check: one run is one credit, and a scenario claiming two " +
              "owes evidence it cannot tell apart. Split it into one scenario per check.",
          },
          {
            kind: "unrecognised-tag",
            message:
              'Feature "planted" scenario @SCN-TGT-014 ("a parked scenario claiming two checks ' +
              'with a typo beside them") carries @untit, which is neither an evidence tier nor ' +
              "a recognised deferral tag — did you mean @unit?",
          },
        ],
      },
      // `parked` withheld: it is no longer grammar (TGT-004, -013, -014 each gain an
      // unrecognised finding) and no longer a skip — so TGT-013's floor and TGT-014's
      // one-check rule, both silent above, fire.
      withNoDeferralsInjected: [
        "unrecognised-tag @SCN-TGT-004",
        "missing-tier-tag @SCN-TGT-005",
        "unrecognised-tag @SCN-TGT-006",
        "missing-tier-tag @SCN-TGT-006",
        "unrecognised-tag @SCN-TGT-007",
        "unrecognised-tag @SCN-TGT-008",
        "unrecognised-tag @SCN-TGT-009",
        "multiple-check-tags @SCN-TGT-012",
        "unrecognised-tag @SCN-TGT-013",
        "missing-tier-tag @SCN-TGT-013",
        "unrecognised-tag @SCN-TGT-014",
        "unrecognised-tag @SCN-TGT-014",
        "multiple-check-tags @SCN-TGT-014",
      ],
      // The registry withheld: `complexity` and `typecheck` name nothing, so the rows that
      // satisfied the floor by their check tag (TGT-010, -011) red twice each, TGT-012's pair
      // stops being two checks and becomes two meaningless words, and TGT-014 — still parked —
      // reds three times on grammar alone.
      withNoChecksInjected: [
        "missing-tier-tag @SCN-TGT-005",
        "unrecognised-tag @SCN-TGT-006",
        "missing-tier-tag @SCN-TGT-006",
        "unrecognised-tag @SCN-TGT-007",
        "unrecognised-tag @SCN-TGT-008",
        "unrecognised-tag @SCN-TGT-009",
        "unrecognised-tag @SCN-TGT-010",
        "missing-tier-tag @SCN-TGT-010",
        "unrecognised-tag @SCN-TGT-011",
        "missing-tier-tag @SCN-TGT-011",
        "unrecognised-tag @SCN-TGT-012",
        "unrecognised-tag @SCN-TGT-012",
        "missing-tier-tag @SCN-TGT-012",
        "unrecognised-tag @SCN-TGT-014",
        "unrecognised-tag @SCN-TGT-014",
        "unrecognised-tag @SCN-TGT-014",
      ],
    });
  });
});
