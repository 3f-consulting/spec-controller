/**
 * @unit for `reconcile.ts` and the module's own surface — every term a project owns arrives from
 * the project (@SCN-RAT-014, 3F-2804).
 *
 * The `[SCN-RAT-014]` markers in the `describe` / `it` strings below are the bidirectional evidence
 * handle (Evidence Manifesto §9) matching features/mutation-ratchet.feature, so a grep of either
 * returns both halves of the pair — this arm and the `@integration` one in
 * tests/steps/mutationRatchet.steps.ts.
 *
 * THE SECOND PROJECT IS THE WHOLE POINT, AND A COSMETIC ONE WOULD PROVE NOTHING. Every arm above
 * this one is driven by fixtures whose values a leak could coincide with; this one is driven by a
 * project that shares no term with this repository at all — its record filed under a name of its
 * own, its gates named in its own words, its sweep's report wherever its own runner leaves one,
 * and its own sentence for banking a measurement.
 *
 * AND EACH TERM IS PINNED BY A DISCRIMINATOR RATHER THAN BY A HAPPY PATH, because a reconciler that
 * ignored an input entirely still answers, and usually answers plausibly. So a decoy record sits at
 * the default name while the request names another; a decoy report sits at the conventional path
 * while the request names another; the same request is run against two roots holding different
 * trees and must answer differently; and the bank-it sentence is run twice with two different
 * wordings. Every one of those reds against a reader that had the term written into it, and every
 * one of them is green against a reader that merely happened to agree.
 *
 * THE SURFACE IS THEN READ AS BYTES, BECAUSE BEHAVIOUR CANNOT SEE THE LAST TERM. A reconciler told
 * which words to use for banking passes every verdict above while a second, unreachable sentence
 * beside it still names somebody's script. So the module's own text is scanned — every
 * non-test source, its commentary struck out so the ban is about what the module DOES rather than
 * what it argues about, its file list exhaustive so a new source cannot dodge the scan, and each
 * pattern proved to fire on the leak it was drawn from before its absence is believed of anything.
 */

import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as surface from "./index.js";
import { FallRefusedError, raisedRecordText } from "./index.js";
import { RECORD_FILE, reconcileGate, type RatchetRequest } from "./reconcile.js";
import type {
  MutationGateAllowance,
  MutationGateRecord,
  MutationMeasurement,
  MutationReportRead,
  MutationVerdict,
  MutationVerdictKind,
} from "./index.js";

/** Where this file sits, and therefore where the module it is pinning sits. */
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * The second project's own five terms. Not one of them is a term of this repository's.
 *
 * THE RECORD NAME IS NOT THE DEFAULT AND THE REPORT PATH IS NOT THE CONVENTION, deliberately: those
 * two are the values a reader with either written into it would reach for, and a fixture that used
 * them would agree with such a reader by coincidence.
 */
const OTHER_PROJECT = {
  gate: "parcel-routing",
  recordFile: "the-bars-parcel-co-keeps.yml",
  reportPath: join("out", "quality", "parcel-routing.mutants.json"),
  bankCommand: "make bank-the-parcel-routing-bar --and-say-why",
} as const;

/** The bar that project's record states for its gate, and the sibling gate banked beside it. */
const BANKED = { detected: 812, total: 900, slack: 2 } as const;

/** One gate's block, as that project authors one — comment furniture, blank lines and all. */
function gateBlock(gate: string, detected: number, total: number, slack: number): string {
  return [
    `  # ${gate} — banked by the sweep that last ran green over this scope.`,
    `  ${gate}:`,
    `    detected: ${detected}`,
    `    total: ${total}`,
    ``,
    `    slack-mutants: ${slack}`,
    `    slack-reason: "${slack === 0 ? "" : "two mutants here are detected by timeout, and a timeout can flip on a slower machine"}"`,
    ``,
  ].join("\n");
}

/** That project's record, as it authors it — its own gate above a sibling of its own. */
function recordText(detected: number, total: number, slack: number): string {
  return [
    "# The bars parcel-co holds itself to. The counts are ours and so are the gate names.",
    "mutation-gates:",
    gateBlock(OTHER_PROJECT.gate, detected, total, slack),
    gateBlock("tariff-tables", 431, 460, 0),
  ].join("\n");
}

/** A report's text, from the two counts a run measured. */
function reportText(detected: number, total: number): string {
  const statuses = [
    ...Array.from({ length: detected }, () => "Killed"),
    ...Array.from({ length: total - detected }, () => "Survived"),
  ];
  return JSON.stringify({
    schemaVersion: "1.0",
    files: {
      "lib/routing.ts": {
        language: "typescript",
        mutants: statuses.map((status, at) => ({ id: `m${at}`, mutatorName: "Conditional", status })),
      },
    },
  });
}

/** What a planted tree holds: a record at some name, and optionally a report at some path. */
interface PlantedTree {
  readonly record: { readonly at: string; readonly text: string };
  readonly report?: { readonly at: string; readonly text: string };
}

/**
 * Plant one tree under a temporary root and hand the root back.
 *
 * THE ROOT IS DELIBERATELY OUTSIDE THE DIRECTORY THIS SUITE RUNS IN, which is the only arrangement
 * that can tell "the root you handed me" from "the root I assumed" — asserted here rather than
 * hoped for, because a fixture that quietly landed inside the working directory would green a
 * reader that never read `root` at all.
 */
function plant(tree: PlantedTree): string {
  const root = mkdtempSync(join(tmpdir(), "ratchet-other-project-"));

  expect(root.startsWith(process.cwd())).toBe(false);
  expect(root.startsWith(MODULE_DIR)).toBe(false);

  for (const file of [tree.record, tree.report]) {
    if (file === undefined) continue;
    const at = join(root, file.at);
    mkdirSync(dirname(at), { recursive: true });
    writeFileSync(at, file.text, "utf8");
  }
  return root;
}

/** A tree holding that project's record and a report of the given counts, both at its own names. */
function otherProjectTree(measured: { detected: number; total: number } | null): string {
  return plant({
    record: { at: OTHER_PROJECT.recordFile, text: recordText(BANKED.detected, BANKED.total, BANKED.slack) },
    report:
      measured === null
        ? undefined
        : { at: OTHER_PROJECT.reportPath, text: reportText(measured.detected, measured.total) },
  });
}

/** The request that project makes, over a planted root. */
function requestOver(root: string, over: Partial<RatchetRequest> = {}): RatchetRequest {
  return { root, ...OTHER_PROJECT, ...over };
}

/** The verdict that project's run reaches, over a tree planted for it. */
function verdictOver(
  measured: { detected: number; total: number } | null,
  over: Partial<RatchetRequest> = {},
): MutationVerdict {
  return reconcileGate(requestOver(otherProjectTree(measured), over));
}

/**
 * Every run of that project's, and the verdict its own counts imply.
 *
 * THE SET IS THE WHOLE SET, and that is what makes this the genericity example rather than a smoke
 * test. A reconciler with one of this repository's terms written into it does not fail on an
 * unusual verdict — it fails on all of them, or on none.
 */
const EVERY_RUN: readonly {
  readonly measured: { detected: number; total: number } | null;
  readonly kind: MutationVerdictKind;
  readonly stands: boolean;
}[] = [
  { measured: { detected: 805, total: 900 }, kind: "regression", stands: false },
  { measured: { detected: 805, total: 890 }, kind: "population-shrank", stands: false },
  { measured: { detected: 810, total: 900 }, kind: "within-slack", stands: true },
  { measured: { detected: 812, total: 910 }, kind: "population-grew", stands: true },
  { measured: { detected: 830, total: 900 }, kind: "unrecorded-improvement", stands: false },
  { measured: { detected: 812, total: 900 }, kind: "at-baseline", stands: true },
  { measured: null, kind: "no-measurement", stands: false },
];

describe("[SCN-RAT-014] reconcileGate — a second project's terms drive the whole verdict", () => {
  it("[SCN-RAT-014] is driven by a project sharing no term with this repository", () => {
    expect(OTHER_PROJECT.recordFile).not.toBe(RECORD_FILE);
    expect(OTHER_PROJECT.reportPath).not.toContain("mutation");
    expect(recordText(BANKED.detected, BANKED.total, BANKED.slack)).toContain(OTHER_PROJECT.gate);
  });

  for (const run of EVERY_RUN) {
    const measured = run.measured === null ? "no report at all" : `${run.measured.detected}/${run.measured.total}`;

    it(`[SCN-RAT-014] answers ${measured} with ${run.kind}, over that project's own gate name`, () => {
      const verdict = verdictOver(run.measured);

      expect(verdict.kind).toBe(run.kind);
      expect(verdict.ok).toBe(run.stands);
      expect(verdict.message).toContain(OTHER_PROJECT.gate);
    });
  }

  it("[SCN-RAT-014] names the path that project chose when there is no report to read", () => {
    const verdict = verdictOver(null);

    expect(verdict.message).toContain(OTHER_PROJECT.reportPath);
    expect(verdict.message).not.toContain("reports");
  });
});

describe("[SCN-RAT-014] reconcileGate — each project-owned term is read, never assumed", () => {
  /** A decoy at the default name, banking figures that reach a different verdict entirely. */
  const DECOY_RECORD = recordText(700, 900, 0);

  it("[SCN-RAT-014] reads the record the request names, with a readable decoy sitting at the default", () => {
    const root = plant({
      record: { at: OTHER_PROJECT.recordFile, text: recordText(BANKED.detected, BANKED.total, BANKED.slack) },
      report: { at: OTHER_PROJECT.reportPath, text: reportText(812, 900) },
    });
    writeFileSync(join(root, RECORD_FILE), DECOY_RECORD, "utf8");

    // The decoy is a working record for the very same gate: a reader with the default written into
    // it finds it, reads it, and answers `unrecorded-improvement` rather than failing.
    expect(reconcileGate(requestOver(root, { recordFile: RECORD_FILE })).kind).toBe("unrecorded-improvement");
    expect(reconcileGate(requestOver(root)).kind).toBe("at-baseline");
  });

  it("[SCN-RAT-014] falls back to the default record name only when the request states none", () => {
    const root = plant({
      record: { at: RECORD_FILE, text: DECOY_RECORD },
      report: { at: OTHER_PROJECT.reportPath, text: reportText(812, 900) },
    });
    const { recordFile: _named, ...unnamed } = requestOver(root);

    expect(reconcileGate(unnamed).kind).toBe("unrecorded-improvement");
  });

  it("[SCN-RAT-014] reads the report the request names, with a decoy at the runner's own convention", () => {
    const root = otherProjectTree({ detected: 812, total: 900 });
    const conventional = join("reports", "mutation", `${OTHER_PROJECT.gate}.json`);
    mkdirSync(join(root, dirname(conventional)), { recursive: true });
    writeFileSync(join(root, conventional), reportText(805, 900), "utf8");

    expect(reconcileGate(requestOver(root, { reportPath: conventional })).kind).toBe("regression");
    expect(reconcileGate(requestOver(root)).kind).toBe("at-baseline");
  });

  it("[SCN-RAT-014] resolves the record under the root it was handed, never one of its own", () => {
    // Two trees, identical but for the record. A reader that joined a root of its own — its install
    // directory, or wherever the process started — answers both the same way or neither at all.
    const onBaseline = plant({
      record: { at: OTHER_PROJECT.recordFile, text: recordText(812, 900, 2) },
      report: { at: OTHER_PROJECT.reportPath, text: reportText(812, 900) },
    });
    const behindItsRecord = plant({
      record: { at: OTHER_PROJECT.recordFile, text: recordText(830, 900, 0) },
      report: { at: OTHER_PROJECT.reportPath, text: reportText(812, 900) },
    });

    expect(reconcileGate(requestOver(onBaseline)).kind).toBe("at-baseline");
    expect(reconcileGate(requestOver(behindItsRecord)).kind).toBe("regression");
  });

  it("[SCN-RAT-014] resolves the report under the root it was handed, never one of its own", () => {
    const stood = otherProjectTree({ detected: 812, total: 900 });
    const fell = otherProjectTree({ detected: 805, total: 900 });

    expect(reconcileGate(requestOver(stood)).kind).toBe("at-baseline");
    expect(reconcileGate(requestOver(fell)).kind).toBe("regression");
  });

  it("[SCN-RAT-014] quotes the project's own instruction in every verdict that asks for a bank", () => {
    const asking = [
      { detected: 812, total: 910 },
      { detected: 830, total: 900 },
    ];
    const otherWords = "just-run-the-thing --write-it-down";

    for (const measured of asking) {
      expect(verdictOver(measured).message).toContain(OTHER_PROJECT.bankCommand);
      expect(verdictOver(measured, { bankCommand: otherWords }).message).toContain(otherWords);
      expect(verdictOver(measured, { bankCommand: otherWords }).message).not.toContain(
        OTHER_PROJECT.bankCommand,
      );
    }
  });
});

/**
 * The names this module's own surface must not hold, each drawn from the leak it was written to catch.
 *
 * PROVED TO FIRE BEFORE ITS ABSENCE IS BELIEVED. A pattern that could never have matched anything
 * reads exactly like a clean surface, so every row carries the text it was drawn from — four of
 * them the reference implementation's own, measured at Analysis — and the arm asserts the pattern
 * matches that before asserting it matches nothing the module holds.
 */
const NAMES_SOMEBODY_OWNS: readonly {
  readonly names: string;
  readonly pattern: RegExp;
  readonly drawnFrom: string;
  /**
   * Whether the pattern is also read over the module's import specifiers.
   *
   * ALL BUT ONE ARE. A specifier names a MODULE rather than a tree, so the path pattern would red
   * on every relative import in the module and prove nothing; every other pattern here is read over
   * them, because a specifier is otherwise exactly where a name could sit out the code scan.
   */
  readonly overSpecifiers: boolean;
}[] = [
  {
    names: "a runner",
    pattern: /\b(stryker|vitest|jest|mocha|karma|pytest|junit)\b/i,
    drawnFrom: "stryker run --mutate lib/routing.ts",
    overSpecifiers: true,
  },
  {
    names: "a command a project's own people type",
    pattern: /\b(pnpm|npm|npx|yarn|bun|gradle|mvn)\b/i,
    drawnFrom: "Bank it: `pnpm mutation:domain --record`",
    overSpecifiers: true,
  },
  {
    names: "a workflow or the service that runs one",
    pattern: /\b(github|gitlab|jenkins|circleci|workflow)\b|GITHUB_[A-Z_]+/i,
    drawnFrom: 'const root = process.env["GITHUB_WORKSPACE"];',
    overSpecifiers: true,
  },
  {
    names: "a project or a repository",
    pattern: /\b(spec[-_]?controller|an adopter's repository|3f[-_]consulting)\b/i,
    drawnFrom: "an-adopters-repository/tools/mutationBaseline.ts",
    overSpecifiers: true,
  },
  {
    names: "a check a project runs",
    pattern: /\b(?:mutation|lint|guard|check|test|typecheck)[:/][a-z][\w-]*/i,
    drawnFrom: "pnpm mutation:domain --record",
    overSpecifiers: true,
  },
  {
    names: "a tree of the module's own finding",
    pattern: /import\s*\.\s*meta|fileURLToPath|__dirname|__filename|process\s*\.\s*cwd/,
    drawnFrom: 'const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");',
    overSpecifiers: true,
  },
  {
    names: "a path on somebody's tree",
    pattern: /[\w.-]\/[\w.-]/,
    drawnFrom: "const reportPath = `reports/mutation/${gate}.json`;",
    overSpecifiers: false,
  },
];

/** One source this module holds: its name, its code with commentary struck out, and its import specifiers. */
interface ModuleSource {
  readonly file: string;
  readonly code: string;
  readonly specifiers: readonly string[];
}

/**
 * Every source file this module holds, commentary struck out and import specifiers lifted away.
 *
 * THE STRIKE-OUT IS WHAT MAKES THE BAN A STATEMENT ABOUT WHAT THE MODULE DOES. This module argues
 * about exactly these ideas at length — it says out loud that it names no runner and no workflow —
 * and would red on its own reasoning otherwise.
 *
 * AND THE SPECIFIERS COME OUT SEPARATELY RATHER THAN BEING DELETED, because they name modules and
 * not trees, so the path pattern must not read them — but a specifier is also exactly where a leak
 * could hide from that removal. They are handed back so the arm can assert what they are.
 */
function moduleSources(): ModuleSource[] {
  return readdirSync(MODULE_DIR)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .sort()
    .map((file) => {
      const struck = readFileSync(join(MODULE_DIR, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/.*$/gm, " ")
        // AND THE SHEBANG, WHICH IS THE PLATFORM'S LINE RATHER THAN THIS MODULE'S (@SCN-RAT-015).
        // It is the one path in the module nobody chose: every command in this repository and every
        // other carries the same interpreter, and the path pattern below cannot tell it from a
        // caller's tree written into the code. It is struck rather than exempted, and the arm below
        // pins its exact bytes — so the line that leaves the scan is a known one, not whatever
        // happens to sit on the first line of a source file.
        .replace(/^#!.*$/m, " ");
      const specifiers = [...struck.matchAll(/from\s+"([^"]*)"/g)].map((found) => found[1] ?? "");

      return { file, code: struck.replace(/from\s+"[^"]*"/g, "from A_MODULE"), specifiers };
    });
}

/** The package's own manifest — where the dependencies this module's imports are held to are stated. */
function packageManifest(): {
  dependencies?: Record<string, string>;
  exports?: unknown;
  publishConfig?: { exports?: unknown };
} {
  return JSON.parse(readFileSync(join(MODULE_DIR, "..", "..", "package.json"), "utf8"));
}

describe("[SCN-RAT-014] the module's own surface names no project, check, runner, workflow or repository", () => {
  it("[SCN-RAT-014] is asserted over every source this module holds, read back from beside this file", () => {
    const sources = moduleSources();

    // Exhaustive on purpose: a source file added to this module reds here until somebody has looked
    // at whether it carries a term its callers own.
    expect(sources.map((source) => source.file)).toEqual([
      "index.ts",
      "ratchet.ts",
      "ratchetCli.ts",
      "reconcile.ts",
      "record.ts",
      "report.ts",
      "verdict.ts",
    ]);
    for (const { file, code } of sources) {
      expect(code.length, `${file} read back with nothing left in it.`).toBeGreaterThan(400);
    }

    // The strike-out is proved to have struck: a phrase that must survive it, and one from the
    // commentary that must not. Without this pair an absence asserted over an emptied string reads
    // exactly like an absence asserted over the file.
    const held = (file: string): string => sources.find((source) => source.file === file)?.code ?? "";

    expect(held("reconcile.ts")).toContain("export function reconcileGate");
    expect(held("reconcile.ts")).not.toContain("THE ROOT IS THE CONSUMER'S WORKSPACE");
    expect(held("index.ts")).toContain("MutationGateRecord");
    expect(held("index.ts")).not.toContain("curated symbol by symbol");
    expect(held("ratchetCli.ts")).toContain("function reconciliationOf");
    expect(held("ratchetCli.ts")).not.toContain("NOTHING HERE NAMES A PROJECT");

    // The struck shebang, pinned to the byte. Striking a line the scan cannot read is only safe
    // while what was struck is known: this asserts the command's first line is the interpreter and
    // nothing else, and that no other source in the module carries one at all.
    const firstLineOf = (file: string): string =>
      readFileSync(join(MODULE_DIR, file), "utf8").split("\n")[0] ?? "";

    expect(firstLineOf("ratchetCli.ts")).toBe("#!/usr/bin/env node");
    for (const { file } of sources.filter((source) => source.file !== "ratchetCli.ts")) {
      expect(firstLineOf(file), `${file} carries a shebang, which the scan strikes unseen.`).not.toMatch(/^#!/);
    }
  });

  it("[SCN-RAT-014] imports only the platform, its own siblings, and what the package states it depends on", () => {
    // The specifiers are lifted out of the code before the path pattern reads it, so this is where
    // they are accounted for: a name sitting in an import is otherwise a name that sat out the scan.
    const stated = Object.keys(packageManifest().dependencies ?? {});

    expect(stated.length).toBeGreaterThan(0);
    for (const { file, specifiers } of moduleSources()) {
      for (const specifier of specifiers) {
        const reachable =
          /^node:[a-z/]+$/.test(specifier) ||
          /^\.\/[\w.-]+\.js$/.test(specifier) ||
          stated.includes(specifier);

        expect(reachable, `${file} imports "${specifier}", which is neither the platform, a sibling, nor a dependency this package states.`).toBe(
          true,
        );
        for (const ban of NAMES_SOMEBODY_OWNS.filter((over) => over.overSpecifiers)) {
          expect(ban.pattern.test(specifier), `${file} imports "${specifier}", which names ${ban.names}.`).toBe(
            false,
          );
        }
      }
    }
  });

  for (const ban of NAMES_SOMEBODY_OWNS) {
    it(`[SCN-RAT-014] holds nothing naming ${ban.names}`, () => {
      // The teeth, proved first: the pattern fires on the text it was drawn from.
      expect(ban.pattern.test(ban.drawnFrom), `nothing in "${ban.drawnFrom}" matches this pattern.`).toBe(
        true,
      );

      for (const { file, code } of moduleSources()) {
        const offending = code.split("\n").filter((line) => ban.pattern.test(line));

        expect(offending, `${file} names ${ban.names}: ${offending.join(" / ")}`).toEqual([]);
      }
    });
  }
});

describe("[SCN-RAT-014] the barrel is curated, and every name a caller needs is on it", () => {
  it("[SCN-RAT-014] exports exactly the fourteen values the surface states, and nothing standing beside them", () => {
    expect(Object.keys(surface).sort()).toEqual([
      "FallRefusedError",
      "MalformedRecordError",
      "RECORD_FILE",
      "floorOf",
      "gateRecordFor",
      "killFloorOf",
      "measurementFromReport",
      "parseGateRecords",
      "raisedRecordText",
      "readMutationReport",
      "reconcileGate",
      "recordedScoreOf",
      "scoreOf",
      "verdictFor",
    ]);
  });

  it("[SCN-RAT-014] hands its recorder's up-only refusal over as a type, catchable by a caller holding nothing but this barrel", () => {
    // THE IMPORT AT THE TOP OF THIS FILE IS HALF THE ASSERTION, AND IT GOES THE LONG WAY ROUND ON
    // PURPOSE. `raisedRecordText` and `FallRefusedError` arrive here through the BARREL rather than
    // through `./ratchet.js`, which is how every other arm over this type reaches it. That
    // module-direct route is exactly what kept this gap invisible: 673 lines of examples about this
    // refusal, all of them green, while the name it is caught by was reachable from inside the
    // directory and from nowhere else. Reading it back off the barrel's own key list would not close
    // that either — a list is satisfied by a name, and what a caller needs is the constructor behind
    // it, live, with a real refusal to hold against it. The route was `spec-controller/mutation-ratchet`
    // until 3F-2859 stopped publishing that subpath; the barrel is the surface a caller holds now,
    // and it is the same object either way.
    const bankedBack: MutationMeasurement = {
      gate: OTHER_PROJECT.gate,
      detected: BANKED.detected,
      total: BANKED.total,
    };

    let raised: unknown;
    try {
      raisedRecordText(
        recordText(BANKED.detected, BANKED.total, BANKED.slack),
        OTHER_PROJECT.gate,
        bankedBack,
        OTHER_PROJECT.recordFile,
      );
    } catch (error) {
      raised = error;
    }

    // Caught by the type and then READ, because that is the whole difference a name buys. A consumer
    // matching the message string can tell that something refused; only the type hands back which
    // record and which gate refused, in fields it did not have to parse a sentence to reach.
    expect(raised).toBeInstanceOf(FallRefusedError);
    const refusal = raised instanceof FallRefusedError ? raised : null;
    expect([refusal?.recordFile, refusal?.gate]).toEqual([OTHER_PROJECT.recordFile, OTHER_PROJECT.gate]);
  });

  it("[SCN-RAT-014] carries the seven types across under the names a consumer's own namespace can hold", () => {
    // Compile-time, and this is the assertion: each name below resolves through the barrel, so a
    // type dropped from it — or renamed on the way across — reds `typecheck` rather than silently
    // narrowing what a consumer can spell.
    const allowance: MutationGateAllowance = { mutants: BANKED.slack, reason: "measured variance" };
    const record: MutationGateRecord = { gate: OTHER_PROJECT.gate, detected: 812, total: 900, allowance };
    const measurement: MutationMeasurement = { gate: OTHER_PROJECT.gate, detected: 812, total: 900 };
    const read: MutationReportRead = { ok: true, measurement };
    const kind: MutationVerdictKind = "at-baseline";
    const verdict: MutationVerdict = { kind, ok: true, message: "" };
    const request: RatchetRequest = requestOver("/nowhere");

    expect([record.gate, measurement.gate, read.ok, verdict.kind, request.gate]).toEqual([
      OTHER_PROJECT.gate,
      OTHER_PROJECT.gate,
      true,
      "at-baseline",
      OTHER_PROJECT.gate,
    ]);
  });
});
