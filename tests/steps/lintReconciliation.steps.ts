/**
 * Step definitions for features/fitness-reconciliation.feature (the @LNT static-check
 * kind).
 *
 * @SCN-LNT-001 — the bidirectional @integration evidence marker (Evidence
 * Manifesto §9). This arm exercises the CITATION SEAM end-to-end: a fixture registry names the
 * bare check a runnable handle IS, the corpus names the stepless fitness scenario carrying it,
 * the running-check observer stamps that scenario's @SCN onto the run, and reconcile +
 * renderMarkdown produce the ledger. The CI config and package.json are the tool's OWN
 * (NOT a fixture — acceptance condition 1), so the check observed is genuinely wired over real
 * source. It complements the @unit test that proves the same posting in isolation.
 *
 * Assertions are ROW-SCOPED to the scenario's own row CELLS (per the earlier
 * hardening) — not a bare regex over the whole report, which would be toothless.
 *
 * Self-contained module-level outcome + distinct step text, so it shares no outcome
 * with ledger.steps.ts (Cucumber registers step definitions globally).
 *
 * Evidence: @SCN-LNT-001 — the seam-bearing first sub-issue; satisfied path.
 */

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseScenarios, evidenceReconciliationOf } from "@3f-consulting/spec-controller-core";
import { checkStaticEvidenceObligations } from "@3f-consulting/spec-controller-core";
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { renderMarkdown, runningStaticChecks, hasBrokenEvidence } from "@3f-consulting/spec-controller-core";
import type { Scenario, EvidenceObservation, Ledger } from "@3f-consulting/spec-controller-core";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import { summaryOf } from "../../packages/core/src/domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../../packages/core/src/domain/evidenceReconciliation.js";
// The citation seam's own pieces are core-INTERNAL (where a registry is authored is still open —
// the registry-home question, increment D), so they are reached by source path rather than
// promoted onto the frozen v1 barrel.
import {
  checkRegistryOf,
  registeredCheckTags as registeredCheckTagsOf,
  type CheckRegistry,
} from "../../packages/core/src/domain/checkRegistry.js";
import {
  citationOfScript,
  fitnessCitations,
} from "../../packages/core/src/parse/fitnessCitations.js";
// The `lint` quality-check carries two shapes since @SCN-CIP-003 (a static-check fact and a
// measurement), so a reader wanting a static check's own runnable handle asks for one.
import {
  isStaticCheckObservation,
  // @SCN-LNT-022 — the measurement artefact as its own reader takes it, so the fixture's bytes
  // are handed to the composition in the shape the composition asks for rather than an `any`.
  type MeasurementReport,
  // @SCN-LNT-031 — the CI walk itself, so the planted workflow is held to what the scenario says
  // it holds (two plain `run:` steps, a code on one) by the reader the observer uses rather than
  // by a second reading of the same YAML.
  ciRunSteps,
} from "@3f-consulting/spec-controller-core/internal";
import { parseTaggedScenarios } from "../../packages/core/src/parse/scenarios.js";
// @SCN-LNT-028 — the CI RUN's record as its own reader takes it, so the planted record is handed
// to the composition in the shape the composition asks for rather than an `any`.
import type { CiStepRecord } from "../../packages/core/src/parse/ciStepRecord.js";
import {
  carriesBar,
  // @SCN-LNT-026 — the ONE spelling of "does this row name its not-examined ending", asked here
  // exactly as the credit reader asks it, so the fixture is held to the fact the rule reads.
  type FitnessCheckIndex,
} from "../../packages/core/src/domain/fitnessChecks.js";
import {
  resolveFitnessChecks,
  // @SCN-LNT-032 — the fixture's REGISTRY read by the resolver the composition itself uses, so the
  // arm is held to the arrangement that puts one of its three checks on the obligation-side
  // observer rather than to a second reading of the same manifest.
  resolveCheckRegistry,
  type KillFloorReader,
} from "../../packages/core/src/parse/targetManifest.js";

/**
 * The reader the row resolver takes, for planted manifests that name no mutation gate.
 *
 * Every fixture below authors its bars as numbers, so the reader is never asked; it is passed
 * because a bar MAY name a gate instead (@SCN-MUT-012), and the resolver takes the record's reader
 * exactly as `resolveThresholds` does rather than reaching for a record of its own.
 */
const NO_GATE_RECORD: KillFloorReader = () => null;
// The fitness-axis credit arms run the reconcile composition itself rather than `runReconcile`:
// where a target's run record comes FROM is the gate's own question, and the reading is what
// these arms prove.
import { evidenceReconciliationFromSources } from "@3f-consulting/spec-controller-core";

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let scenarios: Scenario[];
let evidenceObservations: EvidenceObservation[];
let markdown: string;

// A RunContext fixture — the sibling provenance arg renderMarkdown now requires.
// These @LNT assertions are ROW-SCOPED to the verdict table cells, so
// the provenance header above leaves them byte-green (the Scenario-CRUD Read).
const CTX: RunContext = {
  target: "spec-controller",
  inputs: {},
  runStart: new Date("2026-01-01T00:00:00.000Z"),
  sourceSha: null,
};

// @SCN-LNT-005 outcome: the external target's resolved input paths, its parsed manifest (the
// registry AND the scripts — one read, since the arm asserts against both), and the Ledger the run
// produced. Held apart from `fitnessLedger` because this arm's corpus is the TARGET's, and the two
// being different documents is the whole subject.
let externalOpts: { features: string; ci: string; packageJson: string };
let externalPackageJson: {
  scripts?: Record<string, string>;
  specController?: { checkRegistry?: Record<string, string> };
};
let externalLedger: Ledger;

// @SCN-LNT-006 outcome: the registered bare check tags, and the corpus source read against them.
let registeredCheckTags: string[];
let corpusSource: string;

// @SCN-LNT-018 outcome: the CONFIGURED ROWS the converted route reads, over the same
// `corpusSource` the registered-tag arm builds. Left undefined by every other scenario, which is
// what keeps the reading inert for all of them — `parseScenarios` takes its own empty default.
let configuredFitnessChecks: FitnessCheckIndex | undefined;

// @SCN-LNT-001 / @SCN-LNT-002 outcome: the fixture registry and corpus the citation seam is read
// through, and the Ledger itself — the "exactly one row" count is over posted-credit IDENTITY,
// which the rendered report cannot carry.
let fitnessRegistry: CheckRegistry;
let fitnessCorpus: string;
let fitnessLedger: Ledger;

// @SCN-LNT-009 outcome: the corpus AS IT READS WHEN THE LEDGER IS BUILT, when that is not the one
// the run's citation was resolved against. Undefined for every other scenario, which is what keeps
// the two reads identical there.
let reconciledCorpus: string | undefined;

// @SCN-LNT-002 outcome: the planted tree the unwired check is read against.
let plantedCiSource: string;
let plantedScripts: PackageJsonScripts;

// @SCN-LNT-004 outcome: the BEHAVIOURAL-axis credit, cited to the same @SCN the fitness run cites.
// Held apart from `evidenceObservations` because the two axes are observed by different readers and
// only meet at the reconcile — which is the fact the arm exists to keep true.
let unitCredit: EvidenceObservation;

/** The runnable handle the fixture registry maps. It was spec-controller's own wired check until
 *  3F-3313; the name is fixture data here — the registry, the corpus and the workflow these arms
 *  read are all planted — so what it names in the tree was never load-bearing. */
const CITED_SCRIPT = "lint:feature-codes";

/** The planted unwired handle — fixture-only; never a real in-repo script. */
const PLANTED_SCRIPT = "lint:planted-watermelon";

/** The registered handle nothing implements — fixture-only, and the point of the absent arm. */
const ABSENT_SCRIPT = "lint:absent-check";

/** The two-axis arm's unwired handle. The bare tag the registry maps it to is a DIFFERENT word
 *  (`unwired-check`), so nothing but the citation can join that obligation to this credit. */
const UNWIRED_SCRIPT = "lint:unwired-check";

/**
 * @SCN-LNT-015 outcome: the pairing the REGISTRY names — which row each handle's run credits.
 * Held as the table said it, because the Then asserts the credit landed where the ENTRY named
 * rather than where the corpus happened to reach first, and reading the pairing back off the
 * registry under test would let a reading that lost the `@SCN` assert against its own loss.
 */
let namedCitations: { script: string; check: string; scenario: string }[];

/**
 * Extract a scenario's OWN ledger LEDGER row, split into its cells — `| <scnId> |
 * <verdict> | <reconciling items> |` → the verdict + items CELLS, so an assertion scopes
 * to the row, not the whole report.
 *
 * Scoped to the `## Scenario Reconciliations` section: the reformat moved the ledger
 * to the end and added summary cuts above it that ALSO mention the scnId in a first cell —
 * the `### Lint evidence obligations` table (`| <scnId> | <guard> | <outcome> |`) and
 * the by-feature table — so a whole-report search would shadow the ledger row. Searching
 * only the ledger, matching the scnId in the FIRST cell, keeps the assertions on-target.
 */
function rowCells(scnId: string): { verdict: string; items: string } {
  const ledgerStart = markdown.indexOf("## Scenario Reconciliations");
  const ledger = ledgerStart >= 0 ? markdown.slice(ledgerStart) : markdown;
  const row = ledger.split("\n").find((line) => {
    if (!line.startsWith("|")) return false;
    const cells = line.split("|").map((c) => c.trim());
    return cells[1] === scnId;
  });
  assert.ok(row, `expected a ledger row for ${scnId}; got:\n${markdown}`);
  const cells = row.split("|").map((c) => c.trim());
  // cells: ['', scnId, verdict, items, ''].
  return { verdict: cells[2] ?? "", items: cells[3] ?? "" };
}

// @SCN-LNT-001
// @SCN-LNT-002
// @SCN-LNT-003
// @SCN-LNT-004
// @SCN-LNT-008
// @SCN-LNT-009
Given(
  "{string} is registered as the fitness check {string}",
  function (script: string, check: string) {
    // The registry, as data. It is FIXTURE-supplied here: spec-controller's own tree registers
    // nothing until the corpus sweep (3F-2589), so the seam reads inert over the real tree while
    // this arm still exercises it end-to-end.
    fitnessRegistry = checkRegistryOf({ [script]: check });
    // Every arm below opens on this step, so it is where the divergent-corpus opt-in is cleared:
    // module-level fixtures outlive a cucumber scenario, and a stale one would silently reconcile
    // the NEXT arm against a corpus it never asked for.
    reconciledCorpus = undefined;
  }
);

// @SCN-LNT-001
// @SCN-LNT-002
// @SCN-LNT-003
// @SCN-LNT-008
// @SCN-LNT-015
// @SCN-LNT-016
// @SCN-LNT-017
Given("a stepless fitness scenario carries the bare check {string}", function (check: string) {
  // NO steps — the fitness shape. The corpus is the second hop of the citation seam, so the
  // scenario that CARRIES the check is the one the run will come to cite.
  fitnessCorpus = [
    "@LNT",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @${check} @SCN-AAA-001`,
    "    Scenario: the tree stays inside this check's threshold",
  ].join("\n");
});

// @SCN-LNT-008
// @SCN-LNT-015
// @SCN-LNT-016
// @SCN-LNT-017
Given(
  "a second stepless fitness scenario carries the same bare check {string}",
  function (check: string) {
    // THE CORPUS FAULT, planted. A second STEPLESS scenario carrying the SAME bare check raises the
    // SAME obligation — the obligation rule reads the tag off each scenario's own shape
    // (@SCN-LNT-006) and knows nothing of the other — so the ledger holds two debits for one run.
    // Appended rather than replacing, because corpus ORDER is what decides which one the credit
    // reaches: this one is second, and second gets nothing.
    fitnessCorpus = [
      fitnessCorpus,
      "",
      `    @${check} @SCN-AAA-002`,
      "    Scenario: a second scenario claiming the same check",
    ].join("\n");
  }
);

// @SCN-LNT-017
Given(
  "a third stepless fitness scenario carries a different bare check {string}",
  function (check: string) {
    // THE NEAR-MATCH'S TARGET, and the row that makes this scenario more than @SCN-LNT-016's
    // fixture. It EXISTS — a real stepless fitness scenario the corpus carries — so an entry
    // naming it names something a reader can find; what it does not carry is the characteristic
    // the entry claims. Membership is per-characteristic, and existence is not membership.
    fitnessCorpus = [
      fitnessCorpus,
      "",
      `    @${check} @SCN-AAA-003`,
      "    Scenario: a scenario claiming a different check entirely",
    ].join("\n");
  }
);

// @SCN-LNT-015
// @SCN-LNT-016
// @SCN-LNT-017
Given(
  "these registry entries name the fitness scenario each check credits",
  function (entries: DataTable) {
    // THE RELOCATED ARM, as a target authors it. Each entry carries the characteristic its handle
    // asserts AND the `@SCN` of the row its run credits — the second term being the one fact the
    // handle alone can no longer supply once one characteristic names several checks.
    namedCitations = entries.hashes() as { script: string; check: string; scenario: string }[];
    fitnessRegistry = checkRegistryOf(
      Object.fromEntries(
        namedCitations.map((entry) => [entry.script, { check: entry.check, scn: entry.scenario }])
      )
    );
    // Cleared for the reason every registering Given clears it: module-level fixtures outlive a
    // cucumber scenario, and a stale divergent corpus would reconcile this arm against a corpus it
    // never asked for.
    reconciledCorpus = undefined;
  }
);

// @SCN-LNT-012
Given(
  "{string} and {string} are registered as the fitness checks {string} and {string}",
  function (script: string, otherScript: string, check: string, otherCheck: string) {
    // TWO registered handles, and the ORDER is load-bearing. `checkStaticEvidenceObligations` is
    // driven by the registry's own key order, so the wired check is observed FIRST — which is the
    // credit a reader matching on the @SCN alone finds and hands to both obligations. Registering
    // them the other way round would hide the fault behind an accident of iteration.
    fitnessRegistry = checkRegistryOf({ [script]: check, [otherScript]: otherCheck });
    // Cleared here for the same reason the single-check Given clears it: module-level fixtures
    // outlive a cucumber scenario, and a stale divergent corpus would reconcile this arm against
    // a corpus it never asked for.
    reconciledCorpus = undefined;
  }
);

// @SCN-LNT-012
Given(
  "a stepless fitness scenario carries both bare checks {string} and {string}",
  function (check: string, otherCheck: string) {
    // ONE ROW OWING TWO FITNESS OBLIGATIONS — a legal corpus, and the shape the citation seam is
    // not unique over. `fitnessCitations` maps each bare tag to the scenario carrying it, so BOTH
    // tags here resolve to SCN-AAA-001 and both runs cite it. Nothing about that is a fault; what
    // the arm settles is whether the reconciler can still tell the two credits apart.
    fitnessCorpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${check} @${otherCheck} @SCN-AAA-001`,
      "    Scenario: the tree stays inside both thresholds",
    ].join("\n");
  }
);

// @SCN-LNT-012
Given(
  "the planted package.json defines both scripts while the planted CI config runs only {string}",
  function (wired: string) {
    // THE TWO CREDITS MUST DISAGREE, or the arm proves nothing. Both scripts EXIST, so neither
    // obligation can read `missing`; only one is a CI run step, so one credit is satisfied-shaped
    // and the other is the watermelon. A fixture wiring both would let a reader that smears one
    // credit across both obligations pass — the outcomes would coincide and the smear would be
    // invisible. `typecheck` is the planted unwired one deliberately: it is the ONE check whose
    // runnable handle and bare tag are the same word, so a name-match reading also survives here,
    // and the arm has to be able to fail it.
    plantedCiSource = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      `      - name: Complexity`,
      `        run: pnpm ${wired}`,
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");
    plantedScripts = {
      scripts: {
        [wired]: "tsx scripts/planted-complexity.ts",
        typecheck: "tsc --noEmit",
        test: "vitest run",
      },
    };
  }
);

// @SCN-LNT-009
Given("that fitness scenario is renumbered after the run cites it", function () {
  // THE TWO READS, made to disagree the way a real corpus does. The run's @SCN is stamped when the
  // check is OBSERVED, and the row it names is looked for in the corpus as it reads when the ledger
  // is built. Renumbering between the two is the smallest honest way to produce that disagreement;
  // retiring the scenario, or reconciling a feature file the cited one does not live in, produce
  // the same fact. The citation is still resolved against `fitnessCorpus` — only the reconciled
  // read moves.
  reconciledCorpus = fitnessCorpus.replace("SCN-AAA-001", "SCN-AAA-002");
});

// @SCN-LNT-001
Given("a second scenario would have claimed the same run under name-match", function () {
  // The row name-match ALSO posted this run to. Without it "exactly one row" asserts nothing:
  // a corpus of one row cannot tell a citation from a smear.
  //
  // THE RETIRED TAG FORM HERE IS DELIBERATE AND STAYS (3F-2624's sweep classified it a KEEPER).
  // It is not a corpus that forgot to migrate: it is the NEGATIVE CONTROL, planted so that a
  // reader which re-grew the by-name route — keyed on exactly this spelling — would put the run
  // on two rows and red. Sweeping it to a bare tag would make the second row a genuine second
  // fitness scenario, which is @SCN-LNT-008's subject and a different outcome entirely.
  fitnessCorpus = [
    fitnessCorpus,
    "",
    `    @lint=${CITED_SCRIPT} @SCN-AAA-002`,
    "    Scenario: a fixture scenario naming the same handle the retired way",
    "      Given a fixture step",
  ].join("\n");
});

// @SCN-LNT-001
// @SCN-LNT-008
// @SCN-LNT-009
// @SCN-LNT-015
// @SCN-LNT-016
// @SCN-LNT-017
When(
  "the fitness checks wired into CI are observed and reconciled",
  function () {
    // A PLANTED WORKFLOW WIRING EXACTLY THE REGISTERED HANDLES, and the plant is the migration
    // working rather than a retreat from it (3F-3165, under 3F-3139). This arm read the
    // checked-out ci.yml and package.json until the conversion emptied them: a converted fitness
    // check is not a CI `run:` step at all — its command sits on a `specController.fitnessChecks`
    // row and its own CI step invokes it — so this repository wires no discovered static
    // check for these arms to observe. 3F-3153 measured that coming ("under the full migration no
    // characteristic retains two wired handles at all… the durable answer is a planted tree rather
    // than the real one") and left the move to 3F-3139. This is that move.
    //
    // WHAT THE REAL READ BOUGHT AND WHAT IT DID NOT. It bought a genuine workflow under the
    // OBSERVER; what these arms assert is the CITATION SEAM — which row a run's credit posts to —
    // decided by the registry and the corpus, both of which were always fixtures here. The
    // observer's own reading of a workflow document is still held by the arms that own it
    // (@SCN-USG-001..010, @SCN-LDG-*), over the workflows they plant.
    //
    // THE PLANT STATES ITS OWN PREMISE. Wiring exactly the handles the registry names means the
    // fixture cannot go quietly false the way it did here: a handle nobody registered is not wired,
    // and one that is registered is, which is the condition each of these scenarios says it has.
    const handles = [...fitnessRegistry.keys()];
    const ciSource = [
      "name: CI",
      "jobs:",
      "  ci:",
      "    steps:",
      ...handles.map((handle) => `      - run: pnpm ${handle}`),
    ].join("\n");
    const packageJson: PackageJsonScripts = {
      scripts: Object.fromEntries(handles.map((handle) => [handle, `tsx ${handle}.ts`])),
    };

    const checkTags = registeredCheckTagsOf(fitnessRegistry);
    // TWO READS, and they are the same one unless an arm has said otherwise: the citation is
    // resolved against the corpus as it read when the check was OBSERVED, and the row it names is
    // looked for in the corpus as it reads when the LEDGER is built (@SCN-LNT-009).
    scenarios = parseScenarios(reconciledCorpus ?? fitnessCorpus, [], checkTags);
    const citations = fitnessCitations(parseTaggedScenarios(fitnessCorpus), checkTags);
    evidenceObservations = runningStaticChecks([ciSource], packageJson, ["lint:"], [], (script) =>
      citationOfScript(script, fitnessRegistry, citations)
    );

    const reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false);
    fitnessLedger = reconciliation.ledger;
    markdown = renderMarkdown(reconciliation, CTX);
  }
);

// @SCN-LNT-002
// @SCN-LNT-004
Given(
  "a planted package.json defines the script {string} but the planted CI config does not run it",
  function (script: string) {
    // The PLANTED watermelon — a fixture ci.yml + fixture package.json, NOT the tool's real tree:
    // the script EXISTS (fixture-green) but its command is absent from the CI config, so it guards
    // nothing over real source. spec-controller cannot keep a permanent real watermelon, and the
    // planted script is never a real in-repo one (acceptance bar: the detector CATCHES it over the
    // planted fixture, rather than the outcome being asserted).
    plantedCiSource = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Type-check",
      "        run: pnpm typecheck",
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");
    plantedScripts = {
      scripts: {
        [script]: "tsx scripts/planted-watermelon.ts",
        test: "vitest run",
        typecheck: "tsc --noEmit",
      },
    };
  }
);

// @SCN-LNT-002
// @SCN-LNT-003
// @SCN-LNT-012
When("the registered fitness checks are observed and reconciled", function () {
  // THE OBLIGATION-SIDE OBSERVER, CITING. The running-check reader cannot carry this case at all:
  // it observes what CI RUNS, so a check that runs nowhere is precisely what it filters out. The
  // registry's own handles are therefore what is observed here, and the citation is resolved over
  // the same two hops the running arm uses (@SCN-LNT-001) — one seam, whichever reader reaches it.
  const checkTags = registeredCheckTagsOf(fitnessRegistry);
  scenarios = parseScenarios(fitnessCorpus, [], checkTags);
  const citations = fitnessCitations(parseTaggedScenarios(fitnessCorpus), checkTags);
  evidenceObservations = checkStaticEvidenceObligations(
    [...fitnessRegistry.keys()],
    [plantedCiSource],
    plantedScripts,
    (script) => citationOfScript(script, fitnessRegistry, citations)
  );

  const reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false);
  fitnessLedger = reconciliation.ledger;
  markdown = renderMarkdown(reconciliation, CTX);
});

// @SCN-LNT-003
Given(
  "the planted package.json defines no script {string} and the planted CI config does not run it",
  function (script: string) {
    // The watermelon's planted tree with ONE fact changed — the script is gone. Both arms are read
    // by the same observer through the same When, so the difference the pair proves is exists:true
    // against exists:false and nothing else. The planted handle is never a real in-repo script.
    plantedCiSource = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Type-check",
      "        run: pnpm typecheck",
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");
    plantedScripts = {
      scripts: {
        test: "vitest run",
        typecheck: "tsc --noEmit",
      },
    };
    assert.ok(
      !(script in (plantedScripts.scripts ?? {})),
      `expected the planted package.json to define no script "${script}"`
    );
  }
);

// @SCN-LNT-004
Given(
  "a stepless scenario carries the bare check {string} and also requires a unit test",
  function (check: string) {
    // ONE ROW, TWO AXES. The two bare tags are flat peers and each raises its own obligation —
    // `{ qualityCheck: "unit" }` from @unit, `{ qualityCheck: "lint", staticCheck }` from the
    // registered check tag — so the reconciler meets a row owing evidence on both.
    //
    // The shape below is not an endorsement of mixed tagging — whether one scenario may carry a
    // tier tag and a fitness tag together is @SCN-STG-005's question — it is the only shape from
    // which a two-axis row can be read at all. It is stepless because a fitness scenario ordinarily
    // is, not because the obligation rule reads the shape: it no longer does (@SCN-LNT-006).
    fitnessCorpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @${check} @SCN-AAA-001`,
      "    Scenario: the tree stays inside this check's threshold",
    ].join("\n");
  }
);

// @SCN-LNT-004
Given("the unit test for that scenario passes", function () {
  // The behavioural credit, CITING — the same route, and the same @SCN, the fitness credit will
  // arrive by. A green here is what makes the arm load-bearing: if the axes could smear, this is
  // the credit that would wrongly discharge the fitness obligation and turn the watermelon green.
  unitCredit = { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed" };
});

// @SCN-LNT-004
When("the registered fitness checks and the unit result are observed and reconciled", function () {
  // TWO READERS, ONE RECONCILE. The behavioural credit is a test run's result and the fitness
  // credit comes from the obligation-side reader over the planted tree (@SCN-LNT-002) — they are
  // observed apart and meet only here, which is where independence is either kept or lost.
  const checkTags = registeredCheckTagsOf(fitnessRegistry);
  scenarios = parseScenarios(fitnessCorpus, [], checkTags);
  const citations = fitnessCitations(parseTaggedScenarios(fitnessCorpus), checkTags);
  evidenceObservations = [
    unitCredit,
    ...checkStaticEvidenceObligations(
      [...fitnessRegistry.keys()],
      [plantedCiSource],
      plantedScripts,
      (script) => citationOfScript(script, fitnessRegistry, citations)
    ),
  ];

  const reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations, [], false, false);
  fitnessLedger = reconciliation.ledger;
  markdown = renderMarkdown(reconciliation, CTX);
});

// @SCN-LNT-006
Given("{string} is a registered fitness check", function (check: string) {
  // The registry, as the obligation rule takes it — data, not a prefix heuristic. A tag names a
  // check only because something registered it; without this the corpus could not tell @complexity
  // from @smoke, and every unrecognised tag would be a candidate check.
  registeredCheckTags = [check];
});

// @SCN-LNT-010
Given(
  "{string} is a registered fitness check alongside {string} and {string}",
  function (check: string, peer: string, otherPeer: string) {
    // THE COMPANY IS THE ASSERTION. A registry of one cannot tell a peer from a catch-all — both
    // raise a single obligation over a scenario carrying a single tag, so @SCN-LNT-006's fixture is
    // silent on the question this scenario exists to settle. With the peers registered, a @lint that
    // still stood for the class would owe all three.
    //
    // The peers are registered and NEVER tagged: the corpus below carries @lint alone, so the only
    // way an obligation for `complexity` or `typecheck` can reach that row is a rule that reads the
    // registry rather than the scenario's own tags.
    // Three named parameters rather than a rest: cucumber matches a step definition's ARITY against
    // the expression's capture count, so a variadic signature reads as one argument and never binds.
    registeredCheckTags = [check, peer, otherPeer];
  }
);

// @SCN-LNT-006
// @SCN-LNT-010
Given(
  "a stepless scenario tagged with the bare fitness check {string}",
  function (check: string) {
    // NO steps — the shape a fitness scenario HAS, because it is a declared obligation, nothing
    // runs it, and there is nothing for a step to exemplify. Both callers read this ONE row and
    // nothing else: it is the only shape there is to read the rule on.
    corpusSource = [
      "@FIT",
      "Feature: fitness",
      "  Rule: the tree stays inside its thresholds",
      `    @${check} @SCN-AAA-001`,
      "    Scenario: the codebase stays under the threshold",
    ].join("\n");
  }
);

// @SCN-LNT-007
Given(
  "a scenario tagged with the retired @lint= form naming the runnable handle {string}",
  function (handle: string) {
    // THE HANDLE IS THE REGISTERED ONE. `registeredCheckTags` is derived from the fixture registry
    // the preceding Given built, so the check this handle runs IS registered — which is what makes
    // the expectation below a claim about the reader rather than about an unknown word. A rule that
    // re-routed the retired form through the registry would raise `feature-codes` here and pass a
    // fixture whose handle nothing registered.
    registeredCheckTags = registeredCheckTagsOf(fitnessRegistry);
    // STEPPED, because that is the shape the retired form always rode: it named a runnable script
    // from a behavioural scenario, which is the smear the bare tag replaced. The scenario carries
    // NO other evidence tag, so the whole obligation list is the one this form would have raised —
    // and "raises nothing" is therefore an assertion about the empty list, not about a filter.
    corpusSource = [
      "@FIT",
      "Feature: fitness",
      "  Rule: the retired form is inert",
      `    @lint=${handle} @SCN-AAA-003`,
      "    Scenario: a behavioural scenario still spelling the retired form",
      "      Given the target source",
    ].join("\n");
  }
);

// @SCN-LNT-018
Given(
  "a configured row names the scenario {string} as the fitness check {string}",
  function (scn: string, check: string) {
    // THE ROW IS THE ONLY PLACE THE CHARACTERISTIC IS WRITTEN in this scenario — the corpus the
    // next Given builds carries the bare axis tag and nothing else — so the expectation at the
    // foot is a claim about this row rather than about a tag that happens to spell the same word.
    // Keyed by the @SCN, which is what removes the registry hop: a converted check is not
    // discovered as a script handle, it is a scenario that ran carrying its own tag line.
    configuredFitnessChecks = new Map([[scn, { characteristic: check }]]);
  }
);

// @SCN-LNT-018
Given(
  "that scenario carries the bare fitness axis tag and no characteristic tag",
  function () {
    // NO characteristic tag anywhere on the row. A rule still reading the tag for the subject has
    // nothing to read here, so it answers the empty list and the Then reds — which is what makes
    // this fixture a discriminator rather than a restatement of @SCN-LNT-006's.
    corpusSource = [
      "@FIT",
      "Feature: fitness",
      "  Rule: the tree stays inside its thresholds",
      "    @fitness @SCN-AAA-001",
      "    Scenario: the codebase stays under the threshold",
    ].join("\n");
  }
);

// @SCN-LNT-018
Given("the axis tag reaches it a second time, hoisted onto its Rule", function () {
  // A scenario's effective tags are its own plus its Rule's and its Feature's (@SCN-LDG-020), so
  // the SAME corpus is rebuilt with the axis tag hoisted as well — one read, one row, the tag
  // arriving twice. Owed once: two obligations for one characteristic would leave the second
  // missing for ever, since one run is one credit and can cite one @SCN.
  corpusSource = [
    "@FIT",
    "Feature: fitness",
    "  @fitness",
    "  Rule: the tree stays inside its thresholds",
    "    @fitness @SCN-AAA-001",
    "    Scenario: the codebase stays under the threshold",
  ].join("\n");
});

/**
 * One table row as a MANIFEST would spell it (@SCN-LNT-019) — the three terms a check says about
 * itself, plus the bar where the row names one.
 *
 * The `at least` cell is written through UNTOUCHED where it is not a number, which is the whole of
 * what makes the middle row of the table a bar nothing can read rather than a bar this helper
 * quietly repaired. An empty cell names no bar KEY at all, which is the static case.
 */
function manifestRowOf(row: Record<string, string>): Record<string, unknown> {
  const named = {
    scn: row["scenario"],
    characteristic: row["check"],
    // The COMMAND half of the row, present because a real row carries it and unread on this side.
    command: "the command this check runs",
  };
  const authored = row["at least"] ?? "";
  if (authored === "") return named;
  const number = Number(authored);
  return { ...named, atLeast: Number.isNaN(number) ? authored : number };
}

// @SCN-LNT-019
Given(
  "a target configures these fitness rows, and only the bar each names differs",
  function (table: DataTable) {
    // READ THROUGH THE TARGET'S OWN MANIFEST, not hand-built as a registry, because the claim is
    // about the ROW's shape and the shape is a property of what the target wrote. A hand-built
    // registry would assert against this test's own reading of the rows rather than the engine's.
    configuredFitnessChecks = resolveFitnessChecks(
      { specController: { fitnessChecks: table.hashes().map(manifestRowOf) } },
      NO_GATE_RECORD
    );
  }
);

// @SCN-LNT-019
Given(
  "each of those scenarios carries the bare fitness axis tag and no characteristic tag",
  function () {
    // NO characteristic tag and NO threshold entry anywhere: the only thing separating these three
    // scenarios is the bar its own row named, so the three different obligations at the foot are a
    // claim about the rows and about nothing else on the corpus.
    corpusSource = [
      "@FIT",
      "Feature: fitness",
      "  Rule: the tree stays inside its bars",
      "    @fitness @SCN-AAA-002",
      "    Scenario: the tree stays above its mutation floor",
      "    @fitness @SCN-AAA-003",
      "    Scenario: the tree stays above its coverage floor",
      "    @fitness @SCN-AAA-001",
      "    Scenario: the codebase stays under the complexity threshold",
    ].join("\n");
  }
);

// @SCN-LNT-006
// @SCN-LNT-007
// @SCN-LNT-010
// @SCN-LNT-018
// @SCN-LNT-019
When("the scenario corpus is read", function () {
  scenarios = parseScenarios(corpusSource, [], registeredCheckTags, undefined, configuredFitnessChecks);
});

// @SCN-LNT-018
Then(
  "that scenario raises exactly one Evidence Obligation, naming the fitness check {string}",
  function (check: string) {
    // WHOLE-CORPUS equality, so "exactly one" excludes a rule that raised the obligation twice for
    // the twice-arriving tag as firmly as one that raised it under another name or not at all.
    assert.deepEqual(
      scenarios.map((scenario) => scenario.evidenceObligations),
      [[{ qualityCheck: "lint", staticCheck: check }]],
      `expected the converted row to raise ONE lint Evidence Obligation naming "${check}" — the ` +
        `tag names the axis and the configured row names the characteristic; ` +
        `got ${JSON.stringify(scenarios)}`
    );
  }
);

// @SCN-LNT-019
Then(
  "the three raise, in turn, a measured Evidence Obligation holding that floor whole, a measured one holding no bar, and a plain static one",
  function () {
    // WHOLE-CORPUS equality over all three rows at once, so a rule that raised the measured shape
    // for every row — or the static shape for every row — reds as firmly as one that dropped a row
    // or picked the number out of the bar and left the direction behind.
    assert.deepEqual(
      scenarios.map((scenario) => scenario.evidenceObligations),
      [
        [
          {
            qualityCheck: "lint",
            staticCheck: "mutation",
            measured: true,
            threshold: 90,
            atLeast: true,
          },
        ],
        // MEASURED WITH NO BAR is the legal, loud shape (@SCN-CIP-002): the flag routes the
        // obligation to the comparison arm, and the bar nobody wrote is what that arm reports.
        [{ qualityCheck: "lint", staticCheck: "coverage", measured: true }],
        [{ qualityCheck: "lint", staticCheck: "complexity" }],
      ],
      `expected the ROW'S SHAPE to decide the obligation — a row naming a bar measured and holding ` +
        `it whole, a row naming one nothing can read measured and holding none, a row naming none ` +
        `plain static; got ${JSON.stringify(scenarios)}`
    );
  }
);

// @SCN-LNT-007
Then(
  "the scenario raises no Evidence Obligation at all — the retired form names nothing",
  function () {
    // WHOLE-LIST equality against the EMPTY list, and over the whole corpus: "raises nothing" has
    // to exclude a rule that raised the obligation under a different name, or onto a second row,
    // as well as one that raised it unchanged. A `.length === 0` on one scenario would pass all
    // three.
    assert.deepEqual(
      scenarios.map((scenario) => scenario.evidenceObligations),
      [[]],
      `expected the retired @lint= form to raise NO Evidence Obligation — it supplies no citation, ` +
        `so anything it raised could never be credited and would read missing for ever; ` +
        `got ${JSON.stringify(scenarios)}`
    );
  }
);

// @SCN-LNT-006
// @SCN-LNT-010
Then(
  "the scenario raises exactly one Evidence Obligation, naming the fitness check {string}",
  function (check: string) {
    // WHOLE-CORPUS equality over the one row the corpus holds, so "exactly one" excludes a rule
    // that raised the obligation TWICE for a twice-arriving tag as firmly as one that raised it
    // under another name, on a second row, or not at all. A `.length === 1` on scenario zero would
    // pass all but the last.
    //
    // ONE ROW, AND IT IS STEPLESS, because that is the only shape a fitness scenario has: it is a
    // declared obligation and nothing runs it. The arm that stood beside this one read a STEPPED
    // row and asserted the shape made no difference — which certified the retired ruling whichever
    // way it pointed, so it is gone rather than inverted.
    assert.deepEqual(
      scenarios.map((scenario) => scenario.evidenceObligations),
      [[{ qualityCheck: "lint", staticCheck: check }]],
      `expected the stepless row to raise ONE lint Evidence Obligation naming "${check}" — the ` +
        `registered bare check tag names the axis; got ${JSON.stringify(scenarios)}`
    );
  }
);

// @SCN-LNT-005
Given(
  "an external target whose package.json registers {string} as the fitness check {string}",
  function (script: string, check: string) {
    // Point at the PLANTED EXTERNAL fixture (tests/fixtures/scn-lnt-005/) — a whole target
    // repository in one directory: its own registry, its own corpus, its own scripts, its own CI.
    // The three Givens that follow assert the fixture genuinely holds what this scenario says it
    // holds. Without them the fixture could drift into agreeing with the tool's own tree and the
    // arm would go on passing while proving nothing — the one failure a cross-repo scenario
    // cannot afford, because the whole claim is about WHERE an input came from.
    const fixture = join(process.cwd(), "tests/fixtures/scn-lnt-005");
    externalOpts = {
      features: join(fixture, "features"),
      ci: join(fixture, "ci.yml"),
      packageJson: join(fixture, "package.json"),
    };
    externalPackageJson = JSON.parse(readFileSync(externalOpts.packageJson, "utf8")) as {
      scripts?: Record<string, string>;
      specController?: { checkRegistry?: Record<string, string> };
    };
    assert.equal(
      externalPackageJson.specController?.checkRegistry?.[script],
      check,
      `expected the external target to register "${script}" as the fitness check "${check}"`
    );
  }
);

// @SCN-LNT-005
Given(
  "that target's corpus carries a stepless fitness scenario tagged with the bare check {string}",
  function (check: string) {
    // Read through the engine's own corpus reader rather than a regex over the fixture: a second
    // opinion about a scenario's shape is exactly the disagreement `parseTaggedScenarios` was
    // extracted to prevent. Steplessness is asserted as a fact about THIS fixture — the external
    // target's row is written the ordinary way — not as what makes it a fitness scenario, which is
    // its registered bare check tag and nothing else (@SCN-LNT-006).
    const source = readFileSync(join(externalOpts.features, "target.feature"), "utf8");
    const fitness = parseTaggedScenarios(source).filter((s) => s.stepless && s.tags.includes(check));
    assert.deepEqual(
      fitness.map((s) => s.scnId),
      ["SCN-EXT-001"],
      `expected the external corpus to carry one stepless scenario tagged "${check}"`
    );
  }
);

// @SCN-LNT-005
Given(
  "that target's package.json defines the script {string} while its CI config does not run it",
  function (script: string) {
    assert.ok(
      externalPackageJson.scripts?.[script] !== undefined,
      `expected the external package.json to define the script "${script}"`
    );
    assert.doesNotMatch(
      readFileSync(externalOpts.ci, "utf8"),
      new RegExp(`run:.*${script}`),
      `expected the external CI config NOT to run "${script}"`
    );
  }
);

// @SCN-LNT-005
Given(
  "spec-controller's own package.json defines no such script and registers no such check",
  function () {
    // THE NEGATIVE THE OUTCOME RESTS ON, asserted rather than assumed. A reader falling back to the
    // tool's own manifest finds no script here and reports the check as one nobody wrote, so the row
    // would read missing instead of the watermelon. The day spec-controller acquires a script or a
    // registry entry by either of these names, this arm stops being able to tell the two reads
    // apart — and it says so here rather than quietly going green for the wrong reason.
    const own = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
      specController?: { checkRegistry?: Record<string, string> };
    };
    const registry = own.specController?.checkRegistry ?? {};
    for (const script of Object.keys(externalPackageJson.scripts ?? {})) {
      if (!script.startsWith("lint:")) continue;
      assert.equal(
        own.scripts?.[script],
        undefined,
        `expected spec-controller's own package.json NOT to define "${script}"`
      );
      assert.equal(
        registry[script],
        undefined,
        `expected spec-controller's own registry NOT to name "${script}"`
      );
    }
  }
);

// @SCN-LNT-005
When("the reconciler runs against that external target", function () {
  // Drive the CLI read/reconcile core end-to-end (the cross-component arm): the target's
  // registry and corpus resolve the citation, the target's package.json and CI supply
  // exists / enforced-over-real-source, then reconcile and render.
  // THE AXIS GATES ARE THE CONCEPT'S NOW (3F-2233), so they are stated here rather than at the
  // render call. This scenario is authored against the gates OFF — with the fitness axis on, the
  // ledger row gains its evidence column and `rowCells` (which picks by POSITION) reads that cell
  // as the verdict. The reconciliation is identical either way: same `out-of-balance` verdict,
  // same 🍉 item.
  const external = runReconcile(externalOpts);
  externalLedger = external.ledger;
  markdown = renderMarkdown(
    { summary: summaryOf(external.ledger, false, false), ledger: external.ledger },
    CTX
  );
});

// @SCN-LNT-001
Then(
  "the run's observation posts to exactly one row — the fitness scenario's own",
  function () {
    // The identity of the posted credit, counted across the WHOLE ledger. Under name-match this
    // same object posted to every row naming the handle, so a rule that kept name-routing a
    // citing credit puts SCN-AAA-002 in this list too and the assertion reds.
    const observation = evidenceObservations.find(
      (o) => isStaticCheckObservation(o) && o.staticCheck === CITED_SCRIPT
    );
    assert.ok(observation, `expected an observation of the running check "${CITED_SCRIPT}"`);
    assert.deepEqual(
      fitnessLedger.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation))
        .map((row) => row.scnId),
      ["SCN-AAA-001"],
      "expected the citing credit to post to the fitness scenario's row and to no other"
    );
  }
);

// @SCN-LNT-001
Then("that fitness scenario reconciles satisfied", function () {
  // The OUTCOME on the concept, and the same fact read back off the rendered row — the report
  // is where a reader meets it. A `missing` (the citation route not taken) flips both.
  const outcomes = (
    fitnessLedger.scenarioReconciliations.find((row) => row.scnId === "SCN-AAA-001")
      ?.qualityCheckReconciliations ?? []
  ).map((item) => item.outcome);
  assert.deepEqual(outcomes, ["satisfied"], "expected the fitness obligation to reconcile satisfied");

  const { verdict, items } = rowCells("SCN-AAA-001");
  assert.match(verdict, /\bbalanced\b/, `expected a balanced verdict cell; got "${verdict}"`);
  assert.doesNotMatch(verdict, /out-of-balance/, `expected not out-of-balance; got "${verdict}"`);
  assert.equal(items, "—", `expected no reconciling items; got "${items}"`);
});

// @SCN-LNT-002
Then(
  "that fitness scenario reconciles as the watermelon, naming the check {string}",
  function (check: string) {
    // THE CITATION IS WHAT MAKES THIS REACHABLE. The obligation's staticCheck is the BARE tag the
    // fitness scenario carries while the observation knows only the runnable handle, so nothing
    // matches by name and nothing could: an uncited observation leaves the obligation `missing`.
    const observation = evidenceObservations.find(
      (o) => isStaticCheckObservation(o) && o.staticCheck === PLANTED_SCRIPT
    );
    assert.equal(
      observation?.scnId,
      "SCN-AAA-001",
      `expected the unwired check's observation to cite the fitness scenario; got ${JSON.stringify(observation)}`
    );

    // The OUTCOME on the concept — the pair, so the item is pinned to name the BARE check rather
    // than the handle that ran it, and `watermelon` rather than `missing` or `satisfied`.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-001");
    assert.deepEqual(
      (row?.qualityCheckReconciliations ?? []).map((item) => [item.staticCheck, item.outcome]),
      [[check, "watermelon"]],
      `expected one watermelon reconciling item naming "${check}"; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
    );

    // And the same fact read back off the rendered row — the report is where a reader meets it.
    // Row-scoped to the scenario's own CELLS, so a bare regex over the report cannot pass it.
    const { verdict, items } = rowCells("SCN-AAA-001");
    assert.match(
      verdict,
      /out-of-balance/,
      `expected the fitness scenario's verdict cell to read out-of-balance for the unwired check "${check}"; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*Evidence Observation is passing but fabricated/,
      `expected the lint watermelon reconciling item for "${check}"; got "${items}"`
    );
    assert.match(items, /🍉/, `expected the watermelon item to carry the 🍉 glyph; got "${items}"`);
  }
);

// @SCN-LNT-003
Then(
  "that fitness scenario reconciles missing, naming the check {string}",
  function (check: string) {
    // THE SEAM REACHED THE ROW; there was nothing to credit it with. The observation carries the
    // scenario's @SCN exactly as the watermelon's does — the citation never depended on the script
    // existing — so what reads `missing` is the exists:false fact, not a citation that failed to
    // resolve. Pinning this is what stops the arm passing for the wrong reason.
    const observation = evidenceObservations.find(
      (o) => isStaticCheckObservation(o) && o.staticCheck === ABSENT_SCRIPT
    );
    assert.deepEqual(
      observation,
      {
        qualityCheck: "lint",
        staticCheck: ABSENT_SCRIPT,
        checkTag: "absent-check",
        exists: false,
        enforcedOverRealSource: false,
        scnId: "SCN-AAA-001",
      },
      `expected the absent check to be read as a citing exists:false record; got ${JSON.stringify(observation)}`
    );

    // The OUTCOME on the concept — the pair, so the item is pinned to name the BARE check rather
    // than the handle that found it, and `missing` rather than the watermelon.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-001");
    assert.deepEqual(
      (row?.qualityCheckReconciliations ?? []).map((item) => [item.staticCheck, item.outcome]),
      [[check, "missing"]],
      `expected one missing reconciling item naming "${check}"; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
    );
    // And the credit side pinned by its ABSENCE: an absent check is FOUND as a negative fact, not
    // observed as evidence, so `missing` carries no observation (@SCN-LDG-028).
    assert.equal(
      row?.qualityCheckReconciliations?.[0]?.evidenceObservation,
      undefined,
      "expected the missing item to carry no Evidence Observation (Obligation Exists, Observation None)"
    );

    // And the same fact read back off the rendered row — the report is where a reader meets it.
    // Row-scoped to the scenario's own CELLS, so a bare regex over the report cannot pass it.
    const { verdict, items } = rowCells("SCN-AAA-001");
    assert.match(
      verdict,
      /out-of-balance/,
      `expected the fitness scenario's verdict cell to read out-of-balance for the absent check "${check}"; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*missing/,
      `expected the lint missing reconciling item for "${check}"; got "${items}"`
    );
    assert.match(items, /∅/, `expected the missing item to carry the ∅ glyph; got "${items}"`);
  }
);

// @SCN-LNT-008
Then(
  "the first fitness scenario reconciles satisfied, holding the run's one credit",
  function () {
    // ONE @SCN, and it is the FIRST scenario's — the corpus's own answer, kept by
    // `fitnessCitations`. A last-wins reader cites SCN-AAA-002 and this reds on the citation alone,
    // before any outcome is read.
    const observation = evidenceObservations.find(
      (o) => isStaticCheckObservation(o) && o.staticCheck === CITED_SCRIPT
    );
    assert.equal(
      observation?.scnId,
      "SCN-AAA-001",
      `expected the run to cite the first fitness scenario in corpus order; got ${JSON.stringify(observation)}`
    );

    // The credit's IDENTITY, counted across the WHOLE ledger. A shared-credit path — the reading
    // this ruling refuses — puts SCN-AAA-002 in this list too.
    assert.deepEqual(
      fitnessLedger.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation!))
        .map((row) => row.scnId),
      ["SCN-AAA-001"],
      "expected the one credit to post to the cited scenario's row and to no other"
    );

    const outcomes = (
      fitnessLedger.scenarioReconciliations.find((row) => row.scnId === "SCN-AAA-001")
        ?.qualityCheckReconciliations ?? []
    ).map((item) => item.outcome);
    assert.deepEqual(outcomes, ["satisfied"], "expected the cited scenario to reconcile satisfied");

    const { verdict, items } = rowCells("SCN-AAA-001");
    assert.match(verdict, /\bbalanced\b/, `expected a balanced verdict cell; got "${verdict}"`);
    assert.doesNotMatch(verdict, /out-of-balance/, `expected not out-of-balance; got "${verdict}"`);
    assert.equal(items, "—", `expected no reconciling items; got "${items}"`);
  }
);

// @SCN-LNT-008
// @SCN-LNT-016
// @SCN-LNT-017
Then(
  "the second fitness scenario reconciles missing, naming the check {string}",
  function (check: string) {
    // THE RUNNER-UP, and the whole point of the ruling. It carries the SAME obligation as the row
    // above and finds nothing to discharge it, so it reads `missing` — out loud, on the ledger,
    // rather than absorbed by a run that was never about it. A both-satisfied or dedupe path flips
    // this to `satisfied`; a name-match fallback that let a citing run answer by handle does too.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-002");
    assert.deepEqual(
      (row?.qualityCheckReconciliations ?? []).map((item) => [item.staticCheck, item.outcome]),
      [[check, "missing"]],
      `expected one missing reconciling item naming "${check}"; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
    );
    // Pinned by its ABSENCE: nothing credited this row, so the item carries no observation at all
    // (Obligation Exists, Observation None — @SCN-LDG-028). A credit half-counted here would show up
    // as an observation on a `missing` item, which is the shape that must never occur.
    assert.equal(
      row?.qualityCheckReconciliations?.[0]?.evidenceObservation,
      undefined,
      "expected the runner-up's missing item to carry no Evidence Observation"
    );
    assert.deepEqual(
      row?.evidenceObservations,
      [],
      "expected NO credit to post to the runner-up's row"
    );

    // And the same fact read back off the rendered row — the report is where a reader meets the
    // corpus fault. Row-scoped to the scenario's own CELLS, so a bare regex cannot pass it.
    const { verdict, items } = rowCells("SCN-AAA-002");
    assert.match(
      verdict,
      /out-of-balance/,
      `expected the runner-up's verdict cell to read out-of-balance for "${check}"; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*missing/,
      `expected the lint missing reconciling item for "${check}"; got "${items}"`
    );
    assert.match(items, /∅/, `expected the missing item to carry the ∅ glyph; got "${items}"`);
  }
);

// @SCN-LNT-012
Then(
  "the {string} obligation reconciles as the watermelon, credited by the typecheck run's own observation",
  function (check: string) {
    // THE FALSE GREEN, PINNED. This is the obligation a reader matching on the @SCN alone answers
    // with `lint:complexity`'s credit — a wired, enforced-over-real-source observation — and so
    // reads `satisfied` while the check it names guards nothing. The pair is asserted TOGETHER
    // with the crediting observation, because the outcome alone cannot tell a watermelon read off
    // its own run from a watermelon read off the other one.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-001");
    const item = (row?.qualityCheckReconciliations ?? []).find((i) => i.staticCheck === check);
    assert.deepEqual(
      [item?.outcome, (item?.evidenceObservation as { staticCheck?: string } | undefined)?.staticCheck],
      ["watermelon", "typecheck"],
      `expected the "${check}" obligation to read watermelon, credited by its OWN run's observation ` +
        `— not by the wired complexity credit citing the same @SCN; got ${JSON.stringify(item)}`
    );

    // And the row itself, which is where the false green is actually reported: a smeared credit
    // turns this row `balanced` and the whole ledger green over a check that runs nowhere.
    const { verdict, items } = rowCells("SCN-AAA-001");
    assert.match(
      verdict,
      /out-of-balance/,
      `expected the row to read out-of-balance on the unwired "${check}"; got "${verdict}"`
    );
    assert.match(items, /🍉/, `expected the watermelon item to carry the 🍉 glyph; got "${items}"`);
  }
);

// @SCN-LNT-012
Then(
  "the {string} obligation reconciles satisfied, credited by the complexity run's own observation",
  function (check: string) {
    // THE OTHER HALF, and it is not a formality. Fixing the smear by refusing BOTH credits would
    // pass the assertion above and break this one — the second credit must be accounted for, not
    // merely kept away from the first obligation. Together the two pin every credit to the
    // obligation it is about, which is the never-dropped clause read on a two-check row.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-001");
    const item = (row?.qualityCheckReconciliations ?? []).find((i) => i.staticCheck === check);
    assert.deepEqual(
      [item?.outcome, (item?.evidenceObservation as { staticCheck?: string } | undefined)?.staticCheck],
      ["satisfied", "lint:complexity"],
      `expected the "${check}" obligation to read satisfied, credited by its OWN run's observation; ` +
        `got ${JSON.stringify(item)}`
    );

    // EXACTLY TWO READINGS ON THE ROW, one per obligation — so neither a dropped obligation nor a
    // duplicated one can pass the two assertions by accident.
    assert.equal(
      row?.qualityCheckReconciliations?.length,
      2,
      `expected one reconciling reading per fitness obligation; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
    );
  }
);

// @SCN-LNT-009
Then(
  "the run's credit posts to a phantom row for the @SCN it cited, naming the check {string}",
  function (script: string) {
    // The credit still carries the @SCN it was stamped with — the citation did not fail to
    // resolve, it resolved to a row that has since moved. Pinning it is what stops this arm
    // passing for the wrong reason (an unresolved citation goes to suspense, not here).
    const observation = evidenceObservations.find(
      (o) => isStaticCheckObservation(o) && o.staticCheck === script
    );
    assert.equal(
      observation?.scnId,
      "SCN-AAA-001",
      `expected the run to carry the @SCN it was stamped with; got ${JSON.stringify(observation)}`
    );

    // THE INVENTED ROW — minted by the credit, holding it, raising nothing (nobody named it), and
    // carrying one item that NAMES THE CHECK THAT RAN. A phantom row has no obligation to point a
    // reader at, so the handle is its only where-to-fix.
    const phantom = fitnessLedger.scenarioReconciliations.find(
      (row) => row.kind === "phantom-scenario"
    );
    assert.equal(phantom?.scnId, "SCN-AAA-001", "expected a phantom row for the cited @SCN");
    assert.deepEqual(phantom?.evidenceObligations, [], "expected the phantom row to raise nothing");
    assert.deepEqual(
      (phantom?.qualityCheckReconciliations ?? []).map((item) => [
        item.qualityCheck,
        item.staticCheck,
        item.outcome,
      ]),
      [["lint", script, "cites-unknown-scenario"]],
      `expected one cites-unknown-scenario item naming "${script}"; got ${JSON.stringify(phantom?.qualityCheckReconciliations)}`
    );

    // And the same fact read back off the rendered row — the report is where a reader meets it.
    // Row-scoped to the phantom row's own CELLS, so a bare regex over the report cannot pass it.
    const { verdict, items } = rowCells("SCN-AAA-001");
    assert.match(
      verdict,
      /out-of-balance/,
      `expected the phantom row's verdict cell to read out-of-balance; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*Evidence Observation cites an unknown Scenario/,
      `expected the phantom row to carry the lint cites-unknown-scenario item; got "${items}"`
    );
    assert.match(items, /👻/, `expected the phantom item to carry the 👻 glyph; got "${items}"`);
    assert.match(
      items,
      new RegExp(`\\(${script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`),
      `expected the phantom item to name the check that ran; got "${items}"`
    );
  }
);

// @SCN-LNT-009
Then("no scenario's row holds that credit", function () {
  // NEVER DROPPED, NEVER SMEARED — the credit's identity counted across the WHOLE ledger. A rule
  // that let an unresolvable citation fall back to the handle puts the renumbered row in this list;
  // one that dropped the credit empties it. Both are the failures the phantom row exists to stop.
  const observation = evidenceObservations.find(
    (o) => isStaticCheckObservation(o) && o.staticCheck === CITED_SCRIPT
  );
  assert.ok(observation, `expected an observation of the running check "${CITED_SCRIPT}"`);
  assert.deepEqual(
    fitnessLedger.scenarioReconciliations
      .filter((row) => row.evidenceObservations.includes(observation))
      .map((row) => [row.kind, row.scnId]),
    [["phantom-scenario", "SCN-AAA-001"]],
    "expected the credit to post to the phantom row and to no other"
  );
});

// @SCN-LNT-004
Then(
  "the scenario's fitness obligation reconciles as the watermelon, naming the check {string}",
  function (check: string) {
    // THE FITNESS AXIS, ANSWERED BY ITS OWN CREDIT AND NOTHING ELSE. The pair is asserted so the
    // item is pinned to name the BARE tag the scenario carries while its observation names the
    // RUNNABLE handle — two different words, so a reader that matched by name could never have
    // joined them, and one that let the green unit credit answer this obligation reads `satisfied`.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-001");
    const item = (row?.qualityCheckReconciliations ?? []).find((i) => i.qualityCheck === "lint");
    assert.deepEqual(
      [item?.staticCheck, item?.outcome],
      [check, "watermelon"],
      `expected the fitness obligation to reconcile watermelon naming "${check}"; got ${JSON.stringify(item)}`
    );
    assert.deepEqual(
      item?.evidenceObservation,
      {
        qualityCheck: "lint",
        staticCheck: UNWIRED_SCRIPT,
        checkTag: "unwired-check",
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-AAA-001",
      },
      `expected the fitness obligation to be answered by the citing fitness credit; got ${JSON.stringify(item?.evidenceObservation)}`
    );

    // And the same fact read back off the rendered row — the report is where a reader meets it.
    // The row is out of balance on the fitness item ALONE, while the behavioural axis balances.
    const { verdict, items } = rowCells("SCN-AAA-001");
    assert.match(
      verdict,
      /out-of-balance/,
      `expected the verdict cell to read out-of-balance for the unwired check "${check}"; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*Evidence Observation is passing but fabricated/,
      `expected the lint watermelon reconciling item for "${check}"; got "${items}"`
    );
    assert.match(items, /🍉/, `expected the watermelon item to carry the 🍉 glyph; got "${items}"`);
  }
);

// @SCN-LNT-004
Then("its unit obligation reconciles satisfied, omitted from the reconciling items", function () {
  // THE BEHAVIOURAL AXIS, ANSWERED BY ITS OWN CREDIT AND NOTHING ELSE — the mirror of the item
  // above, and the direction a fitness run must never green. Both credits cite the SAME @SCN and
  // post to the SAME row, so a reconciler answering an obligation by the row it sits on rather
  // than by what it owes puts the fitness credit here.
  const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-001");
  assert.deepEqual(
    (row?.qualityCheckReconciliations ?? []).find((i) => i.qualityCheck === "unit"),
    {
      qualityCheck: "unit",
      outcome: "satisfied",
      evidenceObligation: { qualityCheck: "unit" },
      evidenceObservation: unitCredit,
    },
    `expected the unit obligation to be answered by the unit credit; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
  );
  // TWO READINGS, ONE PER AXIS — counted, so a rule that collapsed the row to a single verdict or
  // let one credit discharge both obligations cannot pass the two assertions above by accident.
  assert.equal(
    row?.qualityCheckReconciliations?.length,
    2,
    `expected exactly one reconciling reading per axis; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
  );

  // The BALANCED axis is dropped from the reconciling items while the other remains — independence
  // read back off the report, where a bare regex over the whole thing could not see it.
  assert.deepEqual(
    (row?.reconcilingItems ?? []).map((i) => i.qualityCheck),
    ["lint"],
    `expected only the fitness item to remain reconciling; got ${JSON.stringify(row?.reconcilingItems)}`
  );
  const { items } = rowCells("SCN-AAA-001");
  assert.doesNotMatch(
    items,
    /\bunit\b/,
    `expected the balanced unit obligation to be OMITTED from the reconciling items; got "${items}"`
  );
});

// @SCN-LNT-005
Then(
  "that target's fitness scenario {string} reconciles as the watermelon, naming the check {string}",
  function (scnId: string, check: string) {
    // THE TWO SIDES NAME DIFFERENT WORDS, and that asymmetry is the assertion. The obligation names
    // the BARE tag the target's fitness scenario carries; the observation names the RUNNABLE handle
    // the target's CI would have had to invoke. Nothing joins them but the citation, and the
    // citation could only be resolved by reading the target's own registry and the target's own
    // corpus — so a run that resolved either from spec-controller's tree reaches no observation at
    // all and this pair reads `missing` with no credit.
    const row = externalLedger.scenarioReconciliations.find((r) => r.scnId === scnId);
    assert.deepEqual(
      (row?.qualityCheckReconciliations ?? []).map((item) => [
        item.staticCheck,
        item.outcome,
        (item.evidenceObservation as { staticCheck?: string } | undefined)?.staticCheck,
      ]),
      [[check, "watermelon", "lint:vocab-check"]],
      `expected one watermelon item naming "${check}", credited by the handle's observation; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
    );

    // And the same fact read back off the rendered row — the report is where a reader meets it.
    // Row-scoped to the scenario's own CELLS, so a bare regex over the report cannot pass it.
    const { verdict, items } = rowCells(scnId);
    assert.match(
      verdict,
      /out-of-balance/,
      `expected ${scnId}'s verdict cell to read out-of-balance for the external check "${check}"; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*Evidence Observation is passing but fabricated/,
      `expected ${scnId} to carry the lint watermelon reconciling item for the external check "${check}"; got "${items}"`
    );
    assert.match(
      items,
      /🍉/,
      `expected ${scnId}'s watermelon item to carry the 🍉 glyph; got "${items}"`
    );
  }
);

// @SCN-LNT-015
Then(
  "each fitness scenario reconciles satisfied, credited by the run its own registry entry names",
  function () {
    // BOTH ROWS, AND EACH BY ITS OWN RUN. Read through the corpus hop alone the second handle
    // cites the FIRST scenario: one row would hold two credits and the other none, reading
    // `missing` while its check ran green (@SCN-LNT-008). The entry's `@SCN` is what parts them,
    // so the assertion is per-entry — the credit for THIS handle, on THIS row, and nowhere else.
    for (const entry of namedCitations) {
      const observation = evidenceObservations
        .filter(isStaticCheckObservation)
        .find((o) => o.staticCheck === entry.script);
      assert.ok(
        observation,
        `expected a run of ${entry.script} to be observed over the real CI config`
      );
      assert.equal(
        observation.scnId,
        entry.scenario,
        `expected ${entry.script} to cite the scenario its registry entry names; got ${JSON.stringify(observation)}`
      );
      assert.equal(
        observation.checkTag,
        entry.check,
        `expected ${entry.script} to carry its own characteristic; got ${JSON.stringify(observation)}`
      );

      // The credit's IDENTITY, counted across the WHOLE ledger. A reading that fell back to
      // first-in-corpus puts BOTH credits on the first row and this list names two.
      assert.deepEqual(
        fitnessLedger.scenarioReconciliations
          .filter((row) => row.evidenceObservations.includes(observation))
          .map((row) => row.scnId),
        [entry.scenario],
        `expected ${entry.script}'s one credit to post to ${entry.scenario} and to no other row`
      );

      const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === entry.scenario);
      assert.deepEqual(
        (row?.qualityCheckReconciliations ?? []).map((item) => [item.staticCheck, item.outcome]),
        [[entry.check, "satisfied"]],
        `expected ${entry.scenario} to reconcile satisfied for "${entry.check}"; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
      );

      // And the same fact read back off the rendered row — the report is where a reader meets it.
      const { verdict, items } = rowCells(entry.scenario);
      assert.match(
        verdict,
        /\bbalanced\b/,
        `expected a balanced verdict cell for ${entry.scenario}; got "${verdict}"`
      );
      assert.doesNotMatch(
        verdict,
        /out-of-balance/,
        `expected ${entry.scenario} not out-of-balance; got "${verdict}"`
      );
      assert.equal(items, "—", `expected no reconciling items on ${entry.scenario}; got "${items}"`);
    }
  }
);

// @SCN-LNT-016
// @SCN-LNT-017
Then(
  "the run of {string} cites no scenario and its credit posts to suspense",
  function (script: string) {
    // THE WHOLE CITATION WITHHELD, not a near-match and not a downgrade. The entry named a row
    // the corpus does not carry with this characteristic, so the seam reaches no `@SCN` at all
    // and the observation carries none — exactly the shape an UNREGISTERED handle already has.
    // A reading that fell back to the corpus hop stamps SCN-AAA-001 here and this reds on the
    // citation alone, before any row is read.
    const observation = evidenceObservations
      .filter(isStaticCheckObservation)
      .find((o) => o.staticCheck === script);
    assert.ok(observation, `expected a run of ${script} to be observed over the real CI config`);
    assert.equal(
      observation.scnId,
      undefined,
      `expected ${script}'s run to cite no scenario; got ${JSON.stringify(observation)}`
    );
    assert.equal(
      observation.checkTag,
      undefined,
      `expected ${script}'s run to carry no citation keys at all; got ${JSON.stringify(observation)}`
    );

    // THE CREDIT'S IDENTITY, counted across the WHOLE ledger — the assertion a fallback path
    // cannot pass. A first-in-corpus degrade puts SCN-AAA-001 in this list; a dropped credit
    // empties it. Only suspense is right.
    assert.deepEqual(
      fitnessLedger.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation))
        .map((row) => row.kind),
      ["suspense-scenario"],
      `expected ${script}'s credit to post to the suspense row and to no other`
    );

    // NAMED ON THE SUSPENSE ROW, because a credit citing nothing has no obligation to point a
    // reader at and its handle is the only where-to-fix.
    const suspense = fitnessLedger.scenarioReconciliations.find(
      (row) => row.kind === "suspense-scenario"
    );
    assert.ok(
      (suspense?.qualityCheckReconciliations ?? []).some(
        (item) => item.staticCheck === script && item.outcome === "cites-no-scenario"
      ),
      `expected a cites-no-scenario item naming ${script}; got ${JSON.stringify(suspense?.qualityCheckReconciliations)}`
    );

    // And the same fact read back off the rendered row — the report is where a reader meets it.
    // Row-scoped to the suspense row's own CELLS, so a bare regex over the report cannot pass it.
    const { verdict, items } = rowCells("(no scenario)");
    assert.match(
      verdict,
      /out-of-balance/,
      `expected the suspense row's verdict cell to read out-of-balance; got "${verdict}"`
    );
    assert.match(
      items,
      /lint .*Evidence Observation cites no Scenario/,
      `expected the suspense row to carry the lint cites-no-scenario item; got "${items}"`
    );
    assert.match(
      items,
      new RegExp(`\\(${script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`),
      `expected the suspense item to name the check that ran; got "${items}"`
    );
  }
);


// @SCN-LNT-017
Then(
  "the third fitness scenario reconciles satisfied for {string} alone, absorbing no credit meant for another characteristic",
  function (check: string) {
    // THE CONTROL, AND IT HAS TO BE ONE. The row the wrong entry named is cited by its OWN
    // handle and reconciles green, so this cannot be passed by a reading that simply fails to
    // credit it: the row is live throughout, and the question is only whether the stray credit
    // reached it. Exactly one reconciling item, naming exactly this characteristic.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-AAA-003");
    assert.deepEqual(
      (row?.qualityCheckReconciliations ?? []).map((item) => [item.staticCheck, item.outcome]),
      [[check, "satisfied"]],
      `expected SCN-AAA-003 to reconcile satisfied for "${check}" and nothing else; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
    );

    // ONE CREDIT ON THE ROW, and it is the one that named this characteristic. A reading that
    // tested the named @SCN's EXISTENCE rather than its MEMBERSHIP posts a second observation
    // here — lint:adopted-vocabulary's — and this list holds two.
    assert.deepEqual(
      (row?.evidenceObservations ?? []).map(
        (observation) => (observation as { staticCheck?: string }).staticCheck
      ),
      ["lint:feature-codes"],
      `expected only the run naming this characteristic to credit SCN-AAA-003; got ${JSON.stringify(row?.evidenceObservations)}`
    );

    // And the same fact read back off the rendered row — the report is where a reader meets it.
    // Row-scoped to the scenario's own CELLS, so a bare regex over the report cannot pass it.
    const { verdict, items } = rowCells("SCN-AAA-003");
    assert.match(verdict, /\bbalanced\b/, `expected a balanced verdict cell; got "${verdict}"`);
    assert.doesNotMatch(verdict, /out-of-balance/, `expected not out-of-balance; got "${verdict}"`);
    assert.equal(items, "—", `expected no reconciling items on SCN-AAA-003; got "${items}"`);
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-020 — the HALF-CONVERTED corpus: two scenarios on the fitness axis, and a row for only
// one of them. The arm runs end-to-end through the balance composition over a planted target, so
// the two readings it asserts — the obligation the rule raises, and the naming the report carries —
// are taken from the same run over the same bytes rather than from two reads that could disagree.
// -------------------------------------------------------------------------

/** The planted half-converted target's resolved input paths, and the reconciliation it produced. */
let halfConvertedOpts: { features: string; ci: string; packageJson: string };
let halfConvertedReconciliation: EvidenceReconciliation;

// @SCN-LNT-020
Given(
  "a target's corpus carries two scenarios on the fitness axis and its configured rows name only the first",
  function () {
    // Point at the PLANTED EXTERNAL fixture (tests/fixtures/scn-lnt-020/) — a whole target
    // repository in one directory: its own corpus, its own rows, its own CI. The two assertions
    // below hold the fixture to what this scenario says it holds; without them it could drift into
    // carrying a row for both scenarios and the arm would go on passing while proving nothing.
    const fixture = join(process.cwd(), "tests/fixtures/scn-lnt-020");
    halfConvertedOpts = {
      features: join(fixture, "features"),
      ci: join(fixture, "ci.yml"),
      packageJson: join(fixture, "package.json"),
    };
    const source = readFileSync(join(halfConvertedOpts.features, "target.feature"), "utf8");
    assert.deepEqual(
      parseTaggedScenarios(source)
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => scenario.scnId),
      ["SCN-HCV-001", "SCN-HCV-002"],
      "expected the planted corpus to carry exactly two scenarios on the fitness axis"
    );
    assert.deepEqual(
      [
        ...resolveFitnessChecks(
          JSON.parse(readFileSync(halfConvertedOpts.packageJson, "utf8")) as object,
          NO_GATE_RECORD
        ).keys(),
      ],
      ["SCN-HCV-001"],
      "expected the planted rows to name the FIRST scenario and no other"
    );
  }
);

// @SCN-LNT-020
When("that target's evidence is reconciled", function () {
  // The whole balance composition over the planted target, and the reconciliation it returns is
  // rendered AS IT CAME — not re-summarised here — so the report a reader meets is the one the run
  // produced rather than one this arm assembled beside it.
  halfConvertedReconciliation = runReconcile(halfConvertedOpts);
  markdown = renderMarkdown(halfConvertedReconciliation, CTX);
});

// @SCN-LNT-020
Then(
  "the second raises no Evidence Obligation, its row is out of balance, and the report names it as a fitness scenario no configured row names",
  function () {
    const rows = halfConvertedReconciliation.ledger.scenarioReconciliations;
    const named = rows.find((row) => row.scnId === "SCN-HCV-001");
    const unnamed = rows.find((row) => row.scnId === "SCN-HCV-002");

    // BOTH ROWS, side by side, because the only thing separating them is whether a row names them.
    // A rule reaching for a near characteristic — or for the axis word itself — puts an obligation
    // on the second and reds here.
    assert.deepEqual(
      named?.evidenceObligations,
      [{ qualityCheck: "lint", staticCheck: "complexity" }],
      `expected the named scenario to raise its row's characteristic; got ${JSON.stringify(named?.evidenceObligations)}`
    );
    assert.deepEqual(
      unnamed?.evidenceObligations,
      [],
      `expected the scenario no row names to raise NOTHING — there is no characteristic to raise ` +
        `one for; got ${JSON.stringify(unnamed?.evidenceObligations)}`
    );

    // IT REDS, on the outcome canon already carries for this shape (Scenario Exists, Evidence
    // Obligation None, Evidence Observation None) rather than on a new one.
    assert.equal(
      unnamed?.verdict,
      "out-of-balance",
      "expected the half-converted scenario's row to be out of balance"
    );
    assert.deepEqual(
      (unnamed?.reconcilingItems ?? []).map((item) => item.outcome),
      ["both-missing"],
      `expected the degenerate item canon already carries, and no minted outcome; got ${JSON.stringify(unnamed?.reconcilingItems)}`
    );

    // AND THE REPORT NAMES IT, because the degenerate item's own sentence is about a scenario
    // carrying no @SCN and this one carries one. The reader is sent to the one remedy.
    assert.match(
      markdown,
      /1 @fitness scenario\(s\) no configured row names: SCN-HCV-002\./,
      `expected the report to name the half-converted scenario; got:\n${markdown}`
    );
    assert.doesNotMatch(
      markdown,
      /no configured row names: [^\n]*SCN-HCV-001/,
      "expected the scenario its row DOES name to stay off that line"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-027 — the ROWS are the side the record cannot erase. A configured row whose step a
// handed-over CI run record never carried is broken evidence; a run handed NO record raises none
// of it. The arm runs over a planted target repository (tests/fixtures/scn-lnt-027/) whose manifest
// names two checks and whose corpus and run record each carry one — an emptied corpus in
// miniature, since the missing check's Evidence Obligation went with its scenario and its credit
// went with the step nothing recorded.
//
// BOTH READINGS FROM ONE TARGET, which is why the second Then reconciles the same fixture a second
// time with the record withheld rather than reaching for a second one. Two fixtures could agree by
// accident, and one default is all that separates the two facts: a reader taking no record for a
// record carrying nothing would call every configured row broken on the first target whose
// pipeline dumps none.
// -------------------------------------------------------------------------

/** The planted target's fixture directory, the record of its run, and what it reconciled to. */
let unenumeratedFixture: string;
let unenumeratedStepRecord: CiStepRecord;
let unenumeratedReconciliation: EvidenceReconciliation;

/** @SCN-LNT-027 outcome: the SAME target reconciled with the run's record withheld. */
let unenumeratedNoRecordReconciliation: EvidenceReconciliation;

/** The planted target's manifest, read once and reused by the Given and the When. */
function unenumeratedManifest(): {
  specController?: { fitnessChecks?: unknown; checkRegistry?: unknown };
} {
  return JSON.parse(readFileSync(join(unenumeratedFixture, "package.json"), "utf8")) as {
    specController?: { fitnessChecks?: unknown; checkRegistry?: unknown };
  };
}

// @SCN-LNT-027
Given(
  "a target's configured rows name a static fitness check for each of two scenarios, and its corpus carries only the first",
  function () {
    unenumeratedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-027");
    const manifest = unenumeratedManifest();
    // THE FIXTURE IS HELD TO THE ASYMMETRY THIS SCENARIO RESTS ON: two STATIC rows, and a corpus
    // carrying one of them. Drift either way — a second scenario appearing, or a row carrying a
    // bar — and the arm would go on passing while asserting nothing about an unrecorded row.
    assert.deepEqual(
      [...resolveFitnessChecks(manifest, NO_GATE_RECORD)].map(([scn, row]) => [
        scn,
        row.characteristic,
        carriesBar(row),
      ]),
      [
        ["SCN-CVT-001", "complexity", false],
        ["SCN-CVT-002", "traceability", false],
      ],
      "expected two STATIC rows, one per scenario the manifest names"
    );
    assert.deepEqual(
      parseTaggedScenarios(
        readFileSync(join(unenumeratedFixture, "features/target.feature"), "utf8")
      )
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => scenario.scnId),
      ["SCN-CVT-001"],
      "expected the planted corpus to carry only the FIRST row's scenario"
    );
  }
);

// @SCN-LNT-027
When(
  "that target's evidence is reconciled with a CI run record carrying a step for that first row alone",
  function () {
    unenumeratedStepRecord = JSON.parse(
      readFileSync(join(unenumeratedFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    // THE RECORD SAYS THE FIRST CHECK RAN AND SAYS NOTHING WHATEVER ABOUT THE SECOND. A fixture
    // whose record held the second row's step in any status would be asserting what a recorded
    // outcome is worth, which is @SCN-LNT-026's claim (3F-3269) — the whole claim here is about a
    // row the record never mentions at all. The step that WROTE the record is in it, as it must be
    // for the document to exist, and no configured row answers that step's id.
    assert.deepEqual(
      Object.entries(unenumeratedStepRecord).map(([id, step]) => [id, step.outcome]),
      [
        ["SCN-CVT-001", "success"],
        ["dump-the-step-record", "success"],
      ],
      "expected the planted record to carry the first row's step alone, beside the step that wrote it"
    );
    const sources = {
      featureSources: [
        readFileSync(join(unenumeratedFixture, "features/target.feature"), "utf8"),
      ],
      untaggedScenarios: [],
      packageJson: unenumeratedManifest(),
      ciSources: [],
      measurements: {},
      runtimeObservations: [],
      deferralTags: [],
      guardScriptPrefixes: [],
      killFloor: () => null,
    };
    unenumeratedReconciliation = evidenceReconciliationFromSources({
      ...sources,
      ciStepRecord: unenumeratedStepRecord,
    });
    // THE SECOND READING OF THE SAME TARGET, with the record NOT HANDED OVER AT ALL — the key
    // omitted rather than emptied, which is the shape the application layer produces: a consumer
    // whose pipeline dumps no record reaches the reader with none. Taken here, in the When, so both
    // readings are of one target and one manifest.
    unenumeratedNoRecordReconciliation = evidenceReconciliationFromSources(sources);
  }
);

// @SCN-LNT-027
Then(
  "the row the record carried no step for is broken evidence naming it, and the run is unsound",
  function () {
    // THE LEDGER WHOLE, because the fault is what is ABSENT from it. Before this rule the second
    // row had no scenario, no Evidence Obligation and no credit, so it appeared nowhere and the
    // run balanced over a check nothing recorded.
    assert.deepEqual(
      unenumeratedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [
        ["SCN-CVT-001", "scenario", "balanced", [["complexity", "satisfied"]]],
        ["(no scenario)", "suspense-scenario", "out-of-balance", [[undefined, "broken"]]],
      ],
      `expected the recorded row credited and the unrecorded one on the suspense row as ` +
        `broken; got ${JSON.stringify(unenumeratedReconciliation.ledger.scenarioReconciliations)}`
    );
    assert.equal(
      hasBrokenEvidence({
        scenarioReconciliations: unenumeratedReconciliation.ledger.scenarioReconciliations,
      }),
      true,
      "expected the run to be stamped unsound by the unrecorded row's broken credit"
    );
    // AND THE REPORT NAMES THE ROW AND SAYS WHY. The broken item carries no observation, so its
    // message is the whole of what a reader gets; it names the @SCN, says what the record held,
    // and prescribes no cure.
    assert.match(
      renderMarkdown(unenumeratedReconciliation, CTX),
      /SCN-CVT-002: the CI run's record carries no step for this row of `specController\.fitnessChecks` — so the check did not run\./,
      "expected the run-integrity section to name the row the record carried no step for"
    );
  }
);

// @SCN-LNT-027
Then(
  "the same target reconciled with no CI run record at all raises nothing broken — the scenario its corpus carries reconciles missing, and the run is merely out of balance",
  function () {
    // THE DISCRIMINATOR AGAINST FLATTENING THE TWO FACTS. Were `no record` read as `an empty
    // record`, this reading would call a consumer whose pipeline dumps none broken over a file it
    // has no reason to own — and every target reconciling today without one would move from out of
    // balance to unsound.
    assert.deepEqual(
      unenumeratedNoRecordReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [["SCN-CVT-001", "scenario", "out-of-balance", [["complexity", "missing"]]]],
      `expected the one enumerable row to reconcile missing and no suspense row at all; got ` +
        `${JSON.stringify(unenumeratedNoRecordReconciliation.ledger.scenarioReconciliations)}`
    );
    assert.equal(
      hasBrokenEvidence({
        scenarioReconciliations:
          unenumeratedNoRecordReconciliation.ledger.scenarioReconciliations,
      }),
      false,
      "expected a run handed no CI run record to be out of balance rather than unsound"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-031 — a discovered check whose CI step STATES the code of the row it runs posts to that
// row; one whose step states none still posts to suspense. The arm runs over a planted target
// repository (tests/fixtures/scn-lnt-031/) whose manifest configures two static rows, whose corpus
// carries both scenarios, and whose workflow runs both checks with the code written on ONE of them.
//
// ONE TARGET, BOTH HALVES, and that is the claim rather than the convenience. A reader citing
// nothing and a reader citing everything each produce a consistent-looking ledger over a target
// that is all one way; only a target that is annotated in one place and not the other tells them
// apart in a single run.
//
// IT RUNS THE COMPOSITION rather than `runningStaticChecks` alone, for the reason the fault had:
// the walk carried the step's code and the observer read it, and the composition between them
// handed the observer no citation seam — so every reader passed and every credit still landed in
// suspense. What is asserted is where the credit LANDED.
// -------------------------------------------------------------------------

/** @SCN-LNT-031 outcome: the planted target's root, its workflow bytes, and its reconciliation. */
let annotatedFixture: string;
let annotatedCiSource: string;
let annotatedReconciliation: EvidenceReconciliation;

// @SCN-LNT-031
Given(
  "a target whose CI runs a check for each of the two static rows its manifest configures",
  function () {
    annotatedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-031");
    const manifest = JSON.parse(
      readFileSync(join(annotatedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { fitnessChecks?: unknown } };
    // THE FIXTURE IS HELD TO THE SYMMETRY THIS SCENARIO RESTS ON: two STATIC rows, each naming a
    // script the manifest holds. Drift either way — a bar appearing, a row losing its script — and
    // the arm would go on passing while asserting something else.
    assert.deepEqual(
      [...resolveFitnessChecks(manifest, NO_GATE_RECORD)].map(([scn, row]) => [
        scn,
        row.characteristic,
        carriesBar(row),
      ]),
      [
        ["SCN-CVT-001", "complexity", false],
        ["SCN-CVT-002", "traceability", false],
      ],
      "expected two STATIC rows, one per scenario the planted corpus carries"
    );
    annotatedCiSource = readFileSync(join(annotatedFixture, "ci.yml"), "utf8");
    // AND BOTH CHECKS ARE ORDINARY `run:` STEPS OF THAT TARGET'S OWN PIPELINE. Nothing is moved out
    // of the pipeline and no wrapper stands in front of a command, which is the property the whole
    // ruling rests on — so a fixture that had quietly grown one would prove a different route.
    assert.deepEqual(
      ciRunSteps([annotatedCiSource]).map((step) => step.command),
      ["pnpm lint:alpha", "pnpm lint:beta"],
      "expected the planted workflow to invoke each row's own script from a plain run: step"
    );
  }
);

// @SCN-LNT-031
Given("only the first check's step states the code of the row it runs", function () {
  // THE ONE DIFFERENCE BETWEEN THE TWO STEPS, ASSERTED AS ONE FACT. Both steps carrying a code, or
  // neither, and the pair below stops discriminating anything while still reading green on one arm.
  assert.deepEqual(
    ciRunSteps([annotatedCiSource]).map((step) => [step.command, step.id]),
    [
      ["pnpm lint:alpha", "SCN-CVT-001"],
      ["pnpm lint:beta", undefined],
    ],
    "expected the first check's step to state its row's code and the second to state none"
  );
});

// @SCN-LNT-031
When(
  "that target's evidence is reconciled from its manifest, its corpus and its workflow",
  function () {
    annotatedReconciliation = evidenceReconciliationFromSources({
      featureSources: [
        readFileSync(join(annotatedFixture, "features/target.feature"), "utf8"),
      ],
      untaggedScenarios: [],
      packageJson: JSON.parse(
        readFileSync(join(annotatedFixture, "package.json"), "utf8")
      ) as PackageJsonScripts,
      ciSources: [annotatedCiSource],
      measurements: {},
      runtimeObservations: [],
      deferralTags: [],
      // THE PREFIX FINDS BOTH CHECKS, WHICH IS WHAT LEAVES THE ANNOTATION AS THE ONLY VARIABLE.
      // Discovery is blind to the `id:`; what the code decides is where a discovered run POSTS.
      guardScriptPrefixes: ["lint:"],
      killFloor: () => null,
    });
  }
);

// @SCN-LNT-031
Then(
  "the first check's run credits the row its step names and that row balances, and the second run cites no scenario",
  function () {
    // THE LEDGER WHOLE, because the fault is a MISPLACEMENT rather than an absence: both credits
    // used to land on the suspense row and both rows used to read missing, so an annotated pipeline
    // and an unannotated one produced the identical ledger.
    assert.deepEqual(
      annotatedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [
        ["SCN-CVT-001", "scenario", "balanced", [["complexity", "satisfied"]]],
        ["SCN-CVT-002", "scenario", "out-of-balance", [["traceability", "missing"]]],
        [
          "(no scenario)",
          "suspense-scenario",
          "out-of-balance",
          [["lint:beta", "cites-no-scenario"]],
        ],
      ],
      `expected the annotated check's credit on its own row and the unannotated one in suspense; ` +
        `got ${JSON.stringify(annotatedReconciliation.ledger.scenarioReconciliations)}`
    );
    // AND THE CREDIT CARRIES THE CHARACTERISTIC ITS ROW NAMES. A CI step states a code and never a
    // characteristic, so a `checkTag` reading `lint:alpha` here would be the handle that ran
    // answering for the row — name-match in a new spelling, which is what this route retired.
    assert.deepEqual(
      annotatedReconciliation.ledger.scenarioReconciliations
        .find((row) => row.scnId === "SCN-CVT-001")
        ?.evidenceObservations.filter(isStaticCheckObservation)
        .map((observation) => [observation.staticCheck, observation.checkTag, observation.scnId]),
      [["lint:alpha", "complexity", "SCN-CVT-001"]],
      "expected the credited run to carry the handle that ran and the characteristic its ROW names"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-028 — a check step the CI RUN'S RECORD says failed posts a `failing` observation: out
// of balance, sound, and carrying what the check found. The arm runs over a planted target
// repository (tests/fixtures/scn-lnt-028/) whose manifest configures one static row, whose corpus
// carries that row's scenario, whose workflow runs the check as a plain step stating its code, and
// whose run record says that step failed.
//
// THE ROW'S CHECK IS A BARE COMMAND RATHER THAN ONE OF THAT REPOSITORY'S SCRIPTS, which is the
// fixture's isolation. A guard-prefixed handle would be DISCOVERED from the workflow and observed
// by the derivation reader, whose credit would answer this row's obligation first — so the reading
// under test would be untested while its arm stayed green.
//
// IT RUNS THE COMPOSITION rather than the record reader alone, because the claim is about WHERE the
// verdict landed and WHAT WORD the ledger says about it. A reader emitting an impeccable
// observation the composition never threads produces exactly the ledger a reader emitting nothing
// produces.
// -------------------------------------------------------------------------

/** @SCN-LNT-028 outcome: the planted target's root, the record of its run, and its reconciliation. */
let failedStepFixture: string;
let failedStepRecord: CiStepRecord;
let failedStepReconciliation: EvidenceReconciliation;

// @SCN-LNT-028
Given(
  "a target whose configured row names a static fitness check for the scenario its corpus carries",
  function () {
    failedStepFixture = join(process.cwd(), "tests/fixtures/scn-lnt-028");
    const manifest = JSON.parse(
      readFileSync(join(failedStepFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { fitnessChecks?: unknown } };
    // THE FIXTURE IS HELD TO WHAT THIS SCENARIO RESTS ON: ONE row, STATIC (a bar would send its
    // credit down the measurement stream instead), naming the scenario the planted corpus carries.
    assert.deepEqual(
      [...resolveFitnessChecks(manifest, NO_GATE_RECORD)].map(([scn, row]) => [
        scn,
        row.characteristic,
        carriesBar(row),
      ]),
      [["SCN-CVT-001", "complexity", false]],
      "expected one STATIC row naming the scenario the planted corpus carries"
    );
    // AND NOTHING ELSE OBSERVES THAT ROW. The check is a bare command, so the workflow read
    // discovers no script for it — asserted through the observer itself rather than by reading the
    // manifest twice, because what must be empty is what that observer EMITS.
    assert.deepEqual(
      runningStaticChecks(
        [readFileSync(join(failedStepFixture, "ci.yml"), "utf8")],
        manifest as PackageJsonScripts,
        ["lint:"]
      ),
      [],
      "expected the workflow read to discover no check for this row, so the run record is its only observer"
    );
  }
);

// @SCN-LNT-028
Given(
  "its CI run's record says that check's step failed, on a record whose remaining step succeeded",
  function () {
    failedStepRecord = JSON.parse(
      readFileSync(join(failedStepFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    // THE TWO FACTS THE SCENARIO NAMES, ASSERTED AS THEY ARE WRITTEN. The check's step failed, and
    // the record's other step succeeded — so a reader summarising the run rather than reading the
    // row's own step has a green to reach for. And the failed step's two fields AGREE: which of
    // them a reader must take is 3F-3264's claim, and a fixture that laundered this one would let
    // each arm pass on the strength of the other's half.
    assert.deepEqual(
      Object.entries(failedStepRecord).map(([id, step]) => [id, step.outcome, step.conclusion]),
      [
        ["SCN-CVT-001", "failure", "failure"],
        ["dump-the-step-record", "success", "success"],
      ],
      "expected the check's step to have failed unlaundered, on a record whose remaining step succeeded"
    );
  }
);

// @SCN-LNT-028
When("that target's evidence is reconciled with what its CI run recorded", function () {
  failedStepReconciliation = evidenceReconciliationFromSources({
    featureSources: [readFileSync(join(failedStepFixture, "features/target.feature"), "utf8")],
    untaggedScenarios: [],
    packageJson: JSON.parse(
      readFileSync(join(failedStepFixture, "package.json"), "utf8")
    ) as PackageJsonScripts,
    ciSources: [readFileSync(join(failedStepFixture, "ci.yml"), "utf8")],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: ["lint:"],
    killFloor: NO_GATE_RECORD,
    ciStepRecord: failedStepRecord,
  });
});

// @SCN-LNT-028
Then(
  "that row's Evidence Obligation reads failing, carrying the observation of the step that failed it, and the run is out of balance rather than unsound",
  function () {
    // THE LEDGER WHOLE, so a credit landing anywhere but on the row its step named is visible
    // rather than absorbed. A suspense row here would say the citation had been lost on the way.
    assert.deepEqual(
      failedStepReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [["SCN-CVT-001", "scenario", "out-of-balance", [["complexity", "failing"]]]],
      `expected the failed step's row to read failing; got ` +
        JSON.stringify(failedStepReconciliation.ledger.scenarioReconciliations)
    );
    // THE OBSERVATION IS CARRIED, WHICH IS WHAT `failing` MEANS AND `broken` DOES NOT. A check that
    // ran and found violations said something; a reading that discarded it would report the
    // strictly weaker fact that nothing was heard from the check at all.
    assert.deepEqual(
      failedStepReconciliation.ledger.scenarioReconciliations
        .find((row) => row.scnId === "SCN-CVT-001")
        ?.evidenceObservations.filter(isStaticCheckObservation)
        .map((observation) => [observation.checkTag, observation.scnId]),
      [["complexity", "SCN-CVT-001"]],
      "expected the failing row to carry the observation of the step that failed it"
    );
    // AND THE RUN IS SOUND. `broken` stamps a run unsound — the evidence stream itself is faulty —
    // and this run's stream worked perfectly: it delivered a red.
    assert.equal(
      hasBrokenEvidence(failedStepReconciliation.ledger),
      false,
      "expected a check that ran and found violations to leave the run sound"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-029 — a pipeline nobody has annotated is reported as every check it runs, each citing
// no scenario, and the steps that are not checks are reported nowhere at all. The arm runs over a
// planted target repository (tests/fixtures/scn-lnt-029/) that has adopted NOTHING: no corpus, no
// configured row, no code on any step — the state a consumer starts in and reaches by doing
// nothing.
//
// THE LEDGER IS ASSERTED WHOLE BECAUSE THE CLAIM IS A CARDINALITY. What `new-client` promises is a
// REPORT — here is every check you run, and not one answers anything you specified — and a report
// is a population before it is a value. Looking one uncited check up and finding it in suspense
// would go on passing over a reader that had stopped raising the other two.
//
// IT RUNS THE COMPOSITION rather than the observer alone, for the reason its sibling does: what is
// claimed is where these credits LANDED. An observer emitting three impeccable citationless
// observations that the reconciliation then filed somewhere else would satisfy an arm over the
// observer and falsify every word of this scenario.
// -------------------------------------------------------------------------

/** @SCN-LNT-029 outcome: the planted target's root, its workflow bytes, and its reconciliation. */
let unannotatedFixture: string;
let unannotatedCiSource: string;
let unannotatedReconciliation: EvidenceReconciliation;

// @SCN-LNT-029
Given(
  "a target whose CI runs every static check its manifest holds, and states the code of none of them",
  function () {
    unannotatedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-029");
    const manifest = JSON.parse(
      readFileSync(join(unannotatedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { fitnessChecks?: unknown } };
    // THE TARGET HAS ADOPTED NOTHING, ASSERTED RATHER THAN ASSUMED. A configured row creeping into
    // this fixture would give a credit somewhere to land, and the arm would go on reading green
    // while reporting a target in a different state entirely.
    assert.deepEqual(
      [...resolveFitnessChecks(manifest, NO_GATE_RECORD)],
      [],
      "expected a target that has configured no fitness row at all"
    );
    unannotatedCiSource = readFileSync(join(unannotatedFixture, "ci.yml"), "utf8");
    // AND NOT ONE STEP STATES A CODE, which is the single fact that makes this `new-client` rather
    // than the annotated state its sibling scenario covers. One `id:` here and this arm would be
    // asserting the wrong pipeline's report.
    assert.deepEqual(
      ciRunSteps([unannotatedCiSource]).map((step) => step.id),
      [undefined, undefined, undefined, undefined, undefined],
      "expected an unannotated pipeline — no CI step stating the code of anything"
    );
  }
);

// @SCN-LNT-029
Given(
  "that CI also checks out its tree, sets up its toolchain, installs its dependencies and builds it",
  function () {
    // THE NON-CHECK STEPS ARE REALLY THERE, so the silence this scenario asserts is a silence about
    // something. A fixture that had quietly lost them would prove nothing at all by their absence
    // from the report.
    assert.deepEqual(
      ciRunSteps([unannotatedCiSource]).map((step) => step.command),
      [
        "pnpm install --frozen-lockfile",
        "pnpm build",
        "pnpm lint:alpha",
        "pnpm lint:beta",
        "pnpm typecheck",
      ],
      "expected the planted workflow to run its two non-check commands beside its three checks"
    );
    // AND `build` IS THE SHARP ONE. Checkout and the toolchain set-up invoke no script and could
    // never be discovered; `pnpm build` runs a script the manifest really holds, and is excluded
    // only because the heuristic does not reach it — no guard prefix, and no `staticChecks` entry
    // naming it. That is the discriminator discriminating rather than a step that was out of reach.
    const manifest = JSON.parse(
      readFileSync(join(unannotatedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { staticChecks?: unknown } };
    assert.deepEqual(
      [Object.keys(manifest.scripts ?? {}).includes("build"), manifest.specController?.staticChecks],
      [true, ["typecheck"]],
      "expected `build` to be a real script of this manifest that no staticChecks entry names"
    );
  }
);

// @SCN-LNT-029
When("that target's evidence is reconciled from its manifest and its workflow", function () {
  unannotatedReconciliation = evidenceReconciliationFromSources({
    // NO CORPUS AT ALL, which is the honest shape of this state rather than a shortcut: a consumer
    // on their first run has specified nothing, so the whole report is what their pipeline says.
    featureSources: [],
    untaggedScenarios: [],
    packageJson: JSON.parse(
      readFileSync(join(unannotatedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts,
    ciSources: [unannotatedCiSource],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: ["lint:"],
    killFloor: NO_GATE_RECORD,
  });
});

// @SCN-LNT-029
Then(
  "every check the pipeline ran is on the one suspense row citing no scenario, and the steps that are not checks are reported nowhere at all",
  function () {
    // THE WHOLE REPORT, AS THE CONSUMER WOULD READ IT: one row, three items, one per check their
    // pipeline runs — and nothing for the install, the build, the checkout or the toolchain
    // set-up. Both halves of this scenario are read off the SAME list, because they are one claim:
    // what makes the report useful is exactly what it leaves out.
    assert.deepEqual(
      unannotatedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [
        [
          "(no scenario)",
          "suspense-scenario",
          "out-of-balance",
          [
            ["lint:alpha", "cites-no-scenario"],
            ["lint:beta", "cites-no-scenario"],
            ["typecheck", "cites-no-scenario"],
          ],
        ],
      ],
      `expected every check in suspense citing no scenario and no step but a check reported at all; ` +
        `got ${JSON.stringify(unannotatedReconciliation.ledger.scenarioReconciliations)}`
    );
    // AND EACH CARRIES ITS HANDLE AND NEITHER CITATION TERM. The handle is what makes the report
    // actionable — it is the one thing the consumer can look up in their own manifest — and a
    // half-citation appearing beside it would be a shape no reader downstream knows how to read.
    assert.deepEqual(
      unannotatedReconciliation.ledger.scenarioReconciliations[0]?.evidenceObservations
        .filter(isStaticCheckObservation)
        .map((observation) => [observation.staticCheck, observation.checkTag, observation.scnId]),
      [
        ["lint:alpha", undefined, undefined],
        ["lint:beta", undefined, undefined],
        ["typecheck", undefined, undefined],
      ],
      "expected each uncited check to carry the handle that ran and no citation at all"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-030 — the reader takes what the STEP DID, so a red the job swallowed still reds the row
// that step names. The arm runs over a planted target repository (tests/fixtures/scn-lnt-030/)
// whose workflow lets its check red without failing the job, and whose run record says that step
// failed while reporting a success to the job it sat in.
//
// THE FIXTURE IS THE ARM, AND ITS SIBLING DECLINED IT ON PURPOSE. @SCN-LNT-028's failed step holds
// its two results in agreement, so a reader taking either one passes there; a record where they
// DISAGREE is the only document that tells the two readers apart. Measured under the plant that
// rewrites the reader to take the laundered field: this arm reds and that one does not.
//
// THE PLANTED WORKFLOW CARRIES `continue-on-error` AND THIS REPOSITORY STILL MAY NOT. @SCN-LAD-008
// refuses the attribute over .github/workflows/ci.yml — the only file it reads — and nothing here
// touches that. What the fixture models is a consumer who reached for it deliberately, and what
// this axis owes them is an honest ledger rather than a refusal.
//
// IT RUNS THE COMPOSITION rather than the record reader alone, for its siblings' reason: the claim
// is about WHAT THE LEDGER SAYS, and a reader emitting an impeccable observation the composition
// never threads produces exactly the ledger a reader emitting nothing produces.
// -------------------------------------------------------------------------

/** @SCN-LNT-030 outcome: the planted target's root, the record of its run, and its reconciliation. */
let swallowedRedFixture: string;
let swallowedRedRecord: CiStepRecord;
let swallowedRedReconciliation: EvidenceReconciliation;

// @SCN-LNT-030
Given(
  "a target whose configured row names a static fitness check for the scenario its corpus carries, and whose CI lets that check's step red without failing the job",
  function () {
    swallowedRedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-030");
    const manifest = JSON.parse(
      readFileSync(join(swallowedRedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { fitnessChecks?: unknown } };
    // THE FIXTURE IS HELD TO WHAT THIS SCENARIO RESTS ON: ONE row, STATIC (a bar would send its
    // credit down the measurement stream instead), naming the scenario the planted corpus carries.
    assert.deepEqual(
      [...resolveFitnessChecks(manifest, NO_GATE_RECORD)].map(([scn, row]) => [
        scn,
        row.characteristic,
        carriesBar(row),
      ]),
      [["SCN-CVT-001", "complexity", false]],
      "expected one STATIC row naming the scenario the planted corpus carries"
    );
    const ciSource = readFileSync(join(swallowedRedFixture, "ci.yml"), "utf8");
    // THE SWALLOW IS READ BY THE PRODUCT'S OWN WORKFLOW READER, not re-derived here from the YAML.
    // `abortsJob: false` is that reader's word for a step whose red the job survives — the state
    // that makes the record below possible — and asking it rather than the file is what keeps the
    // fixture a pipeline that could exist rather than a record nobody could have written. The
    // checkout is not in this list because that reader walks `run:` steps and the checkout `uses:`
    // an action; the dump step is, and it aborts, which is the ordinary state the check departs
    // from.
    assert.deepEqual(
      ciRunSteps([ciSource]).map((step) => [step.id, step.abortsJob]),
      [
        ["SCN-CVT-001", false],
        ["dump-the-step-record", true],
      ],
      "expected the planted workflow's check step to be one whose red its job swallows"
    );
    // AND NOTHING ELSE OBSERVES THAT ROW. The check is a bare command, so the workflow read
    // discovers no script for it — asserted through the observer itself rather than by reading the
    // manifest twice, because what must be empty is what that observer EMITS.
    assert.deepEqual(
      runningStaticChecks([ciSource], manifest as PackageJsonScripts, ["lint:"]),
      [],
      "expected the workflow read to discover no check for this row, so the run record is its only observer"
    );
  }
);

// @SCN-LNT-030
Given(
  "its CI run's record says that step failed, while the job it sat in was told it succeeded",
  function () {
    swallowedRedRecord = JSON.parse(
      readFileSync(join(swallowedRedFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    // THE DISAGREEMENT, ASSERTED AS THE SCENARIO WORDS IT. The check's step did one thing and the
    // job was told another — and every other result in the record is a success, so a reader taking
    // the laundered field has nothing in this document to red on at all.
    assert.deepEqual(
      Object.entries(swallowedRedRecord).map(([id, step]) => [id, step.outcome, step.conclusion]),
      [
        ["SCN-CVT-001", "failure", "success"],
        ["dump-the-step-record", "success", "success"],
      ],
      "expected the check's step to have failed while telling its job it succeeded"
    );
  }
);

// @SCN-LNT-030
When("that target's evidence is reconciled with the record that run wrote about itself", function () {
  swallowedRedReconciliation = evidenceReconciliationFromSources({
    featureSources: [readFileSync(join(swallowedRedFixture, "features/target.feature"), "utf8")],
    untaggedScenarios: [],
    packageJson: JSON.parse(
      readFileSync(join(swallowedRedFixture, "package.json"), "utf8")
    ) as PackageJsonScripts,
    ciSources: [readFileSync(join(swallowedRedFixture, "ci.yml"), "utf8")],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: ["lint:"],
    killFloor: NO_GATE_RECORD,
    ciStepRecord: swallowedRedRecord,
  });
});

// @SCN-LNT-030
Then(
  "that row's Evidence Obligation reads failing off what the step did, and nothing is read off what the job was told",
  function () {
    // THE LEDGER WHOLE, and the one cell that discriminates is the outcome word. Under a reader
    // taking the laundered field this row reads `missing` — no credit raised at all — and stays
    // out of balance, so the VERDICT tells the two readings apart nowhere. A green job does not
    // balance this ledger either way; what it buys is a row that says nothing was heard.
    assert.deepEqual(
      swallowedRedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [["SCN-CVT-001", "scenario", "out-of-balance", [["complexity", "failing"]]]],
      `expected the swallowed red to read failing off the step's own result; got ` +
        JSON.stringify(swallowedRedReconciliation.ledger.scenarioReconciliations)
    );
    // AND THE OBSERVATION IS CARRIED, which is the second half of the same discrimination: the
    // reading the job's telling would have produced raises no credit, so this item would hold none.
    assert.deepEqual(
      swallowedRedReconciliation.ledger.scenarioReconciliations
        .find((row) => row.scnId === "SCN-CVT-001")
        ?.evidenceObservations.filter(isStaticCheckObservation)
        .map((observation) => [observation.checkTag, observation.scnId]),
      [["complexity", "SCN-CVT-001"]],
      "expected the failing row to carry the observation of the step whose red the job swallowed"
    );
    // AND THE RUN IS SOUND. The evidence stream did its job perfectly — it carried a red past a
    // job that had been told there wasn't one.
    assert.equal(
      hasBrokenEvidence(swallowedRedReconciliation.ledger),
      false,
      "expected a check that ran and found violations to leave the run sound"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-021 — a static check's step the CI RUN'S RECORD says SUCCEEDED credits the row that
// step names, citing its own @SCN. The arm runs over a planted target repository
// (tests/fixtures/scn-lnt-021/) whose corpus, rows, workflow and run record all live in one
// directory, so the debit and the credit are taken from one reading of one target.
//
// TWO ROWS FROM ONE RECORD, BECAUSE THE CLAIM IS THAT EACH IS CREDITED BY ITS OWN STEP. A reader
// posting one entry's credit to every configured row, and a reader crossing the two, both leave
// every row BALANCED — so the assertion is over the characteristic each row was credited FOR,
// per row, rather than over a verdict or a count.
//
// IT RUNS THE COMPOSITION rather than the record reader alone, for its siblings' reason: the claim
// is about WHAT THE LEDGER SAYS, and a reader emitting an impeccable observation the composition
// never threads produces exactly the ledger a reader emitting nothing produces.
// -------------------------------------------------------------------------

/** @SCN-LNT-021 outcome: the planted target's root, the record of its run, and its reconciliation. */
let succeededStepFixture: string;
let succeededStepRecord: CiStepRecord;
let succeededStepReconciliation: EvidenceReconciliation;

// @SCN-LNT-021
Given(
  "a target whose configured rows name a static fitness check for each of the two scenarios its corpus carries, and no check registry naming either",
  function () {
    succeededStepFixture = join(process.cwd(), "tests/fixtures/scn-lnt-021");
    const manifest = JSON.parse(
      readFileSync(join(succeededStepFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & {
      specController?: { fitnessChecks?: unknown; checkRegistry?: unknown };
    };
    // THE FIXTURE IS HELD TO WHAT THIS SCENARIO SAYS IT HOLDS: TWO rows, both STATIC (a bar would
    // send a credit down the measurement stream instead), each naming one of the corpus's two
    // scenarios and each carrying its own characteristic.
    assert.deepEqual(
      [...resolveFitnessChecks(manifest, NO_GATE_RECORD)].map(([scn, row]) => [
        scn,
        row.characteristic,
        carriesBar(row),
      ]),
      [
        ["SCN-CVT-001", "complexity", false],
        ["SCN-CVT-002", "traceability", false],
      ],
      "expected two STATIC rows, one per scenario the planted corpus carries"
    );
    // THE HOP THIS ROUTE RETIRES, ASSERTED BY ITS ABSENCE. A reading that still resolved a handle
    // through a registry would find none here.
    assert.equal(
      manifest.specController?.checkRegistry,
      undefined,
      "expected the planted target to configure NO check registry — the hop this route retires"
    );
    const source = readFileSync(join(succeededStepFixture, "features/target.feature"), "utf8");
    assert.deepEqual(
      parseTaggedScenarios(source)
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => [scenario.scnId, scenario.tags.includes("complexity")]),
      [
        ["SCN-CVT-001", false],
        ["SCN-CVT-002", false],
      ],
      "expected the planted corpus to carry both scenarios on the axis and no characteristic tag"
    );
    const ciSource = readFileSync(join(succeededStepFixture, "ci.yml"), "utf8");
    // EACH CHECK'S STEP STATES THE CODE OF THE ROW IT ANSWERS, read by the product's own workflow
    // reader rather than re-derived from the YAML — so the fixture is a pipeline that could exist
    // rather than a record nobody could have written. The checkout is not in this list because
    // that reader walks `run:` steps and the checkout `uses:` an action.
    assert.deepEqual(
      ciRunSteps([ciSource]).map((step) => step.id),
      ["SCN-CVT-001", "SCN-CVT-002", "dump-the-step-record"],
      "expected each check's step to state the code of the row it runs, beside the record's own step"
    );
    // AND NOTHING ELSE OBSERVES THOSE ROWS. Both commands are bare ones, so the workflow read
    // discovers no script for either — asserted through the observer itself rather than by reading
    // the manifest twice, because what must be empty is what that observer EMITS.
    assert.deepEqual(
      runningStaticChecks([ciSource], manifest as PackageJsonScripts, ["lint:"]),
      [],
      "expected the workflow read to discover no check for either row, so the run record is their only observer"
    );
  }
);

// @SCN-LNT-021
Given(
  "its CI run's record says both of those checks' steps succeeded, beside the step that wrote the record",
  function () {
    succeededStepRecord = JSON.parse(
      readFileSync(join(succeededStepFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    // THE RECORD WHOLE, INCLUDING THE ENTRY NO ROW ANSWERS. The dump step succeeded exactly as the
    // checks did, so a reader crediting every entry it can read has nothing in this document to
    // tell it apart — which is what makes the silence asserted at the foot an assertion.
    assert.deepEqual(
      Object.entries(succeededStepRecord).map(([id, step]) => [id, step.outcome]),
      [
        ["SCN-CVT-001", "success"],
        ["SCN-CVT-002", "success"],
        ["dump-the-step-record", "success"],
      ],
      "expected both check steps to have succeeded, beside the step that wrote the record"
    );
  }
);

// @SCN-LNT-021
When("that target's evidence is reconciled with the record its own CI run wrote", function () {
  succeededStepReconciliation = evidenceReconciliationFromSources({
    featureSources: [
      readFileSync(join(succeededStepFixture, "features/target.feature"), "utf8"),
    ],
    untaggedScenarios: [],
    packageJson: JSON.parse(
      readFileSync(join(succeededStepFixture, "package.json"), "utf8")
    ) as PackageJsonScripts,
    ciSources: [readFileSync(join(succeededStepFixture, "ci.yml"), "utf8")],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: ["lint:"],
    killFloor: NO_GATE_RECORD,
    ciStepRecord: succeededStepRecord,
  });
});

// @SCN-LNT-021
Then(
  "each row is credited for the characteristic its own row names, both Evidence Obligations read satisfied, and the run balances",
  function () {
    // THE LEDGER WHOLE, so a credit landing on the wrong row, or a second credit landing beside a
    // first, is visible rather than absorbed. Under the reader before this scenario neither credit
    // is raised at all and both rows read `missing`.
    assert.deepEqual(
      succeededStepReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [
          item.staticCheck,
          item.outcome,
          item.evidenceObservation !== undefined &&
          isStaticCheckObservation(item.evidenceObservation)
            ? [
                item.evidenceObservation.scnId,
                item.evidenceObservation.checkTag,
                item.evidenceObservation.exists,
                item.evidenceObservation.enforcedOverRealSource,
              ]
            : null,
        ]),
      ]),
      [
        [
          "SCN-CVT-001",
          "scenario",
          "balanced",
          [["complexity", "satisfied", ["SCN-CVT-001", "complexity", true, true]]],
        ],
        [
          "SCN-CVT-002",
          "scenario",
          "balanced",
          [["traceability", "satisfied", ["SCN-CVT-002", "traceability", true, true]]],
        ],
      ],
      `expected each row to be credited for its OWN characteristic, both facts observed off the ` +
        `run; got ${JSON.stringify(succeededStepReconciliation.ledger.scenarioReconciliations)}`
    );
    // AND THE STEP THAT WROTE THE RECORD IS ON THE LEDGER NOWHERE. Two rows, no suspense row, and
    // two static checks counted as having run — the three places a credit for an id no row answers
    // could surface.
    assert.equal(
      succeededStepReconciliation.ledger.scenarioReconciliations.length,
      2,
      "expected no third row for the step that wrote the record"
    );
    assert.deepEqual(
      succeededStepReconciliation.summary.staticChecks,
      { runningStaticCheckCount: 2, uncitedStaticCheckCount: 0 },
      "expected exactly the two configured checks counted as having run, and none uncited"
    );
    assert.equal(
      hasBrokenEvidence({
        scenarioReconciliations: succeededStepReconciliation.ledger.scenarioReconciliations,
      }),
      false,
      "expected two checks that ran and held to leave the run sound"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-022 — a MEASURED row's step in the CI RUN'S RECORD raises no credit, because that row's
// credit is its NUMBER. The arm runs over a planted target repository (tests/fixtures/scn-lnt-022/)
// whose corpus, rows, workflow, run record and measurement artefact all live in one directory, so
// the debit and both credits are taken from one reading of one target.
//
// THE TWO ROWS DIFFER IN EXACTLY ONE THING — the second names a bar. Same axis tag, same corpus,
// a step apiece in the same workflow and the same `success` in the same record: every difference
// the assertions see can only be the bar's doing.
//
// IT RUNS THE COMPOSITION rather than the record reader alone, for its siblings' reason: the claim
// is about WHAT THE LEDGER SAYS, and a reader emitting an impeccable observation the composition
// never threads produces exactly the ledger a reader emitting nothing produces.
// -------------------------------------------------------------------------

/** @SCN-LNT-022 outcome: the planted target's root, its two artefacts, and its reconciliation. */
let mixedFixture: string;
let mixedStepRecord: CiStepRecord;
let mixedMeasurements: MeasurementReport;
let mixedReconciliation: EvidenceReconciliation;

/** The planted target's manifest, read once and reused by the Givens and the When. */
function mixedManifest(): PackageJsonScripts & {
  specController?: { fitnessChecks?: unknown; checkRegistry?: unknown };
} {
  return JSON.parse(readFileSync(join(mixedFixture, "package.json"), "utf8")) as PackageJsonScripts & {
    specController?: { fitnessChecks?: unknown; checkRegistry?: unknown };
  };
}

// @SCN-LNT-022
Given(
  "a target's configured rows name a static fitness check for one of its two scenarios and a measured one, holding a floor, for the other",
  function () {
    mixedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-022");
    const manifest = mixedManifest();
    // THE FIXTURE IS HELD TO THE ONE DIFFERENCE THIS SCENARIO RESTS ON. Both rows on the axis, both
    // named by a row, and exactly one of them carrying a bar — without this the fixture could drift
    // into two static rows and the arm would go on passing while proving nothing about routing.
    assert.deepEqual(
      [...resolveFitnessChecks(manifest, NO_GATE_RECORD)].map(([scn, row]) => [
        scn,
        row.characteristic,
        carriesBar(row),
      ]),
      [
        ["SCN-CVT-001", "complexity", false],
        ["SCN-CVT-003", "mutation", true],
      ],
      "expected the planted rows to differ in exactly one thing — the second names a bar"
    );
    // THE HOP THIS ROUTE RETIRES, ASSERTED BY ITS ABSENCE. A reading that still resolved a handle
    // through a registry would find none here.
    assert.equal(
      manifest.specController?.checkRegistry,
      undefined,
      "expected the planted target to configure NO check registry — the hop this route retires"
    );
    assert.deepEqual(
      parseTaggedScenarios(readFileSync(join(mixedFixture, "features/target.feature"), "utf8"))
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => scenario.scnId),
      ["SCN-CVT-001", "SCN-CVT-003"],
      "expected the planted corpus to carry both scenarios on the bare fitness axis tag"
    );
  }
);

// @SCN-LNT-022
Given(
  "its CI run's record says both of those checks' steps succeeded, and its measurement artefact holds a number for the measured one",
  function () {
    mixedStepRecord = JSON.parse(
      readFileSync(join(mixedFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    mixedMeasurements = JSON.parse(
      readFileSync(join(mixedFixture, "measurements.json"), "utf8")
    ) as MeasurementReport;
    // THE MEASURED CHECK'S STEP IS IN THE RECORD AND IT SUCCEEDED, which is the point rather than an
    // oversight: a record that omitted it, or carried it as anything but a step that ran, would
    // green a reading that never had to skip anything.
    assert.deepEqual(
      Object.entries(mixedStepRecord).map(([id, step]) => [id, step.outcome]),
      [
        ["SCN-CVT-001", "success"],
        ["SCN-CVT-003", "success"],
        ["dump-the-step-record", "success"],
      ],
      "expected both check steps to have succeeded, beside the step that wrote the record"
    );
    assert.deepEqual(
      (Array.isArray(mixedMeasurements.measurements) ? mixedMeasurements.measurements : []).map(
        (row) => [
          (row as { scnId?: string }).scnId,
          (row as { checkTag?: string }).checkTag,
          (row as { measured?: number }).measured,
        ]
      ),
      [["SCN-CVT-003", "mutation", 92]],
      "expected the artefact to hold one number, citing the measured scenario and its check"
    );
    const ciSource = readFileSync(join(mixedFixture, "ci.yml"), "utf8");
    // EACH CHECK'S STEP STATES THE CODE OF THE ROW IT ANSWERS, read by the product's own workflow
    // reader rather than re-derived from the YAML — so the fixture is a pipeline that could exist
    // rather than a record nobody could have written.
    assert.deepEqual(
      ciRunSteps([ciSource]).map((step) => step.id),
      ["SCN-CVT-001", "SCN-CVT-003", "dump-the-step-record"],
      "expected each check's step to state the code of the row it runs, beside the record's own step"
    );
    // AND NOTHING ELSE OBSERVES THOSE ROWS. Both commands are bare ones, so the workflow read
    // discovers no script for either — asserted through the observer itself rather than by reading
    // the manifest twice, because what must be empty is what that observer EMITS.
    assert.deepEqual(
      runningStaticChecks([ciSource], mixedManifest(), ["lint:"]),
      [],
      "expected the workflow read to discover no check for either row, so the run record and the number are their only observers"
    );
  }
);

// @SCN-LNT-022
When(
  "that target's evidence is reconciled with the record its own CI run wrote and with what it measured",
  function () {
    mixedReconciliation = evidenceReconciliationFromSources({
      featureSources: [readFileSync(join(mixedFixture, "features/target.feature"), "utf8")],
      untaggedScenarios: [],
      packageJson: mixedManifest(),
      ciSources: [readFileSync(join(mixedFixture, "ci.yml"), "utf8")],
      measurements: mixedMeasurements,
      runtimeObservations: [],
      deferralTags: [],
      guardScriptPrefixes: ["lint:"],
      killFloor: NO_GATE_RECORD,
      ciStepRecord: mixedStepRecord,
    });
  }
);

// @SCN-LNT-022
Then(
  "the static scenario's row is credited off the record and the measured one's row off its number alone, each row carrying one credit and both balanced",
  function () {
    // EACH ROW'S CREDIT LIST WHOLE, because that is where the double count is legible: a stray
    // static credit on the measured row is ABSORBED by that row's own Evidence Obligation, so it
    // never reaches the verdict and a run holding one obligation with two credits still reads
    // balanced. Counting the credits is the assertion; the verdicts ride along beside it.
    assert.deepEqual(
      mixedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.verdict,
        row.evidenceObservations.map((observation) =>
          isStaticCheckObservation(observation)
            ? [observation.staticCheck, "the run's record"]
            : [(observation as { checkTag?: string }).checkTag, "the number"]
        ),
      ]),
      [
        ["SCN-CVT-001", "balanced", [["complexity", "the run's record"]]],
        ["SCN-CVT-003", "balanced", [["mutation", "the number"]]],
      ],
      `expected one credit on each row, the static one off the record and the measured one off ` +
        `its number; got ${JSON.stringify(mixedReconciliation.ledger.scenarioReconciliations)}`
    );
    // AND THE ROLL-UP COUNTS ONE STATIC CHECK AS HAVING RUN, not two. A measured check is not a
    // static check that ran, and this total is where a reader would see the second credit.
    assert.deepEqual(
      mixedReconciliation.summary.staticChecks,
      { runningStaticCheckCount: 1, uncitedStaticCheckCount: 0 },
      "expected exactly one static check counted as having run — the measured row is not one"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-026 — a check step's outcome credits its row only where it SAYS WHAT THE CHECK DID, and
// every other reading is broken evidence rather than a credit. The arm runs over a planted target
// repository (tests/fixtures/scn-lnt-026/) whose corpus, rows, workflow and run record all live in
// one directory, so the debit and the credit are taken from one reading of one target.
//
// ALL FOUR READINGS FROM ONE RECORD, WHICH IS WHY THEY ARE ONE SCENARIO. The four steps are wired
// identically and their rows are identical in shape; what tells them apart is one word apiece in
// the record of one run. Split across four records the set could agree by accident: a reader
// crediting everything and a reader crediting nothing would each need a second run to catch.
//
// THE SENTENCE THAT MOVED IS THE SECOND ROW'S. This scenario's text used to read "the credit is
// reached by the two readings that say the check ran — every step passed, or a step failed". The
// runner's exit code carried the verdict then; a CI step's exit code reaches this ledger nowhere,
// so the failed step's credit carries what it found and its row REDS.
//
// THE CLAIM IS AN ABSENCE ON TWO OF THE FOUR ROWS, SO THE INSTRUMENT IS A CARDINALITY ONE. A stray
// credit on either uncredited row is ABSORBED — each row names its own characteristic, so the extra
// credit answers its own obligation and the ledger goes on reading balanced there. What
// discriminates is each row's credit list, asserted whole, and the running-static-check total.
// -------------------------------------------------------------------------

/** @SCN-LNT-026 outcome: the planted target's root, the record of its run, and its reconciliation. */
let readingsFixture: string;
let readingsRecord: CiStepRecord;
let readingsReconciliation: EvidenceReconciliation;

// @SCN-LNT-026
Given(
  "a target's configured rows name a static fitness check for each of the four scenarios its corpus carries",
  function () {
    readingsFixture = join(process.cwd(), "tests/fixtures/scn-lnt-026");
    const manifest = JSON.parse(
      readFileSync(join(readingsFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { fitnessChecks?: unknown } };
    // THE FIXTURE IS HELD TO WHAT THIS SCENARIO RESTS ON, through the predicate the credit reader
    // asks its question through. Four STATIC rows — a bar would send a credit down the measurement
    // stream instead — one characteristic apiece. No row can excuse a skip at all (3F-3252), so
    // there is no second predicate to hold the fixture to.
    assert.deepEqual(
      [...resolveFitnessChecks(manifest, NO_GATE_RECORD)].map(([scn, row]) => [
        scn,
        row.characteristic,
        carriesBar(row),
      ]),
      [
        ["SCN-CVT-001", "complexity", false],
        ["SCN-CVT-002", "traceability", false],
        ["SCN-CVT-003", "duplication", false],
        ["SCN-CVT-004", "doc-accuracy", false],
      ],
      "expected four STATIC rows, one characteristic apiece"
    );
  }
);

// @SCN-LNT-026
Given(
  "its CI run's record says the first check's step succeeded, the second's failed, the third's was skipped, and the fourth's carries a status nobody anticipated",
  function () {
    readingsRecord = JSON.parse(
      readFileSync(join(readingsFixture, "ci-steps.json"), "utf8")
    ) as CiStepRecord;
    // ONE RECORD SAYING FOUR DIFFERENT THINGS, and the two fields held in agreement throughout.
    // WHICH of the two a reader must take is @SCN-LNT-030's claim over a record where they
    // disagree; settling both here would let a reader taking the laundered field pass this arm on
    // the strength of the right word.
    assert.deepEqual(
      Object.entries(readingsRecord).map(([id, step]) => [id, step.outcome, step.conclusion]),
      [
        ["SCN-CVT-001", "success", "success"],
        ["SCN-CVT-002", "failure", "failure"],
        ["SCN-CVT-003", "skipped", "skipped"],
        ["SCN-CVT-004", "neutral", "neutral"],
        ["dump-the-step-record", "success", "success"],
      ],
      "expected the four check steps written down as succeeded, failed, skipped and a status nobody anticipated, beside the step that wrote the record"
    );
  }
);

// @SCN-LNT-026
When(
  "that target's evidence is reconciled with the single record that run wrote about all four steps",
  function () {
    readingsReconciliation = evidenceReconciliationFromSources({
      featureSources: [readFileSync(join(readingsFixture, "features/target.feature"), "utf8")],
      untaggedScenarios: [],
      packageJson: JSON.parse(
        readFileSync(join(readingsFixture, "package.json"), "utf8")
      ) as PackageJsonScripts,
      ciSources: [readFileSync(join(readingsFixture, "ci.yml"), "utf8")],
      measurements: {},
      runtimeObservations: [],
      deferralTags: [],
      guardScriptPrefixes: ["lint:"],
      killFloor: NO_GATE_RECORD,
      ciStepRecord: readingsRecord,
    });
  }
);

// @SCN-LNT-026
Then(
  "the first row balances on a credit saying its check found nothing, the second reads failing off what its check found, and neither of the last two is credited — each is broken evidence naming what the record said about it, and the run is unsound",
  function () {
    // ALL FOUR ROWS AND THE SUSPENSE ROW AT ONCE, WHOLE. A reading that credited all four, or none,
    // or that went on collapsing the succeeded and failed steps into one answer, reds here — and so
    // does one that left the last two `missing` without stamping the run unsound, which is the
    // reading that would send a reader to write a check that is already written.
    assert.deepEqual(
      readingsReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [
          item.staticCheck,
          item.outcome,
          item.evidenceObservation !== undefined &&
          isStaticCheckObservation(item.evidenceObservation)
            ? item.evidenceObservation.status
            : null,
        ]),
      ]),
      [
        ["SCN-CVT-001", "scenario", "balanced", [["complexity", "satisfied", "passed"]]],
        ["SCN-CVT-002", "scenario", "out-of-balance", [["traceability", "failing", "failed"]]],
        ["SCN-CVT-003", "scenario", "out-of-balance", [["duplication", "missing", null]]],
        ["SCN-CVT-004", "scenario", "out-of-balance", [["doc-accuracy", "missing", null]]],
        ["(no scenario)", "suspense-scenario", "out-of-balance", [
          [undefined, "broken", null],
          [undefined, "broken", null],
        ]],
      ],
      `expected the succeeded step's row balanced, the failed step's row failing off its own ` +
        `verdict, and the last two credited by nothing with a broken item apiece on the suspense ` +
        `row; got ${JSON.stringify(readingsReconciliation.ledger.scenarioReconciliations)}`
    );
    // THE CARDINALITY INSTRUMENT. A reader crediting every reading leaves all four rows carrying a
    // credit, so what discriminates is HOW MANY running static checks the ledger holds — four under
    // such a reader, two here. A check that did not run is neither a running one nor an uncited one.
    assert.deepEqual(
      readingsReconciliation.summary.staticChecks,
      { runningStaticCheckCount: 2, uncitedStaticCheckCount: 0 },
      "expected exactly two static checks counted as having run — the two whose steps said what the check did"
    );
    // THE RUN'S VERDICT, ASKED THROUGH THE PREDICATE THE CLI AND THE RENDERER ASK. Exit 4 rather
    // than exit 1 is what the fall-through buys: the ledger could not be trusted to disagree, which
    // is what a run over checks that did not run is.
    assert.equal(
      hasBrokenEvidence({
        scenarioReconciliations: readingsReconciliation.ledger.scenarioReconciliations,
      }),
      true,
      "expected the run to be stamped unsound by the two broken credits"
    );
    // AND THE REPORT NAMES EACH ROW AND SAYS WHAT THE RECORD SAID ABOUT IT. A broken item carries
    // no observation, so its message is the whole of what a reader gets; each names its @SCN,
    // repeats what the record held, and prescribes no cure.
    const markdown = renderMarkdown(readingsReconciliation, CTX);
    assert.match(
      markdown,
      /SCN-CVT-003: the CI run's record says this check's step was skipped — so the check did not run\./,
      "expected the run-integrity section to name the skipped row and repeat what the record said"
    );
    assert.match(
      markdown,
      /SCN-CVT-004: the CI run's record says this check's step ended `neutral` — so the check did not run\./,
      "expected the run-integrity section to name the row whose status nobody anticipated, and repeat that status"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-024 — a MEASURED row's credit is the number ITS OWN COMMAND wrote into the run's record.
// The arm runs over a planted target repository (tests/fixtures/scn-lnt-024/) whose corpus and rows
// live in one directory, and it really RUNS each row's command the way that target's pipeline runs
// it — a shell, a working directory, and the run's record named in the environment — so what the
// reconciliation is handed was written by those commands rather than planted as bytes.
//
// IT GOES THROUGH THE SHIPPED CLI RATHER THAN THE COMPOSITION, which is this arm's own reason to
// exist beside @SCN-LNT-022's. `parseMeasuredEvidenceObservations` is exported from core's
// UNPUBLISHED `./internal` subpath; what a consumer actually has is `balance --measurements`, so a
// route that reads impeccably in-process and is unreachable from an installed package would pass
// every in-repo arm and fail the only reader that matters.
//
// AND THE RUN IS HANDED NO RUNNER'S REPORT AT ALL. The three streams named in the provenance are
// asserted whole: a credit reaching any of these four rows can only have come out of what the
// commands wrote, so a route still posting on the rows' behalf would have nowhere to post from.
// -------------------------------------------------------------------------

/** @SCN-LNT-024 outcome: the planted target, the record its commands wrote, and the CLI's report. */
let measuredFixture: string;
let measuredRecordPath: string;
let measuredRows: FitnessCheckIndex;
let measuredCommands: Map<string, string>;
let measuredReport: {
  runProvenance: { inputs: Record<string, string> };
  ledger: {
    scenarioReconciliations: {
      scnId: string;
      verdict: string;
      evidenceObservations: { checkTag?: string; measured?: number }[];
    }[];
  };
};

/** The planted target's manifest, read once and reused by the Givens and the When. */
function measuredManifest(): PackageJsonScripts & { specController?: { fitnessChecks?: unknown } } {
  return JSON.parse(readFileSync(join(measuredFixture, "package.json"), "utf8")) as PackageJsonScripts & {
    specController?: { fitnessChecks?: unknown };
  };
}

/**
 * The commands the target's rows name, read straight off its manifest.
 *
 * THE LEDGER'S OWN ROW READER CARRIES NO COMMAND AT ALL, and that is the shape rather than a gap
 * in `resolveFitnessChecks`: what a row's check is RUN by is the consumer's pipeline's business,
 * and `balance` never reads that field. So the arm reads it the way that pipeline does — off the
 * manifest — and reads the characteristic and the bar the way the ledger does.
 */
function measuredCommandsOf(manifest: ReturnType<typeof measuredManifest>): Map<string, string> {
  const rows = (manifest.specController?.fitnessChecks ?? []) as { scn: string; command: string }[];
  return new Map(rows.map((row) => [row.scn, row.command]));
}

/** One of the target's commands, run the way that target's pipeline runs it. */
function runMeasuredCommand(scn: string): void {
  const command = measuredCommands.get(scn);
  assert.ok(command !== undefined, `expected the planted manifest to carry a row for ${scn}`);
  const finished = spawnSync(command, {
    shell: true,
    cwd: measuredFixture,
    encoding: "utf8",
    env: { ...process.env, MEASUREMENT_RECORD: measuredRecordPath },
  });
  assert.equal(
    finished.status,
    0,
    `expected ${scn}'s command to run: ${finished.stderr ?? finished.error?.message ?? ""}`
  );
}

/** Whatever is in the run's record, or no rows at all where nothing has written one. */
function measuredRecordRows(): { scnId?: string; checkTag?: string; measured?: unknown }[] {
  if (!existsSync(measuredRecordPath)) return [];
  const held = JSON.parse(readFileSync(measuredRecordPath, "utf8")) as { measurements?: unknown };
  return Array.isArray(held.measurements)
    ? (held.measurements as { scnId?: string; checkTag?: string; measured?: unknown }[])
    : [];
}

// @SCN-LNT-024
Given(
  "a target's configured rows name a measured fitness check for each of four of its scenarios, and an earlier step of this run has already written one of those numbers into the run's record",
  function () {
    measuredFixture = join(process.cwd(), "tests/fixtures/scn-lnt-024");
    measuredRecordPath = join(
      mkdtempSync(join(tmpdir(), "scn-lnt-024-")),
      "measurements.json"
    );
    measuredRows = resolveFitnessChecks(measuredManifest(), NO_GATE_RECORD);
    measuredCommands = measuredCommandsOf(measuredManifest());
    // EVERY ROW MEASURED, which is what this scenario rests on: a row without a bar is a static one
    // and would be credited from somewhere else entirely, so the arm would go on passing while
    // proving nothing about the record.
    assert.deepEqual(
      [...measuredRows].map(([scn, row]) => [scn, row.characteristic, carriesBar(row)]),
      [
        ["SCN-CVT-020", "ci-run-time", true],
        ["SCN-CVT-021", "mutation", true],
        ["SCN-CVT-022", "complexity", true],
        ["SCN-CVT-023", "doc-accuracy", true],
      ],
      "expected four measured rows, each naming its own characteristic and carrying a bar"
    );
    assert.deepEqual(
      parseTaggedScenarios(readFileSync(join(measuredFixture, "features/target.feature"), "utf8"))
        .filter((scenario) => scenario.tags.includes("fitness"))
        .map((scenario) => scenario.scnId),
      ["SCN-CVT-020", "SCN-CVT-021", "SCN-CVT-022", "SCN-CVT-023"],
      "expected the planted corpus to carry all four scenarios on the bare fitness axis tag"
    );
    // THE EARLIER STEP IS REALLY RUN, so what the three below post beside is a row a command of this
    // run wrote rather than one the arm planted. Its number is what the last assertion looks for
    // still standing.
    assert.deepEqual(measuredRecordRows(), [], "expected the run to start with no record at all");
    runMeasuredCommand("SCN-CVT-020");
    assert.deepEqual(
      measuredRecordRows(),
      [{ scnId: "SCN-CVT-020", checkTag: "ci-run-time", measured: 42.1 }],
      "expected the earlier step to have written its own number and nothing else"
    );
  }
);

// @SCN-LNT-024
Given(
  "of the three commands still to run, the first writes its number into that record, the second writes nothing at all, and the third writes a row nothing could read as a number",
  function () {
    const commands = ["SCN-CVT-021", "SCN-CVT-022", "SCN-CVT-023"].map(
      (scn) => measuredCommands.get(scn) ?? ""
    );
    // THREE DIFFERENT COMMANDS, stated as an assertion over the rows rather than as prose about
    // them, so the arm cannot go on passing against three commands that had quietly become one.
    assert.equal(
      new Set(commands).size,
      3,
      `expected the three remaining rows to name three different commands; got ${JSON.stringify(commands)}`
    );
    // AND ONLY TWO OF THEM CAN REACH THE RECORD AT ALL. The middle one is never handed where the
    // record is, so "writes nothing" is a property of the command rather than of a run that
    // happened to go that way.
    assert.deepEqual(
      commands.map((command) => command.includes("MEASUREMENT_RECORD")),
      [true, false, true],
      "expected the first and third commands to write into the run's record and the second not to"
    );
  }
);

// @SCN-LNT-024
When(
  "each of those commands runs as its own step of that run, and that target's evidence is then reconciled with what the run measured",
  function () {
    for (const scn of ["SCN-CVT-021", "SCN-CVT-022", "SCN-CVT-023"]) runMeasuredCommand(scn);
    // THE REAL BINARY, over the target's own corpus and manifest and the record its commands wrote.
    // Nothing spec-controller ships ran any of those commands; this is the consumer's route in.
    const repoRoot = process.cwd();
    const reportPath = join(mkdtempSync(join(tmpdir(), "scn-lnt-024-cli-")), "reconciliation.json");
    const result = spawnSync(
      join(repoRoot, "node_modules", ".bin", "tsx"),
      [
        join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
        "--features", join(measuredFixture, "features"),
        "--package-json", join(measuredFixture, "package.json"),
        "--measurements", measuredRecordPath,
        "--format", `json:${reportPath}`,
      ],
      { cwd: repoRoot, encoding: "utf8" }
    );
    assert.equal(
      result.error,
      undefined,
      `expected the CLI subprocess to run; it failed to spawn: ${result.error?.message}`
    );
    assert.ok(
      existsSync(reportPath),
      `expected the CLI to persist ${reportPath}; it exited ${result.status}\n` +
        `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
    measuredReport = JSON.parse(readFileSync(reportPath, "utf8")) as typeof measuredReport;
  }
);

// @SCN-LNT-024
Then(
  "the number written earlier still stands beside the one the first command wrote, each crediting its own row for the characteristic that row names, and the other two rows are credited by nothing",
  function () {
    // EACH ROW'S CREDIT LIST WHOLE, because the claim about the two silent rows is an ABSENCE: a
    // credit invented for either of them names a characteristic its own row names, so it would be
    // absorbed by that row's Evidence Obligation and never reach a verdict. Counting is the
    // assertion; the verdicts ride along beside it.
    assert.deepEqual(
      measuredReport.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.verdict,
        row.evidenceObservations.map((observation) => [observation.checkTag, observation.measured]),
      ]),
      [
        ["SCN-CVT-020", "balanced", [["ci-run-time", 42.1]]],
        ["SCN-CVT-021", "balanced", [["mutation", 240]]],
        ["SCN-CVT-022", "out-of-balance", []],
        ["SCN-CVT-023", "out-of-balance", []],
      ],
      `expected the two rows whose commands wrote a number to be credited by it and the other two ` +
        `by nothing; got ${JSON.stringify(measuredReport.ledger.scenarioReconciliations)}`
    );
    // BESIDE, NEVER OVER — read off the record itself, which is the only place the difference
    // between "posted beside" and "posted over" is legible. The unreadable row is IN the file and
    // absent from the ledger above: what refuses it is the reading, not the writing.
    assert.deepEqual(
      measuredRecordRows(),
      [
        { scnId: "SCN-CVT-020", checkTag: "ci-run-time", measured: 42.1 },
        { scnId: "SCN-CVT-021", checkTag: "mutation", measured: 240 },
        { scnId: "SCN-CVT-023", checkTag: "doc-accuracy", measured: "ninety" },
      ],
      "expected each command's row to stand beside the ones already there, in the order they ran"
    );
    // AND NO RUNNER'S REPORT WAS HANDED IN, asserted over the streams the run itself names rather
    // than over the arm's own argv: three inputs, and none of them a pass's document.
    assert.deepEqual(
      Object.keys(measuredReport.runProvenance.inputs),
      ["features", "packageJson", "measurements"],
      "expected the run to name exactly its corpus, its manifest and the record its commands wrote"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-032 — a check the job's verdict does not depend on reconciles as the WATERMELON,
// wherever the severance is written, beside a sibling check whose red IS that verdict. The arm
// runs over a planted target repository (tests/fixtures/scn-lnt-032/) whose manifest names three
// static checks, whose corpus carries a stepless scenario for each, and whose workflow severs two
// of them — one on the step, one on the job.
//
// THREE CHECKS, ONE TARGET, ONE RUN. They run under one manifest and are discovered by one prefix,
// and differ in exactly one thing: where the severance is written, or whether it is written at
// all. Split across three targets they could agree by accident — a reader that flags everything
// and a reader that flags nothing each need a second run to catch.
//
// AND THE THREE REACH BOTH OBSERVERS, WHICH IS THE FIXTURE'S OTHER JOB. The first check is
// REGISTERED, so the corpus obliges its handle and the obligation-side observer answers for it
// while the running-check stream drops it; the second and third are CONFIGURED rows their steps
// cite, so the running-check observer answers for those. Neither module can be reverted without
// redding this arm.
// -------------------------------------------------------------------------

/** @SCN-LNT-032 outcome: the planted target's root, its workflow bytes, and its reconciliation. */
let severedFixture: string;
let severedCiSource: string;
let severedReconciliation: EvidenceReconciliation;

// @SCN-LNT-032
Given("a target whose corpus names three static checks its CI runs", function () {
  severedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-032");
  const manifest = JSON.parse(
    readFileSync(join(severedFixture, "package.json"), "utf8")
  ) as PackageJsonScripts & {
    specController?: { checkRegistry?: unknown; fitnessChecks?: unknown };
  };
  // THE FIXTURE IS HELD TO THE ARRANGEMENT THIS SCENARIO RESTS ON: three STATIC checks, each a
  // script the manifest holds, named the two ways that reach the two observers. Drift either way —
  // a bar appearing, a registry entry lost, a row losing its script — and the arm would go on
  // passing while asserting something else, or would quietly stop exercising one of the readers.
  assert.deepEqual(
    [...resolveFitnessChecks(manifest, NO_GATE_RECORD)].map(([scn, row]) => [
      scn,
      row.characteristic,
      carriesBar(row),
    ]),
    [
      ["SCN-CVT-002", "traceability", false],
      ["SCN-CVT-003", "tech-conformance", false],
    ],
    "expected two CONFIGURED static rows, each naming a script of this manifest"
  );
  assert.deepEqual(
    [...resolveCheckRegistry(manifest)].map(([handle, entry]) => [handle, entry.check]),
    [["lint:alpha", "complexity"]],
    "expected the third check to be named through the REGISTRY, so the obligation-side observer answers for it"
  );
  assert.deepEqual(
    Object.keys(manifest.scripts ?? {}),
    ["lint:alpha", "lint:beta", "lint:gamma"],
    "expected each of the three checks to exist as a script under the one discovered prefix"
  );
  severedCiSource = readFileSync(join(severedFixture, "ci.yml"), "utf8");
  // AND ALL THREE ARE ORDINARY `run:` STEPS OF THAT TARGET'S OWN PIPELINE. Nothing is moved out of
  // the pipeline and no wrapper stands in front of a command, which is the property the whole
  // claim rests on — a fixture that had quietly grown one would prove a different route.
  assert.deepEqual(
    ciRunSteps([severedCiSource]).map((step) => step.command),
    ["pnpm lint:alpha", "pnpm lint:gamma", "pnpm lint:beta"],
    "expected the planted workflow to invoke each check's own script from a plain run: step"
  );
});

// @SCN-LNT-032
Given(
  "the first check's step carries continue-on-error, the second's job carries it, and the third's red is the job's verdict",
  function () {
    // THE ONE DIFFERENCE BETWEEN THE THREE STEPS, ASSERTED AS ONE FACT — and asserted through the
    // reader the observers themselves use, rather than by a second reading of the same YAML that
    // would be free to disagree with it about which steps this workflow even runs.
    //
    // WHERE the key is carried is asserted as well as WHETHER, because a fixture whose two severed
    // checks were severed the same way would leave the far carrier unwitnessed while the arm read
    // green — the reader that catches the near one and misses the far one, which is the fault this
    // scenario exists to close.
    assert.deepEqual(
      ciRunSteps([severedCiSource]).map((step) => [
        step.command,
        step.abortsJob,
        step.abortsJob ? null : step.continuesOnError.carriedBy,
      ]),
      [
        ["pnpm lint:alpha", false, "step"],
        ["pnpm lint:gamma", true, null],
        ["pnpm lint:beta", false, "job"],
      ],
      "expected one check severed on its step, one on its job, and one whose red is still the job's verdict"
    );
  }
);

// @SCN-LNT-032
When(
  "that target's evidence is reconciled from its manifest, its corpus and the two jobs of its workflow",
  function () {
    severedReconciliation = evidenceReconciliationFromSources({
      featureSources: [
        readFileSync(join(severedFixture, "features/target.feature"), "utf8"),
      ],
      untaggedScenarios: [],
      packageJson: JSON.parse(
        readFileSync(join(severedFixture, "package.json"), "utf8")
      ) as PackageJsonScripts,
      ciSources: [severedCiSource],
      measurements: {},
      runtimeObservations: [],
      deferralTags: [],
      // THE PREFIX FINDS ALL THREE, WHICH IS WHAT LEAVES THE SEVERANCE AS THE ONLY VARIABLE.
      // Discovery is blind to `continue-on-error`; what the key decides is what a discovered
      // check's row READS.
      guardScriptPrefixes: ["lint:"],
      killFloor: () => null,
    });
  }
);

// @SCN-LNT-032
Then(
  "the first two rows read the watermelon and leave balanced, and the third reconciles satisfied",
  function () {
    // THE LEDGER WHOLE, because what this watches for is a DISCRIMINATION rather than one row's
    // value. An arm over the severed rows alone would pass over a reader that had started flagging
    // the third as well — the opposite fault, and just as wrong.
    assert.deepEqual(
      severedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ]),
      [
        ["SCN-CVT-001", "scenario", "out-of-balance", [["complexity", "watermelon"]]],
        ["SCN-CVT-002", "scenario", "out-of-balance", [["traceability", "watermelon"]]],
        ["SCN-CVT-003", "scenario", "balanced", [["tech-conformance", "satisfied"]]],
      ],
      `expected both severed checks to read the watermelon and the sibling to stay satisfied; ` +
        `got ${JSON.stringify(severedReconciliation.ledger.scenarioReconciliations)}`
    );
    // AND A SEVERED CHECK IS STILL OBSERVED, as one that EXISTS and enforces nothing. The field
    // moves and the membership filter does not: narrowing the filter that decides whether a script
    // is observed at all would delete a severed check from the report rather than surface it —
    // the same fault reached from the other side, and silent. A watermelon row carrying no
    // observation at all is that mistake showing.
    assert.deepEqual(
      severedReconciliation.ledger.scenarioReconciliations
        .filter((row) => row.scnId !== "SCN-CVT-003")
        .flatMap((row) => row.evidenceObservations)
        .filter(isStaticCheckObservation)
        .map((observation) => [
          observation.staticCheck,
          observation.exists,
          observation.enforcedOverRealSource,
          observation.scnId,
        ]),
      [
        ["lint:alpha", true, false, "SCN-CVT-001"],
        ["lint:beta", true, false, "SCN-CVT-002"],
      ],
      "expected each severed check to be OBSERVED as one that exists and enforces nothing, on the row it cites"
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-033 — the static-check CENSUS counts only the checks the job's verdict depends on, on
// BOTH of its counts. The arm drives the REAL `balance` CLI over a planted target repository
// (tests/fixtures/scn-lnt-033/) whose manifest names two static checks, whose corpus names
// neither, and whose workflow severs one of them — and reads the census off the persisted report
// rather than off an in-memory re-run.
//
// A DIFFERENT READER FROM @SCN-LNT-032'S, WHICH IS WHY IT IS A SECOND SCENARIO. That one is the
// NAMED row: an obligation exists and its outcome moves. Here there is no obligation at all and no
// row moves — what moves is the one line a consumer reads for how much protection they have, and
// the figure they take from it is the subtraction neither count prints.
//
// REGISTERED-BUT-UNCARRIED, BOTH OF THEM, so the severance is the only variable. The two checks
// share a prefix, a manifest, a registry treatment and their absence from the corpus; the job's
// verdict depends on one and not on the other. A fixture whose two checks also differed in their
// citation could report this census for a reason that has nothing to do with the key.
// -------------------------------------------------------------------------

/** @SCN-LNT-033 outcome: the planted target's root and the report the CLI persisted for it. */
let uncitedSeveredFixture: string;
let uncitedSeveredMd: string;

// @SCN-LNT-033
Given(
  "a target running two static checks no scenario cites, one of them behind continue-on-error",
  function () {
    uncitedSeveredFixture = join(process.cwd(), "tests/fixtures/scn-lnt-033");
    const manifest = JSON.parse(
      readFileSync(join(uncitedSeveredFixture, "package.json"), "utf8")
    ) as PackageJsonScripts & { specController?: { checkRegistry?: unknown } };
    // THE FIXTURE IS HELD TO THE ARRANGEMENT THE CLAIM RESTS ON: two static checks under one
    // discovered prefix, BOTH registered, so neither is uncited for a reason the other is not.
    // Drift either way — a third script, a registry entry lost — and the arm would go on passing
    // while asserting something else.
    assert.deepEqual(
      Object.keys(manifest.scripts ?? {}),
      ["lint:advisory", "lint:enforced"],
      "expected exactly two checks, each a script under the one discovered prefix"
    );
    assert.deepEqual(
      [...resolveCheckRegistry(manifest)].map(([handle, entry]) => [handle, entry.check]),
      [
        ["lint:advisory", "complexity"],
        ["lint:enforced", "tech-conformance"],
      ],
      "expected BOTH handles registered, so the citation seam treats them identically"
    );
    // AND THE CORPUS NAMES NEITHER, which is what makes both of them uncited. Asserted against the
    // corpus bytes rather than left to the fixture's own comment: a tag appearing on either check
    // would make that check CITED and take the whole claim away.
    const corpus = readFileSync(
      join(uncitedSeveredFixture, "features/target.feature"),
      "utf8"
    );
    assert.deepEqual(
      ["complexity", "tech-conformance"].filter((check) => corpus.includes(`@${check}`)),
      [],
      "expected the corpus to carry neither check's bare tag — an uncited check is one nothing names"
    );
    // THE ONE DIFFERENCE BETWEEN THE TWO STEPS, read through the reader the observers themselves
    // use rather than by a second reading of the same YAML, which would be free to disagree with
    // them about which steps this workflow even runs.
    assert.deepEqual(
      ciRunSteps([readFileSync(join(uncitedSeveredFixture, "ci.yml"), "utf8")]).map((step) => [
        step.command,
        step.abortsJob,
      ]),
      [
        ["pnpm lint:advisory", false],
        ["pnpm lint:enforced", true],
      ],
      "expected one check the job's verdict survives and one whose red IS that verdict"
    );
  }
);

// @SCN-LNT-033
When(
  "that target's census is taken from its manifest, its corpus and its workflow",
  function () {
    // THE REAL CLI OVER REAL FILES, not an in-memory re-run — the census is a rendered LINE, and
    // what a consumer reads is the report on disk. A fold asserted in memory cannot tell whether
    // the number ever reached the page.
    const reportDir = mkdtempSync(join(tmpdir(), "spec-controller-lnt033-"));
    const reportPath = join(reportDir, "spec-reconciliation.md");
    const result = spawnSync(
      join(process.cwd(), "node_modules", ".bin", "tsx"),
      [
        join(process.cwd(), "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
        "--features", join(uncitedSeveredFixture, "features"),
        "--ci", join(uncitedSeveredFixture, "ci.yml"),
        "--package-json", join(uncitedSeveredFixture, "package.json"),
        "--target", "lnt033-fixture",
        "--format", `md:${reportPath}`,
      ],
      { cwd: reportDir, encoding: "utf8" }
    );
    assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
    // Exit 1: this target IS out of balance — two uncited credits in suspense and one unobserved
    // unit obligation. The report is written IN FULL first, which is what this arm reads.
    assert.equal(
      result.status,
      1,
      `expected exit 1 (out-of-balance) writing the report; got ${result.status}\nstderr:\n${result.stderr}`
    );
    uncitedSeveredMd = readFileSync(reportPath, "utf8");
  }
);

// @SCN-LNT-033
Then(
  "the census reports one static check run and one uncited static check, so the named count it implies is nil",
  function () {
    // BOTH COUNTS AS ONE LINE, because the fault is a DISAGREEMENT between them rather than a wrong
    // number in either. A reader that had narrowed the running count as well would report "0 run,
    // 0 uncited" — two counts agreeing by both being empty, which describes a pipeline with no
    // checks in it.
    //
    // AND THE LINE IS LIFTED BEFORE IT IS COMPARED, so a red prints the census the report actually
    // carries. A whole-report `includes` that fails says only that a string was absent, and the
    // one thing a reader of this red needs is the pair of numbers that turned up instead.
    const censusLine = uncitedSeveredMd
      .split("\n")
      .find((line) => /static check\(s\) run, \d+ uncited static check\(s\)\./.test(line));
    assert.equal(
      censusLine,
      "1 static check(s) run, 1 uncited static check(s).",
      `expected the severed check to count in NEITHER census count, so the named count it ` +
        `implies is 1 − 1 = 0. An untreated uncited count reports 2 uncited here and the ` +
        `subtraction goes to −1, which is a number no pipeline can have.`
    );

    // THE COUNT MOVES AND THE POSTING DOES NOT. Dropping the severed check from the stream would
    // satisfy the line above by DELETING the check from the report — the reader would never learn
    // they run a check that guards nothing and that nobody has named, which is two omissions at
    // once and silent. Both handles are on the books, on the suspense row and on no other.
    const ledgerSection = uncitedSeveredMd.slice(
      uncitedSeveredMd.indexOf("## Scenario Reconciliations")
    );
    for (const handle of ["lint:advisory", "lint:enforced"]) {
      const bearing = ledgerSection
        .split("\n")
        .filter((line) => line.startsWith("|") && line.includes(`(${handle})`))
        .map((line) => line.split("|").map((cell) => cell.trim())[1]);
      assert.deepEqual(
        bearing,
        ["(no scenario)"],
        `expected ${handle} banked as a cites-no-scenario credit on the suspense row and on no ` +
          `other; got ${JSON.stringify(bearing)} in:\n${uncitedSeveredMd}`
      );
    }
  }
);
