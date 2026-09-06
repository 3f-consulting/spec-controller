/**
 * Unit arm for @SCN-MUT-014 — one gate name across the four artefacts that state it, and the report
 * the ratchet reads is the one the sweep writes (features/mutation-score.feature, 3F-2932).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `[SCN-MUT-014]` ids in the describe / it
 * strings below match the scenario's tag, so a grep of the id returns both halves of the pair.
 * `@unit`-only — Cucumber skips it; this Vitest arm IS the observed evidence.
 *
 * EVERY TERM IS READ OFF THE REAL ARTEFACT, WHICH IS THE WHOLE SCENARIO. A planted record beside a
 * planted manifest would show that two matching words match, which nothing ever doubted. What is in
 * doubt is whether THIS repository's four spellings are still one word, and the only way to ask
 * that is to open the four files each push ships.
 *
 * AND THE CHASE IS FOLLOWED RATHER THAN ASSUMED AT EACH HOP. The nightly's gate is not read out of
 * `package.json` because a script is written there — it is read by finding which script the NIGHTLY
 * runs, resolving that script's own command line, and taking the `--gate` off it. A test that
 * skipped to the manifest would stay green over a workflow that had stopped invoking the ratchet at
 * all, which is the drift with the longest fuse: nothing reds, and the gate simply stops running.
 *
 * NOTHING HERE IS ALLOWED TO PASS ON AN ABSENCE. Each reader below refuses what it cannot find, so
 * a missing record, a manifest that names no gate and a workflow that runs no ratchet each red as
 * themselves rather than as an empty comparison against an empty one.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  RECORD_FILE,
  gateRecordFor,
  parseGateRecords,
  type MutationGateRecord,
} from "../../packages/spec-controller/src/mutation-ratchet/index.js";

import { MUTATION_REPORT_PATH } from "./mutationScore.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The scenario whose bar this repository sources from its own record. */
const OWN_SCENARIO = "SCN-FIT-002";

/** The check that bar is authored against. */
const OWN_CHECK = "mutation";

/** The workflow that sweeps this repository's domain core, and ends on the ratchet's verdict. */
const NIGHTLY = ".github/workflows/mutation.yml";

/** The producer that stamps a gate onto the measurement it reads back out of the report. */
const PRODUCER = "tests/checks/mutationScoreCli.ts";

/** One of this repository's own files, read whole. */
function bytesOf(file: string): string {
  return readFileSync(path.join(repoRoot, file), "utf8");
}

/** The manifest, as the ledger's own edge reads it. */
const manifest = JSON.parse(bytesOf("package.json")) as {
  scripts?: Record<string, string>;
  specController?: { fitnessChecks?: readonly Record<string, unknown>[] };
};

/**
 * The CONFIGURED ROW this repository authors for its own mutation check, refused where it holds
 * none.
 *
 * READ OFF THE ROW RATHER THAN OFF `specController.thresholds` (3F-3152). @SCN-FIT-002 is a
 * CONVERTED fitness check, so everything it says about itself — its characteristic, its command
 * and its bar — is in one row keyed by its `@SCN`. Which key of the manifest holds the bar was
 * never this scenario's claim; that the manifest, the record, the nightly and the producer state
 * ONE gate name is.
 */
function ownRow(): Record<string, unknown> {
  const row = (manifest.specController?.fitnessChecks ?? []).find(
    (configured) => configured["scn"] === OWN_SCENARIO,
  );
  if (row === undefined) {
    throw new Error(
      `package.json holds no specController.fitnessChecks row naming ${OWN_SCENARIO}, ` +
        "so the gate it sources its bar from cannot be read off it.",
    );
  }
  return row;
}

/** A `--flag`'s value on a resolved command line, refused where the flag carries none. */
function flagValueOf(command: string, flag: string): string {
  // Single quotes are stripped because a script's own command line may quote a value that carries
  // a space — `--bank-command 'pnpm mutation:bank'` — and the flags read here sit beside it.
  const found = new RegExp(`${flag}\\s+'?([^\\s']+)'?`).exec(command);
  if (found === null) throw new Error(`${flag} is not given a value in: ${command}`);
  return found[1]!;
}

/**
 * A script's command with any `pnpm <script>` of this manifest's own expanded into it.
 *
 * ONE HOP IS ENOUGH AND MORE WOULD BE A LOOP. The banking script delegates to the reconciling one
 * and nothing here delegates twice; a chain deeper than that is a shape this repository does not
 * have, and a recursion written for it could not terminate on a script that named itself.
 */
function commandOf(script: string): string {
  const command = manifest.scripts?.[script];
  if (command === undefined) throw new Error(`package.json names no script "${script}".`);
  const delegate = /^pnpm\s+([\w:-]+)/.exec(command);
  const inner = delegate === null ? undefined : manifest.scripts?.[delegate[1]!];
  return inner === undefined ? command : `${inner} ${command.slice(delegate![0].length)}`;
}

/** Every package.json script the nightly's own `run:` steps invoke. */
function scriptsTheNightlyRuns(): string[] {
  return [...bytesOf(NIGHTLY).matchAll(/^\s*run:\s*pnpm\s+([\w:-]+)\s*$/gm)].map(
    (step) => step[1]!,
  );
}

/**
 * The command line the nightly hands the ratchet, refused when the nightly hands it none.
 *
 * IT IS THE ABSENCE THAT MATTERS HERE. A workflow that no longer reconciles anything leaves every
 * name below still agreeing with every other, so a reader that shrugged at finding no invocation
 * would report a wired gate over a pipeline that had quietly stopped asking for a verdict.
 */
function nightlyRatchetCommand(): string {
  const reconciling = scriptsTheNightlyRuns()
    .map(commandOf)
    .filter((command) => command.includes("ratchetCli.ts"));
  if (reconciling.length !== 1) {
    throw new Error(
      `${NIGHTLY} runs ${reconciling.length} scripts that reach the ratchet; it must run exactly one.`,
    );
  }
  return reconciling[0]!;
}

/** The gate the manifest sources this repository's own bar from, refused where it names none. */
function gateTheManifestNames(): string {
  const row = ownRow();
  // The row's own characteristic is asserted alongside, because a row naming a gate under some
  // OTHER characteristic would answer this question about a check nobody is asking about.
  const named = row["atLeast"];
  const gate =
    typeof named === "object" && named !== null
      ? (named as Record<string, unknown>)["mutationGate"]
      : undefined;
  if (row["characteristic"] !== OWN_CHECK || typeof gate !== "string" || gate.trim() === "") {
    throw new Error(
      `package.json holds ${OWN_SCENARIO}'s row as ${JSON.stringify(row)}, which is not a ` +
        `"${OWN_CHECK}" row naming a mutation gate.`,
    );
  }
  return gate;
}

/** Where the manifest's bar is sourced from — the record's own name, or the conventional one. */
function recordTheManifestReads(): string {
  const bar = ownRow()["atLeast"] as { recordFile?: unknown } | undefined;
  const named = bar?.recordFile;
  return typeof named === "string" ? named : RECORD_FILE;
}

/** The gate the producer stamps onto the measurement it reads, off its own bytes. */
function gateTheProducerStamps(): string {
  // Read from the source rather than imported: the constant is module-local, and the module it
  // lives in runs a sweep on import.
  const found = /^const GATE = "([^"]+)";$/m.exec(bytesOf(PRODUCER));
  if (found === null) throw new Error(`${PRODUCER} states no gate for the reader it calls.`);
  return found[1]!;
}

/** This repository's own record, for the gate its manifest names. */
function ownRecord(): MutationGateRecord {
  const recordFile = recordTheManifestReads();
  return gateRecordFor(
    gateTheManifestNames(),
    parseGateRecords(bytesOf(recordFile), recordFile),
    recordFile,
  );
}

describe("[SCN-MUT-014] this repository's mutation gate is one word across the four artefacts that state it", () => {
  it("[SCN-MUT-014] sources SCN-FIT-002's bar from a gate this repository's own record holds", () => {
    // `gateRecordFor` refuses a gate the record does not hold, so a rename on either side reds here
    // naming both the gate that was asked for and the ones the record does carry.
    const record = ownRecord();
    expect(record.gate).toBe(gateTheManifestNames());
    expect(record.total).toBeGreaterThan(0);
  });

  it("[SCN-MUT-014] asks the ratchet to reconcile that same gate, of that same record", () => {
    // The same file as well as the same word: two readers holding one gate name over two different
    // records agree on the spelling and on nothing else.
    const command = nightlyRatchetCommand();
    expect(flagValueOf(command, "--gate")).toBe(gateTheManifestNames());
    expect(command.includes("--record-file") ? flagValueOf(command, "--record-file") : RECORD_FILE)
      .toBe(recordTheManifestReads());
  });

  it("[SCN-MUT-014] stamps that same gate onto the measurement the producer reads", () => {
    expect(gateTheProducerStamps()).toBe(gateTheManifestNames());
  });

  it("[SCN-MUT-014] hands the ratchet the report path this repository's own sweep writes", () => {
    // The constant is imported rather than re-typed, so this asks whether the workflow agrees with
    // the sweep rather than whether two copies of a path agree with each other.
    expect(flagValueOf(nightlyRatchetCommand(), "--report")).toBe(MUTATION_REPORT_PATH);
  });

  it("[SCN-MUT-014] states this gate's allowance and, being zero, states no reason for it", () => {
    // Zero because it was MEASURED zero — the sweep reports no timeouts and no no-coverage, on two
    // very different runners. A reason beside a zero would be a justification for nothing.
    const record = ownRecord();
    expect(record.allowance.mutants).toBe(0);
    expect(record.allowance.reason).toBe("");
  });
});
