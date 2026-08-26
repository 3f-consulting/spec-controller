/**
 * Unit pin for the recorder — a measurement written into a gate's block as a text edit, with the
 * reasoning around it surviving the write (@SCN-RAT-011, 3F-2801), refused outright when it is not
 * a raise (@SCN-RAT-012, 3F-2802), and kept inside the block it names when a sibling gate banks the
 * very same counts (@SCN-RAT-013, 3F-2803).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN id
 * matching features/mutation-ratchet.feature, so a grep of either returns both halves of its pair —
 * this arm and the step block in tests/steps/mutationRatchet.steps.ts.
 *
 * THE ASSERTION IS A BYTE COMPARISON, NOT AN INSPECTION, AND THAT DISTINCTION IS THE WHOLE POINT OF
 * THIS FILE. A test that parsed the raised record and found two new numbers in it would pass
 * against a recorder that had re-serialised the document and deleted every comment on the way —
 * which is precisely the failure this Rule exists to make impossible, because a record file is
 * mostly the argument for where its bars sit. So the two figure lines are struck out of the before
 * and the after by their exact bytes, and what is left of each is compared whole.
 *
 * AND THE FIXTURE IS AWKWARD ON PURPOSE. Comments above the gates and inside their blocks, a blank
 * line in every block, two different quoting styles, extra spaces around two of the four colons,
 * policy below the section that is none of the ratchet's business, and a trailing newline. Every
 * one of those is a byte a document model normalises away or drops, so a fixture without them is a
 * fixture a re-dump could reproduce — and a comparison against it would be green on the one
 * implementation this example exists to red.
 *
 * THE SIBLING IS BANKED FIRST, ALSO ON PURPOSE. A rewriter that took the first `detected` line it
 * met would raise "state-model" and report success on "domain", so the gate this example asks about
 * is the second one in the file rather than the first.
 *
 * WHAT THE @integration ARM ADDS INSTEAD. This one hands the recorder a string composed here. That
 * arm writes an authored record onto a real tree, raises it through the file-handling half, and
 * reads the bytes back off disk — the encoding, and the record resolved against the root its caller
 * named rather than wherever the process happened to start.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

import { MalformedRecordError, parseGateRecords, scoreOf } from "./record.js";
import * as recorder from "./ratchet.js";
import { FallRefusedError, raisedRecordText } from "./ratchet.js";

/** The name the fixture record is filed under — this file's own, never a name the module knows. */
const RECORD_FILE = "our-own-quality-bars.yml";

/** The gate this example raises, and the sibling banked above it. */
const RAISED_GATE = "domain";
const SIBLING_GATE = "state-model";

/**
 * A record as a project authors one, with every byte a document model would normalise away.
 *
 * Written line by line rather than as one literal so that the awkwardness is visible and deliberate:
 * the three-space gap after `detected` on the sibling and the two-space gap after `total` on the
 * raised gate are the fixture's, not a typo, and the raised record is required to keep both.
 */
const RECORD_TEXT = [
  "# Our own quality bars. The counts below are ours, and so are the gate names.",
  "#",
  "# THE RECORD IS A PAIR OF COUNTS, NEVER A BARE SCORE — a lost kill and a grown mutant",
  "# population are different events, and one number cannot separate them.",
  "",
  "mutation-gates:",
  "",
  "  # The cheap scope, quarantined from the expensive one so a slow sweep over the domain",
  "  # cannot hold this bar hostage.",
  `  ${SIBLING_GATE}:`,
  "    detected:   202",
  "    total: 254",
  "",
  "    # Nothing to absorb: this gate is deterministic and has never timed a mutant out.",
  "    slack-mutants: 0",
  '    slack-reason: ""',
  "",
  "  # The expensive scope. The bar sits where the last green sweep left it, and the argument",
  "  # for that position is this comment — which is the thing a re-dump eats.",
  `  ${RAISED_GATE}:`,
  "    detected: 2175",
  "    total:  2243",
  "",
  "    # The allowance, and the standard the reason below is judged against: it names a source",
  "    # of run-to-run variance this gate's own measurement exhibits, or it is head-room.",
  "    slack-mutants: 1",
  "    slack-reason: 'one mutant here is detected by timeout, and a timeout can flip to Survived",
  "      on a slower runner with no change to the suite'",
  "",
  "# Below here is the rest of this project's policy, and none of it is the ratchet's business.",
  "some-other-section:",
  "  detected: 1",
  "  total: 1",
  "",
].join("\n");

/** The run the raised gate is raised to. */
const MEASURED = { gate: RAISED_GATE, detected: 2200, total: 2250 } as const;

/**
 * The two lines that may move, before and after, byte for byte.
 *
 * SPELLED OUT RATHER THAN BUILT FROM THE COUNTS, because the spacing is half of what is being
 * asserted. A recorder that emitted `total: 2250` where the record said `total:  2243` has
 * normalised the file, and these constants are what notices.
 */
const FIGURE_LINES_BEFORE = ["    detected: 2175", "    total:  2243"] as const;
const FIGURE_LINES_AFTER = ["    detected: 2200", "    total:  2250"] as const;

/**
 * A record whose raised gate holds no `total` line, with a LATER gate that does.
 *
 * THE LATER GATE IS THE TRAP. A rewriter that searched past the end of the named gate's block would
 * find a `total` line, rewrite it, and hand back a record in which some other gate had quietly been
 * given this gate's population.
 */
const HALF_FINISHED_RECORD = [
  "mutation-gates:",
  "",
  "  # Written by hand, and left half-finished.",
  `  ${RAISED_GATE}:`,
  "    detected: 2175",
  "    slack-mutants: 0",
  "",
  "  # Complete — and the block a rewriter running past the block above would reach.",
  `  ${SIBLING_GATE}:`,
  "    detected: 202",
  "    total: 254",
  "    slack-mutants: 0",
  "",
].join("\n");

/**
 * The record with the two figure lines struck out, so that what is left is everything else.
 *
 * FAILING BY NAME WHEN A LINE IS NOT THERE. If the raised record does not hold the exact bytes
 * expected of it, the strike-out cannot happen, and saying which line was not found is the
 * difference between a diagnosable red and a wall of text.
 */
function withoutTheFigureLines(text: string, figureLines: readonly string[]): string {
  const lines = text.split("\n");
  const struck = figureLines.map((line) => {
    const at = lines.indexOf(line);
    expect(at, `the record holds no line reading exactly "${line}".`).not.toBe(-1);
    return at;
  });

  return lines.filter((_, at) => !struck.includes(at)).join("\n");
}

/** Every index at which two texts' lines differ, counted over the longer of the two. */
function movedLines(before: string, after: string): number[] {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const moved: number[] = [];
  for (let at = 0; at < Math.max(beforeLines.length, afterLines.length); at += 1) {
    if (beforeLines[at] !== afterLines[at]) moved.push(at);
  }
  return moved;
}

/** The counts a record states for one gate, read back through the loader. */
function bankedIn(text: string, gate: string): { detected: number; total: number } {
  const record = parseGateRecords(text, RECORD_FILE).get(gate);
  expect(record, `the raised record states no gate "${gate}".`).toBeDefined();
  return { detected: record?.detected ?? -1, total: record?.total ?? -1 };
}

describe("[SCN-RAT-011] raisedRecordText", () => {
  it("[SCN-RAT-011] is driven by a record carrying comments, blank lines, mixed quoting, uneven spacing and a trailing newline — the bytes a re-dump would not reproduce", () => {
    expect(RECORD_TEXT).toMatch(/^# Our own quality bars/);
    expect(RECORD_TEXT.endsWith("\n")).toBe(true);
    expect(RECORD_TEXT.split("\n").filter((line) => line.trim().startsWith("#")).length).toBe(12);
    expect(RECORD_TEXT.split("\n").filter((line) => line === "").length).toBe(7);
    expect(RECORD_TEXT).toContain("slack-reason: \"\"");
    expect(RECORD_TEXT).toContain("slack-reason: 'one mutant here");

    // The sibling is banked FIRST, so a rewriter taking the first `detected` line it meets raises
    // the wrong gate rather than agreeing with this example by coincidence.
    expect(RECORD_TEXT.indexOf(`  ${SIBLING_GATE}:`)).toBeLessThan(
      RECORD_TEXT.indexOf(`  ${RAISED_GATE}:`),
    );
    for (const line of FIGURE_LINES_BEFORE) {
      expect(RECORD_TEXT.split("\n").filter((held) => held === line)).toHaveLength(1);
    }
  });

  it("[SCN-RAT-011] banks the named gate's two figures at the measurement", () => {
    const raised = raisedRecordText(RECORD_TEXT, RAISED_GATE, MEASURED, RECORD_FILE);

    expect(bankedIn(raised, RAISED_GATE)).toEqual({
      detected: MEASURED.detected,
      total: MEASURED.total,
    });
  });

  it("[SCN-RAT-011] moves exactly two lines, and what is left of the record either side of them is byte-identical", () => {
    const raised = raisedRecordText(RECORD_TEXT, RAISED_GATE, MEASURED, RECORD_FILE);

    expect(movedLines(RECORD_TEXT, raised)).toHaveLength(2);

    // The comparison this whole example exists for: the two figure lines struck out of each text by
    // their exact bytes, and the entire remainder — every comment, blank line, indent, quote,
    // section below the gates, and the trailing newline — compared whole.
    expect(withoutTheFigureLines(raised, FIGURE_LINES_AFTER)).toBe(
      withoutTheFigureLines(RECORD_TEXT, FIGURE_LINES_BEFORE),
    );
  });

  it("[SCN-RAT-011] leaves the sibling banked above it at the figures it was banked at, its own reasoning still above it", () => {
    const raised = raisedRecordText(RECORD_TEXT, RAISED_GATE, MEASURED, RECORD_FILE);

    expect(bankedIn(raised, SIBLING_GATE)).toEqual({ detected: 202, total: 254 });
    expect(raised).toContain("cannot hold this bar hostage.");
    expect(raised).toContain("    detected:   202");
  });

  it("[SCN-RAT-011] refuses a gate whose block holds no line to rewrite, naming the line — rather than rewriting a later gate's", () => {
    // The fixture assertion that gives the refusal its teeth: there IS a `total` line further down,
    // so a rewriter unbounded by the block's end has something to find.
    expect(HALF_FINISHED_RECORD).toContain("    total: 254");
    expect(HALF_FINISHED_RECORD.indexOf(`  ${RAISED_GATE}:`)).toBeLessThan(
      HALF_FINISHED_RECORD.indexOf("    total: 254"),
    );

    const refused = (): string =>
      raisedRecordText(HALF_FINISHED_RECORD, RAISED_GATE, MEASURED, RECORD_FILE);

    expect(refused).toThrow(MalformedRecordError);
    try {
      refused();
    } catch (error) {
      const refusal = error as MalformedRecordError;
      expect(refusal.field).toBe("total");
      expect(refusal.key).toBe(RAISED_GATE);
      expect(refusal.recordFile).toBe(RECORD_FILE);
      expect(refusal.message).toContain("total");
    }
  });
});

/**
 * THE UP-ONLY REFUSAL (@SCN-RAT-012, 3F-2802) — and the ABSENCE of any way past it.
 *
 * A REFUSAL TEST PASSES AGAINST A RECORDER THAT REFUSES EVERYTHING, which is why the last arm below
 * offers a run that genuinely measured better and asserts it is still written. A recorder wired to
 * throw on every call satisfies every other assertion in this block, and reds that one — and reds
 * @SCN-RAT-011's four arms with it.
 *
 * AND AN ACCEPTANCE THAT ONLY WATCHED THE REFUSAL FIRE WOULD BE GREEN AGAINST A BUILD THAT HAD
 * QUIETLY GROWN A WAY PAST IT. So the absence is asserted over the module's own bytes rather than
 * intended: every non-test source file beside this one is read, its commentary struck out, and what
 * is left is required to hold none of the wordings an override arrives under. The list of files
 * read is exhaustive, so a new source file added to this module reds until somebody has looked at
 * it — which is what would happen the day a command surface grows a flag here. Three probes, not
 * one: the arity, so a fifth input cannot be added silently; the behaviour, so a fifth input handed
 * over anyway changes no answer; and the bytes, which is the only one of the three that catches a
 * defaulted parameter, a settings block, or a value read out of the environment.
 *
 * THE SCAN IS PROVED TO HAVE HAPPENED BEFORE IT IS BELIEVED. A file read from the wrong path, or
 * one whose commentary swallowed the whole text, is an absence that reads exactly like a clean
 * scan; so the arm that reads them asserts the file list, a floor on each file's remaining bytes,
 * a phrase that must survive the strike-out and a phrase that must not.
 */

/** The pair the fixture record banks for the raised gate, spelled here rather than read back. */
const BANKED = { detected: 2175, total: 2243 } as const;

/**
 * The Examples table's three runs, each one banked by a comparison written wrong a different way.
 *
 * THE SECOND AND THIRD ARE THE ROWS THAT DO THE WORK. The first is refused by any comparison at
 * all. The second is the record's own two figures offered back — banked by a recorder written on
 * `<`, whose write is a no-op that would read, in a shell history or a run's own log, as a ratchet
 * that happened. The third moves both counts and holds the ratio exactly — banked by a recorder
 * written on the PAIR, whose write raises nothing over a record already stating that score.
 */
const NOT_A_RAISE = [
  { detected: 2100, total: 2243, separates: "measured worse — refused by any comparison at all" },
  { detected: 2175, total: 2243, separates: "the record's own two figures, offered back" },
  { detected: 4350, total: 4486, separates: "both counts moved and the ratio held" },
] as const;

/**
 * The exact figure as a message states it — not a longer number, and not a negated one.
 *
 * The lookbehind is @SCN-RAT-004's measured guard, carried here for the same reason: a plain
 * substring check is satisfied by the wrong answer.
 */
function figure(value: number): string {
  return `(?<![\\d.-])${value}(?!\\d)`;
}

/** A count pair, both halves whole, carrying the score its own counts imply. */
function countPairScored(detected: number, total: number): RegExp {
  const score = scoreOf(detected, total).toFixed(4).replace(".", "\\.");
  return new RegExp(`${figure(detected)}/${figure(total)} \\(${score}%\\)`);
}

/** Where this file sits, and therefore where the module it is pinning sits. */
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * The wordings an escape hatch arrives under — the words somebody reaching for one would type.
 *
 * MATCHED OVER CODE RATHER THAN PROSE, because this module argues about exactly these ideas at
 * length in its commentary and would red on its own reasoning otherwise. The strike-out is what
 * makes the ban a statement about what the recorder TAKES rather than about what it says.
 */
const AN_OVERRIDE =
  /\b(forc|allow[-_]?lower|allow[-_]?fall|lower[-_]?anyway|overrid|unsafe|anyway|downgrade|bypass|ignore|skip)/i;

/**
 * The wordings above, each with a sample of the escape hatch it was drawn from.
 *
 * WIDENED TWICE OVER, BOTH TIMES ON A PLANT THAT GOT THROUGH (@SCN-RAT-015, 3F-2805) — which is
 * what the exhaustive file list above is FOR: a command surface arrived, and the day it did, the
 * wordings an override could take changed under this pattern's feet.
 *
 * THE HYPHENATED SPELLINGS ARE THE FIRST. Until this module had a command, every name an override
 * could take was an identifier, and identifiers here are camelCase — so `allowLower` was the whole
 * of it. A flag is spelled in kebab-case, and `--allow-lower` is the exact wording the scenario
 * above forbids by name; read against the camelCase list alone it sailed straight through.
 *
 * AND THE TRAILING WORD BOUNDARY IS THE SECOND, which is the wider of the two. `forceLower` and
 * `overrideTheRatchet` are both an escape hatch wearing a longer name, and both ended one word-part
 * short of a boundary — so the roots are matched as PREFIXES now, and a hatch cannot hide by having
 * something appended to it. The samples below are the plants themselves, kept so the next widening
 * has evidence rather than a hunch.
 */
const AN_OVERRIDE_ARRIVES_AS: readonly string[] = [
  'const forced = argv.includes("--force");',
  'banking: argv.includes("--allow-lower"),',
  'forceLower: argv.includes("--force-lower"),',
  'const fall = argv.includes("--allowFall");',
  "if (settings.overrideTheRatchet) return raised;",
  'lowerAnyway: process.env["BANK_IT_UNSAFE"] === "1",',
  "// downgrade, bypass, ignore, skip",
];

/** Every source file of the recorder's own module, with its commentary struck out. */
function moduleSources(): { file: string; code: string }[] {
  return readdirSync(MODULE_DIR)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .sort()
    .map((file) => ({
      file,
      code: readFileSync(join(MODULE_DIR, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/.*$/gm, " "),
    }));
}

/** The refusal a call raised, or a failure naming what came back in its place. */
function refusalOf(offered: () => string): FallRefusedError {
  try {
    offered();
  } catch (error) {
    if (error instanceof FallRefusedError) return error;
    throw error;
  }
  throw new Error("the recorder handed back a raised record rather than refusing to bank it.");
}

describe("[SCN-RAT-012] raisedRecordText — the record only ratchets up", () => {
  it("[SCN-RAT-012] is driven by three runs that are each not a raise, two of which a comparison written wrong would bank", () => {
    for (const run of NOT_A_RAISE) {
      expect(scoreOf(run.detected, run.total), run.separates).toBeLessThanOrEqual(
        scoreOf(BANKED.detected, BANKED.total),
      );
    }

    // The second row IS the record's pair, so a comparison that only refuses a FALL banks it.
    expect({ detected: NOT_A_RAISE[1].detected, total: NOT_A_RAISE[1].total }).toEqual(BANKED);

    // The third row shares the record's score and neither of its figures, so a comparison written
    // on the two figures rather than on the score banks it.
    expect(NOT_A_RAISE[2].detected).not.toBe(BANKED.detected);
    expect(NOT_A_RAISE[2].total).not.toBe(BANKED.total);
    expect(scoreOf(NOT_A_RAISE[2].detected, NOT_A_RAISE[2].total)).toBe(
      scoreOf(BANKED.detected, BANKED.total),
    );
  });

  for (const run of NOT_A_RAISE) {
    const measurement = { gate: RAISED_GATE, detected: run.detected, total: run.total } as const;
    const offered = (): string =>
      raisedRecordText(RECORD_TEXT, RAISED_GATE, measurement, RECORD_FILE);

    describe(`[SCN-RAT-012] offered ${run.detected}/${run.total} — ${run.separates}`, () => {
      it("[SCN-RAT-012] refuses to bank it, handing back no raised record at all", () => {
        expect(offered).toThrow(FallRefusedError);
      });

      it("[SCN-RAT-012] names both count pairs, each carrying the score its own counts imply", () => {
        const { message } = refusalOf(offered);

        expect(message).toMatch(countPairScored(BANKED.detected, BANKED.total));
        expect(message).toMatch(countPairScored(run.detected, run.total));
      });

      it("[SCN-RAT-012] sends its reader to edit the record by hand, under the name its caller gave, with the reason in the commit", () => {
        const { message } = refusalOf(offered);

        expect(message).toContain(RECORD_FILE);
        expect(message).toContain("by hand");
        expect(message).toContain("reason in the commit");
      });

      it("[SCN-RAT-012] names no flag, so nothing in it reads as a door that opens", () => {
        // The same discipline @SCN-RAT-016's red carries from the other side: no `--` anywhere, so
        // an option this module invented cannot hide behind wording nobody happens to check for.
        const { message } = refusalOf(offered);

        expect(message).not.toMatch(/--/);
        expect(message).not.toMatch(AN_OVERRIDE);
      });

      it("[SCN-RAT-012] names the gate it was asked about and the record it read", () => {
        const refusal = refusalOf(offered);

        expect(refusal.gate).toBe(RAISED_GATE);
        expect(refusal.recordFile).toBe(RECORD_FILE);
        expect(refusal.message).toContain(RAISED_GATE);
      });

      it("[SCN-RAT-012] compares against the block it was asked about, not the sibling banked above it", () => {
        // The sibling is banked FIRST at 202 of 254 — a far lower score than any row here — so a
        // recorder reading the first `detected` line it met would find every one of these a raise
        // and write it.
        expect(scoreOf(202, 254)).toBeLessThan(scoreOf(run.detected, run.total));
        expect(RECORD_TEXT.indexOf(`  ${SIBLING_GATE}:`)).toBeLessThan(
          RECORD_TEXT.indexOf(`  ${RAISED_GATE}:`),
        );
        expect(offered).toThrow(FallRefusedError);
      });
    });
  }

  it("[SCN-RAT-012] is asserted over the recorder's own bytes, read back from the module beside this file", () => {
    const sources = moduleSources();

    // Exhaustive on purpose: a source file added to this module reds here until somebody has
    // looked at whether it grew a way past the refusal.
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

    // The strike-out is proved to have struck: a phrase that must survive it, and a phrase from
    // the commentary either side that must not. Without this pair an absence asserted over an
    // empty string reads exactly like an absence asserted over the file.
    const held = (file: string): string =>
      sources.find((source) => source.file === file)?.code ?? "";

    expect(held("ratchet.ts")).toContain("export function raisedRecordText");
    expect(held("ratchet.ts")).toContain("export function bankRaisedRecord");
    expect(held("ratchet.ts")).not.toContain("A SURGICAL TEXT EDIT, NEVER A RE-DUMP");
    expect(held("verdict.ts")).toContain("function scoreRoseFrom");
    expect(held("verdict.ts")).not.toContain("THE FLOOR IS STATED, NEVER CONSULTED");
    // The command is read like every other source here, and that is the whole point of the list
    // being exhaustive: a command surface is exactly where a way past the refusal would arrive, as a
    // flag, and it arrived (@SCN-RAT-015, 3F-2805) with none.
    expect(held("ratchetCli.ts")).toContain("function reconciliationOf");
    expect(held("ratchetCli.ts")).not.toContain("A REFUSAL TO BANK IS AN EXPECTED ENDING");
  });

  it("[SCN-RAT-012] takes nothing anywhere in the module that would write a fall", () => {
    // The teeth, proved before the absence is believed: every wording fires on the line it was
    // drawn from. An absence asserted by a pattern that matches nothing reads exactly like a clean
    // scan, which is the false green this arm exists to close.
    for (const arrival of AN_OVERRIDE_ARRIVES_AS) {
      expect(AN_OVERRIDE.test(arrival), `nothing in "${arrival}" reads as an escape hatch.`).toBe(true);
    }

    for (const { file, code } of moduleSources()) {
      expect(code, `${file} holds wording an escape hatch could arrive under.`).not.toMatch(
        AN_OVERRIDE,
      );
    }
  });

  it("[SCN-RAT-012] exports the recorder and its refusal, and nothing standing beside them", () => {
    expect(Object.keys(recorder).sort()).toEqual([
      "FallRefusedError",
      "bankRaisedRecord",
      "raisedRecordText",
    ]);
  });

  it("[SCN-RAT-012] takes four inputs, and a fifth handed over anyway changes no answer", () => {
    expect(raisedRecordText).toHaveLength(4);
    expect(recorder.bankRaisedRecord).toHaveLength(4);

    const measurement = { gate: RAISED_GATE, ...BANKED } as const;
    const handedAnyway: unknown[] = [true, 1, "force", { force: true }, ["force"]];
    for (const extra of handedAnyway) {
      const offered = (): string =>
        (raisedRecordText as unknown as (...args: unknown[]) => string)(
          RECORD_TEXT,
          RAISED_GATE,
          measurement,
          RECORD_FILE,
          extra,
        );

      expect(offered).toThrow(FallRefusedError);
    }
  });

  it("[SCN-RAT-012] leaves a run that genuinely measured better to be written — the refusal is the fall, never the write", () => {
    // The discriminator. A recorder wired to refuse EVERYTHING passes every assertion above it and
    // reds this one, along with all four of @SCN-RAT-011's arms.
    const raised = raisedRecordText(RECORD_TEXT, RAISED_GATE, MEASURED, RECORD_FILE);

    expect(bankedIn(raised, RAISED_GATE)).toEqual({
      detected: MEASURED.detected,
      total: MEASURED.total,
    });
    expect(scoreOf(MEASURED.detected, MEASURED.total)).toBeGreaterThan(
      scoreOf(BANKED.detected, BANKED.total),
    );
  });
});

/**
 * THE COLLIDING SIBLING (@SCN-RAT-013, 3F-2803) — the example that gives the block boundary teeth.
 *
 * EVERY OTHER EXAMPLE IN THIS FILE IS DRIVEN BY A RECORD WHOSE GATES HOLD DISTINCT FIGURES, AND
 * THAT IS EXACTLY WHAT LETS A WRONG RECORDER THROUGH. A rewriter that reached for the two figures
 * by their VALUES — striking the old numerals out wherever in the file they first appear — writes
 * precisely the right two lines over such a record, moves two lines and no others, keeps every
 * comment, and is indistinguishable from a correct one. It only ever writes the wrong gate when two
 * gates happen to bank the same counts, which a project's own record does rarely and by accident.
 * So the collision is planted here on purpose; nothing else in this Rule produces it.
 *
 * AND THE ORDERING IS EXERCISED BOTH WAYS ROUND, WHICH IS THE HALF AN EXAMPLE FORGETS. A colliding
 * record that only ever writes the raised gate ABOVE its twin is green against a rewriter that
 * takes the first line it meets, because the first line it meets is the right one. The same
 * collision is therefore authored twice — raised gate above its twin, and below it — and both are
 * required to reach the same answer.
 *
 * THE SIBLING IS READ AS BYTES AT ITS OWN LINE NUMBERS, NEVER BY LOOKING THE LINE UP. The two
 * blocks' figure lines are identical strings, so searching the raised record for
 * `    detected: 2175` finds whichever block comes first and proves nothing about the other — the
 * very confusion this example exists to catch, reproduced inside its own assertion. Positions are
 * taken from the record BEFORE the write and read back at the same positions after it.
 *
 * AND "STILL BANKS 2175 OF 2243" IS NOT ENOUGH ON ITS OWN, WHICH IS WHY THE BYTES COME FIRST. A
 * sibling block rewritten to the very numbers it already held reads back identically through the
 * loader; only the bytes say the lines were never touched at all.
 */

/** One gate's block of the colliding record — identical to its twin's but for the name and the note. */
function blockFor(gate: string): string[] {
  return [
    `  # The bar for ${gate}, and the argument for where this one sits.`,
    `  ${gate}:`,
    `    detected: ${BANKED.detected}`,
    `    total: ${BANKED.total}`,
    "",
    "    # Nothing to absorb here: this gate has never timed a mutant out.",
    "    slack-mutants: 0",
    '    slack-reason: ""',
    "",
  ];
}

/** A record whose two gates bank the very same two figures, written in one of the two orders. */
function collidingRecord(first: string, second: string): string {
  return [
    "# Two gates, the very same two figures. Gates collide like this rarely and by accident; this",
    "# record does it on purpose, because a record without a collision cannot tell a rewrite bounded",
    "# by the named gate's block from one that was merely lucky in how the file happened to be ordered.",
    "",
    "mutation-gates:",
    "",
    ...blockFor(first),
    ...blockFor(second),
    "# Below here is the rest of this project's policy, and none of it is the ratchet's business.",
    "some-other-section:",
    "  detected: 1",
    "  total: 1",
    "",
  ].join("\n");
}

/** The same collision authored twice — the gate to be raised above its twin, and below it. */
const ORDERINGS = [
  { where: "above", text: collidingRecord(RAISED_GATE, SIBLING_GATE) },
  { where: "below", text: collidingRecord(SIBLING_GATE, RAISED_GATE) },
] as const;

/**
 * Where a record writes one gate's two figure lines, found from that gate's own key line.
 *
 * BY POSITION, NEVER BY BYTES — see the block comment above. The figure lines of the two blocks are
 * the same string, so looking one up would find the wrong gate's half the time.
 */
function figureLinesAt(text: string, gate: string): number[] {
  const lines = text.split("\n");
  const key = lines.indexOf(`  ${gate}:`);
  expect(key, `the colliding record writes no block for "${gate}".`).not.toBe(-1);
  return [key + 1, key + 2];
}

/** The bytes a text holds at the given line numbers. */
function linesAt(text: string, at: readonly number[]): string[] {
  const lines = text.split("\n");
  return at.map((index) => lines[index] ?? "");
}

describe("[SCN-RAT-013] raisedRecordText — the write stays inside the named gate", () => {
  it("[SCN-RAT-013] is driven by a record whose two gates bank the very same counts, authored both ways round", () => {
    for (const { where, text } of ORDERINGS) {
      const held = text.split("\n");

      // The collision, stated: each figure line occurs TWICE, and the two blocks' pairs are the
      // same bytes. Without this the fixture could drift into two gates that merely look alike.
      expect(held.filter((line) => line === `    detected: ${BANKED.detected}`), where).toHaveLength(2);
      expect(held.filter((line) => line === `    total: ${BANKED.total}`), where).toHaveLength(2);
      expect(linesAt(text, figureLinesAt(text, RAISED_GATE)), where).toEqual(
        linesAt(text, figureLinesAt(text, SIBLING_GATE)),
      );
    }

    // The two orderings really are the two orderings — the assertion that makes reporting one
    // ordering's result as the pair's impossible.
    expect(ORDERINGS[0].text.indexOf(`  ${RAISED_GATE}:`)).toBeLessThan(
      ORDERINGS[0].text.indexOf(`  ${SIBLING_GATE}:`),
    );
    expect(ORDERINGS[1].text.indexOf(`  ${SIBLING_GATE}:`)).toBeLessThan(
      ORDERINGS[1].text.indexOf(`  ${RAISED_GATE}:`),
    );

    // And the run is a genuine raise over the pair BOTH gates hold, so "the sibling was left alone"
    // cannot pass because the write was refused before it began.
    expect(scoreOf(MEASURED.detected, MEASURED.total)).toBeGreaterThan(
      scoreOf(BANKED.detected, BANKED.total),
    );
  });

  for (const { where, text } of ORDERINGS) {
    const raised = (): string => raisedRecordText(text, RAISED_GATE, MEASURED, RECORD_FILE);

    describe(`[SCN-RAT-013] with the gate to be raised written ${where} its twin`, () => {
      it("[SCN-RAT-013] banks the named gate at the run's counts", () => {
        expect(bankedIn(raised(), RAISED_GATE)).toEqual({
          detected: MEASURED.detected,
          total: MEASURED.total,
        });
      });

      it("[SCN-RAT-013] leaves the sibling's two figure lines byte-identical, not rewritten to the figures they already held", () => {
        const at = figureLinesAt(text, SIBLING_GATE);

        expect(linesAt(raised(), at)).toEqual(linesAt(text, at));
        expect(bankedIn(raised(), SIBLING_GATE)).toEqual(BANKED);
      });

      it("[SCN-RAT-013] moves the named gate's own two lines and no line outside its block", () => {
        expect(movedLines(text, raised())).toEqual(figureLinesAt(text, RAISED_GATE));
      });
    });
  }
});
