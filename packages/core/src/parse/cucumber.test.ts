/**
 * @unit guard for the source→level seam.
 *
 * Strict coverage gain: parseCucumberEvidenceObservations had no dedicated unit test — its level was
 * a hardcoded "integration". This proves the level is now the CALLER-SUPPLIED one, so the
 * implicit Cucumber⇒integration assumption is gone (the Read's positive guard). The
 * JS-ecosystem default (integration) is set at the CLI edge, not here.
 */

import { describe, it, expect } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";
import type { RuntimeEvidenceObservation } from "../model.js";

/**
 * THE FALLBACK HALF of @SCN-LDG-011's rule. The scenario's Rule preamble
 * (`features/ledger.feature`) states both halves: a runtime observation's level comes from the
 * cited scenario's own tier tag, and the source level the caller passes survives only as the
 * fallback for an untagged scenario. The sibling block below proves the derivation half; this block
 * proves the fallback half — that the fallback is genuinely the CALLER's parameter and not a
 * reinstated Cucumber⇒integration hardcode.
 *
 * WHY THIS BLOCK IS NOT REDUNDANT WITH ITS SIBLING, established by mutation (3F-2364):
 *   - Hardcoding the untagged fallback to "integration" (`: ["integration"]` in `deriveLevels`)
 *     reds EXACTLY ONE test in the whole tree — the NON-default `it` below. Every cited sibling,
 *     unit and cucumber alike, stays green: they all either take the tag path or happen to PASS
 *     "integration" as their fallback, so the old hardcode agrees with them by COINCIDENCE. This
 *     block is the only place that coincidence is broken.
 *   - Breaking the fallback path wholesale (`: ["e2e"]`) reds four tests — both of this block's,
 *     plus `[SCN-LDG-011]`'s "falls back to the caller-named level…" and `[SCN-LDG-015]`'s. That
 *     wider mutation makes the block LOOK superseded; only the narrower one above separates them.
 *
 * The first `it` is the CONTROL arm (its assertion is indeed also covered by `[SCN-LDG-011]`'s
 * "falls back to the caller-named level…" below); it is kept because the non-default `it`'s
 * contrast is only legible against a default-case baseline in the same block.
 */
describe("[SCN-LDG-011] parseCucumberEvidenceObservations stamps the caller-named level as the untagged fallback", () => {
  const report: CucumberJsonReport = [
    {
      uri: "features/x.feature",
      elements: [
        { tags: [{ name: "@SCN-FOO-003" }], steps: [{ result: { status: "passed" } }] },
      ],
    },
  ];

  it("attributes results at the named level (integration — the JS-ecosystem default named by the CLI)", () => {
    // Each credit carries its feature-file locator (the where-to-fix, ruling Q5).
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-FOO-003", status: "passed", locator: "features/x.feature" },
    ]);
  });

  it("honors a NON-default named level — the assumption is gone (no Cucumber⇒integration hardcode)", () => {
    const out = parseCucumberEvidenceObservations(report, "unit");
    expect(out).toHaveLength(1);
    expect(out.every((r) => r.qualityCheck === "unit")).toBe(true);
  });
});

describe("[SCN-LDG-011] parseCucumberEvidenceObservations derives the level from the scenario's named tier tag", () => {
  it("stamps an @e2e-tagged scenario's observation e2e — the tag, not the fallback source level", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/e2e.feature",
        elements: [
          {
            tags: [{ name: "@e2e" }, { name: "@SCN-LDG-011" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    // Fallback "integration" is the JS-ecosystem default the CLI passes; the scenario's
    // own @e2e tag overrides it, so the observation is levelled e2e (an adopter's repository fix).
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "e2e", scnId: "SCN-LDG-011", status: "passed", locator: "features/e2e.feature" },
    ]);
  });

  it("falls back to the caller-named level for a scenario with no tier tag", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/x.feature",
        elements: [
          { tags: [{ name: "@SCN-FOO-009" }], steps: [{ result: { status: "passed" } }] },
        ],
      },
    ];
    // No @integration/@e2e/@performance tag → the fallback (source level) still applies.
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-FOO-009", status: "passed", locator: "features/x.feature" },
    ]);
  });
});

describe("[SCN-LDG-012] parseCucumberEvidenceObservations derives integration from the @integration tag, not the source fallback", () => {
  it("stamps an @integration-tagged scenario's observation integration even under a non-integration fallback — derivation, not the old hardcode", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/integration.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-LDG-012" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    // Fallback "e2e" is deliberately NOT "integration": the integration level can only come
    // from DERIVING the scenario's @integration tag. The retired
    // CUCUMBER_QUALITY_CHECK="integration" hardcode agreed for this case by COINCIDENCE; this
    // proves the tier is now reached by derivation. If the parser ignored the tag and used the
    // fallback, the level would be e2e — the mutation that proves this pin's teeth.
    expect(parseCucumberEvidenceObservations(report, "e2e")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-012", status: "passed", locator: "features/integration.feature" },
    ]);
  });
});

describe("[SCN-LDG-014] parseCucumberEvidenceObservations emits one observation per named non-unit tier", () => {
  it("emits BOTH an integration and an e2e observation from ONE cucumber pass of an @integration @e2e scenario", () => {
    // The multi-tag ruling's teeth: a SINGLE cucumber run of a scenario NAMING two non-unit
    // tiers discharges BOTH obligations, so the parser must emit ONE observation per named
    // tier (integration + e2e), same scnId, same passed status. Before per-tier emission the
    // parser emitted a SINGLE observation (the first matched tier), so this reds at length 1.
    const report: CucumberJsonReport = [
      {
        uri: "features/both.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@e2e" }, { name: "@SCN-LDG-014" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    // One observation per named tier, in tag order (@integration then @e2e), same
    // scnId / status / locator. Today's single-observation parser emits only the first tier, so
    // toEqual reds on the length-1 vs length-2 mismatch.
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-014", status: "passed", locator: "features/both.feature" },
      { qualityCheck: "e2e", scnId: "SCN-LDG-014", status: "passed", locator: "features/both.feature" },
    ]);
  });

  it("GUARD: a single-non-unit-tag scenario still emits EXACTLY ONE observation (no accidental duplicate)", () => {
    // Per-tier emission must not double-count the single-tier case: an @integration-only
    // scenario yields exactly one integration observation, not two. Pins LDG-011/012/013's
    // single-observation invariant against a regression in the per-tier fan-out.
    const report: CucumberJsonReport = [
      {
        uri: "features/one.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-LDG-014" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "e2e")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-014", status: "passed", locator: "features/one.feature" },
    ]);
  });
});

describe("[SCN-LDG-015] parseCucumberEvidenceObservations derives NO non-unit level from a @unit-only scenario and never manufactures a unit discharge", () => {
  it("falls back to the single caller-named level for a @unit-only scenario — never a unit observation (unit is vitest's substrate, not cucumber-derivable)", () => {
    // The NEGATIVE BOUNDARY of the derivation rule: @unit is NOT a cucumber-derivable tier, so
    // deriveLevels finds no non-unit tier tag and falls back to the SINGLE caller-supplied level
    // (integration). Exactly ONE observation, at the fallback level — and crucially NOT levelled
    // unit: cucumber must never manufacture a unit discharge for a @unit-only scenario (unit is
    // the vitest substrate). Reds if @unit is added to the derivable tiers — a spurious unit
    // observation would then discharge the scenario's unit obligation where none is named.
    const report: CucumberJsonReport = [
      {
        uri: "features/unitOnly.feature",
        elements: [
          {
            tags: [{ name: "@unit" }, { name: "@SCN-LDG-015" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-LDG-015", status: "passed", locator: "features/unitOnly.feature" },
    ]);
  });
});

describe("[SCN-PND-013] parseCucumberEvidenceObservations classifies a scenario three-way — pending is never inferred from status", () => {
  /** A single-scenario cucumber report whose one step carries `status`. */
  const reportWithStep = (status: string): CucumberJsonReport => [
    {
      uri: "features/pnd013.feature",
      elements: [
        {
          tags: [{ name: "@integration" }, { name: "@SCN-PDN-001" }],
          steps: [{ result: { status } }],
        },
      ],
    },
  ];

  it("emits a `passed` observation when every step passed (→ satisfied downstream)", () => {
    expect(parseCucumberEvidenceObservations(reportWithStep("passed"), "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-PDN-001", status: "passed", locator: "features/pnd013.feature" },
    ]);
  });

  it("emits a `failed` observation when a step failed (→ failing downstream)", () => {
    expect(parseCucumberEvidenceObservations(reportWithStep("failed"), "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-PDN-001", status: "failed", locator: "features/pnd013.feature" },
    ]);
  });

  // The three-way's teeth: each inconclusive status (a stub that RAN but proved nothing) emits
  // NOTHING — dropped at the reader, so the evidence obligation reconciles missing BY ABSENCE.
  //
  // `ambiguous` LEFT this list at @SCN-LDG-019: it is not a stub that proved nothing but a BROKEN
  // HARNESS — two step definitions match one step, so the step CANNOT run — and the reader now
  // emits a `broken` observation for it (see [SCN-LDG-019] below). PND-013's own Examples row
  // `| ambiguous | missing |` still holds: the reconciler's fail-safe excludes a broken
  // observation from the obligation match, so the evidence obligation still reconciles missing BY
  // ABSENCE. The statuses that STAY dropped stay honest: `undefined` (no step definition written —
  // the test genuinely is absent), `pending` (explicitly deferred), `skipped` (never ran).
  for (const status of ["undefined", "pending", "skipped"]) {
    it(`DROPS an inconclusive "${status}" scenario — emits no observation (→ missing by absence)`, () => {
      expect(parseCucumberEvidenceObservations(reportWithStep(status), "integration")).toEqual([]);
    });
  }

  it("drops an inconclusive scenario at EVERY named tier — the drop is whole-scenario, not per-tier", () => {
    // The multi-tier note: a scenario NAMING @integration @e2e that reads inconclusive emits
    // NO observation at ANY tier (not integration-dropped-but-e2e-kept). Reds today: the binary
    // reader would emit a `failed` observation per named tier (two observations).
    const report: CucumberJsonReport = [
      {
        uri: "features/multi.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@e2e" }, { name: "@SCN-PDN-002" }],
            steps: [{ result: { status: "passed" } }, { result: { status: "skipped" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([]);
  });

  it("still emits a genuine passed/failed UNCITED (null-scnId) result — only inconclusive is dropped", () => {
    // The null-scnId handling survives the three-way: a scenario carrying NO @SCN tag but a
    // genuine failed step still emits its null-scnId credit (SUSPENSE). Only inconclusive results
    // are dropped; a real pass/fail — cited or not — is preserved.
    const report: CucumberJsonReport = [
      {
        uri: "features/uncited.feature",
        elements: [
          { tags: [{ name: "@integration" }], steps: [{ result: { status: "failed" } }] },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: null, status: "failed", locator: "features/uncited.feature" },
    ]);
  });
});

describe("[SCN-LDG-019] parseCucumberEvidenceObservations emits a broken observation for an ambiguous step — a broken harness, not an absent test", () => {
  // BROKEN IS READER-AGNOSTIC. @SCN-LDG-017 established `broken` over vitest's instance of it (a
  // file that failed to COLLECT); this is cucumber's, and its only one: a step matched by TWO step
  // definitions is reported `ambiguous`, so the step CANNOT run. The inconclusive drop reported it
  // as `missing` — sending the reader to write a test that already exists while two step
  // definitions collide. Reds today: the drop emits NOTHING at all.
  //
  // Cucumber emits NO `error_message` for an ambiguous step (verified: the result object is
  // exactly `{ status: "ambiguous", duration: 0 }` — the "Multiple step definitions match: …"
  // detail is pretty-formatter-only), so the reader SYNTHESISES the what-broke message from the
  // step it names. It states what broke; it prescribes no cure.
  const ambiguousReport = (tags: Array<{ name?: string }>): CucumberJsonReport => [
    {
      uri: "features/ldg019.feature",
      elements: [
        {
          tags,
          steps: [
            { keyword: "Given ", name: "a step two definitions both match", result: { status: "ambiguous", duration: 0 } },
          ],
        },
      ],
    },
  ];

  it("emits ONE broken observation carrying the scenario's scnId, the feature-file locator, and a synthesised message naming the ambiguous step", () => {
    const observations = parseCucumberEvidenceObservations(
      ambiguousReport([{ name: "@integration" }, { name: "@SCN-HNS-020" }]),
      "integration"
    );

    expect(observations).toHaveLength(1);
    // Narrowed to the runtime shape: the cucumber reader only ever emits runtime observations
    // (a static check observation is the static reader's), and `broken` / `message` live there.
    const [observation] = observations as RuntimeEvidenceObservation[];
    expect(observation).toMatchObject({
      qualityCheck: "integration",
      // THE CITATION. This is the FIRST case in the codebase that emits a `broken` observation
      // carrying an scnId — vitest's collection failure is citation-less by construction (a file
      // that fails to collect names no test, so it cites no @SCN). The cucumber scenario DID cite
      // its @SCN; the step just could not run. The reconciler's fail-safe is what keeps the credit
      // off the obligation it cites (pinned in reconcile.test.ts [SCN-LDG-019]).
      scnId: "SCN-HNS-020",
      locator: "features/ldg019.feature",
      broken: true,
    });
    // The WHAT-BROKE payload: it NAMES the ambiguous step and says two or more step definitions
    // match it, so it never ran. No cure is prescribed.
    expect(observation!.message).toContain("Given a step two definitions both match");
    expect(observation!.message).toMatch(/step definitions match/i);
    expect(observation!.message).toMatch(/never ran/i);
  });

  it("emits the broken observation ONCE for a multi-tier scenario — the harness broke once, not once per named tier", () => {
    // The whole-scenario shape, mirroring the inconclusive drop (which is whole-scenario, not
    // per-tier): the ambiguity is a property of the STEP, so a scenario NAMING @integration @e2e
    // yields ONE broken item on the suspense row, not two. It is levelled at the scenario's first
    // named tier.
    const observations = parseCucumberEvidenceObservations(
      ambiguousReport([{ name: "@integration" }, { name: "@e2e" }, { name: "@SCN-HNS-021" }]),
      "integration"
    );

    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({ qualityCheck: "integration", broken: true });
  });

  it("takes ambiguity BEFORE the inconclusive drop — an ambiguous step alongside skipped ones is still broken", () => {
    // The fourth arm is checked BEFORE the drop: a cucumber run halts the scenario at the
    // ambiguous step, so the steps after it read `skipped`. Under the drop-first ordering the
    // whole scenario would vanish, ambiguity and all.
    const report: CucumberJsonReport = [
      {
        uri: "features/ldg019.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-HNS-022" }],
            steps: [
              { keyword: "Given ", name: "a step two definitions both match", result: { status: "ambiguous" } },
              { keyword: "When ", name: "the run halts", result: { status: "skipped" } },
            ],
          },
        ],
      },
    ];

    expect(parseCucumberEvidenceObservations(report, "integration")).toMatchObject([
      { scnId: "SCN-HNS-022", broken: true },
    ]);
  });

  it("does NOT emit broken for a genuinely failing step — a step that RAN and failed is attributable, and stays `failing`", () => {
    // THE BOUNDARY (mirroring @SCN-LDG-017's): `broken` is specifically the evidence that never
    // materialised. A step that ran and failed is honest, attributable evidence — it must keep
    // landing as an ordinary `failed` observation on the scenario it cites, never on the suspense
    // row.
    const report: CucumberJsonReport = [
      {
        uri: "features/ldg019.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@SCN-HNS-023" }],
            steps: [{ keyword: "Given ", name: "a step that ran and failed", result: { status: "failed" } }],
          },
        ],
      },
    ];

    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-HNS-023", status: "failed", locator: "features/ldg019.feature" },
    ]);
  });

  it("emits the broken observation for an UNCITED ambiguous scenario too — scnId null, still broken", () => {
    // The citation is not what makes it broken: a scenario carrying no @SCN whose step is
    // ambiguous is still a broken harness. It posts to the suspense row either way (a broken credit
    // posts nowhere else) — but as `broken`, never folded into `cites-no-scenario`, whose remedy is
    // the wrong one (add a citation, rather than fix the colliding step definitions).
    const observations = parseCucumberEvidenceObservations(
      ambiguousReport([{ name: "@integration" }]),
      "integration"
    );

    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({ scnId: null, broken: true, locator: "features/ldg019.feature" });
  });
});
