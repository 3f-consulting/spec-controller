import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { codeErrorsCtx as ctx } from "./scenarioCodeError.test-utils.js";

interface File {
  readonly slug: string;
  readonly featureCode: string;
  readonly scenarios: readonly string[];
}

function source({ slug, featureCode, scenarios }: File): string {
  const body = scenarios.map((tags, i) => `  @unit ${tags}\n  Scenario: s${i + 1}\n    Given a thing\n`);
  return `@${featureCode}\nFeature: ${slug}\n\n${body.join("\n")}`;
}

function markdownOf(files: readonly File[]): string {
  const codes = files.flatMap((file) => file.scenarios.filter((tags) => !tags.includes(" ")).map((tags) => tags.slice(1)));
  return renderMarkdown(
    evidenceReconciliationFromSources({
      featureSources: files.map(source),
      featureFiles: files.map(({ slug, featureCode }) => ({ slug, featureCode })),
      untaggedScenarios: [],
      packageJson: {},
      ciSources: [],
      behaviouralObservations: codes.map((scnId) => ({ qualityCheck: "unit", scnId, status: "passed" })),
      deferralTags: [],
    }),
    ctx
  );
}

function framingOf(md: string): string {
  const lines = md.split("\n");
  const heading = lines.indexOf(CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsHeading]);
  expect(heading).toBeGreaterThanOrEqual(0);
  return lines[heading + 2]!;
}

function verdictOf(md: string): string {
  const lines = md.split("\n");
  const heading = lines.indexOf(CORE_MESSAGES[CoreMessage.RunVerdictHeading]);
  expect(heading).toBeGreaterThanOrEqual(0);
  return lines[heading + 2]!;
}

const SEVERAL: File = { slug: "one", featureCode: "ONE", scenarios: ["@SCN-ONE-001", "@SCN-ONE-002 @SCN-ONE-003"] };
const FOREIGN: File = { slug: "two", featureCode: "TWO", scenarios: ["@SCN-TWO-001", "@SCN-ONE-004"] };
const ONE_ALONE: File = { slug: "one", featureCode: "ONE", scenarios: ["@SCN-ONE-001"] };

const SEVERAL_CODES = "more than one scenario code";
const NO_ACCOUNT = "no account was raised for it";

describe("[SCN-STG-031] a scenario carrying several codes is described in the report as a scenario no account was raised for, never as a misfiled code whose accounts still reconcile", () => {
  describe("when every listed error is several-scn-codes", () => {
    let md: string;
    beforeEach(() => {
      md = markdownOf([SEVERAL]);
    });

    it("frames the section as a scenario carrying more than one code that no account was raised for, never as a misfiling whose accounts reconcile", () => {
      const framing = framingOf(md);
      expect(framing).toContain(SEVERAL_CODES);
      expect(framing).toContain(NO_ACCOUNT);
      expect(framing).not.toContain("misfile");
      expect(framing).not.toContain("reconciles");
    });

    it("glosses the verdict the same way, never as a code filed under the wrong feature", () => {
      const verdict = verdictOf(md);
      expect(verdict).toContain(SEVERAL_CODES);
      expect(verdict).toContain(NO_ACCOUNT);
      expect(verdict).not.toContain("wrong feature");
      expect(verdict).not.toContain("reconciles");
    });
  });

  describe("when the listed errors hold a misfiling and a several-scn-codes error", () => {
    let md: string;
    beforeEach(() => {
      md = markdownOf([SEVERAL, FOREIGN]);
    });

    it("frames the section as true of both, and never says every account still reconciles", () => {
      const framing = framingOf(md);
      expect(framing).toContain("misfiles a scenario code");
      expect(framing).toContain(SEVERAL_CODES);
      expect(framing).toContain(NO_ACCOUNT);
      expect(framing).not.toContain("reconciles");
    });

    it("glosses the verdict as true of both, and never says the accounts all reconcile", () => {
      const verdict = verdictOf(md);
      expect(verdict).toContain("wrong feature");
      expect(verdict).toContain(SEVERAL_CODES);
      expect(verdict).toContain(NO_ACCOUNT);
      expect(verdict).not.toContain("reconciles");
    });
  });

  describe("when every listed error is a misfiling", () => {
    let md: string;
    beforeEach(() => {
      md = markdownOf([ONE_ALONE, FOREIGN]);
    });

    it("frames and glosses exactly as before", () => {
      expect(framingOf(md)).toBe(
        CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsFraming](CORE_MESSAGES[CoreMessage.OneScenarioCodeError])
      );
      expect(verdictOf(md)).toContain(`— ${CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsGloss]("")} (`);
    });
  });
});
