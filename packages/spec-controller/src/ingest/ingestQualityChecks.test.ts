import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runReconcile, killFloorReaderFor } from "./ingestQualityChecks.js";
import {
  resolveDeferralTags,
  resolveThresholds,
} from "@3f-consulting/spec-controller-core/internal";
import { DEFAULT_DEFERRAL_TAGS } from "../deferralTags.js";
import { RECORD_FILE } from "../mutation-ratchet/index.js";
import { parseScenarios, reconcile } from "@3f-consulting/spec-controller-core";
import {
  measuredCheckTags,
  parseMeasuredEvidenceObservations,
  thresholdFor,
  thresholdsOf,
} from "@3f-consulting/spec-controller-core/internal";

/**
 * @SCN-PND-021 (@unit) — the config read/union in isolation. `resolveDeferralTags` takes the
 * target's parsed `package.json` object and returns DEFAULT_DEFERRAL_TAGS EXTENDED by
 * `specController.deferralTags`. Config EXTENDS, never replaces (a project cannot un-recognise a
 * built-in); configured tags are bare names, `@`-stripped, consistent with the starter set;
 * malformed config is ignored defensively. The core parser stays pure — it takes this union as its
 * injected `deferralTags` param.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the [SCN-PND-021] id,
 * matching features/pending-items.feature and the @integration arm in
 * tests/steps/pendingItems.steps.ts (a grep of the id returns both halves), plus the --help arm in
 * packages/spec-controller/src/cli-registry.test.ts.
 */
describe("[SCN-PND-021] resolveDeferralTags extends the starter set with specController.deferralTags", () => {
  it("unions a project-configured tag with the built-in starter set — the configured tag is recognised", () => {
    // Teeth: the configured `deferred` tag must appear in the resolved set (so it defers like a
    // built-in), alongside the whole starter set. Reds while the config is ignored (the stub returns
    // the starter set only).
    const resolved = resolveDeferralTags({ specController: { deferralTags: ["deferred"] } }, DEFAULT_DEFERRAL_TAGS);
    expect(resolved).toContain("deferred");
    for (const builtin of DEFAULT_DEFERRAL_TAGS) {
      expect(resolved).toContain(builtin);
    }
  });

  it("EXTENDS, never replaces — a project cannot un-recognise a built-in, even with a disjoint config", () => {
    // Config extends the recognised set: configuring `deferred` keeps every built-in (`@wip` still
    // defers). The resolved set is a superset of DEFAULT_DEFERRAL_TAGS plus the configured tag.
    const resolved = resolveDeferralTags({ specController: { deferralTags: ["deferred"] } }, DEFAULT_DEFERRAL_TAGS);
    expect(new Set(resolved)).toEqual(new Set([...DEFAULT_DEFERRAL_TAGS, "deferred"]));
    // Even an EMPTY configured list leaves the built-in set intact — it cannot subtract `@wip`.
    expect(new Set(resolveDeferralTags({ specController: { deferralTags: [] } }, DEFAULT_DEFERRAL_TAGS))).toEqual(
      new Set(DEFAULT_DEFERRAL_TAGS)
    );
  });

  it("returns exactly the starter set when no specController.deferralTags is configured", () => {
    // A package.json with no `specController` field (or no `deferralTags`) resolves to the starter
    // set alone — the default the pure parser already applies.
    expect(new Set(resolveDeferralTags({}, DEFAULT_DEFERRAL_TAGS))).toEqual(new Set(DEFAULT_DEFERRAL_TAGS));
    expect(new Set(resolveDeferralTags({ specController: {} }, DEFAULT_DEFERRAL_TAGS))).toEqual(new Set(DEFAULT_DEFERRAL_TAGS));
  });

  it("strips a leading `@` and ignores malformed (non-string / non-array) config entries", () => {
    // Configured tags are bare names, `@`-stripped, consistent with DEFAULT_DEFERRAL_TAGS — so
    // `@deferred` resolves to the bare `deferred` the tag-line parser compares against. Non-string
    // entries and a non-array `deferralTags` are ignored defensively (never a crash, never a stray tag).
    expect(resolveDeferralTags({ specController: { deferralTags: ["@deferred"] } }, DEFAULT_DEFERRAL_TAGS)).toContain("deferred");
    const mixed = resolveDeferralTags({ specController: { deferralTags: ["@custom", 7, null] as unknown[] } }, DEFAULT_DEFERRAL_TAGS);
    expect(mixed).toContain("custom");
    expect(new Set(mixed)).toEqual(new Set([...DEFAULT_DEFERRAL_TAGS, "custom"]));
    // A non-array `deferralTags` is ignored — the starter set is returned unchanged.
    expect(new Set(resolveDeferralTags({ specController: { deferralTags: "nope" as unknown } }, DEFAULT_DEFERRAL_TAGS))).toEqual(
      new Set(DEFAULT_DEFERRAL_TAGS)
    );
  });
});

/**
 * @SCN-MUT-012 (@unit) — the substitution this edge performs, in isolation: a bar naming a mutation
 * gate leaves here as the number that gate's record implies, and everything downstream of this
 * function reads what it has always read.
 *
 * THE ENGINE IS NOT UNDER TEST AND MUST NOT BE TOUCHED (3F-2788, non-negotiable 1). `thresholdsOf`
 * is imported here only to build the registry the SAME manifest with the number typed into it
 * produces, which is the identity these arms assert against — a comparison that would be vacuous
 * if either side had learned anything about records, gates or YAML.
 *
 * ITS @integration HALF drives the whole seam — the planted record, the corpus, the obligation and
 * the reconciled row — from tests/steps/mutationScore.steps.ts.
 */
describe("[SCN-MUT-012] resolveThresholds reads a bar that names a mutation gate as that gate's kill floor", () => {
  const planted: string[] = [];

  afterEach(() => {
    for (const root of planted.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  const GATE = "domain";
  const KILLS = 701;
  const MUTANTS = 704;
  const ALLOWANCE = 2;
  const KILL_FLOOR = KILLS - ALLOWANCE;

  function recordText(detected: number, total: number, slack: number): string {
    return `mutation-gates:
  ${GATE}:
    detected: ${detected}
    total: ${total}
    slack-mutants: ${slack}
    slack-reason: "measured non-determinism on this gate"
`;
  }

  /** A target tree holding that record under the name given, and its root. */
  function plantRoot(recordFile: string, text: string): string {
    const root = mkdtempSync(join(tmpdir(), "resolve-thresholds-"));
    planted.push(root);
    writeFileSync(join(root, recordFile), text, "utf8");
    return root;
  }

  function manifest(bar: unknown) {
    return { specController: { thresholds: { "SCN-MSD-001": { mutation: bar } } } };
  }

  /** The registry as a plain structure, so two of them can be compared as one value. */
  function asEntries(registry: ReturnType<typeof thresholdsOf>) {
    return [...registry].map(([scnId, bars]) => [scnId, [...bars]]);
  }

  it("hands the engine the number the record implies, and nothing the engine has not always read", () => {
    // THE IDENTITY IS THE ASSERTION. `{ atLeast: { mutationGate: "domain" } }` over a record banking
    // 701 kills with 2 allowed must leave this function as the registry `{ atLeast: 699 }` builds —
    // which is what makes `packages/core` untouched a property rather than a claim.
    const root = plantRoot(RECORD_FILE, recordText(KILLS, MUTANTS, ALLOWANCE));

    expect(
      asEntries(
        resolveThresholds(manifest({ atLeast: { mutationGate: GATE } }), killFloorReaderFor(root))
      )
    ).toEqual(asEntries(thresholdsOf({ "SCN-MSD-001": { mutation: { atLeast: KILL_FLOOR } } })));
  });

  it("reads the record the reference names, rather than the conventional one beside it", () => {
    // The asymmetry `ratchetCli` already rules on: the record's name belongs to whoever owns the
    // record. The decoy under the conventional name banks a different figure, so a resolver that
    // ignored the stated name would answer 599 and this would red rather than pass by coincidence.
    const root = plantRoot("the-bars-parcel-co-keeps.yml", recordText(KILLS, MUTANTS, ALLOWANCE));
    writeFileSync(join(root, RECORD_FILE), recordText(601, MUTANTS, ALLOWANCE), "utf8");

    const registry = resolveThresholds(
      manifest({ atLeast: { mutationGate: GATE, recordFile: "the-bars-parcel-co-keeps.yml" } }),
      killFloorReaderFor(root)
    );

    expect(registry.get("SCN-MSD-001")?.get("mutation")).toEqual({
      threshold: KILL_FLOOR,
      atLeast: true,
    });
  });

  it("substitutes the value and reads no direction, so a ceiling naming a gate resolves the same way", () => {
    // DIRECTION-BLIND ON PURPOSE. The engine has no opinion about which checks are floors
    // (@SCN-LNT-005, and this feature's own preamble), so a target authoring a mutation ceiling is
    // wrong out loud rather than quietly overruled — which it cannot be if this edge special-cases
    // the direction it expects.
    const root = plantRoot(RECORD_FILE, recordText(KILLS, MUTANTS, ALLOWANCE));

    expect(
      resolveThresholds(manifest({ atMost: { mutationGate: GATE } }), killFloorReaderFor(root))
        .get("SCN-MSD-001")
        ?.get("mutation")
    ).toEqual({ threshold: KILL_FLOOR });
  });

  it("opens no record at all for a manifest that names no gate", () => {
    // The two live @ci-run-time ceilings are bare numbers, and a resolver that read a record before
    // asking whether anything referenced one would fail on every target that has never banked a
    // mutation gate. The root planted here holds no record, so an eager read raises rather than
    // resolves.
    const root = mkdtempSync(join(tmpdir(), "resolve-thresholds-"));
    planted.push(root);

    expect(
      asEntries(
        resolveThresholds(
          { specController: { thresholds: { "SCN-AAA-005": { "ci-run-time": 75 } } } },
          killFloorReaderFor(root)
        )
      )
    ).toEqual(asEntries(thresholdsOf({ "SCN-AAA-005": { "ci-run-time": 75 } })));
  });
});

/**
 * @SCN-MUT-013 (@unit) — the four ways a reference cannot be sourced, and the one answer.
 *
 * NO ROW HERE IS ALLOWED TO REACH A NUMBER, which is what makes this the negative of the arm above
 * rather than a second reading of it. A bar the edge picked is a bar nobody authored being enforced
 * as though somebody had, and the reachable ones are worse than arbitrary: a record refused for an
 * allowance wider than its kills would resolve to a NEGATIVE floor, which no measurement can miss.
 *
 * IT SITS BESIDE @SCN-MUT-012's ARMS ON PURPOSE (3F-2788). An edge answering "no bar" to everything
 * passes every assertion below and silently un-gates the whole measured axis; the pair in one file
 * is what makes the two run together and the vacuous edge unreachable.
 */
describe("[SCN-MUT-013] a bar naming a gate the record cannot supply resolves to no bar at all", () => {
  const planted: string[] = [];

  afterEach(() => {
    for (const root of planted.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  const GATE = "domain";

  /** A target tree, with the record text given filed under the conventional name — or none at all. */
  function plantRoot(text: string | null): string {
    const root = mkdtempSync(join(tmpdir(), "resolve-thresholds-negative-"));
    planted.push(root);
    if (text !== null) writeFileSync(join(root, RECORD_FILE), text, "utf8");
    return root;
  }

  function manifestNamingTheGate() {
    return {
      specController: {
        thresholds: { "SCN-MSD-001": { mutation: { atLeast: { mutationGate: GATE } } } },
      },
    };
  }

  /** A record banking one gate's figures, as a project authors one. */
  function recordText(gate: string, fields: string): string {
    return `mutation-gates:\n  ${gate}:\n${fields}`;
  }

  /** The corpus the bar is read against — one stepless row carrying the bare check. */
  const CORPUS = `@MSD
Feature: measured

  Rule: the domain core is mutated at least as hard as its bar

    @mutation @SCN-MSD-001
    Scenario: the domain core is mutated at least as hard as its bar
`;

  /**
   * The four records, each the way this reference stops being sourceable.
   *
   * THE FOURTH IS PLURAL BECAUSE THE REFUSAL IS. `parseGateRecords` refuses five separate count
   * shapes, and an edge that read any ONE of them as a number would be a live hole — so the row's
   * fixture is every one of them rather than a representative.
   */
  const REFUSED_COUNTS: readonly [string, string][] = [
    ["a gate that measured no mutants", "    detected: 0\n    total: 0\n    slack-mutants: 0\n"],
    ["more kills than mutants", "    detected: 705\n    total: 704\n    slack-mutants: 0\n"],
    ["a fractional count", "    detected: 700.5\n    total: 704\n    slack-mutants: 0\n"],
    ["an allowance wider than the kills", "    detected: 5\n    total: 704\n    slack-mutants: 9\n"],
    ["an allowance nobody justified", "    detected: 701\n    total: 704\n    slack-mutants: 2\n"],
  ];

  const ROWS: readonly [string, string | null][] = [
    // The gate name mistyped where the manifest states it: a record that reads perfectly, asked for
    // a gate it never held. Nothing about the record is wrong, so nobody is ever sent to look at it.
    [
      "holds no gate of that name",
      recordText("core", "    detected: 701\n    total: 704\n    slack-mutants: 0\n"),
    ],
    // A fresh clone, a moved file, a .gitignore that swallowed it.
    ["is not there to be read", null],
    // The YAML parser's own detection, normalised into the one refusal type — a gate recorded twice.
    ["holds text nothing can read as a record", "mutation-gates:\n  domain: 1\n  domain: 2\n"],
    ["holds the gate with counts it refuses as a bar", recordText(GATE, REFUSED_COUNTS[0]![1])],
  ];

  /** The registry a manifest whose bar nothing can read produces — the identity every row asserts. */
  function registryWithNoBar() {
    return thresholdsOf({ "SCN-MSD-001": { mutation: { direction: "up", value: 91.87 } } });
  }

  function asEntries(registry: ReturnType<typeof thresholdsOf>) {
    return [...registry].map(([scnId, bars]) => [scnId, [...bars]]);
  }

  it.each(ROWS)("the record %s: the key survives and no bar comes back", (_row, text) => {
    // THE IDENTITY IS THE ASSERTION, as it is on the positive arm. The registry must be the very one
    // an unreadable bar already produces — the key present, `null` beside it — because that is what
    // keeps the check MEASURED while the bar goes missing. A dropped key would take the obligation
    // down with the bar and move the complaint to the tag grammar.
    const registry = resolveThresholds(
      manifestNamingTheGate(),
      killFloorReaderFor(plantRoot(text))
    );

    expect(asEntries(registry)).toEqual(asEntries(registryWithNoBar()));
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toBeNull();
    expect(measuredCheckTags(registry)).toContain("mutation");
  });

  it.each(ROWS)(
    "the record %s: the obligation is raised measured, holding no bar the edge picked",
    (_row, text) => {
      const registry = resolveThresholds(
      manifestNamingTheGate(),
      killFloorReaderFor(plantRoot(text))
    );
      const raised = parseScenarios(CORPUS, [], measuredCheckTags(registry), registry);
      const obligation = raised[0]?.evidenceObligations[0];

      // ASSERTED ON THE KEY SET, because the reading that must not be reachable is a bar with a
      // number in it: `threshold: 0`, `threshold: -4` or `threshold: NaN` would each satisfy a
      // field-by-field read and hold the row to a figure nobody wrote.
      expect(Object.keys(obligation ?? {}).sort()).toEqual([
        "measured",
        "qualityCheck",
        "staticCheck",
      ]);
      expect(obligation?.measured).toBe(true);
    }
  );

  it.each(ROWS)(
    "the record %s: the row reports the unauthored bar rather than reconciling satisfied",
    (_row, text) => {
      // A MEASUREMENT IS POSTED, WHICH IS WHAT MAKES THIS A NEGATIVE. `missing` over no measurement
      // at all would be true of every row on this axis; the claim is that a run which WOULD clear a
      // sourceable bar still cannot be settled by one nobody could source.
      const registry = resolveThresholds(
      manifestNamingTheGate(),
      killFloorReaderFor(plantRoot(text))
    );
      const ledger = reconcile(
        parseScenarios(CORPUS, [], measuredCheckTags(registry), registry),
        parseMeasuredEvidenceObservations({
          measurements: [{ scnId: "SCN-MSD-001", checkTag: "mutation", measured: 701 }],
        })
      );
      const row = ledger.scenarioReconciliations.find((r) => r.scnId === "SCN-MSD-001");
      const item = row?.qualityCheckReconciliations.find((r) => r.staticCheck === "mutation");

      expect(item?.outcome).toBe("missing");
      expect(row?.verdict).toBe("out-of-balance");
    }
  );

  it.each(REFUSED_COUNTS)("counts the record refuses — %s — reach no bar either", (_shape, fields) => {
    const registry = resolveThresholds(
      manifestNamingTheGate(),
      killFloorReaderFor(plantRoot(recordText(GATE, fields)))
    );

    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toBeNull();
  });

  it("leaves every other bar in the manifest exactly as it found it", () => {
    // THE REFUSAL IS THE REFERENCE'S, NOT THE PASS'S. An edge that answered a record it could not
    // read by resolving the whole manifest EMPTY would pass every assertion above and take the two
    // live @ci-run-time ceilings off the books with it — the un-gating this scenario exists to
    // refuse, reached by the other door.
    const registry = resolveThresholds(
      {
        specController: {
          thresholds: {
            "SCN-MSD-001": { mutation: { atLeast: { mutationGate: GATE } } },
            "SCN-AAA-005": { "ci-run-time": 75 },
          },
        },
      },
      killFloorReaderFor(plantRoot(null))
    );

    expect(thresholdFor(registry, "SCN-AAA-005", "ci-run-time")).toEqual({ threshold: 75 });
    expect(thresholdFor(registry, "SCN-MSD-001", "mutation")).toBeNull();
  });
});
