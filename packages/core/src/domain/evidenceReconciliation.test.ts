import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCorpus } from "../../../spec-controller/src/inputs/ingestQualityChecks.js";
import { committedRepository } from "../../../spec-controller/src/runIdentity/gitRepository.test-utils.js";
import { temporaryDirectory } from "../../../spec-controller/src/temporaryDirectory.test-utils.js";
import { readTargetHead, readToolInstall, readTargetOrigin } from "../../../spec-controller/src/runIdentity/resolveRunInputs.js";
import { parsedFeatures } from "../inputs/parsedFeatures.test-utils.js";
import { workflowSteps } from "../inputs/parsedWorkflows.test-utils.js";
import { shellReading } from "../inputs/shell.js";
import { targetConfigurationFrom } from "../inputs/manifest.js";
import { provenanceFrom, provenanceOf, runIdentityOf } from "./provenance.js";
import { coreText } from "../messages/coreText.js";
import { renderJson } from "../reports/json.js";
import { renderMarkdown } from "../reports/markdown.js";
import type { ClaimCode, ClaimCodeError } from "./claimCodes.js";
import { claimReconciliationsOf, type ClaimReconciliation, type QualityCheckReconciliation } from "./claimReconciliation.js";
import {
  evidenceReconciliationOf,
  excludedClaimCodeOccurrencesOf,
  runVerdictOf,
  stepAccountOf,
  totalsOf,
  type EvidenceReconciliation,
  type RunToReconcile,
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
  it.each<[string, { run: Run; verdict: RunVerdict }]>([
    ["CLM-EVR-001", { run: () => ({ claimReconciliations: [balanced(), balanced()], claimCodeErrors: [] }), verdict: { verdict: "balanced" } }],
    ["CLM-EVR-002", { run: () => ({ claimReconciliations: [balanced(), outOfBalance([failing()])], claimCodeErrors: [] }), verdict: { verdict: "out-of-balance" } }],
    ["CLM-EVR-003", { run: () => ({ claimReconciliations: [unnamed()], claimCodeErrors: [] }), verdict: { verdict: "out-of-balance" } }],
  ])("[%s] the run will be balanced or out of balance, as its Claim Reconciliations call for", (_clm, { run, verdict }) => {
    const { claimReconciliations, claimCodeErrors } = run();
    expect(runVerdictOf(claimReconciliations, claimCodeErrors)).toEqual(verdict);
  });
});

describe("the run verdict says why balance could not reconcile a run", () => {
  it.each<[string, { run: Run; why: string }]>([
    ["CLM-EVR-004", { run: () => ({ claimReconciliations: [unnamed([neverRan()])], claimCodeErrors: [] }), why: "unsound" }],
    ["CLM-EVR-005", { run: () => ({ claimReconciliations: [balanced()], claimCodeErrors: [severalCodes] }), why: "claim-code-errors" }],
  ])("[%s] the run will be not reconciled, naming why", (_clm, { run, why }) => {
    const { claimReconciliations, claimCodeErrors } = run();
    expect(runVerdictOf(claimReconciliations, claimCodeErrors)).toEqual({ verdict: "not-reconciled", why });
  });

  it.each<[string, { corpusIn: (dir: string) => string }]>([
    ["CLM-EVR-006", { corpusIn: (dir) => join(dir, "features") }],
    ["CLM-EVR-007", { corpusIn: (dir) => {
        mkdirSync(join(dir, "features"));
        return join(dir, "features");
      },
    }],
    ["CLM-EVR-008", { corpusIn: (dir) => {
        mkdirSync(join(dir, "features"));
        writeFileSync(join(dir, "features", "one.feature"), "@ONE\nFeature: one\n");
        return join(dir, "features");
      },
    }],
    ["CLM-EVR-008", { corpusIn: (dir) => {
        mkdirSync(join(dir, "features"));
        writeFileSync(join(dir, "features", "one.feature"), "@ONE\nFeature: one\n\n  Background:\n    Given a step\n");
        return join(dir, "features");
      },
    }],
    ["CLM-EVR-008", { corpusIn: (dir) => {
        mkdirSync(join(dir, "features"));
        writeFileSync(join(dir, "features", "one.feature"), "# one: the feature is still to be written\n");
        return join(dir, "features");
      },
    }],
  ])("[%s] the run will be not reconciled, naming why", (_clm, { corpusIn }) => {
    const reading = readCorpus(corpusIn(temporaryDirectory("evr-corpus-")));
    expect(reading.kind).toBe("read");
    const corpus = reading.kind === "read" ? reading.corpus : [];
    const claimReconciliations = claimReconciliationsOf(executableClaimsOf(corpus, { deferralTags: [], strict: false }), []);
    expect(runVerdictOf(claimReconciliations, [])).toEqual({ verdict: "not-reconciled", why: "nothing-to-reconcile" });
  });

  it.each<[string, { run: Run; why: string }]>([
    ["CLM-EVR-009", { run: () => ({ claimReconciliations: [unnamed([neverRan()]), outOfBalance([failing()])], claimCodeErrors: [] }), why: "unsound" }],
    ["CLM-EVR-010", { run: () => ({ claimReconciliations: [unnamed([neverRan()])], claimCodeErrors: [severalCodes] }), why: "unsound" }],
    ["CLM-EVR-011", { run: () => ({ claimReconciliations: [outOfBalance([failing()])], claimCodeErrors: [severalCodes] }), why: "claim-code-errors" }],
    ["CLM-EVR-012", { run: () => ({ claimReconciliations: [], claimCodeErrors: [severalCodes] }), why: "claim-code-errors" }],
  ])("[%s] when several reasons apply, unsound comes first, then claim code errors, then nothing to reconcile, all before out of balance", (_clm, { run, why }) => {
    const { claimReconciliations, claimCodeErrors } = run();
    expect(runVerdictOf(claimReconciliations, claimCodeErrors)).toEqual({ verdict: "not-reconciled", why });
  });
});

type Reconciled = () => readonly ClaimReconciliation[];

describe("the summary counts what was reconciled", () => {
  it.each<[string, { reconciled: Reconciled; counts: Totals["claimReconciliations"] }]>([
    ["CLM-EVR-013", { reconciled: () => [balanced()], counts: { total: 1, balanced: 1, outOfBalance: 0 } }],
    ["CLM-EVR-014", { reconciled: () => [outOfBalance([failing()])], counts: { total: 1, balanced: 0, outOfBalance: 1 } }],
    ["CLM-EVR-015", { reconciled: () => [balanced(), outOfBalance([failing()])], counts: { total: 2, balanced: 1, outOfBalance: 1 } }],
    ["CLM-EVR-016", { reconciled: () => [unnamed()], counts: { total: 1, balanced: 0, outOfBalance: 1 } }],
  ])("[%s] Total of the Claim Reconciliations", (_clm, { reconciled, counts }) => {
    expect(totalsOf(reconciled(), 0).claimReconciliations).toEqual(counts);
  });

  it.each<[string, { reconciled: Reconciled; counts: Totals["qualityCheckReconciliations"] }]>([
    ["CLM-EVR-017", { reconciled: () => [balanced()], counts: { total: 1, outOfBalance: 0, byOutcome: [], missingByKind: [] } }],
    ["CLM-EVR-018", { reconciled: () => [outOfBalance([failing(), missing("integration")])], counts: { total: 2, outOfBalance: 2, byOutcome: [{ outcome: "failing", count: 1 }, { outcome: "missing", count: 1 }], missingByKind: [{ kind: "integration", count: 1 }] } }],
    ["CLM-EVR-019", { reconciled: () => [outOfBalance([{ outcome: "no-claim-code", kind: "unit", obligation: { kind: "unit" } }], claim("one.feature", undefined))], counts: { total: 1, outOfBalance: 1, byOutcome: [{ outcome: "no-claim-code", count: 1 }], missingByKind: [] } }],
    ["CLM-EVR-020", { reconciled: () => [0, 1].map(() => outOfBalance([{ outcome: "duplicate-claim-code", kind: "unit", obligation: { kind: "unit" } }])), counts: { total: 2, outOfBalance: 2, byOutcome: [{ outcome: "duplicate-claim-code", count: 2 }], missingByKind: [] } }],
  ])("[%s] Total of the Quality Check Reconciliations, by outcome", (_clm, { reconciled, counts }) => {
    expect(totalsOf(reconciled(), 0).qualityCheckReconciliations).toEqual(counts);
  });

  it("[CLM-EVR-019] Total of the Quality Check Reconciliations, by outcome, for a scenario written with no code and no tag", () => {
    const corpus = parsedFeatures(["@ONE\nFeature: one\n\n  Scenario: a claim\n    Given a step\n"], ["one.feature"]);
    const reconciled = claimReconciliationsOf(executableClaimsOf(corpus, { deferralTags: [], strict: false }), []);
    expect(totalsOf(reconciled, 0).qualityCheckReconciliations).toEqual({ total: 1, outOfBalance: 1, byOutcome: [{ outcome: "no-claim-code", count: 1 }], missingByKind: [] });
  });

  it.each<[string, { reconciled: Reconciled; counts: Partial<Totals["evidenceObservations"]> }]>([
    ["CLM-EVR-021", { reconciled: () => [balanced()], counts: { total: 1, byKind: [{ kind: "unit", count: 1 }], onExecutableClaim: 1, onPhantomClaim: 0, onUnnamedClaim: 0 } }],
    ["CLM-EVR-022", { reconciled: () => [unnamed(), outOfBalance([{ outcome: "cites-unknown-claim", kind: "fitness", observation: observation("passed", "fitness", [PHANTOM]) }], { claimCode: PHANTOM })],
      counts: { total: 2, byKind: [{ kind: "unit", count: 1 }, { kind: "fitness", count: 1 }], onExecutableClaim: 0, onPhantomClaim: 1, onUnnamedClaim: 1 },
    }],
  ])("[%s] Total of the Evidence Observations, by kind of quality check and by kind of claim", (_clm, { reconciled, counts }) => {
    expect(totalsOf(reconciled(), 0).evidenceObservations).toMatchObject(counts);
  });

  it.each<[string, { reconciled: Reconciled; byFeature: Totals["outOfBalanceByFeature"] }]>([
    ["CLM-EVR-023", { reconciled: () => [outOfBalance([failing()], claim("one.feature")), { ...balanced(), claim: claim("two.feature") }], byFeature: [{ file: "one.feature", count: 1 }] }],
    ["CLM-EVR-024", { reconciled: () => [outOfBalance([{ outcome: "no-claim-code", kind: "unit", obligation: { kind: "unit" } }], claim("one.feature", undefined))], byFeature: [{ file: "one.feature", count: 1 }] }],
    ["CLM-EVR-025", { reconciled: () => [outOfBalance([{ outcome: "no-claim-code", kind: "unit", obligation: { kind: "unit" } }], claim("three.feature", undefined))], byFeature: [{ file: "three.feature", count: 1 }] }],
    ["CLM-EVR-026", { reconciled: () => [unnamed()], byFeature: undefined }],
  ])("[%s] Total of the out-of-balance Claim Reconciliations, by feature", (_clm, { reconciled, byFeature }) => {
    const totals = totalsOf(reconciled(), 0);
    expect(totals.outOfBalanceByFeature).toEqual(byFeature);
    expect(totals.claimReconciliations.outOfBalance).toBe(1);
  });

  it.each<[string, { source: string; excluded: number }]>([
    ["CLM-EVR-027", { source: "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: a claim\n", excluded: 0 }],
    ["CLM-EVR-028", { source: "@ONE\nFeature: one\n\n  @unit\n  Scenario: a claim about @CLM-ONE-001\n", excluded: 1 }],
    ["CLM-EVR-029", { source: "@ONE\nFeature: one\n\n  # see @CLM-ONE-001\n  @unit\n  Scenario: a claim\n", excluded: 1 }],
    ["CLM-EVR-030", { source: "@ONE\nFeature: one\n\n  # see @CLM-ONE-001\n  @unit @CLM-ONE-001\n  Scenario: a claim\n", excluded: 1 }],
    ["CLM-EVR-031", { source: "@ONE\nFeature: one\n\n  @unit\n  Scenario Outline: claims\n    Examples:\n      | clm         |\n      | CLM-ONE-001 |\n", excluded: 0 }],
  ])("[%s] Total of the claim codes written where no claim reads them", (_clm, { source, excluded }) => {
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

  it("[CLM-EVR-032] a job that calls a reusable workflow has no steps read in it, so it has no counts", () => {
    const calling = `${TWO_JOBS}  deploy:\n    uses: ./.github/workflows/deploy.yml\n`;
    const { jobs } = stepAccountOf(workflowSteps([calling], ["ci.yml"]), dispositionOf);
    expect(jobs.map(({ job, stepsRead }) => ({ job, stepsRead }))).toEqual([
      { job: "build", stepsRead: 4 },
      { job: "check", stepsRead: 2 },
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
  it.each<[string, { reconciled: Reconciled; ran: number }]>([
    ["CLM-EVR-034", { reconciled: () => [outOfBalance([{ outcome: "cannot-fail", kind: "fitness", obligation: { kind: "fitness" }, observation: observation("passed-on-error", "fitness") }])], ran: 1 }],
    ["CLM-EVR-035", { reconciled: () => [unnamed([{ outcome: "never-ran", kind: "fitness", observation: observation("never-ran", "fitness", []) }])], ran: 0 }],
    ["CLM-EVR-036", { reconciled: () => [outOfBalance([satisfied(), missing("fitness")])], ran: 0 }],
  ])("[%s] balance counts a fitness function as run only when its Evidence Observation ran", (_clm, { reconciled, ran }) => {
    expect(totalsOf(reconciled(), 0).evidenceObservations.fitnessFunctionsRan).toBe(ran);
  });
});

describe("the provenance says what the run used", () => {
  const VERSION = { toolVersion: "0.1.256" };
  const TOOL_FOLDER = "/install/spec-controller/dist";

  it("[CLM-EVR-037] the provenance describes the run", () => {
    expect(provenanceOf({ target: "acme/web", ...VERSION }, []).target).toBe("acme/web");
  });

  it("[CLM-EVR-038] the provenance describes the run", () => {
    const { repo, head } = committedRepository("evr-source-");
    const identity = runIdentityOf({ givenSourceSha: "abc1234", head: readTargetHead(repo), ...readToolInstall(repo) });
    expect(head).not.toBe("abc1234");
    expect(provenanceOf(identity, []).sourceSha).toBe("abc1234");
  });

  it.each<[string, string, { target: string; hidden: readonly string[] }]>([
    ["CLM-EVR-039", "https://ci:s3cret@example.com/acme/web?x=1#y", { target: "acme/web", hidden: ["ci", "s3cret", "x=1", "#y"] }],
    ["CLM-EVR-039", "https://ci:s3cret@example.com/web?x=1#y", { target: "https://example.com/web", hidden: ["ci", "s3cret", "x=1", "#y"] }],
    ["CLM-EVR-039", "https://ci:s3cret@example.com/group/acme/web?x=1#y", { target: "acme/web", hidden: ["ci", "s3cret", "x=1", "#y"] }],
    ["CLM-EVR-039", "https://ci:s3cret@[fe80::1]/acme/web?x=1#y", { target: "acme/web", hidden: ["ci", "s3cret", "x=1", "#y"] }],
    ["CLM-EVR-039", "https://ci:s3/cret@example.com/web?x=1#y", { target: "unknown-target", hidden: ["ci", "s3", "cret", "x=1", "#y"] }],
    ["CLM-EVR-039", "git@github.com:web.git", { target: "github.com:web.git", hidden: ["git@"] }],
    ["CLM-EVR-039", "https://ci@/acme/web", { target: "unknown-target", hidden: ["ci"] }],
    ["CLM-EVR-039", "git@:acme/web.git", { target: "unknown-target", hidden: ["git"] }],
  ])("[%s] the provenance describes the run, from the origin %s", (_clm, remote, { target, hidden }) => {
    const { repo } = committedRepository("evr-origin-", remote);
    const provenance = provenanceOf(runIdentityOf({ origin: readTargetOrigin(repo), toolFolder: TOOL_FOLDER, ...VERSION }), []);
    expect(provenance.target).toBe(target);
    for (const part of hidden) expect(provenance.target).not.toContain(part);
  });

  it.each([
    ["CLM-EVR-045", "git@github.com:acme/web.git"],
    ["CLM-EVR-045", "ci:s3cret@github.com:acme/web.git"],
    ["CLM-EVR-045", "g@github.com:acme/web.git"],
    ["CLM-EVR-050", "github.com:acme/web.git"],
    ["CLM-EVR-049", "ssh://git@github.com/acme/web.git"],
  ])("[%s] the provenance describes the run, from the origin %s", (_clm, remote) => {
    const { repo } = committedRepository("evr-owner-repo-origin-", remote);
    expect(provenanceOf(runIdentityOf({ origin: readTargetOrigin(repo), toolFolder: TOOL_FOLDER, ...VERSION }), []).target).toBe("acme/web");
  });

  it.each([
    ["CLM-EVR-047", "/srv/git/web.git"],
    ["CLM-EVR-047", "../web"],
    ["CLM-EVR-047", "../web/"],
    ["CLM-EVR-047", "web.git"],
    ["CLM-EVR-047", "../a:b/web"],
    ["CLM-EVR-048", "file:///srv/git/web.git"],
  ])("[%s] the provenance describes the run, from the origin %s", (_clm, remote) => {
    const { repo } = committedRepository("evr-path-origin-", remote);
    expect(provenanceOf(runIdentityOf({ origin: readTargetOrigin(repo), toolFolder: TOOL_FOLDER, ...VERSION }), []).target).toBe("web");
  });

  it("[CLM-EVR-040] the provenance describes the run", () => {
    const { repo, head } = committedRepository("evr-tool-");
    writeFileSync(join(repo, "package.json"), JSON.stringify({ version: "0.1.256" }));
    expect(provenanceOf(runIdentityOf(readToolInstall(repo)), []).toolSha).toBe(head);
  });

  it("[CLM-EVR-041] the provenance describes the run", () => {
    const { repo } = committedRepository("evr-package-");
    const toolDir = join(repo, "node_modules", "spec-controller", "dist");
    mkdirSync(toolDir, { recursive: true });
    writeFileSync(join(repo, "node_modules", "spec-controller", "package.json"), JSON.stringify({ version: "0.1.256" }));
    const provenance = provenanceOf(runIdentityOf(readToolInstall(toolDir)), []);
    expect(provenance).not.toHaveProperty("toolSha");
    expect(provenance.toolVersion).toBe("0.1.256");
  });

  it("[CLM-EVR-046] the provenance describes the run", () => {
    const { repo } = committedRepository("evr-copied-in-");
    const toolDir = join(repo, "node_modules", "vendored", "spec-controller");
    mkdirSync(toolDir, { recursive: true });
    writeFileSync(join(repo, "node_modules", "vendored", "package.json"), JSON.stringify({ name: "vendored" }));
    const provenance = provenanceOf(runIdentityOf(readToolInstall(toolDir)), []);
    expect(provenance).not.toHaveProperty("toolSha");
    expect(provenance.toolVersion).toBe("unknown");
  });

  it.each<[string, { given?: string; root?: string; input: { readonly name: string; readonly path?: string } }]>([
    ["CLM-EVR-042", { given: "/work/acme/cucumber.json", input: { name: "cucumber", path: "cucumber.json" } }],
    ["CLM-EVR-043", { input: { name: "cucumber" } }],
    ["CLM-EVR-044", { given: "/work/acme/a.json", input: { name: "cucumber", path: "a.json" } }],
    ["CLM-EVR-044", { given: "/work/acme/a.json", root: "/work/acme/.", input: { name: "cucumber", path: "a.json" } }],
    ["CLM-EVR-044", { given: "/work/acme/a.json", root: "//work//acme/", input: { name: "cucumber", path: "a.json" } }],
    ["CLM-EVR-044", { given: "/work/acme/a.json", root: "/work/x/../acme", input: { name: "cucumber", path: "a.json" } }],
    ["CLM-EVR-044", { given: "/work/acme", input: { name: "junit", path: "." } }],
  ])("[%s] the provenance describes the run", (_clm, { given, root = "/work/acme", input }) => {
    const { inputs } = provenanceFrom(VERSION, [{ name: input.name, ...(given === undefined ? {} : { path: given }) }], root);
    expect(inputs).toEqual([input]);
  });
});

const A_PASSING_CLAIM = "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: a claim\n    Given a step\n";

function reconciledRun(run: Partial<RunToReconcile>): EvidenceReconciliation {
  return evidenceReconciliationOf({
    features: parsedFeatures([A_PASSING_CLAIM], ["one.feature"]),
    testObservations: [observation("passed")],
    steps: [],
    readings: { scripts: {}, shell: shellReading },
    configuration: targetConfigurationFrom({}, []),
    strict: false,
    provenance: provenanceOf({ toolVersion: "0.1.256" }, []),
    ...run,
  });
}

function headingsOf(markdown: string): string[] {
  return markdown.split("\n").flatMap((line) => (line.startsWith("## ") ? [line.slice(3)] : []));
}

describe("the Markdown report's sections will come in a fixed order", () => {
  it("[CLM-RPT-009] the Markdown report's sections will come in a fixed order, for a run reconciled with something for every section", () => {
    const evidenceReconciliation = reconciledRun({
      features: parsedFeatures([A_PASSING_CLAIM, "Feature: three\n\n  @unit @CLM-ONE-002\n  Scenario: another claim\n    Given a step\n"], ["one.feature", "three.feature"]),
      testObservations: [observation("failed"), observation("never-ran", "unit", [])],
      steps: workflowSteps([TWO_JOBS], ["ci.yml"]),
      configuration: targetConfigurationFrom({ specController: { runners: { unit: 3 } } }, []),
    });
    expect(headingsOf(renderMarkdown(evidenceReconciliation))).toEqual([
      coreText("provenance-heading"),
      coreText("errors-in-the-inputs-heading"),
      coreText("run-integrity-heading"),
      coreText("summary-heading"),
      coreText("claim-reconciliations-heading"),
    ]);
  });
});

describe("neither report will have an optional section the run had nothing for", () => {
  it.each([
    ["CLM-RPT-077", "errors-in-the-inputs-heading", "errorsInTheInputs"],
    ["CLM-RPT-021", "run-integrity-heading", "runIntegrity"],
    ["CLM-RPT-052", "step-account-heading", "stepAccount"],
  ] as const)("[%s] neither report has the section %s when the reconciled run had nothing for it", (_clm, section, key) => {
    const evidenceReconciliation = reconciledRun({});
    const markdown = renderMarkdown(evidenceReconciliation);
    expect({ markdown: markdown.includes(`# ${coreText(section)}\n`), json: key in (JSON.parse(renderJson(evidenceReconciliation)) as object) }).toEqual({
      markdown: false,
      json: false,
    });
  });
});

describe("a configuration setting balance cannot use will be left out", () => {
  it("[CLM-CFG-004] the setting \"unit\": 3 under runners is left out, and the reconciled run carries its error", () => {
    const { errorsInTheInputs } = reconciledRun({ configuration: targetConfigurationFrom({ specController: { runners: { unit: 3 } } }, []) });
    expect(errorsInTheInputs).toEqual({ configurationErrors: [{ kind: "configuration-wrong-kind", entry: "runners.unit" }] });
  });
});

describe("a misplaced or clashing claim code will be a claim code error", () => {
  it("[CLM-STG-056] a code in a file with no feature code, and the reconciled run carries the error", () => {
    const features = parsedFeatures(["Feature: three\n\n  @unit @CLM-ONE-002\n  Scenario: a claim\n    Given a step\n"], ["three.feature"]);
    expect(reconciledRun({ features }).errorsInTheInputs).toEqual({ claimCodeErrors: [{ kind: "no-feature-code", files: ["three.feature"] }] });
  });
});
