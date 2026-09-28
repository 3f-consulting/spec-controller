import { describe, it, expect } from "vitest";
import { renderMarkdown, renderReportFromJson } from "./markdown.js";
import { renderJson } from "./json.js";
import type { Ledger } from "../model.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation, Summary } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";

const ledger: Ledger = reconcile(
  [{ scnId: "SCN-USG-025", evidenceObligations: [{ qualityCheck: "unit" }] }],
  [{ qualityCheck: "unit", scnId: "SCN-USG-025", status: "passed" }],
);

const ctx: RunContext = {
  target: "config-target",
  inputs: { features: "features", packageJson: "package.json" },
  runStart: new Date("2026-09-28T12:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const render = (extra: Partial<Summary>): string => {
  const er: EvidenceReconciliation = { summary: { ...summaryOf(ledger, false, false), ...extra }, ledger };
  return renderMarkdown(er, ctx);
};

const section = (md: string): string[] => {
  const lines = md.split("\n");
  const start = lines.indexOf("## Configuration not read");
  if (start === -1) return [];
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  return lines.slice(start, end);
};

describe("[SCN-USG-025] the report names a specController entry of a kind its reader does not take", () => {
  it("renders one line per entry, after the run provenance and before any cut of the reconciliation", () => {
    const md = render({
      wrongKindConfiguration: [
        { entry: "specController.notChecks", is: "a string", reads: "a list" },
        { entry: "specController.runners.unit", is: "a number", reads: "a string or null" },
      ],
    });
    expect(section(md)).toEqual([
      "## Configuration not read",
      "",
      "The target's package.json holds configuration this run could not use. Each entry below was read as absent, and every account in this report is the one the target gives without it.",
      "",
      "- `specController.notChecks` is a string where a list is read, so this run read it as absent.",
      "- `specController.runners.unit` is a number where a string or null is read, so this run read it as absent.",
      "",
    ]);
    expect(md.indexOf("## Run provenance")).toBeLessThan(md.indexOf("## Configuration not read"));
    expect(md.indexOf("## Configuration not read")).toBeLessThan(md.indexOf("## Summary views"));
  });

  it("renders nothing when every entry was read", () => {
    expect(render({})).not.toContain("## Configuration not read");
    expect(render({})).toBe(render({ wrongKindConfiguration: undefined }));
  });
});

describe("[SCN-USG-028] the report names a key the specController block does not read, in one sentence for every key", () => {
  const line = (key: string) => section(render({ unknownConfigurationKeys: [key] })).filter((l) => l.startsWith("- "));

  it("names each unread key after the entries of the wrong kind", () => {
    const md = render({
      wrongKindConfiguration: [{ entry: "specController.notChecks", is: "a string", reads: "a list" }],
      unknownConfigurationKeys: ["fitnessChecks", "zzz"],
    });
    expect(section(md).filter((l) => l.startsWith("- "))).toEqual([
      "- `specController.notChecks` is a string where a list is read, so this run read it as absent.",
      "- `specController.fitnessChecks` is not a key the specController block reads, so this run read nothing from it.",
      "- `specController.zzz` is not a key the specController block reads, so this run read nothing from it.",
    ]);
  });

  it("says of a retired key exactly what it says of an invented one", () => {
    const template = (key: string) => line(key).map((l) => l.replaceAll(key, "<key>"));
    expect(template("fitnessChecks")).toEqual(template("zzz"));
    expect(template("staticChecks")).toEqual(template("zzz"));
    expect(template("zzz")).toHaveLength(1);
  });

  it("renders the section for unread keys alone", () => {
    expect(section(render({ unknownConfigurationKeys: ["notCheck"] }))[0]).toBe("## Configuration not read");
  });
});

describe("[SCN-USG-027] a saved run re-rendered names the same specController entries its live report named", () => {
  it("carries the entries in the saved reconciliation, so the re-render names them with no manifest to read", () => {
    const summary: Partial<Summary> = {
      wrongKindConfiguration: [{ entry: "specController.notChecks", is: "a string", reads: "a list" }],
      unknownConfigurationKeys: ["fitnessChecks"],
    };
    const er: EvidenceReconciliation = { summary: { ...summaryOf(ledger, false, false), ...summary }, ledger };
    const live = section(renderMarkdown(er, ctx));
    expect(live).toHaveLength(7);
    expect(section(renderReportFromJson(renderJson(er, ctx)))).toEqual(live);
  });
});
