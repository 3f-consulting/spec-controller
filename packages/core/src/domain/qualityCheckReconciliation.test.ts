import { describe, it, expect } from "vitest";
import { everyOutcomeCorpusJson } from "../assemble/everyOutcomeCorpus.test-utils.js";
import { claimReconciliationsOf } from "../assemble/reportClaimReconciliations.test-utils.js";
import {
  reconcileEvidenceObligation,
  makeQualityCheckReconciliation,
  OUTCOME_SIDE_PROFILE,
} from "./qualityCheckReconciliation.js";
import type { Outcome, QualityCheckReconciliation, ReconciledEvidenceObligation, ReconciledEvidenceObservation, SidePresence } from "./qualityCheckReconciliation.js";
import { linesOf, type ReconciliationLine } from "./claimReconciliation.js";
import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
import { QualityCheckReconciliationFault } from "./qualityCheckReconciliationFault.js";
import type { EvidenceObligation, EvidenceObservation } from "./journal.js";

describe("[CLM-LDG-026] a Quality Check Reconciliation carries the evidence obligation it reconciles (the debit side)", () => {
  it("a missing behavioural reconciliation is its kind of quality check, its evidence obligation and the missing outcome, with no observation list", () => {
    const obligation: EvidenceObligation = { qualityCheckKind: "unit" };
    const reconciliation = reconcileEvidenceObligation("CLM-LDG-026", obligation, []);

    expect(reconciliation).toStrictEqual({
      qualityCheckKind: "unit",
      outcome: "missing",
      evidenceObligation: obligation,
    });
  });
});

describe("[CLM-LDG-028] a fitness missing reconciliation carries its obligation and no observation — an absent guard is an absence", () => {
  it("a fitness missing reconciliation is the fitness kind of quality check, its evidence obligation and the missing outcome, with no observation list", () => {
    const obligation: EvidenceObligation = { qualityCheckKind: "fitness" };
    const absentGuard: EvidenceObservation = {
      qualityCheckKind: "fitness",
      fitnessFunction: "lint:absent-guard",
      exists: false,
      enforcedOverRealSource: false,
    };
    const reconciliation = reconcileEvidenceObligation("CLM-LDG-028", obligation, [absentGuard]);

    expect(reconciliation).toStrictEqual({
      qualityCheckKind: "fitness",
      outcome: "missing",
      evidenceObligation: obligation,
    });
  });
});

interface Refusal {
  readonly refused: boolean;
  readonly fault: QualityCheckFault | undefined;
}

function attemptMint(mint: () => unknown): Refusal {
  try {
    mint();
    return { refused: false, fault: undefined };
  } catch (thrown) {
    return { refused: true, fault: (thrown as { fault?: QualityCheckFault }).fault };
  }
}

type OutcomeSides = (typeof OUTCOME_SIDE_PROFILE)[Outcome];

function flipped(presence: SidePresence): SidePresence {
  switch (presence) {
    case "Exists":
      return "None";
    case "None":
      return "Exists";
    default: {
      const outsideTheType: never = presence;
      throw new Error(`not a side-presence: ${JSON.stringify(outsideTheType)}`);
    }
  }
}

type Fields = Parameters<typeof makeQualityCheckReconciliation>[0];

const sampleObligation: ReconciledEvidenceObligation = { qualityCheckKind: "unit" };

function observationLine(outcome: Outcome, ran: boolean): ReconciledEvidenceObservation {
  return { qualityCheckKind: "unit", claimCode: "CLM-LDG-030", status: "passed", ...(ran ? {} : { neverRan: true as const }), outcome };
}

/** The outcomes only an evidence observation's line reads; a reconciliation's own outcome is never one of them. */
const OBSERVATION_LINE_OUTCOMES: readonly Outcome[] = [
  "satisfied",
  "failing",
  "cannot-fail",
  "cites-unknown-claim",
  "cites-no-claim",
  "not-asked-for",
  "never-ran",
];

/** The outcomes an evidence obligation's own line reads when no evidence observation that ran answers it. */
const OBLIGATION_LINE_OUTCOMES: readonly Outcome[] = ["missing", "no-quality-check", "no-claim-code", "duplicate-claim-code"];

function isObligationsOwnLine(profile: OutcomeSides): boolean {
  return profile.observation === "None";
}

function obligationSide(presence: SidePresence): Pick<Fields, "evidenceObligation"> {
  return presence === "Exists" ? { evidenceObligation: sampleObligation } : {};
}

/** A reconciliation holding one line of the outcome, its sides as the outcome's definition requires. */
function lineAsDefined(outcome: Outcome, profile: OutcomeSides): Fields {
  if (isObligationsOwnLine(profile)) return { outcome, ...obligationSide(profile.obligation) };
  return { ...obligationSide(profile.obligation), evidenceObservations: [observationLine(outcome, outcome !== "never-ran")] };
}

/** The same line with its obligation side flipped: an observation's line carries the obligation exactly when it ran against one. */
function lineWithObligationFlipped(outcome: Outcome, profile: OutcomeSides): Fields {
  const flippedObligation = obligationSide(flipped(profile.obligation));
  if (isObligationsOwnLine(profile)) return { outcome, ...flippedObligation };
  return { ...flippedObligation, evidenceObservations: [observationLine(outcome, true)] };
}

/** The same line with its observation side flipped: the obligation's own line answered by an observation that ran, or an observation's outcome on the obligation's own line. */
function lineWithObservationFlipped(outcome: Outcome, profile: OutcomeSides): Fields {
  if (!isObligationsOwnLine(profile)) return { outcome, ...obligationSide(profile.obligation) };
  const answering: Outcome = profile.obligation === "Exists" ? "satisfied" : "not-asked-for";
  return { outcome, ...obligationSide(profile.obligation), evidenceObservations: [observationLine(answering, true)] };
}

function expectUnconstructibleBesideAnObservationThatRan(outcome: Outcome): void {
  const profile = OUTCOME_SIDE_PROFILE[outcome];
  const answering: Outcome = profile.obligation === "Exists" ? "satisfied" : "not-asked-for";

  expect(() =>
    makeQualityCheckReconciliation({
      outcome,
      ...obligationSide(profile.obligation),
      evidenceObservations: [observationLine(answering, true)],
    })
  ).toThrow(QualityCheckReconciliationFault);
}

function sidesOf(line: ReconciliationLine): [Outcome, SidePresence, SidePresence] {
  return [
    line.outcome,
    line.evidenceObligation === undefined ? "None" : "Exists",
    line.evidenceObservation === undefined ? "None" : "Exists",
  ];
}

/** Every Reconciliation line of the JSON report the every-outcome corpus emits, read back through the domain's own reader. */
function corpusReportLines(): ReconciliationLine[] {
  const rows = claimReconciliationsOf<{ readonly qualityCheckReconciliations: readonly QualityCheckReconciliation[] }>(JSON.parse(everyOutcomeCorpusJson()));
  return rows.flatMap((row) => row.qualityCheckReconciliations.flatMap(linesOf));
}

describe("[CLM-LDG-030] every Reconciliation line's sides match its outcome's definition, a divergent pair is unconstructible, and the emitted report agrees", () => {
  for (const [outcomeKey, profile] of Object.entries(OUTCOME_SIDE_PROFILE)) {
    const outcome = outcomeKey as Outcome;

    it(`${outcome}: a line with the sides its definition requires constructs, and reads back with exactly those sides`, () => {
      const lines = linesOf(makeQualityCheckReconciliation(lineAsDefined(outcome, profile)));

      expect(lines.map(sidesOf)).toStrictEqual([[outcome, profile.obligation, profile.observation]]);
    });

    it(`${outcome}: a line with its obligation side flipped is unconstructible — refused with the obligation-side code and the whole divergence`, () => {
      const refusal = attemptMint(() => makeQualityCheckReconciliation(lineWithObligationFlipped(outcome, profile)));

      expect(refusal.refused).toBe(true);
      expect(refusal.fault).toStrictEqual({
        code: QualityCheckFaultCode.EvidenceDivergesFromOutcome,
        evidence: "evidence-obligation",
        outcome,
        presenceForOutcome: profile.obligation,
        presenceFound: flipped(profile.obligation),
      });
    });

    it(`${outcome}: a line with its observation side flipped is unconstructible — refused with the observation-side code and the whole divergence`, () => {
      const refusal = attemptMint(() => makeQualityCheckReconciliation(lineWithObservationFlipped(outcome, profile)));

      expect(refusal.refused).toBe(true);
      expect(refusal.fault).toStrictEqual({
        code: QualityCheckFaultCode.EvidenceDivergesFromOutcome,
        evidence: "evidence-observation",
        outcome,
        presenceForOutcome: profile.observation,
        presenceFound: flipped(profile.observation),
      });
    });
  }

  it("the observation-line and obligation-line outcomes are every outcome, each once", () => {
    expect([...OBSERVATION_LINE_OUTCOMES, ...OBLIGATION_LINE_OUTCOMES].sort()).toStrictEqual(Object.keys(OUTCOME_SIDE_PROFILE).sort());
  });

  for (const outcome of OBSERVATION_LINE_OUTCOMES) {
    it(`${outcome}: a reconciliation carrying an observation line's outcome as its own is unconstructible, with no observation beside it`, () => {
      const profile = OUTCOME_SIDE_PROFILE[outcome];

      expect(() => makeQualityCheckReconciliation({ outcome, ...obligationSide(profile.obligation) })).toThrow(
        QualityCheckReconciliationFault
      );
    });

    it(`${outcome}: a reconciliation carrying an observation line's outcome as its own is unconstructible beside an observation that ran`, () => {
      expectUnconstructibleBesideAnObservationThatRan(outcome);
    });
  }

  for (const outcome of OBLIGATION_LINE_OUTCOMES) {
    it(`${outcome}: a reconciliation carrying it as its own outcome is unconstructible beside an observation that ran`, () => {
      expectUnconstructibleBesideAnObservationThatRan(outcome);
    });
  }

  it("every line of the JSON report the every-outcome corpus emits carries the sides its outcome's definition requires", () => {
    const lines = corpusReportLines();

    expect(lines.map(sidesOf)).toStrictEqual(
      lines.map((line) => [line.outcome, OUTCOME_SIDE_PROFILE[line.outcome].obligation, OUTCOME_SIDE_PROFILE[line.outcome].observation])
    );
  });

  it("the JSON report the every-outcome corpus emits holds a line of every outcome", () => {
    const outcomes = new Set(corpusReportLines().map((line) => line.outcome));

    expect([...outcomes].sort()).toStrictEqual(Object.keys(OUTCOME_SIDE_PROFILE).sort());
  });
});

describe("[CLM-LDG-035] a fitness-function evidence observation discharges only the obligation on the row whose claim code it cites", () => {
  it("two rows share one checkTag; the cited row is satisfied and the other stays missing", () => {
    const obligation: EvidenceObligation = { qualityCheckKind: "fitness" };
    const observation: EvidenceObservation = {
      qualityCheckKind: "fitness",
      fitnessFunction: "lint:complexity",
      claimCode: "CLM-AAA-001",
      exists: true,
      enforcedOverRealSource: true,
    };

    const cited = reconcileEvidenceObligation("CLM-AAA-001", obligation, [observation]);
    const other = reconcileEvidenceObligation("CLM-AAA-002", obligation, [observation]);

    expect(cited).not.toHaveProperty("outcome");
    expect(cited.evidenceObservations).toEqual([{ ...observation, outcome: "satisfied" }]);

    expect(other.outcome).toBe("missing");
    expect(other.evidenceObservations).toBeUndefined();
  });
});
