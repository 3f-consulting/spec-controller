#!/usr/bin/env node
/**
 * The `spec-controller` binary — the top-level command host + dispatcher.
 *
 * Usage:
 *   spec-controller [--store <root>] [--run-id <id>] <command> [command-args]
 *
 * Commands: `balance` — the deterministic reconciliation of declared scenarios against
 * observed evidence, standalone on the public core + app layer (no engine). The
 * `analyse` / `migrate` capabilities are a separate, closed offering built on the same
 * core.
 *
 * Storage is a CROSS-CUTTING host modifier, not a command. A leading `--store <root>`
 * turns any command into a STORED run: the host wraps the command via the kept-run
 * scaffold — a named `<root>/<target>/<run-id>/` directory, the command's outputs routed
 * in, and a `run.yaml` manifest — and hands the command its own clean args, unchanged. So
 * `balance` stays emit-only (its default, no-store output is byte-identical); the store
 * opinion lives at the host, injected via `--store` (required — there is no default, a
 * default would write inside the repo). `--run-id` defaults to a timestamp.
 */

import { dirname } from "node:path";

import { runBalance } from "./cli-balance/cli.js";
import { resolveSourceSha } from "./run-management/resolveRunInputs.js";
import {
  executeKeptRun,
  resolveRunId,
  type KeptRunSpec,
  type RunManifestMeta,
} from "./run-management/keptRun.js";
import { parseHostInvocation, wrapCommandArgv, peekFlag } from "./host.js";

const USAGE = `spec-controller — reconcile declared behaviour against observed evidence

Usage:
  spec-controller [--store <root>] [--run-id <id>] balance [options]

Commands:
  balance    Reconcile Gherkin scenarios against test/CI evidence and emit the
             Evidence Reconciliation (Markdown to stdout by default).

Host modifiers (before the command):
  --store <root>   Store the run: write <root>/<target>/<run-id>/ with the
                   reconciliation outputs + a run.yaml manifest. Required to store;
                   there is no default (a default would write inside the repo).
  --run-id <id>    Name the stored run (default: an ISO-8601 UTC timestamp).

Full flags, examples, and CI wiring: doc/how_to_use.md.`;

/** Dispatch a command to its handler with the given (clean or store-wrapped) argv. */
function runCommand(command: string, argv: string[]): void {
  switch (command) {
    case "balance":
      runBalance(argv);
      return;
    default:
      process.stderr.write(`spec-controller: unknown command "${command}".\n\n${USAGE}\n`);
      process.exit(1);
  }
}

function main(hostArgv: string[]): void {
  const inv = parseHostInvocation(hostArgv);
  const command = inv.command;

  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(USAGE + "\n");
    return;
  }

  // No store directive → dispatch the command directly; its output is unchanged.
  if (inv.store === undefined) {
    runCommand(command, inv.commandArgs);
    return;
  }

  // Store directive → wrap the command via keptRun. The scaffold makes the run dir, hands
  // the injected route the two store-dir `--format` specs, and stamps run.yaml. The route
  // dispatches the command with its own clean args PLUS those specs, so the command's own
  // writer produces the stored artefacts (byte-identical to a bare `--format` run). The
  // host peeks the conventional provenance flags off the command args to name the dir +
  // stamp the manifest, without consuming them (the command still sees them).
  const runId = resolveRunId({ runId: inv.runId, now: new Date() });
  const target = peekFlag(inv.commandArgs, "target") ?? "unknown-target";
  const features = peekFlag(inv.commandArgs, "features");
  const sourceSha =
    resolveSourceSha({
      sourceSha: peekFlag(inv.commandArgs, "source-sha"),
      targetDir: features !== undefined ? dirname(features) : undefined,
    }) ?? "unknown";

  const spec: KeptRunSpec = { storeRoot: inv.store, target, runId };
  // `mode` is the command's run kind; only `balance` ships today (analyse/migrate are the
  // private engine's, added when it lands).
  const meta: RunManifestMeta = { sourceSha, mode: "balance", date: new Date().toISOString() };

  const plan = executeKeptRun(spec, meta, (formatSpecs) =>
    runCommand(command, wrapCommandArgv(inv.commandArgs, [...formatSpecs])),
  );

  // The command's stdout was routed into the run dir, so tell the operator where it landed.
  process.stdout.write(plan.runDir + "\n");
}

main(process.argv.slice(2));
