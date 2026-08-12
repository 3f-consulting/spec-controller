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

import { Given, When, Then } from "@cucumber/cucumber";
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
import { isStaticCheckObservation } from "@3f-consulting/spec-controller-core/internal";
import { parseTaggedScenarios } from "../../packages/core/src/parse/scenarios.js";

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
Given("a stepless fitness scenario carries the bare check {string}", function (check: string) {
  // NO steps — the fitness shape. The corpus is the second hop of the citation seam, so the
  // scenario that CARRIES the check is the one the run will come to cite.
  fitnessCorpus = [
    "@LNT",
    "Feature: fixture",
    "  Rule: a fixture rule",
    `    @${check} @SCN-FIT-001`,
    "    Scenario: the tree stays inside this check's threshold",
  ].join("\n");
});

// @SCN-LNT-008
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
      `    @${check} @SCN-FIT-002`,
      "    Scenario: a second scenario claiming the same check",
    ].join("\n");
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
    // tags here resolve to SCN-FIT-001 and both runs cite it. Nothing about that is a fault; what
    // the arm settles is whether the reconciler can still tell the two credits apart.
    fitnessCorpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${check} @${otherCheck} @SCN-FIT-001`,
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
  reconciledCorpus = fitnessCorpus.replace("SCN-FIT-001", "SCN-FIT-002");
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
    `    @lint=${CITED_SCRIPT} @SCN-FIT-002`,
    "    Scenario: a fixture scenario naming the same handle the retired way",
    "      Given a fixture step",
  ].join("\n");
});

// @SCN-LNT-001
// @SCN-LNT-008
// @SCN-LNT-009
When(
  "the fitness checks wired into CI over the real source are observed and reconciled",
  function () {
    // The tool's OWN, REAL CI config + package.json from the checked-out tree (cwd is the repo
    // root under `pnpm cucumber`) — the check is genuinely a CI run step over real source, not a
    // planted fixture. The cross-component arm: registry → corpus → observer → reconcile → render.
    const root = process.cwd();
    const ciSource = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    ) as PackageJsonScripts;

    const checkTags = registeredCheckTagsOf(fitnessRegistry);
    // TWO READS, and they are the same one unless an arm has said otherwise: the citation is
    // resolved against the corpus as it read when the check was OBSERVED, and the row it names is
    // looked for in the corpus as it reads when the LEDGER is built (@SCN-LNT-009).
    scenarios = parseScenarios(reconciledCorpus ?? fitnessCorpus, [], checkTags);
    const citations = fitnessCitations(parseTaggedScenarios(fitnessCorpus), checkTags);
    evidenceObservations = runningStaticChecks([ciSource], packageJson, ["lint:"], [], (script) =>
      citationOfScript(script, fitnessRegistry, citations)
    );

    const reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations);
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

  const reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations);
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
    // STEPLESS is what makes the second one reachable at all (@SCN-LNT-006): a bare check tag on a
    // STEPPED scenario raises nothing, which is name-match's own fault refused in the tag form. So
    // the shape below is not an endorsement of mixed tagging — whether a behavioural scenario may
    // carry a fitness tag is @SCN-STG-005's question — it is the only shape from which a two-axis
    // row can be read at all.
    fitnessCorpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @${check} @SCN-FIT-001`,
      "    Scenario: the tree stays inside this check's threshold",
    ].join("\n");
  }
);

// @SCN-LNT-004
Given("the unit test for that scenario passes", function () {
  // The behavioural credit, CITING — the same route, and the same @SCN, the fitness credit will
  // arrive by. A green here is what makes the arm load-bearing: if the axes could smear, this is
  // the credit that would wrongly discharge the fitness obligation and turn the watermelon green.
  unitCredit = { qualityCheck: "unit", scnId: "SCN-FIT-001", status: "passed" };
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

  const reconciliation = evidenceReconciliationOf(scenarios, evidenceObservations);
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
    // NO steps — that is the whole point of the fixture. A fitness scenario is a whole-system
    // characteristic held against a threshold, so it has nothing to exemplify; the bare tag is read
    // off THAT shape, and the stepped case is the one this rule must not raise an obligation for.
    corpusSource = [
      "@FIT",
      "Feature: fitness",
      "  Rule: the tree stays inside its thresholds",
      `    @${check} @SCN-FIT-001`,
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
      `    @lint=${handle} @SCN-FIT-003`,
      "    Scenario: a behavioural scenario still spelling the retired form",
      "      Given the target source",
    ].join("\n");
  }
);

// @SCN-LNT-006
// @SCN-LNT-007
// @SCN-LNT-010
When("the scenario corpus is read", function () {
  scenarios = parseScenarios(corpusSource, [], registeredCheckTags);
});

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
    // Whole-list equality, so "exactly one" has teeth in both directions: a rule that raised the
    // obligation twice (the tag arrives on the scenario and could arrive again by inheritance) fails
    // here, and so does one that raised none.
    assert.deepEqual(
      scenarios.map((scenario) => scenario.evidenceObligations),
      [[{ qualityCheck: "lint", staticCheck: check }]],
      `expected one lint Evidence Obligation naming "${check}"; got ${JSON.stringify(scenarios)}`
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
    // Read through the engine's own corpus reader rather than a regex over the fixture: what makes
    // the scenario a fitness one is steplessness, and a second opinion about that shape is exactly
    // the disagreement `parseTaggedScenarios` was extracted to prevent.
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
    // citing credit puts SCN-FIT-002 in this list too and the assertion reds.
    const observation = evidenceObservations.find(
      (o) => isStaticCheckObservation(o) && o.staticCheck === CITED_SCRIPT
    );
    assert.ok(observation, `expected an observation of the running check "${CITED_SCRIPT}"`);
    assert.deepEqual(
      fitnessLedger.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation))
        .map((row) => row.scnId),
      ["SCN-FIT-001"],
      "expected the citing credit to post to the fitness scenario's row and to no other"
    );
  }
);

// @SCN-LNT-001
Then("that fitness scenario reconciles satisfied", function () {
  // The OUTCOME on the concept, and the same fact read back off the rendered row — the report
  // is where a reader meets it. A `missing` (the citation route not taken) flips both.
  const outcomes = (
    fitnessLedger.scenarioReconciliations.find((row) => row.scnId === "SCN-FIT-001")
      ?.qualityCheckReconciliations ?? []
  ).map((item) => item.outcome);
  assert.deepEqual(outcomes, ["satisfied"], "expected the fitness obligation to reconcile satisfied");

  const { verdict, items } = rowCells("SCN-FIT-001");
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
      "SCN-FIT-001",
      `expected the unwired check's observation to cite the fitness scenario; got ${JSON.stringify(observation)}`
    );

    // The OUTCOME on the concept — the pair, so the item is pinned to name the BARE check rather
    // than the handle that ran it, and `watermelon` rather than `missing` or `satisfied`.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-FIT-001");
    assert.deepEqual(
      (row?.qualityCheckReconciliations ?? []).map((item) => [item.staticCheck, item.outcome]),
      [[check, "watermelon"]],
      `expected one watermelon reconciling item naming "${check}"; got ${JSON.stringify(row?.qualityCheckReconciliations)}`
    );

    // And the same fact read back off the rendered row — the report is where a reader meets it.
    // Row-scoped to the scenario's own CELLS, so a bare regex over the report cannot pass it.
    const { verdict, items } = rowCells("SCN-FIT-001");
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
        scnId: "SCN-FIT-001",
      },
      `expected the absent check to be read as a citing exists:false record; got ${JSON.stringify(observation)}`
    );

    // The OUTCOME on the concept — the pair, so the item is pinned to name the BARE check rather
    // than the handle that found it, and `missing` rather than the watermelon.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-FIT-001");
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
    const { verdict, items } = rowCells("SCN-FIT-001");
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
    // `fitnessCitations`. A last-wins reader cites SCN-FIT-002 and this reds on the citation alone,
    // before any outcome is read.
    const observation = evidenceObservations.find(
      (o) => isStaticCheckObservation(o) && o.staticCheck === CITED_SCRIPT
    );
    assert.equal(
      observation?.scnId,
      "SCN-FIT-001",
      `expected the run to cite the first fitness scenario in corpus order; got ${JSON.stringify(observation)}`
    );

    // The credit's IDENTITY, counted across the WHOLE ledger. A shared-credit path — the reading
    // this ruling refuses — puts SCN-FIT-002 in this list too.
    assert.deepEqual(
      fitnessLedger.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation!))
        .map((row) => row.scnId),
      ["SCN-FIT-001"],
      "expected the one credit to post to the cited scenario's row and to no other"
    );

    const outcomes = (
      fitnessLedger.scenarioReconciliations.find((row) => row.scnId === "SCN-FIT-001")
        ?.qualityCheckReconciliations ?? []
    ).map((item) => item.outcome);
    assert.deepEqual(outcomes, ["satisfied"], "expected the cited scenario to reconcile satisfied");

    const { verdict, items } = rowCells("SCN-FIT-001");
    assert.match(verdict, /\bbalanced\b/, `expected a balanced verdict cell; got "${verdict}"`);
    assert.doesNotMatch(verdict, /out-of-balance/, `expected not out-of-balance; got "${verdict}"`);
    assert.equal(items, "—", `expected no reconciling items; got "${items}"`);
  }
);

// @SCN-LNT-008
Then(
  "the second fitness scenario reconciles missing, naming the check {string}",
  function (check: string) {
    // THE RUNNER-UP, and the whole point of the ruling. It carries the SAME obligation as the row
    // above and finds nothing to discharge it, so it reads `missing` — out loud, on the ledger,
    // rather than absorbed by a run that was never about it. A both-satisfied or dedupe path flips
    // this to `satisfied`; a name-match fallback that let a citing run answer by handle does too.
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-FIT-002");
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
    const { verdict, items } = rowCells("SCN-FIT-002");
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
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-FIT-001");
    const item = (row?.qualityCheckReconciliations ?? []).find((i) => i.staticCheck === check);
    assert.deepEqual(
      [item?.outcome, (item?.evidenceObservation as { staticCheck?: string } | undefined)?.staticCheck],
      ["watermelon", "typecheck"],
      `expected the "${check}" obligation to read watermelon, credited by its OWN run's observation ` +
        `— not by the wired complexity credit citing the same @SCN; got ${JSON.stringify(item)}`
    );

    // And the row itself, which is where the false green is actually reported: a smeared credit
    // turns this row `balanced` and the whole ledger green over a check that runs nowhere.
    const { verdict, items } = rowCells("SCN-FIT-001");
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
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-FIT-001");
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
      "SCN-FIT-001",
      `expected the run to carry the @SCN it was stamped with; got ${JSON.stringify(observation)}`
    );

    // THE INVENTED ROW — minted by the credit, holding it, raising nothing (nobody named it), and
    // carrying one item that NAMES THE CHECK THAT RAN. A phantom row has no obligation to point a
    // reader at, so the handle is its only where-to-fix.
    const phantom = fitnessLedger.scenarioReconciliations.find(
      (row) => row.kind === "phantom-scenario"
    );
    assert.equal(phantom?.scnId, "SCN-FIT-001", "expected a phantom row for the cited @SCN");
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
    const { verdict, items } = rowCells("SCN-FIT-001");
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
    [["phantom-scenario", "SCN-FIT-001"]],
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
    const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-FIT-001");
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
        scnId: "SCN-FIT-001",
      },
      `expected the fitness obligation to be answered by the citing fitness credit; got ${JSON.stringify(item?.evidenceObservation)}`
    );

    // And the same fact read back off the rendered row — the report is where a reader meets it.
    // The row is out of balance on the fitness item ALONE, while the behavioural axis balances.
    const { verdict, items } = rowCells("SCN-FIT-001");
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
  const row = fitnessLedger.scenarioReconciliations.find((r) => r.scnId === "SCN-FIT-001");
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
  const { items } = rowCells("SCN-FIT-001");
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
