import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger } from "../model.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation, Summary } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

let ledger: Ledger;
beforeEach(() => {
  ledger = reconcile(
    [{ scnId: "SCN-USG-025", evidenceObligations: [{ qualityCheck: "unit" }] }],
    [{ qualityCheck: "unit", scnId: "SCN-USG-025", status: "passed" }],
  );
});

const ctx: RunContext = {
  target: "config-target",
  inputs: [{ ...FEATURES, path: "features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, { ...PACKAGE_JSON, path: "package.json" }, CI_STEPS],
  corpus: "features",
  runStart: new Date("2026-09-28T12:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const render = (extra: Partial<Summary>): string => {
  const er: EvidenceReconciliation = { summary: { ...summaryOf(ledger, false, false), ...extra }, ledger };
  return renderMarkdown(er, ctx, publishedExitCodeOf);
};

const heading = CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading];

const section = (md: string): string[] => {
  const lines = md.split("\n");
  const start = lines.indexOf(heading);
  if (start === -1) return [];
  const end = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  return lines.slice(start, end);
};

describe("[SCN-RPT-045] the report names a specController entry of a kind its reader does not take", () => {
  it("renders one line per entry, after the run provenance and before any cut of the reconciliation", () => {
    const md = render({
      configurationOfWrongKind: [
        { entry: "specController.notChecks", is: "string", reads: "list" },
        { entry: "specController.runners.unit", is: "number", reads: "string-or-null" },
      ],
    });
    expect(section(md)).toEqual([
      heading,
      "",
      "The target's package.json holds configuration this run could not use. Each entry below was read as absent, and every account in this report is the one the target gives without it.",
      "",
      "- `specController.notChecks` is a string where a list is read, so this run read it as absent.",
      "- `specController.runners.unit` is a number where a string or null is read, so this run read it as absent.",
      "",
    ]);
    expect(md.indexOf("## Run provenance")).toBeLessThan(md.indexOf(heading));
    expect(md.indexOf(heading)).toBeLessThan(md.indexOf("## Summary views"));
  });
});

describe("[SCN-RPT-046] the report names a key the specController block does not read, in one sentence for every key", () => {
  it("names each unread key after the entries of the wrong kind", () => {
    const md = render({
      configurationOfWrongKind: [{ entry: "specController.notChecks", is: "string", reads: "list" }],
      configurationKeysNotRead: ["fitnessChecks", "zzz"],
    });
    expect(section(md).filter((l) => l.startsWith("- "))).toEqual([
      "- `specController.notChecks` is a string where a list is read, so this run read it as absent.",
      "- `specController.fitnessChecks` is not a key the specController block reads, so this run read nothing from it.",
      "- `specController.zzz` is not a key the specController block reads, so this run read nothing from it.",
    ]);
  });
});
