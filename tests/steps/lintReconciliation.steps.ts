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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseScenarios, evidenceReconciliationOf } from "@3f-consulting/spec-controller-core";
import { checkStaticEvidenceObligations } from "@3f-consulting/spec-controller-core";
import type { PackageJsonScripts } from "@3f-consulting/spec-controller-core";
import { reconcile } from "@3f-consulting/spec-controller-core";
import { runReconcile } from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { renderMarkdown, runningStaticChecks } from "@3f-consulting/spec-controller-core";
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
} from "@3f-consulting/spec-controller-core/internal";
import { parseTaggedScenarios } from "../../packages/core/src/parse/scenarios.js";
import {
  carriesBar,
  type FitnessCheckRegistry,
} from "../../packages/core/src/domain/fitnessChecks.js";
import {
  resolveFitnessChecks,
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
// @SCN-LNT-021 — the CREDIT side reads the fitness pass's Cucumber report, so this arm runs the
// reconcile composition itself rather than `runReconcile`: where that report comes FROM is
// @SCN-SLF-001's Update, and the reading is what this scenario proves.
import { evidenceReconciliationFromSources } from "@3f-consulting/spec-controller-core";
import type { CucumberJsonReport } from "@3f-consulting/spec-controller-core";

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
let configuredFitnessChecks: FitnessCheckRegistry | undefined;

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

/** The runnable handle the fixture registry maps — spec-controller's own genuinely-wired check. */
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
    // row and the fitness cucumber pass invokes it — so this repository wires no discovered static
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
    // NO steps — the ordinary shape of a fitness scenario, which has a whole-system characteristic
    // to hold and nothing to exemplify. It is the FIRST of the two rows this scenario reads; the
    // Given that follows appends the STEPPED one, and the assertion is that the shape made no
    // difference (@SCN-LNT-006).
    corpusSource = [
      "@FIT",
      "Feature: fitness",
      "  Rule: the tree stays inside its thresholds",
      `    @${check} @SCN-AAA-001`,
      "    Scenario: the codebase stays under the threshold",
    ].join("\n");
  }
);

// @SCN-LNT-006
// @SCN-LNT-010
Given(
  "a STEPPED scenario tagged with the same bare fitness check {string}",
  function (check: string) {
    // THE SAME TAG ON THE OTHER SHAPE, appended to the SAME corpus the preceding Given built — one
    // read, two rows, so the assertion that follows compares the two answers rather than two runs.
    // The row carries its check tag and NOTHING else, which is the shape a converted fitness
    // scenario arrives in: a tier tag beside it would be a corpus defect (@SCN-STG-005), and the
    // point here is the obligation rule, not the corpus rule.
    corpusSource = [
      corpusSource,
      `    @${check} @SCN-AAA-002`,
      "    Scenario: the same characteristic, now carrying a runnable example",
      "      Given a step, which is the whole of what makes this row STEPPED",
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
    // The RUNNER's half of the row, present because a real row carries it and unread on this side.
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
  "each of those scenarios raises exactly one Evidence Obligation, naming the fitness check {string}",
  function (check: string) {
    // WHOLE-CORPUS equality over BOTH rows, and the two expectations are deliberately IDENTICAL:
    // what this scenario asserts is that the shape made no difference. A rule still reading the
    // steps answers `[]` for the second row and fails here; one that answered twice for the first
    // fails here too.
    assert.deepEqual(
      scenarios.map((scenario) => scenario.evidenceObligations),
      [
        [{ qualityCheck: "lint", staticCheck: check }],
        [{ qualityCheck: "lint", staticCheck: check }],
      ],
      `expected the stepless row AND the stepped row each to raise one lint Evidence Obligation ` +
        `naming "${check}" — the tag is the discriminator, not the steps; got ${JSON.stringify(scenarios)}`
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
// @SCN-LNT-021 — the CREDIT side of a converted STATIC check: a scenario the fitness pass reported
// credits the row that raised its Evidence Obligation, citing its own @SCN. The arm runs over a
// planted target repository (tests/fixtures/scn-lnt-021/) whose corpus, rows and fitness report all
// live in one directory, so the debit and the credit are taken from one reading of one target.
// -------------------------------------------------------------------------

/** The planted converted target's fixture directory, its fitness report, and what it reconciled to. */
let convertedFixture: string;
let convertedFitnessReport: CucumberJsonReport;
let convertedReconciliation: EvidenceReconciliation;

/** The planted target's manifest, read once and reused by the Given and the When. */
function convertedManifest(): {
  specController?: { fitnessChecks?: unknown; checkRegistry?: unknown };
} {
  return JSON.parse(readFileSync(join(convertedFixture, "package.json"), "utf8")) as {
    specController?: { fitnessChecks?: unknown; checkRegistry?: unknown };
  };
}

// @SCN-LNT-021
Given(
  "a target's configured rows name a static fitness check for each of the two scenarios its corpus carries",
  function () {
    convertedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-021");
    const manifest = convertedManifest();
    // THE FIXTURE IS HELD TO WHAT THIS SCENARIO SAYS IT HOLDS. Without these it could drift into
    // carrying a bar, a characteristic tag or a check registry, and the arm would go on passing
    // while proving something else.
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
      "expected the planted rows to name both scenarios, each a STATIC check carrying no bar"
    );
    assert.equal(
      manifest.specController?.checkRegistry,
      undefined,
      "expected the planted target to configure NO check registry — the hop this route retires"
    );
    const source = readFileSync(join(convertedFixture, "features/target.feature"), "utf8");
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
  }
);

// @SCN-LNT-021
Given(
  "its fitness pass reported both, the first having found nothing and the second a violation",
  function () {
    convertedFitnessReport = JSON.parse(
      readFileSync(join(convertedFixture, "fitness.json"), "utf8")
    ) as CucumberJsonReport;
    // The report is held to carrying BOTH verdicts, because the claim at the foot is that the
    // credit is about the wiring and the exit code is about the findings. A fixture that drifted
    // into two passing scenarios would let a reading that filtered on status pass here.
    assert.deepEqual(
      (convertedFitnessReport[0]?.elements ?? []).map((scenario) => [
        (scenario.tags ?? []).map((tag) => tag.name).join(" "),
        (scenario.steps ?? []).map((step) => step.result?.status).join(","),
      ]),
      [
        ["@fitness @SCN-CVT-001", "passed"],
        ["@fitness @SCN-CVT-002", "failed"],
      ],
      "expected the planted report to carry both axis scenarios, one passed and one failed"
    );
  }
);

// @SCN-LNT-021
When("that target's evidence is reconciled with what its fitness pass reported", function () {
  // The reconcile composition over the planted target and NOTHING else — no CI bytes, no scripts,
  // no runtime observations, no measurements. Every credit these two rows receive can only have
  // come from the fitness report.
  convertedReconciliation = evidenceReconciliationFromSources({
    featureSources: [readFileSync(join(convertedFixture, "features/target.feature"), "utf8")],
    untaggedScenarios: [],
    packageJson: convertedManifest(),
    ciSources: [],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: [],
    killFloor: () => null,
    fitnessReport: convertedFitnessReport,
  });
});

// @SCN-LNT-021
Then(
  "each scenario's own row is credited for the characteristic its row names, no check registry naming either, and both rows balance",
  function () {
    // BOTH ROWS AT ONCE, whole — a reading that credited only the passing scenario, or that landed
    // one row's credit on the other row, reds here as firmly as one that credited nothing.
    assert.deepEqual(
      convertedReconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.verdict,
        // The row's reconciled SUB-ROWS, not its `reconcilingItems`: that field holds the
        // non-balanced subset, so a satisfied credit would be invisible in it.
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
          "balanced",
          [["complexity", "satisfied", ["SCN-CVT-001", "complexity", true, true]]],
        ],
        [
          "SCN-CVT-002",
          "balanced",
          [["traceability", "satisfied", ["SCN-CVT-002", "traceability", true, true]]],
        ],
      ],
      `expected each reported scenario's own row to be credited for its row's characteristic, both ` +
        `facts observed off the run; got ${JSON.stringify(convertedReconciliation.ledger.scenarioReconciliations)}`
    );
  }
);

// -------------------------------------------------------------------------
// @SCN-LNT-022 — the same reading over a MEASURED row: the fitness report raises no credit for it,
// because that row's credit is its NUMBER. The arm runs over a planted target repository
// (tests/fixtures/scn-lnt-022/) whose two rows differ in exactly one thing — the second names a
// bar — so both streams are read from one target and the routing can only be the bar's doing.
// -------------------------------------------------------------------------

/** The planted mixed target's fixture directory, its two artefacts, and what it reconciled to. */
let mixedFixture: string;
let mixedFitnessReport: CucumberJsonReport;
let mixedMeasurements: MeasurementReport;
let mixedReconciliation: EvidenceReconciliation;

/** The planted target's manifest, read once and reused by the Given and the When. */
function mixedManifest(): { specController?: { fitnessChecks?: unknown } } {
  return JSON.parse(readFileSync(join(mixedFixture, "package.json"), "utf8")) as {
    specController?: { fitnessChecks?: unknown };
  };
}

// @SCN-LNT-022
Given(
  "a target's configured rows name a static fitness check for one of its two scenarios and a measured one, holding a floor, for the other",
  function () {
    mixedFixture = join(process.cwd(), "tests/fixtures/scn-lnt-022");
    // THE FIXTURE IS HELD TO THE ONE DIFFERENCE THIS SCENARIO RESTS ON. Both rows on the axis, both
    // named by a row, and exactly one of them carrying a bar — without this the fixture could drift
    // into two static rows and the arm would go on passing while proving nothing about routing.
    assert.deepEqual(
      [...resolveFitnessChecks(mixedManifest(), NO_GATE_RECORD)].map(([scn, row]) => [
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
  "its fitness pass reported both scenarios, and its measurement artefact holds a number for the measured one",
  function () {
    mixedFitnessReport = JSON.parse(
      readFileSync(join(mixedFixture, "fitness.json"), "utf8")
    ) as CucumberJsonReport;
    mixedMeasurements = JSON.parse(
      readFileSync(join(mixedFixture, "measurements.json"), "utf8")
    ) as MeasurementReport;
    // THE MEASURED SCENARIO IS IN THE REPORT, and that is the point rather than an oversight: its
    // appearance there is still what says the check ran. A fixture whose report omitted it would
    // green a reading that never had to skip anything.
    assert.deepEqual(
      (mixedFitnessReport[0]?.elements ?? []).map((scenario) =>
        (scenario.tags ?? []).map((tag) => tag.name).join(" ")
      ),
      ["@fitness @SCN-CVT-001", "@fitness @SCN-CVT-003"],
      "expected the planted report to carry BOTH axis scenarios, the measured one included"
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
  }
);

// @SCN-LNT-022
When(
  "that target's evidence is reconciled with what its fitness pass reported and with what it measured",
  function () {
    mixedReconciliation = evidenceReconciliationFromSources({
      featureSources: [readFileSync(join(mixedFixture, "features/target.feature"), "utf8")],
      untaggedScenarios: [],
      packageJson: mixedManifest(),
      ciSources: [],
      measurements: mixedMeasurements,
      runtimeObservations: [],
      deferralTags: [],
      guardScriptPrefixes: [],
      killFloor: () => null,
      fitnessReport: mixedFitnessReport,
    });
  }
);

// @SCN-LNT-022
Then(
  "the static scenario's row is credited off the report and the measured one's row off its number alone, each row carrying one credit and both balanced",
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
            ? [observation.staticCheck, "the fitness report"]
            : [(observation as { checkTag?: string }).checkTag, "the number"]
        ),
      ]),
      [
        ["SCN-CVT-001", "balanced", [["complexity", "the fitness report"]]],
        ["SCN-CVT-003", "balanced", [["mutation", "the number"]]],
      ],
      `expected one credit on each row, the static one off the report and the measured one off ` +
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
