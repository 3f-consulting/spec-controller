import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { __er as er } from "../evidenceReconciliation.test-utils.js";
import type { RunContext, RunInputs } from "../domain/runProvenance.js";
import { handedInputs } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { provenanceInputsView } from "./provenanceFacts.js";

const notSupplied = (flags: string): string => `- ${coreMessage(CoreMessage.ProvenanceNotSupplied, { flags })}`;

let balance: Ledger;
beforeEach(() => {
  balance = reconcile(
    [{ claimCode: "CLM-RPT-028", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
    [{ qualityCheckKind: "unit", claimCode: "CLM-RPT-028", status: "passed" }],
  );
});

const handed = (inputs: RunInputs): RunContext => ({
  target: "partly-handed-target",
  inputs: handedInputs(inputs),
  corpus: "features",
  runStart: new Date("2026-09-06T15:30:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
});

const notSuppliedLine = (md: string): string | null =>
  md.split("\n").find((line) => line.startsWith(notSupplied(""))) ?? null;

describe("[CLM-RPT-028] the Run provenance names the canonical inputs the run did not receive", () => {
  it("names the flags with no value on a line of their own, beneath the Inputs list", () => {
    const md = renderMarkdown(er(balance), handed({ features: "features", ciSteps: "ci-steps.json" }), publishedExitCodeOf);
    expect(notSuppliedLine(md)).toBe(notSupplied("`--vitest`, `--pytest`, `--jest`, `--junit`, `--rspec`, `--cucumber`, `--ci`, `--package-json`"));
    expect(md.indexOf("  - `--ci-steps ci-steps.json`")).toBeGreaterThan(-1);
    expect(md.indexOf("  - `--ci-steps ci-steps.json`")).toBeLessThan(md.indexOf(notSupplied("")));
    expect(md.indexOf(notSupplied(""))).toBeLessThan(md.indexOf(`- ${coreMessage(CoreMessage.ProvenanceRunTimestamp, { runStartUtc: "" })}`));
  });

  it("says nothing about absence when the run was handed every canonical stream", () => {
    const md = renderMarkdown(
      er(balance),
      handed({
        features: "features",
        vitest: "vitest.json",
        pytest: "report.xml",
        jest: "jest.json",
        junit: "junit.xml",
        rspec: "rspec.json",
        cucumber: "cucumber.json",
        ci: ".github/workflows",
        packageJson: "package.json",
        ciSteps: "ci-steps.json",
      }),
      publishedExitCodeOf
    );
    expect(notSuppliedLine(md)).toBeNull();
  });

  it("keeps the none-specified Inputs branch reachable, and names every canonical flag beside it", () => {
    const md = renderMarkdown(er(balance), handed({}), publishedExitCodeOf);
    expect(md.split("\n")).toContain(`- ${coreMessage(CoreMessage.ProvenanceNoInputs)}`);
    expect(notSuppliedLine(md)).toBe(
      notSupplied("`--features`, `--vitest`, `--pytest`, `--jest`, `--junit`, `--rspec`, `--cucumber`, `--ci`, `--package-json`, `--ci-steps`")
    );
  });

  it.each([
    { inputs: [], view: { kind: "none" } },
    {
      inputs: [{ flag: "--features", value: "features" }, { flag: "--ci", value: ".github/workflows" }],
      view: { kind: "given", inputs: [{ flag: "--features", value: "features" }, { flag: "--ci", value: ".github/workflows" }] },
    },
  ])("says whether the run was given any input, from $inputs.length inputs", ({ inputs, view }) => {
    expect(provenanceInputsView(inputs)).toEqual(view);
  });
});
