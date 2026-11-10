import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCorpus } from "../../../spec-controller/src/ingest/ingestQualityChecks.js";
import { committedRepository } from "../../../spec-controller/src/run-management/gitRepository.test-utils.js";
import { temporaryDirectory } from "../../../spec-controller/src/temporaryDirectory.test-utils.js";
import { resolveSourceSha, resolveTargetOrigin, resolveToolIdentity } from "../../../spec-controller/src/run-management/resolveRunInputs.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { workflowSteps } from "../parse/parsedWorkflows.test-utils.js";
import { shellReading } from "../parse/commandRuns.js";
import { provenanceFrom } from "../provenance/provenance.js";
import type { ClaimCode, ClaimCodeError } from "./claimCodes.js";
import { claimReconciliationsOf, type ClaimReconciliation, type QualityCheckReconciliation } from "./claimReconciliation.js";
import {
  excludedClaimCodeOccurrencesOf,
  provenanceOf,
  runVerdictOf,
  stepAccountOf,
  totalsOf,
  type RunVerdict,
  type Totals,
} from "./evidenceReconciliation.js";
import { executableClaimsOf, type ExecutableClaim, type QualityCheckKind } from "./postEvidenceObligation.js";
import { stepDispositionOf, type EvidenceObservation, type PipelineStep } from "./postEvidenceObservation.js";

const ONE: ClaimCode = { featureCode: "ONE", number: "001" };
const PHANTOM: ClaimCode = { featureCode: "ONE", number: "999" };

const observation = (result: EvidenceObservation["result"], kind: QualityCheckKind = "unit", cites: readonly ClaimCode[] = [ONE]): EvidenceObservation =>
  ({ cites, result, kind, place: "a.test.ts", notes: [] });

const claim = (file = "one.feature", claimCode: ClaimCode | undefined = ONE): ExecutableClaim =>
  ({ ...(claimCode === undefined ? {} : { claimCode }), file, title: "t", obligations: [{ kind: "unit" }] });

const satisfied = (kind: QualityCheckKind = "unit"): QualityCheckReconciliation =>
  ({ outcome: "satisfied", kind, obligation: { kind }, observation: observation("passed", kind) });
const failing = (): QualityCheckReconciliation => ({ outcome: "failing", kind: "unit", obligation: { kind: "unit" }, observation: observation("failed") });
const missing = (kind: QualityCheckKind): QualityCheckReconciliation => ({ outcome: "missing", kind, obligation: { kind } });
const neverRan = (): QualityCheckReconciliation => ({ outcome: "never-ran", kind: "unit", observation: observation("never-ran", "unit", []) });
const citesNoClaim = (): QualityCheckReconciliation => ({ outcome: "cites-no-claim", kind: "unit", observation: observation("passed", "unit", []) });

const balanced = (qualityChecks: readonly QualityCheckReconciliation[] = [satisfied()]): ClaimReconciliation =>
  ({ claim: claim(), qualityCheckReconciliations: qualityChecks, verdict: "balanced" });
const outOfBalance = (qualityChecks: readonly QualityCheckReconciliation[], on: ClaimReconciliation["claim"] = claim()): ClaimReconciliation =>
  ({ claim: on, qualityCheckReconciliations: qualityChecks, verdict: "out-of-balance" });
const unnamed = (qualityChecks: readonly QualityCheckReconciliation[] = [citesNoClaim()]): ClaimReconciliation => outOfBalance(qualityChecks, {});

const severalCodes: ClaimCodeError = { kind: "several-claim-codes", files: ["one.feature"], scenario: "s", codes: ["CLM-ONE-001", "CLM-ONE-002"] };

type Run = () => { readonly claimReconciliations: readonly ClaimReconciliation[]; readonly claimCodeErrors: readonly ClaimCodeError[] };

describe("a run is balanced only when all its Claim Reconciliations are", () => {
  it.each<{ clm: string; run: Run; verdict: RunVerdict }>([
    { clm: "CLM-EVR-001", run: () => ({ claimReconciliations: [balanced(), balanced()], claimCodeErrors: [] }), verdict: { verdict: "balanced" } },
    { clm: "CLM-EVR-002", run: () => ({ claimReconciliations: [balanced(), outOfBalance([failing()])], claimCodeErrors: [] }), verdict: { verdict: "out-of-balance" } },
    { clm: "CLM-EVR-003", run: () => ({ claimReconciliations: [unnamed()], claimCodeErrors: [] }), verdict: { verdict: "out-of-balance" } },
  ])("[$clm] the run will be balanced or out of balance, as its Claim Reconciliations call for", ({ run, verdict }) => {
    const { claimReconciliations, claimCodeErrors } = run();
    expect(runVerdictOf(claimReconciliations, claimCodeErrors)).toEqual(verdict);
  });
});

describe("the run verdict says why balance could not reconcile a run", () => {
  it.each<{ clm: string; run: Run; why: string }>([
    { clm: "CLM-EVR-004", run: () => ({ claimReconciliations: [unnamed([neverRan()])], claimCodeErrors: [] }), why: "unsound" },
    { clm: "CLM-EVR-005", run: () => ({ claimReconciliations: [balanced()], claimCodeErrors: [severalCodes] }), why: "claim-code-errors" },
  ])("[$clm] the run will be not reconciled, naming why", ({ run, why }) => {
    const { claimReconciliations, claimCodeErrors } = run();
    expect(runVerdictOf(claimReconciliations, claimCodeErrors)).toEqual({ verdict: "not-reconciled", why });
  });

  it.each<{ clm: string; corpusIn: (dir: string) => string }>([
    { clm: "CLM-EVR-006", corpusIn: (dir) => join(dir, "features") },
    {
      clm: "CLM-EVR-007",
      corpusIn: (dir) => {
        mkdirSync(join(dir, "features"));
        return join(dir, "features");
      },
    },
    {
      clm: "CLM-EVR-008",
      corpusIn: (dir) => {
        mkdirSync(join(dir, "features"));
        writeFileSync(join(dir, "features", "one.feature"), "@ONE\nFeature: one\n");
        return join(dir, "features");
      },
    },
  ])("[$clm] the run will be not reconciled, naming why", ({ corpusIn }) => {
    const reading = readCorpus(corpusIn(temporaryDirectory("evr-corpus-")));
    expect(reading.kind).toBe("read");
    const corpus = reading.kind === "read" ? reading.corpus : [];
    const claimReconciliations = claimReconciliationsOf(executableClaimsOf(corpus, { deferralTags: [], strict: false }), []);
    expect(runVerdictOf(claimReconciliations, [])).toEqual({ verdict: "not-reconciled", why: "nothing-to-reconcile" });
  });

  it.each<{ clm: string; run: Run; why: string }>([
    { clm: "CLM-EVR-009", run: () => ({ claimReconciliations: [unnamed([neverRan()]), outOfBalance([failing()])], claimCodeErrors: [] }), why: "unsound" },
    { clm: "CLM-EVR-010", run: () => ({ claimReconciliations: [unnamed([neverRan()])], claimCodeErrors: [severalCodes] }), why: "unsound" },
    { clm: "CLM-EVR-011", run: () => ({ claimReconciliations: [outOfBalance([failing()])], claimCodeErrors: [severalCodes] }), why: "claim-code-errors" },
    { clm: "CLM-EVR-012", run: () => ({ claimReconciliations: [], claimCodeErrors: [severalCodes] }), why: "claim-code-errors" },
  ])("[$clm] when several reasons apply, unsound comes first, then claim code errors, then nothing to reconcile, all before out of balance", ({ run, why }) => {
    const { claimReconciliations, claimCodeErrors } = run();
    expect(runVerdictOf(claimReconciliations, claimCodeErrors)).toEqual({ verdict: "not-reconciled", why });
  });
});

type Reconciled = () => readonly ClaimReconciliation[];

describe("the summary counts what was reconciled", () => {
  it.each<{ clm: string; reconciled: Reconciled; counts: Totals["claimReconciliations"] }>([
    { clm: "CLM-EVR-013", reconciled: () => [balanced()], counts: { total: 1, balanced: 1, outOfBalance: 0 } },
    { clm: "CLM-EVR-014", reconciled: () => [outOfBalance([failing()])], counts: { total: 1, balanced: 0, outOfBalance: 1 } },
    { clm: "CLM-EVR-015", reconciled: () => [balanced(), outOfBalance([failing()])], counts: { total: 2, balanced: 1, outOfBalance: 1 } },
    { clm: "CLM-EVR-016", reconciled: () => [unnamed()], counts: { total: 1, balanced: 0, outOfBalance: 1 } },
  ])("[$clm] Total of the Claim Reconciliations", ({ reconciled, counts }) => {
    expect(totalsOf(reconciled(), 0).claimReconciliations).toEqual(counts);
  });

  it.each<{ clm: string; reconciled: Reconciled; counts: Totals["qualityCheckReconciliations"] }>([
    { clm: "CLM-EVR-017", reconciled: () => [balanced()], counts: { total: 1, outOfBalance: 0, byOutcome: [], missingByKind: [] } },
    { clm: "CLM-EVR-018", reconciled: () => [outOfBalance([failing(), missing("integration")])], counts: { total: 2, outOfBalance: 2, byOutcome: [{ outcome: "failing", count: 1 }, { outcome: "missing", count: 1 }], missingByKind: [{ kind: "integration", count: 1 }] } },
    { clm: "CLM-EVR-019", reconciled: () => [outOfBalance([{ outcome: "no-claim-code", kind: "unit", obligation: { kind: "unit" } }], claim("one.feature", undefined))], counts: { total: 1, outOfBalance: 1, byOutcome: [{ outcome: "no-claim-code", count: 1 }], missingByKind: [] } },
    { clm: "CLM-EVR-020", reconciled: () => [0, 1].map(() => outOfBalance([{ outcome: "duplicate-claim-code", kind: "unit", obligation: { kind: "unit" } }])), counts: { total: 2, outOfBalance: 2, byOutcome: [{ outcome: "duplicate-claim-code", count: 2 }], missingByKind: [] } },
  ])("[$clm] Total of the Quality Check Reconciliations, by outcome", ({ reconciled, counts }) => {
    expect(totalsOf(reconciled(), 0).qualityCheckReconciliations).toEqual(counts);
  });

  it.each<{ clm: string; reconciled: Reconciled; counts: Partial<Totals["evidenceObservations"]> }>([
    { clm: "CLM-EVR-021", reconciled: () => [balanced()], counts: { total: 1, byKind: [{ kind: "unit", count: 1 }], onExecutableClaim: 1, onPhantomClaim: 0, onUnnamedClaim: 0 } },
    {
      clm: "CLM-EVR-022",
      reconciled: () => [unnamed(), outOfBalance([{ outcome: "cites-unknown-claim", kind: "fitness", observation: observation("passed", "fitness", [PHANTOM]) }], { claimCode: PHANTOM })],
      counts: { total: 2, byKind: [{ kind: "unit", count: 1 }, { kind: "fitness", count: 1 }], onExecutableClaim: 0, onPhantomClaim: 1, onUnnamedClaim: 1 },
    },
  ])("[$clm] Total of the Evidence Observations, by kind of quality check and by kind of claim", ({ reconciled, counts }) => {
    expect(totalsOf(reconciled(), 0).evidenceObservations).toMatchObject(counts);
  });

  it.each<{ clm: string; reconciled: Reconciled; byFeature: Totals["outOfBalanceByFeature"] }>([
    { clm: "CLM-EVR-023", reconciled: () => [outOfBalance([failing()], claim("one.feature"))], byFeature: [{ file: "one.feature", count: 1 }] },
    { clm: "CLM-EVR-024", reconciled: () => [outOfBalance([{ outcome: "no-claim-code", kind: "unit", obligation: { kind: "unit" } }], claim("one.feature", undefined))], byFeature: [{ file: "one.feature", count: 1 }] },
    { clm: "CLM-EVR-025", reconciled: () => [outOfBalance([{ outcome: "no-claim-code", kind: "unit", obligation: { kind: "unit" } }], claim("three.feature", undefined))], byFeature: [{ file: "three.feature", count: 1 }] },
    { clm: "CLM-EVR-026", reconciled: () => [unnamed()], byFeature: undefined },
  ])("[$clm] Total of the out-of-balance Claim Reconciliations, by feature", ({ reconciled, byFeature }) => {
    const totals = totalsOf(reconciled(), 0);
    expect(totals.outOfBalanceByFeature).toEqual(byFeature);
    expect(totals.claimReconciliations.outOfBalance).toBe(1);
  });

  it.each<{ clm: string; source: string; excluded: number }>([
    { clm: "CLM-EVR-027", source: "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: a claim\n", excluded: 0 },
    { clm: "CLM-EVR-028", source: "@ONE\nFeature: one\n\n  @unit\n  Scenario: a claim about @CLM-ONE-001\n", excluded: 1 },
    { clm: "CLM-EVR-029", source: "@ONE\nFeature: one\n\n  # see @CLM-ONE-001\n  @unit\n  Scenario: a claim\n", excluded: 1 },
    { clm: "CLM-EVR-030", source: "@ONE\nFeature: one\n\n  # see @CLM-ONE-001\n  @unit @CLM-ONE-001\n  Scenario: a claim\n", excluded: 1 },
    { clm: "CLM-EVR-031", source: "@ONE\nFeature: one\n\n  @unit\n  Scenario Outline: claims\n    Examples:\n      | clm         |\n      | CLM-ONE-001 |\n", excluded: 0 },
  ])("[$clm] Total of the claim codes written where no claim reads them", ({ source, excluded }) => {
    expect(excludedClaimCodeOccurrencesOf(parsedFeatures([source], ["one.feature"]))).toBe(excluded);
  });
});

const TWO_JOBS = `jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - run: pnpm lint
      - run: vitest run
      - name: Install
        run: pnpm install
  check:
    steps:
      - run: spec-controller balance
      - run: pnpm audit
`;

const dispositionOf = (step: PipelineStep) =>
  stepDispositionOf(step, {
    runsTheReconciler: (command) => command.startsWith("spec-controller balance"),
    nonChecks: ["ci.yml:build:Install"],
    runners: { unit: "vitest" },
    scripts: {},
    shell: shellReading,
  });

describe("balance accounts for every step it reads", () => {
  it("[CLM-EVR-032] each job's counts will add up to the steps read in it", () => {
    const { jobs } = stepAccountOf(workflowSteps([TWO_JOBS], ["ci.yml"]), dispositionOf);
    expect(jobs).toEqual([
      { workflow: "ci.yml", job: "build", stepsRead: 4, runners: 1, reconcilerSteps: 0, nonChecks: 1, plumbing: 1, candidates: 1 },
      { workflow: "ci.yml", job: "check", stepsRead: 2, runners: 0, reconcilerSteps: 1, nonChecks: 0, plumbing: 0, candidates: 1 },
    ]);
  });

  it("[CLM-EVR-033] the total will be the sum of the jobs", () => {
    const { jobs, total } = stepAccountOf(workflowSteps([TWO_JOBS], ["ci.yml"]), dispositionOf);
    const summed = (count: "stepsRead" | "runners" | "reconcilerSteps" | "nonChecks" | "plumbing" | "candidates") => jobs.reduce((sum, job) => sum + job[count], 0);
    expect(total).toEqual({
      stepsRead: summed("stepsRead"),
      runners: summed("runners"),
      reconcilerSteps: summed("reconcilerSteps"),
      nonChecks: summed("nonChecks"),
      plumbing: summed("plumbing"),
      candidates: summed("candidates"),
      accountedFor: 6,
    });
    expect(total).toMatchObject({ runners: 1, reconcilerSteps: 1, nonChecks: 1, plumbing: 1, candidates: 2 });
    expect(total.stepsRead).toBe(6);
  });
});

describe("only a fitness function that ran counts as run", () => {
  it.each<{ clm: string; reconciled: Reconciled; ran: number }>([
    { clm: "CLM-EVR-034", reconciled: () => [outOfBalance([{ outcome: "cannot-fail", kind: "fitness", obligation: { kind: "fitness" }, observation: observation("passed-on-error", "fitness") }])], ran: 1 },
    { clm: "CLM-EVR-035", reconciled: () => [unnamed([{ outcome: "never-ran", kind: "fitness", observation: observation("never-ran", "fitness", []) }])], ran: 0 },
    { clm: "CLM-EVR-036", reconciled: () => [outOfBalance([missing("fitness")])], ran: 0 },
  ])("[$clm] balance counts a fitness function as run only when its Evidence Observation ran", ({ reconciled, ran }) => {
    expect(totalsOf(reconciled(), 0).evidenceObservations.fitnessFunctionsRan).toBe(ran);
  });
});

describe("the provenance says what the run used", () => {
  const VERSION = { toolVersion: "0.1.256" };

  it("[CLM-EVR-037] the provenance describes the run", () => {
    expect(provenanceOf({ target: "acme/web", ...VERSION }, []).target).toBe("acme/web");
  });

  it("[CLM-EVR-038] the provenance describes the run", () => {
    const { repo, head } = committedRepository("evr-source-");
    const sourceSha = resolveSourceSha({ sourceSha: "abc1234", targetDir: repo }) ?? undefined;
    expect(head).not.toBe("abc1234");
    expect(provenanceOf({ ...(sourceSha === undefined ? {} : { sourceSha }), ...VERSION }, []).sourceSha).toBe("abc1234");
  });

  it("[CLM-EVR-039] the provenance describes the run", () => {
    const { repo } = committedRepository("evr-origin-", "https://ci:s3cret@example.com/acme/web?x=1#y");
    const origin = resolveTargetOrigin(repo) ?? undefined;
    const { target } = provenanceOf({ ...(origin === undefined ? {} : { origin }), ...VERSION }, []);
    expect(target).toBe("acme/web");
    for (const part of ["ci", "s3cret", "x=1", "#y"]) expect(target).not.toContain(part);
  });

  it("[CLM-EVR-040] the provenance describes the run", () => {
    const { repo, head } = committedRepository("evr-tool-");
    writeFileSync(join(repo, "package.json"), JSON.stringify({ version: "0.1.256" }));
    const { toolSha, toolVersion } = resolveToolIdentity({ toolDir: repo });
    expect(provenanceOf({ ...(toolSha === null ? {} : { toolSha }), toolVersion }, []).toolSha).toBe(head);
  });

  it("[CLM-EVR-041] the provenance describes the run", () => {
    const { repo } = committedRepository("evr-package-");
    const toolDir = join(repo, "node_modules", "spec-controller", "dist");
    mkdirSync(toolDir, { recursive: true });
    writeFileSync(join(repo, "node_modules", "spec-controller", "package.json"), JSON.stringify({ version: "0.1.256" }));
    const { toolSha, toolVersion } = resolveToolIdentity({ toolDir });
    const provenance = provenanceOf({ ...(toolSha === null ? {} : { toolSha }), toolVersion }, []);
    expect(provenance).not.toHaveProperty("toolSha");
    expect(provenance.toolVersion).toBe("0.1.256");
  });

  it.each<{ clm: string; given?: string; input: { readonly name: string; readonly path?: string } }>([
    { clm: "CLM-EVR-042", given: "/work/acme/cucumber.json", input: { name: "cucumber", path: "cucumber.json" } },
    { clm: "CLM-EVR-043", input: { name: "cucumber" } },
    { clm: "CLM-EVR-044", given: "/work/acme/a.json", input: { name: "cucumber", path: "a.json" } },
  ])("[$clm] the provenance describes the run", ({ given, input }) => {
    const { inputs } = provenanceFrom(VERSION, [{ name: "cucumber", ...(given === undefined ? {} : { path: given }) }], "/work/acme");
    expect(inputs).toEqual([input]);
  });
});
