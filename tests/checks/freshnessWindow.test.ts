/**
 * @unit for @SCN-PLC-003 — features/measurement-placement.feature.
 *
 * THIS ONE READS TEXT AND ITS SIBLINGS RUN THE PLACEMENT, which is a difference in the CLAIM and
 * not a relaxation. @SCN-PLC-001 and @SCN-PLC-002 lift a placement step out of the workflow and
 * execute it, because what a placement DOES at the boundary cannot be read off its configuration.
 * This scenario's claim is not about what any placement does: it is that there is ONE window,
 * written once, and that every placement reaches that one writing. Three arrangements that happen
 * to agree is precisely the state a behavioural pair cannot tell apart from one rule applied three
 * times — so the writing is what is read.
 *
 * THE POPULATION IS DERIVED FROM THE PIPELINE AND NEVER LISTED HERE. A list of placements typed
 * into this file would be a fourth writing of the fact the scenario is about, and it would keep
 * passing on the day a fourth placement was added without a window: a list naming two things finds
 * both of them however many there are. So `.github/workflows/` is read, and the population is
 * whatever it states.
 *
 * TWO DERIVATIONS OVERLAP, BECAUSE EACH IS BLIND WHERE THE OTHER LOOKS.
 *
 *   - A step PLACES A MEASUREMENT when it mentions the evidence root and names a file the
 *     product's own reader reads a placed measurement back from (`SWEEP_RECORD_PATH`,
 *     `timingsRecordPath`). That catches a placement however it writes — `cp`, a redirect, a tool.
 *   - A step COPIES INTO THE EVIDENCE ROOT when it runs `cp`/`mv`/`install` with the root as its
 *     destination. That catches a placement of something this arm has never heard of.
 *
 * Every copy into the root must then be either a placement of a measurement, which owes the window,
 * or a placement of the one thing the product itself names as NOT a measurement
 * (`RECORDED_SWEEP_PATH` — a per-mutant record, deliberately under no window, because age makes
 * that comparison stricter rather than staler). A fourth placement of anything else fails here,
 * which is what the derivation is for.
 *
 * THE RESIDUAL, NAMED: a step placing a measurement under a filename no reader reads, written by
 * something that is not a copy, is outside both derivations. Nothing downstream could read it
 * either, so it would not settle a row — but it would not be caught here.
 *
 * A WINDOW VALUE IS READ AS CODE, NEVER AS PROSE. Comments are stripped before any of these
 * assertions run. Narration about a window — including narration that has gone stale — is a
 * different defect with a different owner; what this arm is about is where the rule is WRITTEN.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import {
  RECORDED_SWEEP_PATH,
  SWEEP_RECORD_PATH,
  timingsRecordPath,
} from "./measurementArtefact.js";

const repoRoot = process.cwd();

/** The one writing of the window, and the subject of this whole file. */
const SHARED_RULE = path.posix.join("scripts", "freshness-window.sh");

/** Every workflow this repository runs — the placements are found in them, not listed here. */
const WORKFLOWS = path.join(repoRoot, ".github", "workflows");

/** Seconds in an hour: the unit the shared rule's own sentence says its number is stated in. */
const SECONDS_PER_HOUR = 60 * 60;

interface Placement {
  /** Which workflow and which step, for a failure that says where to look. */
  readonly where: string;
  /** The step's script with its comments stripped — what the runner would execute. */
  readonly code: string;
}

/** A script's executable half. Whole-line comments only: `${NAME#prefix}` is an expansion. */
function codeOf(script: string): string {
  return script
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
}

/** A TypeScript source's executable half. */
function tsCodeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * A shell script with every expansion collapsed to a wildcard.
 *
 * `cp "${staged}" "${ROOT}/${record}"` says nothing about what is placed; `record="timings-${scn}-
 * measurements.json"` says everything. Collapsing lets one shape match both the literal filename
 * the sweep places and the per-row one a timing places, without this file re-deriving either.
 */
function collapseExpansions(script: string): string {
  return script.replace(/\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*/g, "*");
}

/** Whether a collapsed script names a file of this shape, as a whole path segment. */
function names(collapsed: string, shape: string): boolean {
  const pattern = shape.replace(/[.]/g, "\\.").replace(/\*/g, "[^\\s\"'/]*");
  return new RegExp(`(^|[\\s"'/=(])${pattern}`).test(collapsed);
}

/** Every `run:` step of every workflow, as the code a runner would execute. */
function everyRunStep(): Placement[] {
  const steps: Placement[] = [];
  for (const file of readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f))) {
    const workflow = parse(readFileSync(path.join(WORKFLOWS, file), "utf8")) as {
      jobs?: Record<string, { steps?: readonly { name?: string; run?: unknown }[] }>;
    };
    for (const [job, body] of Object.entries(workflow.jobs ?? {}))
      for (const step of body.steps ?? [])
        if (typeof step.run === "string")
          steps.push({ where: `${file} → ${job} → "${step.name ?? "(unnamed)"}"`, code: codeOf(step.run) });
  }
  return steps;
}

const EVIDENCE_ROOT = /SPEC_CONTROLLER_EVIDENCE_DIR/;

/** A measurement the product reads back from the evidence root, by the name it reads it under. */
const PLACED_MEASUREMENT_SHAPES = [SWEEP_RECORD_PATH, timingsRecordPath("*")];

function placesAMeasurement(step: Placement): boolean {
  const collapsed = collapseExpansions(step.code);
  return EVIDENCE_ROOT.test(step.code) && PLACED_MEASUREMENT_SHAPES.some((s) => names(collapsed, s));
}

function copiesIntoTheEvidenceRoot(step: Placement): boolean {
  return /\b(?:cp|mv|install|rsync)\b[^\n]*\$\{?SPEC_CONTROLLER_EVIDENCE_DIR\}?\//.test(step.code);
}

function placesTheRecord(step: Placement): boolean {
  return names(collapseExpansions(step.code), RECORDED_SWEEP_PATH);
}

/**
 * A window value written HERE — the thing that must exist in exactly one place.
 *
 * Two spellings, because a second writing can wear either. A name shaped like a window
 * (`MAX_AGE`, `WINDOW_SECONDS`) catches one assembled out of small numbers; a literal of four
 * digits or more catches one typed as seconds under any name at all. A READ of the shared value —
 * `${MAX_AGE}` in a placement's own sentence — is neither, and is not a second writing.
 */
function windowValuesIn(code: string): string[] {
  const written: string[] = [];
  for (const [, name] of code.matchAll(/^[^\S\n]*(?:export\s+|const\s+|let\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm))
    if (/(^|_)(MAX|AGE|WINDOW|FRESHNESS|STALE|EXPIRY|CUTOFF|TTL)(_|$)/i.test(name!))
      written.push(`${name}= — a window-shaped name assigned here`);
  for (const [seconds] of code.matchAll(/\b\d{4,}\b/g))
    written.push(`${seconds} — a seconds-scale literal`);
  return written;
}

/** A numeric comparison — what an age is weighed against a window by. */
function ageComparisonsIn(code: string): string[] {
  return [...code.matchAll(/\s-(?:gt|lt|ge|le)\b/g)].map((m) => m[0].trim());
}

/**
 * A reading of NOW — the other half of an age, and the reason a reader is asked for it too.
 *
 * `date -u -d "<iso>" +%s` parses a moment somebody handed over and is transport; `date -u +%s`
 * with no date to parse is this machine's clock, which only the one rule has any business reading.
 */
function clockReadsIn(code: string): string[] {
  const shell = [...code.matchAll(/\bdate\b[^\n|;&)]*\+%s/g)]
    .map((m) => m[0].trim())
    .filter((call) => !/\s--?d(?:ate)?\b/.test(call));
  const typescript = [...code.matchAll(/\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bhrtime\b|\bperformance\s*\.\s*now\b/g)].map(
    (m) => m[0],
  );
  return [...shell, ...typescript];
}

const sharedRuleSource = readFileSync(path.join(repoRoot, SHARED_RULE), "utf8");
const sharedRuleCode = codeOf(sharedRuleSource);

const runSteps = everyRunStep();
const placements = runSteps.filter(placesAMeasurement);
const copiesIn = runSteps.filter(copiesIntoTheEvidenceRoot);

describe("[SCN-PLC-003] the sweep and both suite timings are placed by one rule under one window", () => {
  it("finds the placements in the pipeline, and every copy into the evidence root is accounted for", () => {
    // THE INSTRUMENT MUST HAVE FOUND SOMETHING BEFORE ITS SILENCE MEANS ANYTHING. A derivation
    // that matched nothing would pass every assertion below while asserting over an empty set.
    expect(runSteps.length, "no workflow in .github/workflows states a run: step at all").toBeGreaterThan(0);
    expect(
      copiesIn.length,
      "no step of any workflow copies anything into the evidence root — the derivation matched nothing, so nothing below is being asserted",
    ).toBeGreaterThan(0);

    // AND IT MUST HAVE FOUND BOTH KINDS. The product names two shapes of placed measurement; a
    // derivation reaching only one would hold half the corpus to a rule and leave half unread.
    for (const shape of PLACED_MEASUREMENT_SHAPES)
      expect(
        placements.some((p) => names(collapseExpansions(p.code), shape)),
        `no step of any workflow places "${shape}", which is a measurement the product reads back from the evidence root`,
      ).toBe(true);

    // THE PARTITION, AND THE WHOLE REASON THE POPULATION IS DERIVED. Anything copied into the
    // evidence root either carries a measurement — and owes the window — or is the one artefact
    // the product itself names as not a measurement.
    const unaccounted = copiesIn
      .filter((step) => !placesAMeasurement(step) && !placesTheRecord(step))
      .map((step) => step.where);
    expect(
      unaccounted,
      `these steps copy into the evidence root and place neither a measurement this arm can weigh nor the ${RECORDED_SWEEP_PATH} the product names as not a measurement`,
    ).toEqual([]);
  });

  it("has every placement ask the one shared rule, rather than agreeing with it", () => {
    // The function's name is read off the rule that defines it: spelled again here, this file
    // would be one more copy of the fact it is asserting is uncopied.
    const asks = [...sharedRuleCode.matchAll(/^\s*([a-z_][a-z0-9_]*)\s*\(\)\s*\{/gm)].map((m) => m[1]!);
    expect(asks, `${SHARED_RULE} defines no function for a placement to call`).not.toEqual([]);

    for (const placement of placements) {
      expect(
        new RegExp(`(^|\\s)(\\.|source)\\s+${SHARED_RULE}(\\s|$)`, "m").test(placement.code),
        `${placement.where} places a measurement without sourcing ${SHARED_RULE}`,
      ).toBe(true);
      for (const ask of asks)
        expect(
          new RegExp(`\\b${ask}\\b`).test(placement.code),
          `${placement.where} sources ${SHARED_RULE} and never calls its ${ask}`,
        ).toBe(true);
    }
  });

  it("leaves no placement holding a window, a comparison or a clock of its own", () => {
    for (const placement of placements) {
      expect(
        windowValuesIn(placement.code),
        `${placement.where} writes a window of its own; the window is written once, in ${SHARED_RULE}`,
      ).toEqual([]);
      expect(
        ageComparisonsIn(placement.code),
        `${placement.where} weighs a number itself; the age-versus-window comparison is ${SHARED_RULE}'s alone`,
      ).toEqual([]);
      expect(
        clockReadsIn(placement.code),
        `${placement.where} reads this machine's clock; an age is computed once, where the window is`,
      ).toEqual([]);
    }
  });

  it("writes the window in exactly one place across the pipeline and its scripts", () => {
    const sites = new Map<string, string[]>();
    for (const step of runSteps) {
      const written = windowValuesIn(step.code);
      if (written.length > 0) sites.set(step.where, written);
    }
    const scripts = path.join(repoRoot, "scripts");
    for (const file of readdirSync(scripts).filter((f) => f.endsWith(".sh"))) {
      const written = windowValuesIn(codeOf(readFileSync(path.join(scripts, file), "utf8")));
      if (written.length > 0) sites.set(path.posix.join("scripts", file), written);
    }

    const each = [...sites].map(([where, written]) => where + " [" + written.join("; ") + "]").join(" | ");
    expect([...sites.keys()], `a window value is written in more than one place: ${each}`).toEqual([SHARED_RULE]);
  });

  it("states the window as a cadence and a margin, and holds the number that derivation produces", () => {
    // THE VALUE IS READ THE WAY A PLACEMENT READS IT — sourced, not scraped. A regex over the file
    // would be this arm's own reading of what the placements get, free to differ from it.
    const sourced = spawnSync("bash", ["-c", `. ${SHARED_RULE} && printf '%s' "\${MAX_AGE}"`], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(sourced.status, `sourcing ${SHARED_RULE} failed: ${sourced.stderr}`).toBe(0);
    const window = Number(sourced.stdout);
    expect(Number.isInteger(window) && window > 0, `${SHARED_RULE} sources no window at all`).toBe(true);

    expect(
      [...sharedRuleCode.matchAll(/^\s*MAX_AGE=/gm)].length,
      `${SHARED_RULE} assigns the window more than once`,
    ).toBe(1);

    // THE DERIVATION IS READ OUT OF THE FILE'S OWN SENTENCE, so nothing is typed twice: the arm
    // asks whether the two halves of one file agree, not whether either matches a number here.
    // Whitespace is normalised first — the sentence is wrapped, and a phrase straddling a line
    // break would read as a sentence nobody wrote.
    const derivation = sharedRuleSource
      .split("\n")
      .filter((line) => /^\s*#/.test(line))
      .map((line) => line.replace(/^\s*#\s?/, ""))
      .join(" ")
      .replace(/\s+/g, " ");
    const stated = /(\d+)\s*h\s*=\s*a\s*(\d+)\s*h(?:our)?s?\s*cadence\s*\+\s*(\d+)\s*h(?:our)?s?\s*(?:of\s*)?margin/i.exec(
      derivation,
    );
    expect(
      stated,
      `${SHARED_RULE} states its window as a bare number: no sentence there derives it from a cadence and a margin`,
    ).not.toBeNull();

    const [, total, cadence, margin] = stated!.map(Number);
    expect(total, `${SHARED_RULE} says ${total}h but a ${cadence}h cadence and ${margin}h of margin make ${cadence! + margin!}h`).toBe(
      cadence! + margin!,
    );
    expect(
      window,
      `${SHARED_RULE} holds ${window}s, which is not the ${total}h its own derivation states`,
    ).toBe(total! * SECONDS_PER_HOUR);
  });

  it("leaves no measured row's reader holding a window or a clock", () => {
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
      specController: { fitnessChecks: readonly { scn: string; command: string; atMost?: number; atLeast?: number }[] };
    };

    const readers = new Map<string, string[]>();
    for (const row of manifest.specController.fitnessChecks) {
      if (row.atMost === undefined && row.atLeast === undefined) continue;
      const invoked = /\bpnpm\s+(?:--silent\s+)?([A-Za-z0-9:_-]+)/.exec(row.command);
      const script = invoked === null ? undefined : manifest.scripts[invoked[1]!];
      expect(script, `${row.scn} states the command "${row.command}", which names no package.json script`).toBeDefined();
      const sources = [...script!.matchAll(/([\w./-]+\.ts)\b/g)].map((m) => m[1]!);
      expect(sources, `${row.scn}'s command runs no TypeScript source this arm can read`).not.toEqual([]);
      for (const source of sources) readers.set(source, [...(readers.get(source) ?? []), row.scn]);
    }
    expect([...readers.keys()], "the manifest states no measured row with a reader to read").not.toEqual([]);

    for (const [source, rows] of readers) {
      const code = tsCodeOf(readFileSync(path.join(repoRoot, source), "utf8"));
      expect(
        windowValuesIn(code),
        `${source} answers ${rows.join(", ")} and holds a window; freshness is decided where a measurement crosses, not where it is read`,
      ).toEqual([]);
      expect(
        clockReadsIn(code),
        `${source} answers ${rows.join(", ")} and reads a clock; a row carries no clock and neither does its reader`,
      ).toEqual([]);
    }
  });
});
