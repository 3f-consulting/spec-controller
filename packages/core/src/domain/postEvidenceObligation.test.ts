import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";

describe("an executable claim will raise an Evidence Obligation for each kind-of-check tag that applies to it", () => {
  it("[CLM-OBL-009] a scenario tagged @unit raises a unit Evidence Obligation", () => {
    const feature = featureAsWrittenFrom("one.feature", "Feature: one\n\n  @unit\n  Scenario: a scenario\n    Given a step\n");

    expect(executableClaimsOf([feature]).map(({ obligations }) => obligations)).toEqual([[{ kind: "unit" }]]);
  });
});
