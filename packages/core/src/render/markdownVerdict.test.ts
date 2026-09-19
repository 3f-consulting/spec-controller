/**
 * Unit tests for the markdown renderer — broken evidence, the run verdict and the collection's
 * name (@SCN-RPT-021, @SCN-RPT-022, @SCN-RPT-024). Each describe carries its own @SCN id and its
 * own bidirectional-evidence note.
 *
 * SPLIT FROM `markdown.test.ts` AT 3F-3541, AND FOR A MECHANICAL REASON. That file measured 1341
 * code lines against the test ceiling of 400 (`tests/checks/complexityThresholds.mjs`), and the
 * complexity gate raises a touched file's standing findings to errors. No assertion moved in the
 * split. The file-local helpers below are copies of that file's own, which is this tree's
 * convention for test fixtures: a helper shared through a module under `src/` would ship in `dist`.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger, ScenarioReconciliation } from "../model.js";
import { OUTCOME_DESCRIPTION, makeQualityCheckReconciliation, OUTCOME_SIDE_PROFILE } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";
import type { EvidenceObservation, Scenario, RuntimeQualityCheck } from "../model.js";
import { summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

/**
 * Test-local composition of the Evidence Reconciliation from a Ledger fixture (3F-2233).
 *
 * It states NO rule of its own: `summaryOf` is the concept's OWN tally — the very function its
 * factory calls — so this duplicates nothing. Only the entry path differs. `evidenceReconciliationOf`
 * builds from JOURNAL inputs (what production does); these fixtures already hold a Ledger, so they
 * compose the concept around it rather than re-reconciling.
 */
const __er = (ledger: Ledger, wo = false, wg = false): EvidenceReconciliation => ({
  summary: summaryOf(ledger, wo, wg),
  ledger,
});

// @SCN-LDG-030: fixtures must mint branded Quality Check Reconciliations via the smart constructor.
// This helper supplies canon-correct PLACEHOLDER sides (content is immaterial to the renderer, which
// reads no per-QCR side — only side PRESENCE is constrained by the invariant) so each hand-built
// fixture routes through the constructor.
function qcr(
  fields: Parameters<typeof makeQualityCheckReconciliation>[0],
): ReturnType<typeof makeQualityCheckReconciliation> {
  const profile = OUTCOME_SIDE_PROFILE[fields.outcome];
  return makeQualityCheckReconciliation({
    ...fields,
    ...(profile.obligation === "Exists" && fields.evidenceObligation === undefined
      ? { evidenceObligation: { qualityCheck: "unit" } }
      : {}),
    ...(profile.observation === "Exists" && fields.evidenceObservation === undefined
      ? { evidenceObservation: { qualityCheck: "unit", scnId: "SCN-FIXTURE-001", status: "passed" } }
      : {}),
  });
}

const ctx: RunContext = {
  target: "an-adopters-repository",
  inputs: {
    features: "../an-adopters-repository/features",
    vitest: "../an-adopters-repository/vitest-report.json",
  },
  runStart: new Date("2026-06-27T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

/**
 * Unit test for the unsound run-integrity stamp (@SCN-RPT-021), over BOTH broken kinds.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-021 id
 * matching features/report.feature, so a grep of the id returns both halves of the pair.
 * @unit ONLY (operator-endorsed): the renderer is a pure function over the report model, and the
 * pipeline manifestation is already carried by @SCN-LDG-017 / @SCN-LDG-018 / @SCN-LDG-019's arms.
 *
 * The customer-visible payoff of the whole `broken` slice (3F-1642, generalised over cucumber by
 * 3F-1654). A `missing` row tells the reader to WRITE A TEST; when the proof exists and merely
 * NEVER RAN, that instruction is wrong. So the markdown NAMES the broken evidence, PRINTS what
 * broke, and STAMPS the run "unsound" — the render headline word (the predicate is
 * `hasBrokenEvidence`; predicate-name ≠ headline-word, per `isBalanced` vs "balanced").
 *
 * TWO INSTANCES, ONE SHAPE (3F-1654). `broken` now has two producers, and the copy must read
 * truthfully over both:
 *   - VITEST — a suite that failed to COLLECT. The runner gives its own message (multi-line, with
 *     a stack), printed VERBATIM: the tool does not interpret it.
 *   - CUCUMBER — a step two or more step definitions match, so it never ran. Cucumber emits NO
 *     `error_message` for an ambiguous step, so there is nothing to quote: the reader SYNTHESISED
 *     the diagnosis upstream (@SCN-LDG-019) and the renderer prints what the item CARRIES. No
 *     per-reader branch here — the difference is already resolved before the renderer sees it.
 * The bounded softening (operator-mandated): pass the runner's words through where it gives them;
 * STATE the diagnosis where it gives none; PRESCRIBE NO CURE, either way. The renderer may name
 * WHAT failed and WHERE. It may never say how to fix it.
 *
 * Teeth (the Update, 3F-1744): today's copy is vitest-shaped — "N proving suites failed to
 * collect", "the collection error the runner reported", and an `OUTCOME_DESCRIPTION.broken` gloss
 * that names a suite's collection. Rendered over a CUCUMBER-broken balance it MISCALLS a
 * step-definition collision a collection failure — the tool lying about what broke. The
 * no-miscall assertions below red against it.
 *
 * Parent: (@SCN-RPT-021).
 */
describe("[SCN-RPT-021] the markdown names the broken evidence and its error, stamped unsound", () => {
  const VITEST_LOCATOR = "tests/harness/cucumber.trigger.test.ts";
  // A REAL vitest collection message: multi-line, with a stack — the shape that forces the
  // verbatim print into a fenced block rather than a table cell.
  const VITEST_MESSAGE =
    "Error: Cannot find package '@cucumber/tag-expressions' imported from " +
    `${VITEST_LOCATOR}\n    at packageResolve (node:internal/modules/esm/resolve:catch)\n    at moduleResolve (node:internal/modules/esm/resolve)`;

  const CUCUMBER_LOCATOR = "features/handover.feature";
  // The message the CUCUMBER reader SYNTHESISES (@SCN-LDG-019, verbatim from `ambiguousMessage`):
  // cucumber gives no error_message for an ambiguous step, so the reader states the diagnosis —
  // what broke, and no cure.
  const CUCUMBER_MESSAGE =
    'The step "When the handover is accepted" is ambiguous — two or more step definitions match ' +
    "it, so the step never ran.";

  /** The row (markdown table line) whose first cell is the given scnId. */
  const rowFor = (md: string, scnId: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
    expect(row, `expected a rendered row for ${scnId}`).toBeTruthy();
    return row!;
  };

  /**
   * A scenario reconciling `missing` (its proof exists but never ran) alongside the
   * suspense row carrying the `broken` credit for it. The whole point of the slice is that a
   * reader can tell those two rows apart.
   */
  const balanceWithBroken = (
    item: ScenarioReconciliation["reconcilingItems"][number]
  ): Ledger => {
    // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A, 3F-1894). SCN-HNS-002 raises a unit
    // obligation whose proof never ran (no non-broken credit cites it → `missing`); the broken
    // observation names no test, so it cites nothing and posts to SUSPENSE carrying its locator +
    // message. The suspense item is DERIVED from `item` (a broken credit built from its fields) —
    // it cannot be honestly hard-coded, since a suspense row that carries a `broken` reconciling
    // item but empty `evidenceObservations`/`qualityCheckReconciliations` is a shape the reconciler
    // never emits.
    const scenarios: Scenario[] = [
      { scnId: "SCN-HNS-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observations: EvidenceObservation[] = [
      {
        qualityCheck: item.qualityCheck as RuntimeQualityCheck,
        scnId: null,
        status: "passed",
        broken: true,
        ...(item.locator !== undefined ? { locator: item.locator } : {}),
        ...(item.message !== undefined ? { message: item.message } : {}),
      },
    ];
    return reconcile(scenarios, observations);
  };

  // The lived an adopter's repository shape (3F-1642): vitest's collection failure.
  const vitestBroken = balanceWithBroken(
    qcr({
      qualityCheck: "unit",
      outcome: "broken",
      locator: VITEST_LOCATOR,
      message: VITEST_MESSAGE,
    }),
  );

  // The cucumber instance (3F-1654): an ambiguous step. The item's shape is identical — locator
  // + message — which is exactly why the renderer needs no per-reader branch.
  const cucumberBroken = balanceWithBroken(
    qcr({
      qualityCheck: "integration",
      outcome: "broken",
      locator: CUCUMBER_LOCATOR,
      message: CUCUMBER_MESSAGE,
    }),
  );

  /** The run-integrity section alone — where the stamp and the per-item lines live. */
  const integrityOf = (md: string): string => md.slice(md.indexOf("## Run integrity"));

  /**
   * The run-integrity STAMP section, bounded — from `## Run integrity` up to the next heading
   * (`## Summary views`), so it excludes the outcome-row gloss and the verdict line that follow.
   * Manifesto → the Unsound entry governs the stamp; the Outcome column governs the outcome-row.
   * The reader-agnostic ("neither miscalls the other's failure a collection failure") assertion is
   * a pin on the STAMP the Unsound entry owns, so it is scoped to the stamp — not over-claimed onto
   * the outcome-row surface, which the Outcome column governs and which this scenario does not pin.
   */
  const stampOf = (md: string): string =>
    md.slice(md.indexOf("## Run integrity"), md.indexOf("## Summary views"));

  it("stamps each run unsound, above the summary views", () => {
    for (const balance of [vitestBroken, cucumberBroken]) {
      const md = renderMarkdown(__er(balance), ctx);
      // "Unsound" is the RENDER HEADLINE word — the reader's one-glance verdict on run integrity.
      expect(md).toContain("## Run integrity: unsound");
      // Sited between the provenance header and the summary views: the stamp qualifies every
      // count below it (a `missing` in an unsound run may be a broken proof), so it must be read
      // FIRST. @SCN-RPT-009's summary-first / ledger-last ordering is otherwise unchanged.
      const iProvenance = md.indexOf("## Run provenance");
      const iStamp = md.indexOf("## Run integrity: unsound");
      const iSummary = md.indexOf("## Summary views");
      expect(iProvenance).toBeLessThan(iStamp);
      expect(iStamp).toBeLessThan(iSummary);
      // The stamp explains what it INVALIDATES — that a `missing` below may be a broken proof,
      // not an absent one. Without this the word "unsound" is a label with no consequence.
      expect(md).toMatch(/unsound[\s\S]{0,400}missing/i);
    }
  });

  it("names each run's own broken evidence — the file or the feature — and neither miscalls the other's failure a collection failure", () => {
    const vitestMd = renderMarkdown(__er(vitestBroken), ctx);
    const cucumberMd = renderMarkdown(__er(cucumberBroken), ctx);

    // The WHERE-to-fix, each in its own idiom: a test file for vitest, a feature file for
    // cucumber. Both come off the item's `locator` — one field, two producers.
    expect(vitestMd).toContain(VITEST_LOCATOR);
    expect(cucumberMd).toContain(CUCUMBER_LOCATOR);

    // THE UPDATE (3F-1744, narrowed 3F-1925). An ambiguous cucumber step is neither a "suite" nor
    // a "collection error", so the run-integrity STAMP — reader-agnostic by design — must not call
    // it one. Manifesto → the Unsound entry governs the stamp (a run may carry `broken` items of
    // different producers, so the stamp names only what they share); the Outcome column governs the
    // outcome-row gloss, which names the producer ("the proving suite failed to collect"). This
    // assertion is the pin on the stamp's reader-agnosticism the Unsound entry owns, so it is scoped
    // to the stamp — the whole-report match over-claimed onto the outcome-row surface the Outcome
    // column owns, and would contradict that canon gloss.
    expect(stampOf(cucumberMd)).not.toMatch(/collection|collect|proving suite/i);

    // And symmetrically: the vitest report must not borrow cucumber's diagnosis either. The
    // renderer states only what the item CARRIES.
    expect(vitestMd).not.toMatch(/ambiguous|step definition/i);
  });

  it("prints the runner's error verbatim where the runner gives one, and states the diagnosis itself where it does not", () => {
    // VITEST — the runner's own message, VERBATIM (every line, stack included), in a fenced block
    // because it is multi-line. The tool does not interpret it; the reader diagnoses from it.
    const vitestIntegrity = integrityOf(renderMarkdown(__er(vitestBroken), ctx));
    expect(vitestIntegrity).toContain(VITEST_MESSAGE);
    expect(vitestIntegrity).toMatch(/```[\s\S]*Cannot find package[\s\S]*```/);

    // CUCUMBER — the runner gives NOTHING to quote (an ambiguous step's result object is exactly
    // `{ status, duration }`), so the item carries the diagnosis the reader synthesised: WHAT
    // broke — this step, matched twice, never ran. The renderer prints it the same way.
    const cucumberIntegrity = integrityOf(renderMarkdown(__er(cucumberBroken), ctx));
    expect(cucumberIntegrity).toContain(CUCUMBER_MESSAGE);
    expect(cucumberIntegrity).toMatch(/```[\s\S]*is ambiguous[\s\S]*```/);
  });

  it("sends the reader to fix the harness and regenerate — prescribing no cure for the error itself", () => {
    for (const balance of [vitestBroken, cucumberBroken]) {
      const md = renderMarkdown(__er(balance), ctx);
      // The one remedy that ALWAYS holds, whatever broke. It POINTS; it does not diagnose a cure.
      expect(md).toMatch(/fix the harness and regenerate/i);
      // REMEDY-NEUTRAL, both kinds. A collection error is equally a missing dep, a syntax error, a
      // bad import, or a top-level throw; an ambiguity is equally either colliding definition's
      // fault. The report must never guess the cure — no `pnpm install`, and no "delete one of the
      // step definitions" either.
      expect(md).not.toMatch(/pnpm install|npm install|yarn install|--frozen-lockfile/i);
      expect(md).not.toMatch(/delete |remove |rename |narrow |disambiguate/i);
    }
  });

  it("carries the locator on the suspense row's broken item — a broken proof, not an absent one", () => {
    const vitestMd = renderMarkdown(__er(vitestBroken), ctx);
    const suspense = rowFor(vitestMd, "(no scenario)");
    // The credit-side locator suffix (ruling Q5), now extended to `broken`: glyph + the canon
    // description (single-sourced from OUTCOME_DESCRIPTION, 3F-1626) + the where-to-fix.
    expect(suspense).toContain(`💥 ${OUTCOME_DESCRIPTION.broken}`);
    expect(suspense).toContain(VITEST_LOCATOR);
    // The row cell carries the error's HEADLINE line only — the verbatim multi-line message
    // lives in the run-integrity section; a stack in a table cell would destroy the table.
    expect(suspense).toContain("Cannot find package '@cucumber/tag-expressions'");
    expect(suspense).not.toContain("at packageResolve");
    // The DISTINCTION the slice exists for: the scenario still reads `missing` (honest
    // at its own resolution — no evidence cited it), and it is NOT the broken row. A reader
    // tells "the proof exists and is broken" from "no proof was written".
    const namedRow = rowFor(vitestMd, "SCN-HNS-002");
    expect(namedRow).toContain(`∅ ${OUTCOME_DESCRIPTION.missing}`);
    expect(namedRow).not.toContain("💥");

    // The cucumber row carries the same two halves — the feature file and the synthesised
    // diagnosis — through the identical code path.
    const cucumberSuspense = rowFor(renderMarkdown(__er(cucumberBroken), ctx), "(no scenario)");
    expect(cucumberSuspense).toContain(`💥 ${OUTCOME_DESCRIPTION.broken}`);
    expect(cucumberSuspense).toContain(CUCUMBER_LOCATOR);
    expect(cucumberSuspense).toContain("is ambiguous");
  });

  it("omits the stamp entirely when the run carries no broken evidence (byte-identical regression)", () => {
    // The omit-when-empty precedent (the Pending Items tally): a SOUND run's report must not gain
    // a stray empty section — it renders byte-identically to the pre-slice output.
    const sound: Ledger = reconcile(
      [{ scnId: "SCN-SND-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      []
    );
    const md = renderMarkdown(__er(sound), ctx);
    expect(md).not.toContain("Run integrity");
    expect(md).not.toContain("unsound");
    expect(md).not.toContain("💥");
    // An out-of-balance-but-SOUND run still reads `missing` exactly as it did before the slice —
    // the honest instruction there IS "write the test".
    expect(md).toContain(`unit ∅ ${OUTCOME_DESCRIPTION.missing}`);
  });
});

/**
 * Unit test for the run-verdict headline (@SCN-RPT-022).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-022 id
 * matching features/report.feature, so a grep of the id returns both halves of the pair.
 * @unit ONLY (ticket-endorsed): the renderer is a pure function over the report model. The
 * agreement between this headline and the REAL process exit code is @SCN-CLI-013's arm.
 *
 * A SUPPLEMENT, not the fix (3F-1727). The tally already fails on its own once every Scenario
 * Reconciliation is counted (@SCN-RMD-001, 3F-1724); this makes the failure impossible to MISS.
 * The slice's non-negotiable invariant: a run that exits non-zero NEVER renders a headline that
 * reads as a pass — an adopter's repository 17-36-50Z fault (3F-1703), where `141 | 141 | 0` looked like a
 * clean board on a run that exited 1.
 *
 * The verdict is read off the WHOLE-RUN predicates in the CLI's own dominance order (broken →
 * out-of-balance → pending, cli-balance/cli.ts) — asking the same predicates in the same order
 * is what stops the headline drifting from the exit code it names. Exit 3 is the one code the
 * core cannot assert: `--strict` is a CLI-edge flag invisible to the core, so a balanced run
 * carrying Pending Items names it CONDITIONALLY and never claims it.
 *
 * Parent: (@SCN-RPT-022).
 */
describe("[SCN-RPT-022] the summary opens with the run verdict and the exit code it maps to", () => {
  /** The text from the `## Summary views` heading to the first cut beneath it. */
  const summaryOpening = (md: string): string =>
    md.slice(md.indexOf("## Summary views"), md.indexOf("### Evidence reconciliation"));

  // RECONCILER-TRUE FIXTURES (evidence-manifesto §11A, 3F-1894). Every ledger is PRODUCED by
  // reconcile() over a corpus, so the whole-run verdict predicates read a ledger the pipeline emits.
  // The shared balanced scenario + its passing unit credit.
  const balancedScenario: Scenario = {
    scnId: "SCN-VRD-001",
    evidenceObligations: [{ qualityCheck: "unit" }],
  };
  const balancedObs: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-VRD-001",
    status: "passed",
  };

  const balanced: Ledger = reconcile([balancedScenario], [balancedObs]);

  // an adopter's repository 17-36-50Z shape in miniature: every scenario row balances, and the only
  // out-of-balance row is the SUSPENSE reconciliation (an uncited credit) — the run that read as a
  // pass.
  const outOfBalance: Ledger = reconcile(
    [balancedScenario],
    [balancedObs, { qualityCheck: "unit", scnId: null, status: "passed", locator: "x.test.ts" }]
  );

  // A broken credit (its proof never ran) posts to the suspense row — the run is UNSOUND, which the
  // CLI's dominance order asks BEFORE the balance verdict.
  const broken: Ledger = reconcile(
    [balancedScenario],
    [
      balancedObs,
      {
        qualityCheck: "unit",
        scnId: null,
        status: "passed",
        broken: true,
        locator: "tests/harness/x.test.ts",
        message: "Error: boom",
      },
    ]
  );

  // A balanced run carrying a single deferred (pending) obligation → balanced, exit 0, with the
  // conditional exit-3-under-`--strict` rider.
  const balancedWithPending: Ledger = reconcile(
    [
      {
        scnId: "SCN-VRD-001",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
      },
    ],
    [balancedObs]
  );

  it("opens the summary with the verdict, before any cut of the reconciliation", () => {
    // ALWAYS present — unlike the omit-when-empty unsound stamp, a BALANCED run needs its
    // verdict line too, so the headline is the first thing under the summary heading.
    const opening = summaryOpening(renderMarkdown(__er(balanced), ctx));
    expect(opening).toContain("### Run verdict");
    expect(opening).toMatch(/BALANCED/);
  });

  it("reads BALANCED and exit 0 when every Scenario Reconciliation balances", () => {
    const md = renderMarkdown(__er(balanced), ctx);
    expect(summaryOpening(md)).toContain("**BALANCED**");
    expect(summaryOpening(md)).toContain("exit 0");
    // The gloss names the three scenario-kinds by canon, pinned as the WHOLE sentence — so the
    // retired kind-label once emitted in `scenario`'s place cannot return without failing here.
    // A companion negative naming it went at 3F-2329: subsumed, and renaming it to canon would
    // invert it into "`scenario` is absent" — green for the wrong reason.
    expect(summaryOpening(md)).toContain(
      "every Scenario Reconciliation balances: scenario, phantom and suspense alike."
    );
  });

  it("reads OUT-OF-BALANCE and exit 1 — never as a pass — when a row does not balance", () => {
    const opening = summaryOpening(renderMarkdown(__er(outOfBalance), ctx));
    // The slice's non-negotiable invariant: the failing run's headline is the FAILURE.
    expect(opening).toContain("**OUT-OF-BALANCE**");
    expect(opening).toContain("exit 1");
    expect(opening).not.toContain("**BALANCED**");
  });

  it("reads UNSOUND and exit 4 when the run carries broken evidence, pre-empting the balance verdict", () => {
    const opening = summaryOpening(renderMarkdown(__er(broken), ctx));
    // The CLI's dominance order, mirrored: a broken run is ALWAYS out-of-balance too (its
    // broken item sits on the suspense row), so `broken` must be asked FIRST or the headline
    // would say exit 1 while the process exits 4.
    expect(opening).toContain("**UNSOUND**");
    expect(opening).toContain("exit 4");
    expect(opening).not.toContain("exit 1");
  });

  it("glosses UNSOUND in reader-agnostic terms — a proof that never ran, not a vitest suite that failed to collect", () => {
    const opening = summaryOpening(renderMarkdown(__er(broken), ctx));

    // `broken` is READER-AGNOSTIC: it covers a vitest suite that failed to collect
    // (@SCN-LDG-017) AND a cucumber step matched by two or more definitions (@SCN-LDG-019).
    // The verdict line is read by the same reader in both cases, so it must name the FACT
    // the two SHARE — a proof never ran — and leave the producer-specific detail to the
    // run-integrity stamp above (@SCN-RPT-021).
    expect(opening).toContain("could not be TRUSTED to reconcile");
    expect(opening).toContain("A proof never ran");

    // The TEETH (3F-1749): the gloss was generalised in 3F-1744 but nothing pinned the text,
    // so it could silently drift BACK to the vitest idiom — which would misdescribe a cucumber
    // ambiguity to the reader's face. An ambiguous step is not a "suite", and it did not fail
    // to "collect". Forbid the vocabulary, not merely require the phrasing.
    expect(opening).not.toMatch(/suite/i);
    expect(opening).not.toMatch(/collect/i);
  });

  it("notes exit 3 under --strict conditionally when a balanced run carries Pending Items — and never asserts it", () => {
    const opening = summaryOpening(renderMarkdown(__er(balancedWithPending), ctx));
    // Balanced is still the verdict — the Pending Items note is a CONDITIONAL rider, because
    // `--strict` is a CLI-edge flag the core cannot see.
    expect(opening).toContain("**BALANCED**");
    expect(opening).toContain("exit 0");
    expect(opening).toMatch(/exit 3 under `--strict`/);
    // A balanced run WITHOUT Pending Items never mentions exit 3 at all.
    expect(summaryOpening(renderMarkdown(__er(balanced), ctx))).not.toContain("exit 3");
  });
});

/**
 * Unit test for the reconciliation-collection noun (@SCN-RPT-024).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-024 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Binds the vocabulary rule for the reconciled OUTPUT collection: canon names it
 * "Scenario Reconciliation" ("scenarios" is a Rejected alias — it holds Scenario
 * Reconciliations, not scenarios). The report names the collection on two rendered
 * surfaces — the Subject CELL of the Evidence-reconciliation table's collection row,
 * and the headline verdict tally under "## Scenario Reconciliations" — and both must
 * read the same word. The tally counts EVERY row (scenario + phantom + suspense;
 * @SCN-RMD-001, 3F-1724), so it names Scenario Reconciliations, not scenarios.
 *
 * Teeth: the Subject-cell assertion passes against current code (markdown.ts already
 * renders "Scenario Reconciliation" in the table cell); the tally assertion REDS —
 * the tally renders "N scenario(s):" today. That is the genuine red→green (3F-1919):
 * the tally noun is corrected to "Scenario Reconciliation(s)". Asserts the rendered
 * CELL VALUE and the tally STRING, never their section headings (a separate concern).
 *
 * Parent: (@SCN-RPT-024).
 */
describe('[SCN-RPT-024] the reconciliation collection is named "Scenario Reconciliation(s)", never "scenario(s)"', () => {
  // A balance carrying one scenario (balanced) row, one phantom row, and one suspense row.
  // The summary tally then reads total=3, balanced=1, out-of-balance=2 (phantom + suspense are
  // both always out-of-balance), phantom=1, suspense=1 — so the headline names 3 of the
  // collection. Counting is UNCHANGED by this scenario; only the rendered noun.
  const namedPhantomSuspense: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-A",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "satisfied" })],
        pendingItems: [],
        reconcilingItems: [],
      },
      {
        scnId: "SCN-PHANTOM-999",
        kind: "phantom-scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "cites-unknown-scenario" })],
        pendingItems: [],
        reconcilingItems: [qcr({ qualityCheck: "unit", outcome: "cites-unknown-scenario" })],
      },
      {
        scnId: "(no scenario)",
        kind: "suspense-scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [qcr({ qualityCheck: "fitness", staticCheck: "guard:static", outcome: "cites-no-scenario" })],
        pendingItems: [],
        reconcilingItems: [qcr({ qualityCheck: "fitness", staticCheck: "guard:static", outcome: "cites-no-scenario" })],
      },
    ],
  };

  it('names the collection "Scenario Reconciliation" in the Evidence-reconciliation table Subject cell', () => {
    const md = renderMarkdown(__er(namedPhantomSuspense), ctx);
    // The Subject cell of the reconciliation-collection row — asserted as the CELL value
    // (pipe-delimited), never the section heading. Passes against current code (markdown.ts:470).
    expect(md).toContain("| Scenario Reconciliation |");
  });

  it('names the collection "Scenario Reconciliation(s)" in the headline verdict tally, never "scenario(s)"', () => {
    const md = renderMarkdown(__er(namedPhantomSuspense), ctx);
    // The headline tally counts every row and names the collection — Scenario Reconciliations,
    // not scenarios. This REDS against current code (the tally renders "scenario(s):").
    expect(md).toContain("- 3 Scenario Reconciliation(s): 1 balanced, 2 out-of-balance.");
    // The banned noun never appears in the tally.
    expect(md).not.toContain("- 3 scenario(s):");
  });
});
