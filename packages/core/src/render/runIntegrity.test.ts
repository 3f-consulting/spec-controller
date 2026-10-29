import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { makeQualityCheckReconciliation, OUTCOME_SIDE_PROFILE, UNNAMED_CLAIM_ID } from "../model.js";
import type {
  ClaimKind,
  ClaimReconciliation,
  EvidenceObservation,
  Ledger,
  QualityCheckReconciliation,
} from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const ctx: RunContext = {
  target: "run-integrity-target",
  inputs: [{ ...FEATURES, path: "specs/features" }, { ...VITEST, path: "vitest-report.json" }, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "specs/features",
  runStart: new Date("2026-10-05T17:00:00.000Z"),
  sourceSha: "4084f00dc0ffeeba110000000000000000deadbe",
  toolSha: "4084aaaa71ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const COLLECTION_FAILED_LOCATOR = "src/collect.test.ts";
const COLLECTION_FAILED_MESSAGE = "  \n\t\nError:  Cannot   find | package\n    at packageResolve (node:internal)";

const collectionFailed = (locator: string, message?: string): EvidenceObservation => ({
  qualityCheck: "unit",
  scnId: null,
  status: "failed",
  locator,
  broken: true,
  ...(message !== undefined ? { message } : {}),
});

const SKIPPED_CHECK: EvidenceObservation = {
  qualityCheck: "fitness",
  fitnessFunction: "SCN-RIN-001",
  scnId: "SCN-RIN-001",
  exists: false,
  enforcedOverRealSource: false,
  broken: true,
  notes: [{ kind: "check-step-did-not-run", code: "SCN-RIN-001", outcome: "skipped" }],
};

function itemOf(
  fields: Parameters<typeof makeQualityCheckReconciliation>[0],
  observation: EvidenceObservation,
): QualityCheckReconciliation {
  return makeQualityCheckReconciliation({
    ...fields,
    ...(OUTCOME_SIDE_PROFILE[fields.outcome].observation === "Exists" ? { evidenceObservation: observation } : {}),
  });
}

function brokenItemOf(observation: EvidenceObservation): QualityCheckReconciliation {
  return itemOf(
    {
      qualityCheck: observation.qualityCheck,
      outcome: "broken",
      ...(observation.locator !== undefined ? { locator: observation.locator } : {}),
      ...(observation.message !== undefined ? { message: observation.message } : {}),
      ...(observation.notes !== undefined ? { notes: observation.notes } : {}),
    },
    observation,
  );
}

function claimOf(
  scnId: string,
  kind: ClaimKind,
  items: readonly QualityCheckReconciliation[],
  observations: readonly EvidenceObservation[] = [],
): ClaimReconciliation {
  return {
    scnId,
    kind,
    verdict: "out-of-balance",
    evidenceObservations: observations,
    evidenceObligations: items.flatMap((item) => (item.evidenceObligation !== undefined ? [item.evidenceObligation] : [])),
    qualityCheckReconciliations: items,
    reconcilingItems: items,
    pendingItems: [],
  };
}

const missingClaimOf = (scnId: string, qualityCheck: "unit" | "fitness"): ClaimReconciliation =>
  claimOf(scnId, "scenario", [
    makeQualityCheckReconciliation({ qualityCheck, outcome: "missing", evidenceObligation: { qualityCheck } }),
  ]);

function render(...broken: readonly EvidenceObservation[]): string {
  const ledger: Ledger = {
    claimReconciliations: [
      missingClaimOf("SCN-RIN-001", "fitness"),
      missingClaimOf("SCN-RIN-002", "unit"),
      claimOf(UNNAMED_CLAIM_ID, "unnamed-claim", broken.map(brokenItemOf), broken),
    ],
  };
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false, false), ledger };
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf);
}

function runIntegrityLines(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(CORE_MESSAGES[CoreMessage.RunIntegrityHeading]);
  const end = lines.indexOf(CORE_MESSAGES[CoreMessage.SummaryViewsHeading]);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return lines.slice(start, end);
}

function unnamedClaimCell(md: string): string {
  const lines = md.split("\n");
  const header = lines.indexOf(CORE_MESSAGES[CoreMessage.LedgerTableHeader]);
  expect(header).toBeGreaterThanOrEqual(0);
  const rows = lines.slice(header + 2).filter((line) => line.startsWith("| (unnamed claim) | "));
  expect(rows).toHaveLength(1);
  return rows[0]!.slice(2, -2).split(" | ")[2]!;
}

const whatBroke = (locator: string): string =>
  `- ${CORE_MESSAGES[CoreMessage.BrokenEvidenceWhatBroke](`\`${locator}\``)}`;

const brokenCell = (qualityCheck: string, where: string): string =>
  `${qualityCheck}: ${OUTCOME_DESCRIPTION.broken} (${where})`;

const unsoundStamp = (proofs: string): string =>
  `**This run is unsound.** ${proofs} A row reading "Evidence Observation is missing" below may therefore be a ` +
  'BROKEN proof rather than an absent one — it cannot be read as "write the test", because the test may ' +
  "already be there. Fix the harness and regenerate.";

describe("[SCN-RPT-021] the markdown names the broken evidence and its error, and stamps the run unsound", () => {
  let checkDidNotRun: string;
  beforeEach(() => {
    checkDidNotRun = CORE_MESSAGES[CoreMessage.CheckStepSkipped]("SCN-RIN-001");
  });

  it("one broken evidence: the stamp counts one proof, then names its file and prints its error verbatim, each block followed by a blank line", () => {
    const md = render(collectionFailed(COLLECTION_FAILED_LOCATOR, COLLECTION_FAILED_MESSAGE));
    expect(runIntegrityLines(md)).toEqual([
      CORE_MESSAGES[CoreMessage.RunIntegrityHeading],
      "",
      unsoundStamp(CORE_MESSAGES[CoreMessage.OneProofNeverRan]),
      "",
      whatBroke(COLLECTION_FAILED_LOCATOR),
      "",
      "```text",
      ...COLLECTION_FAILED_MESSAGE.split("\n"),
      "```",
      "",
    ]);
  });

  it("two broken evidences: the stamp counts them in the plural, and the one the runner did not name is listed as unnamed", () => {
    const md = render(collectionFailed(COLLECTION_FAILED_LOCATOR, COLLECTION_FAILED_MESSAGE), SKIPPED_CHECK);
    expect(runIntegrityLines(md)).toEqual([
      CORE_MESSAGES[CoreMessage.RunIntegrityHeading],
      "",
      unsoundStamp(CORE_MESSAGES[CoreMessage.ProofsNeverRan](2)),
      "",
      whatBroke(COLLECTION_FAILED_LOCATOR),
      "",
      "```text",
      ...COLLECTION_FAILED_MESSAGE.split("\n"),
      "```",
      "",
      whatBroke(CORE_MESSAGES[CoreMessage.BrokenEvidenceNotNamed]),
      "",
      "```text",
      checkDidNotRun,
      "```",
      "",
    ]);
  });

  it("the unnamed claim's row headlines each broken item by its error's first non-blank line, whitespace collapsed and the cell's pipe escaped", () => {
    const md = render(collectionFailed(COLLECTION_FAILED_LOCATOR, COLLECTION_FAILED_MESSAGE), SKIPPED_CHECK);
    expect(unnamedClaimCell(md)).toBe(
      [
        brokenCell("unit", `${COLLECTION_FAILED_LOCATOR}: Error: Cannot find \\| package`),
        brokenCell("fitness", checkDidNotRun),
      ].join("; "),
    );
  });

  it("the unnamed claim's row trims a broken file's locator that begins with a space, when the runner reports no error", () => {
    const md = render(collectionFailed(" spaced/collect.test.ts"));
    expect(unnamedClaimCell(md)).toBe(brokenCell("unit", "spaced/collect.test.ts"));
  });
});
