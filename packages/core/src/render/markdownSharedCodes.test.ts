import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { renderJson } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { __er as er } from "../evidenceReconciliation.test-utils.js";
import { evidenceObligations, sharedScnCodesOf } from "../domain/corpusCounts.js";
import { parseFeatureCounts, readCorpus } from "../parse/scenarioReaders.test-utils.js";
import { censusBlock as censusBlockOf } from "./renderedSection.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import type { Ledger } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import {
  RECONCILING_ITEMS_COLUMN,
  VERDICT_COLUMN,
  claimReconciliationsTable,
  type ClaimReconciliationsTable,
  type ClaimRow,
} from "./claimReconciliationsTable.test-utils.js";

const ctx: RunContext = {
  target: "stg-017",
  inputs: [{ ...FEATURES, path: "features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "features",
  runStart: new Date("2026-09-23T20:00:00.000Z"),
  sourceSha: "0000000000000000000000000000000000000000",
  toolSha: "0000000000000000000000000000000000000000",
  toolVersion: "0.1.0",
};

let ledger: Ledger;
let census: EvidenceObligations;
beforeEach(() => {
  ledger = reconcile(
    [
      { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-OWN-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    []
  );
  census = {
    ...evidenceObligations(3, 3),
    sharedScnCodes: [
      {
        scnId: "SCN-ONE-001",
        scenarios: [
          { feature: "one.feature", scenario: "the scenario in one" },
          { feature: "two.feature", scenario: "the scenario in two" },
        ],
      },
    ],
  };
});

const alpha = `Feature: alpha

  @unit @SCN-TRI-001
  Scenario: the first carrier of the three-way code
    Given a fixture

  @unit @SCN-DUO-001
  Scenario: the first carrier of the two-way code
    Given a fixture

  @unit @SCN-OWN-001
  Scenario: a scenario of its own
    Given a fixture
`;

const beta = `Feature: beta

  @unit @SCN-TRI-001
  Scenario: the second carrier of the three-way code
    Given a fixture

  @unit @SCN-DUO-001
  Scenario: the second carrier of the two-way code
    Given a fixture

  @unit @SCN-TRI-001
  Scenario: the third carrier of the three-way code
    Given a fixture
`;

function censusBlock(corpus: readonly { feature: string; source: string }[]): string[] {
  const { untagged, raw, scenarios } = readCorpus(corpus);
  const md = renderMarkdown(
    er(reconcile(scenarios, [])),
    ctx,
    publishedExitCodeOf,
    evidenceObligations(raw, scenarios.length, untagged, sharedScnCodesOf(corpus.map(({ feature, source }) => ({ feature, ...parseFeatureCounts(source) }))))
  );
  return censusBlockOf(md);
}

describe("[SCN-RPT-064] the report states how many scenarios the corpus holds and how many codes more than one carries, and names the scenarios sharing each code", () => {
  it.each([
    [
      "states that the corpus holds three scenarios, one code carried by more than one of them",
      "- The corpus holds 3 scenarios — 1 @SCN code(s) carried by more than one scenario:",
    ],
    [
      "names the shared code with the file and the name of each scenario carrying it",
      "  - SCN-ONE-001: one.feature : the scenario in one; two.feature : the scenario in two",
    ],
  ])("%s", (_title, line) => {
    const md = renderMarkdown(er(ledger), ctx, publishedExitCodeOf, census);
    expect(md).toContain(line);
  });

  it("carries the shared codes in the JSON census, and nothing when no code is shared", () => {
    const shared = JSON.parse(renderJson(er(ledger), ctx, census));
    expect(shared.scenarioCodes.sharedScnCodes).toEqual(census.sharedScnCodes);
    const clean = JSON.parse(renderJson(er(ledger), ctx, evidenceObligations(3, 3)));
    expect(clean.scenarioCodes).not.toHaveProperty("sharedScnCodes");
    expect(renderMarkdown(er(ledger), ctx, publishedExitCodeOf, evidenceObligations(3, 3))).not.toContain("The corpus holds");
  });

  it("renders an account whose sharers name no quality check by its outcome alone, never an undefined subject", () => {
    const bare = reconcile(
      [
        { scnId: "SCN-ONE-001", evidenceObligations: [] },
        { scnId: "SCN-ONE-001", evidenceObligations: [] },
      ],
      []
    );
    const [row] = claimReconciliationsTable(renderMarkdown(er(bare), ctx, publishedExitCodeOf)).rowsOf("SCN-ONE-001");
    expect(row?.cell(VERDICT_COLUMN)).toBe("out-of-balance");
    expect(row?.cell(RECONCILING_ITEMS_COLUMN).startsWith("Evidence Obligation's @SCN code is carried by another Scenario")).toBe(true);
    expect(row?.cells.join(" | ")).not.toContain("undefined");
  });

  it("counts every scenario and every shared code, and names each shared code's carriers, a code to a line, in code order", () => {
    expect(
      censusBlock([
        { feature: "alpha.feature", source: alpha },
        { feature: "beta.feature", source: beta },
      ])
    ).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](0)}`,
      `- ${CORE_MESSAGES[CoreMessage.SharedScnCodes](6, 2)}`,
      "  - SCN-DUO-001: alpha.feature : the first carrier of the two-way code; beta.feature : the second carrier of the two-way code",
      "  - SCN-TRI-001: alpha.feature : the first carrier of the three-way code; beta.feature : the second carrier of the three-way code; beta.feature : the third carrier of the three-way code",
    ]);
  });
});

describe("[SCN-RPT-070] each Claim Reconciliation of a shared code names, in its reconciling items, the feature file and title of the scenario it reconciles", () => {
  const sharerTable = (): ClaimReconciliationsTable =>
    claimReconciliationsTable(renderMarkdown(
      er(
        reconcile(
          [
            { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }], feature: "login.feature", title: "a user with the right password is let in" },
            { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }], feature: "logout.feature", title: "a signed-in user is signed out" },
          ],
          []
        )
      ),
      ctx,
      publishedExitCodeOf
    ));
  const sharerRowsOf = (): ClaimRow[] => sharerTable().rowsOf("SCN-ONE-001");

  it.each([
    ["login.feature : a user with the right password is let in"],
    ["logout.feature : a signed-in user is signed out"],
  ])("names %s in its sharer's reconciling items", (scenario) => {
    const rows = sharerRowsOf();
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.cell(RECONCILING_ITEMS_COLUMN) === `unit: ${OUTCOME_DESCRIPTION["duplicate-scn-code"]} — this one is ${scenario}`)).toHaveLength(1);
  });

  it("renders the two sharers' rows alike but for the scenario each names", () => {
    const table = sharerTable();
    const rows = table.rowsOf("SCN-ONE-001").map((row) =>
      table.header.map((column) =>
        column === RECONCILING_ITEMS_COLUMN ? row.cell(column).replace(/ — this one is .+$/, " — this one is <scenario>") : row.cell(column)
      )
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]![table.header.indexOf(RECONCILING_ITEMS_COLUMN)]).toContain(" — this one is <scenario>");
    expect(rows[1]).toEqual(rows[0]);
  });
});
