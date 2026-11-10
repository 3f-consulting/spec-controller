import { describe, expect, it } from "vitest";
import { renderJson, renderMarkdown, type EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { writeReports } from "./writer.js";
import type { IdentifiedInput } from "./format.js";
import { settlingRefusal } from "../../outputLocation.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "../../programOutput.test-utils.js";

const RUN: EvidenceReconciliation = {
  claimReconciliations: [],
  runVerdict: { verdict: "not-reconciled", why: "nothing-to-reconcile" },
  totals: {
    claimReconciliations: { total: 0, balanced: 0, outOfBalance: 0 },
    qualityCheckReconciliations: { total: 0, outOfBalance: 0, byOutcome: [], missingByKind: [] },
    evidenceObservations: { total: 0, byKind: [], onExecutableClaim: 0, onPhantomClaim: 0, onUnnamedClaim: 0, fitnessFunctionsRan: 0 },
    excludedClaimCodeOccurrences: 0,
  },
  provenance: { target: "acme/widgets", sourceSha: "unknown", toolVersion: "0.2.0", inputs: [] },
};

recordWhatTheProgramWrites();

function reportsWritten(formatSpecs: readonly string[], inputs: readonly IdentifiedInput[] = []): Written {
  settlingRefusal(() => {
    writeReports(formatSpecs, RUN, inputs);
    return true;
  }, false);
  return whatTheProgramWrote();
}

describe("you will get the report format you named", () => {
  it.each([
    ["CLM-FMT-001", "no format", [], "md"],
    ["CLM-FMT-014", "md", ["md"], "md"],
    ["CLM-FMT-015", "json", ["json"], "json"],
  ] as const)("[%s] asking for %s gives that report", (_clm, _format, formatSpecs, report) => {
    expect(reportsWritten(formatSpecs).stdout).toBe(report === "md" ? renderMarkdown(RUN) : renderJson(RUN));
  });
});
