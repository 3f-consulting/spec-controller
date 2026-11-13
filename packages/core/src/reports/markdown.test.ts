import { describe, expect, it } from "vitest";
import { markdownReportOf } from "./markdown.js";

describe("each run verdict, and each reason a run is not reconciled, has an opening of its own", () => {
  it.each([["CLM-RPT-111", "balanced", "Every claim has the evidence it asks for, so the run is balanced and nothing needs your attention."]] as const)(
    "[%s] a run that was %s opens with its sentence",
    (_clm, verdict, opening) => {
      expect(markdownReportOf({ verdict }).split("\n")[0]).toBe(opening);
    },
  );
});
