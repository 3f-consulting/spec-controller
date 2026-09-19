/**
 * @unit guard for the source→level seam.
 *
 * Strict coverage gain: parseVitestEvidenceObservations had no dedicated unit test — its level was
 * a hardcoded "unit". This proves the level is now the CALLER-SUPPLIED one, so the
 * implicit Vitest⇒unit assumption is gone (the Read's positive guard — what fails if
 * anyone re-hardcodes the level). The JS-ecosystem default (unit) is set at the
 * CLI edge, not here.
 */

import { describe, it, expect } from "vitest";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "./vitest.js";

/**
 * THE NOT-THE-INPUT-SOURCE HALF of @SCN-LDG-011's rule, on the vitest reader. Its Rule in
 * `features/ledger.feature` reads: a runtime observation's level is the cited scenario's own tier
 * tag, not the input source — and the source level the caller passes survives only as the fallback
 * for an untagged scenario. Vitest never derives: unit is vitest's substrate, so no tier tag is
 * ever read from a vitest report (canon states this twice inside the same Rule, in @SCN-LDG-013's
 * and @SCN-LDG-015's preambles). The caller-supplied level therefore stands here UNCONDITIONALLY,
 * and this block is what proves it genuinely stands — that the parameter is stamped verbatim and
 * not quietly replaced by a reinstated Vitest⇒unit hardcode. The cucumber reader's sibling block
 * proves the same seam on its side (3F-2364, same @SCN).
 *
 * WHY THIS BLOCK IS NOT REDUNDANT WITH ITS CITED SIBLINGS, established by mutation (3F-2365):
 *   - NARROW — reinstating the retired hardcode (`qualityCheck` → `"unit"` at both `results.push`
 *     sites in `vitest.ts`) reds EXACTLY ONE test in the whole tree, out of 756 unit tests and 151
 *     cucumber scenarios: the NON-default `it` below. Every cited sibling stays green — `[SCN-PND-015]`,
 *     `[SCN-LDG-016]` and `[SCN-LDG-017]` all call the reader at "unit", so the old hardcode agrees
 *     with them by COINCIDENCE. This block is the only place that coincidence is broken.
 *   - WIDE — hardcoding a wholly wrong level (`qualityCheck` → `"integration"`) reds TWELVE: both of
 *     this block's `it`s PLUS cited siblings `[SCN-PND-015]`, `[SCN-LDG-016]`, `[SCN-LDG-017]`,
 *     `[SCN-LDG-013]` and `[SCN-CLI-013]`. Run alone that reads as "a sibling reds too → superseded
 *     → delete" — the WRONG ruling. Only the narrow polarity separates them.
 *
 * The first `it` is the CONTROL arm: the wide mutation shows its assertion is also covered by
 * `[SCN-PND-015]`'s passed/failed `it`s. It is kept because the non-default `it`'s contrast is only
 * legible against an in-block default baseline — deleting it would resolve the same 2 obligations
 * and lose the contrast, so it earns nothing.
 */
describe("[SCN-LDG-011] parseVitestEvidenceObservations stamps the caller-named level — vitest derives none", () => {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/a.test.ts",
        assertionResults: [
          { fullName: "[SCN-FOO-001] does a thing", status: "passed" },
          { fullName: "[SCN-FOO-002] does another", status: "failed" },
        ],
      },
    ],
  };

  it("attributes results at the named level (unit — the JS-ecosystem default named by the CLI)", () => {
    // Each credit carries its test-file locator (the where-to-fix, ruling Q5) —
    // verbatim here (no run root passed), portable-relative at the CLI edge.
    expect(parseVitestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-FOO-001", status: "passed", locator: "/r/a.test.ts" },
      { qualityCheck: "unit", scnId: "SCN-FOO-002", status: "failed", locator: "/r/a.test.ts" },
    ]);
  });

  it("honors a NON-default named level — the assumption is gone (no Vitest⇒unit hardcode)", () => {
    const out = parseVitestEvidenceObservations(report, "e2e");
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.qualityCheck === "e2e")).toBe(true);
    // The status pass-through is unchanged by the quality-check parameter.
    expect(out.map((r) => (r.qualityCheck !== "fitness" ? r.status : null))).toEqual([
      "passed",
      "failed",
    ]);
  });
});

describe("[SCN-PND-015] parseVitestEvidenceObservations classifies three-way — inconclusive is dropped", () => {
  // Uniform with the cucumber reader (@SCN-PND-013): pending is NEVER inferred from an assertion's
  // status. `passed`/`failed` emit an observation (satisfied/failing downstream); an inconclusive
  // vitest status (`skipped`/`todo`, and any status ∉ {passed, failed}) is DROPPED — the evidence
  // obligation then reconciles missing BY ABSENCE. This proves the emitted-or-dropped classification
  // over the reader in ISOLATION; the @integration arm (tests/steps/pendingItems.steps.ts,
  // [SCN-PND-015]) proves it through the parse→reconcile pipeline. The status strings below are the
  // real vitest JSON reporter's actual assertion statuses (§11A) — never a hand-seeded status.
  const reportWithStatus = (status: string): VitestJsonReport => ({
    testResults: [
      { name: "/r/a.test.ts", assertionResults: [{ fullName: "[SCN-PDV-001] a unit assertion", status }] },
    ],
  });

  it("emits a `passed` observation for a passed assertion", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("passed"), "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status: "passed", locator: "/r/a.test.ts" },
    ]);
  });

  it("emits a `failed` observation for a failed assertion", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("failed"), "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status: "failed", locator: "/r/a.test.ts" },
    ]);
  });

  it("DROPS a skipped assertion — inconclusive, so nothing is emitted", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("skipped"), "unit")).toEqual([]);
  });

  it("DROPS a todo assertion — inconclusive, so nothing is emitted", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("todo"), "unit")).toEqual([]);
  });

  it("DROPS any non-pass-non-fail status — robust to vitest's status spelling", () => {
    // Belt-and-braces on the ∉ {passed, failed} rule: `pending` and an undefined status also drop.
    expect(parseVitestEvidenceObservations(reportWithStatus("pending"), "unit")).toEqual([]);
    expect(
      parseVitestEvidenceObservations(
        { testResults: [{ name: "/r/a.test.ts", assertionResults: [{ fullName: "[SCN-PDV-001] x" }] }] },
        "unit"
      )
    ).toEqual([]);
  });

  it("drops ONLY the inconclusive assertion — genuine passed/failed siblings still emit", () => {
    // A mixed file: the passed + failed assertions emit (incl. an uncited null-scnId credit for the
    // one carrying no @SCN); only the skipped one drops. Preserves the SUSPENSE (null-scnId) path.
    const out = parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "/r/a.test.ts",
            assertionResults: [
              { fullName: "[SCN-PDV-001] p", status: "passed" },
              { fullName: "no scn here", status: "failed" },
              { fullName: "[SCN-PDV-002] s", status: "skipped" },
            ],
          },
        ],
      },
      "unit"
    );
    expect(out).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status: "passed", locator: "/r/a.test.ts" },
      { qualityCheck: "unit", scnId: null, status: "failed", locator: "/r/a.test.ts" },
    ]);
  });
});

describe("[SCN-LDG-016] parseVitestEvidenceObservations attributes an assertion by its own leaf title", () => {
  // The REAL-SHAPED report vitest emits for a grouping `describe` carrying a bracket citation with
  // two `it`s beneath it. Vitest gives each assertion BOTH names: `fullName` is the ANCESTOR PATH
  // (outermost describe → innermost it, so it LEADS with the describe's citation) and `title` is
  // the assertion's OWN name.
  //   - the SELF-CITING leaf: its own title cites SCN-LEA-016; its fullName leads with SCN-ANC-016.
  //   - the BARE sibling leaf: no citation of its own — the ancestor path is its only citation.
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/citation.test.ts",
        assertionResults: [
          {
            // FIX TO CANON (3F-2368): the leaf's self-citation was written `@SCN-LEA-016` —
            // Cucumber's step-block marker form — in a fixture standing for a VITEST title,
            // where canon's form is the bracket (evidence-manifesto.md). Only the
            // sigil-agnostic reader made the fixture pass. The assertions below are unchanged;
            // the property proved (most-specific-citation-wins) is unchanged.
            fullName: "[SCN-ANC-016] the grouping describe > [SCN-LEA-016] the leaf proves its own scenario",
            title: "[SCN-LEA-016] the leaf proves its own scenario",
            status: "passed",
          },
          {
            fullName: "[SCN-ANC-016] the grouping describe > the bare sibling leaf proves the ancestor's",
            title: "the bare sibling leaf proves the ancestor's",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("credits the self-citing leaf to the scenario its OWN title cites, not the ancestor describe's", () => {
    // The ATTRIBUTION SET, whole: the self-citing leaf posts to the leaf-cited scenario and the
    // bare sibling posts to the ancestor — one credit each. Under first-match-on-the-concatenation
    // BOTH read SCN-ANC-016 (the leaf's citation shadowed), so this reds on the first element.
    expect(parseVitestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-LEA-016", status: "passed", locator: "/r/citation.test.ts" },
      { qualityCheck: "unit", scnId: "SCN-ANC-016", status: "passed", locator: "/r/citation.test.ts" },
    ]);
  });

  it("credits the ancestor exactly once — the bare sibling leaf — with no spurious second credit", () => {
    // The MIRROR symptom, counted: the shadowed leaf's credit was STOLEN by the ancestor, which
    // then carried TWO credits for its one obligation. Reds with 2 (and 0) under the old reader.
    const out = parseVitestEvidenceObservations(report, "unit");
    expect(out.filter((o) => o.qualityCheck !== "fitness" && o.scnId === "SCN-ANC-016")).toHaveLength(1);
    expect(out.filter((o) => o.qualityCheck !== "fitness" && o.scnId === "SCN-LEA-016")).toHaveLength(1);
  });

  it("falls back to the ancestor path when the leaf's own title carries no citation", () => {
    // The FALLBACK half — leaf-title-first must not break the established "describe carries the
    // bracket, plain `it`s beneath" style: a leaf with no citation of its own still credits the
    // describe's scenario. Reds if the reader ever stopped reading fullName at all.
    const out = parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "/r/citation.test.ts",
            assertionResults: [
              { fullName: "[SCN-ANC-016] the grouping describe > a plain leaf", title: "a plain leaf", status: "passed" },
            ],
          },
        ],
      },
      "unit"
    );
    expect(out).toEqual([
      { qualityCheck: "unit", scnId: "SCN-ANC-016", status: "passed", locator: "/r/citation.test.ts" },
    ]);
  });
});

describe("[SCN-LDG-033] parseVitestEvidenceObservations reads the bracketed token — an id in prose is prose", () => {
  // The reader matched any SCN-shaped token ANYWHERE in a title, so this repository's own
  // corpus — which names scenario ids constantly, as fixture data and as cross-references —
  // minted citations nobody wrote. The canon form is the bracket (evidence-manifesto.md: the
  // Vitest describe/it string includes [SCN-007]); the `@` marker belongs to Cucumber's step
  // blocks, and is deliberately NOT accepted here because it is how every prose cross-reference
  // in this repository is written.
  //
  // Both non-bracket shapes are exercised in the one report: a BARE fixture id (the shape the
  // original defect was filed against) and an `@`-prefixed cross-reference (the shape that was
  // live in staticObservationTally.test.ts). Neither may cite.
  const proseOnly: VitestJsonReport = {
    testResults: [
      {
        name: "/r/prose.test.ts",
        assertionResults: [
          {
            fullName: "the tally block > drops SCN-PDX-001 when the guard is not running (@SCN-PDR-002)",
            title: "drops SCN-PDX-001 when the guard is not running (@SCN-PDR-002)",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("emits an uncited credit — neither the bare id nor the @-prefixed one cites", () => {
    // `scnId: null` is the SUSPENSE credit the ledger already carries (@SCN-LDG-007). Under the
    // sigil-free reader this reds with `scnId: "SCN-PDX-001"` — the first prose token, promoted
    // to a citation and minting a phantom scenario for an id no corpus scenario carries.
    expect(parseVitestEvidenceObservations(proseOnly, "unit")).toEqual([
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "/r/prose.test.ts" },
    ]);
  });

  it("still reads a bracketed citation out of prose that also names other ids", () => {
    // The positive half, and the reason the rule is a FORM rule rather than a position rule: the
    // bracket wins wherever it sits, and the prose tokens around it stay invisible — including a
    // bare id that PRECEDES it, which a first-match-anywhere reader would have taken instead.
    const out = parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "/r/prose.test.ts",
            assertionResults: [
              {
                fullName: "unlike SCN-PDX-001, [SCN-PDR-003] is genuinely proved here (cf. @SCN-PDR-002)",
                title: "unlike SCN-PDX-001, [SCN-PDR-003] is genuinely proved here (cf. @SCN-PDR-002)",
                status: "passed",
              },
            ],
          },
        ],
      },
      "unit"
    );
    expect(out).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDR-003", status: "passed", locator: "/r/prose.test.ts" },
    ]);
  });
});

describe("[SCN-LDG-032] a leaf's prose mention does not override its describe's bracketed citation", () => {
  // The ANCESTOR arm of the bracket rule, and the mirror of [SCN-LDG-033]'s suspense arm.
  // [SCN-LDG-016] made a self-citing leaf beat its ancestor; the sigil-free reader let a leaf
  // that merely MENTIONED an id count as self-citing, so the mention SHADOWED the describe's
  // real citation — the ancestor lost its credit, the mentioned id gained one it never earned.
  // Under the bracket rule the leaf falls through to its ancestor, as a leaf naming nothing does.
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/prose.test.ts",
        assertionResults: [
          {
            fullName: "[SCN-ANC-032] the grouping describe > mirrors what SCN-PDX-032 does, per @SCN-PDR-032",
            title: "mirrors what SCN-PDX-032 does, per @SCN-PDR-032",
            status: "passed",
          },
        ],
      },
    ],
  };

  it("credits the ancestor describe — the leaf's prose mentions are not citations", () => {
    // Reds under the sigil-free reader with `scnId: "SCN-PDX-032"`: the leaf's first prose token
    // shadowed the ancestor's bracket. The whole-observation equality is deliberate — it pins the
    // fall-through AND that nothing else about the credit shifted.
    expect(parseVitestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-ANC-032", status: "passed", locator: "/r/prose.test.ts" },
    ]);
  });

  it("still lets a BRACKETED leaf citation override the ancestor — the fall-through is not a blanket", () => {
    // The boundary [SCN-LDG-016] drew, re-asserted against this rule: narrowing the FORM must not
    // narrow the PRECEDENCE. A leaf that genuinely cites still wins, even with prose ids around it.
    // Reds if the bracket rule were mis-implemented as "the ancestor always wins".
    const out = parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "/r/prose.test.ts",
            assertionResults: [
              {
                fullName: "[SCN-ANC-032] the grouping describe > [SCN-LEA-032] proves its own, unlike SCN-PDX-032",
                title: "[SCN-LEA-032] proves its own, unlike SCN-PDX-032",
                status: "passed",
              },
            ],
          },
        ],
      },
      "unit"
    );
    expect(out).toEqual([
      { qualityCheck: "unit", scnId: "SCN-LEA-032", status: "passed", locator: "/r/prose.test.ts" },
    ]);
  });
});

describe("[SCN-LDG-017] a collection-failed vitest file emits a broken observation naming the file and its error", () => {
  // A vitest file that fails to COLLECT reports `status: "failed"` with a `message` and ZERO
  // assertionResults — it named no test, so it cites no @SCN. The reader walked
  // `assertionResults[]` only, so it emitted NOTHING and the run carried no trace of the failure
  // (the scenario whose proof lived there reconciled `missing`, indistinguishable from an
  // unwritten test — an adopter's repository CI dogfood's false-`missing`, 2026-07-13). The reader must now read
  // the file-level `status` + `message` it previously discarded.
  const collectionFailed: VitestJsonReport = {
    testResults: [
      {
        name: "/r/harness.test.ts",
        status: "failed",
        message: "Error: Cannot find package '@cucumber/tag-expressions'",
        assertionResults: [],
      },
    ],
  };

  it("emits ONE broken observation carrying the file locator and the collection message", () => {
    // The where-to-fix payload is the whole point: the locator names the file to fix and the
    // message says what broke. `scnId` is null — a collection failure names no test, so it cites
    // no scenario and can post to no scenario's row. Reds with `[]` under the assertion-only
    // reader.
    expect(parseVitestEvidenceObservations(collectionFailed, "unit")).toEqual([
      {
        qualityCheck: "unit",
        scnId: null,
        status: "failed",
        locator: "/r/harness.test.ts",
        broken: true,
        message: "Error: Cannot find package '@cucumber/tag-expressions'",
      },
    ]);
  });

  it("relativises the broken observation's locator to the run root, as it does every credit", () => {
    // Uniform with the existing credits (portable paths): the locator is relative to the run root
    // when one is given.
    const out = parseVitestEvidenceObservations(collectionFailed, "unit", "/r");
    expect(out).toHaveLength(1);
    // The reader emits runtime observations only (a static check observation is the static reader's), so
    // narrow off the `fitness` discriminator to read the credit-side locator.
    const observation = out[0]!;
    expect(observation.qualityCheck).not.toBe("fitness");
    if (observation.qualityCheck === "fitness") throw new Error("unreachable");
    expect(observation.locator).toBe("harness.test.ts");
  });

  it("BOUNDARY: a failed file that DID collect emits its assertions and no broken observation", () => {
    // The boundary the design draws: a runtime throw INSIDE a named `it` is ATTRIBUTABLE — vitest
    // reports it with a name and `status: failed`, so it already lands as `failing` on the cited
    // scenario's row. `broken` is specifically the CITATION-LESS collection failure. A file-level
    // `status: "failed"` is therefore NOT sufficient on its own (every file with a failing test
    // carries it) — the zero-assertions condition is what distinguishes the two. Reds if the
    // reader keys on file status alone, which would post a spurious broken item on every ordinary
    // red test run.
    const failedButCollected: VitestJsonReport = {
      testResults: [
        {
          name: "/r/a.test.ts",
          status: "failed",
          message: "1 test failed",
          assertionResults: [{ fullName: "[SCN-FOO-003] throws at runtime", status: "failed" }],
        },
      ],
    };
    expect(parseVitestEvidenceObservations(failedButCollected, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-FOO-003", status: "failed", locator: "/r/a.test.ts" },
    ]);
  });

  it("a PASSING file with zero assertions emits nothing — only a FAILED collection is broken", () => {
    // The other half of the boundary: an empty-but-green file (no tests, no failure) is not a
    // collection failure. Emitting a broken item for it would post a finding on every file vitest
    // reports with no assertions.
    expect(
      parseVitestEvidenceObservations(
        { testResults: [{ name: "/r/empty.test.ts", status: "passed", assertionResults: [] }] },
        "unit"
      )
    ).toEqual([]);
  });
});
