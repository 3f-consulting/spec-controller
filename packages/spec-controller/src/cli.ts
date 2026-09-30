#!/usr/bin/env node
/**
 * The `spec-controller` binary — the top-level command host + dispatcher.
 *
 * Usage:
 *   spec-controller [--store <root>] [--run-id <id>] <command> [command-args]
 *
 * Commands: `balance` — the deterministic reconciliation of scenarios against
 * observed evidence, standalone on the public core + app layer (no engine). It also polices the
 * corpus's own scenario codes. `allocate` — a query, not a verdict: the next scenario code
 * for a feature part, which keeps no run and so takes no host modifier. The
 * `analyse` / `migrate` capabilities are a separate, closed offering built on the same core.
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
import { inputsReadBy, NODE_INPUT_READER } from "./cli-balance/inputsRead.js";
import { parseArgs } from "./cli-args.js";
import { runAllocate } from "./cli-allocate/cli.js";
import { resolveSourceSha, resolveToolIdentity } from "./run-management/resolveRunInputs.js";
import {
  executeKeptRun,
  resolveRunId,
  type KeptRunSpec,
  type RouteOutputs,
  type RunManifestMeta,
} from "./run-management/keptRun.js";
import {
  parseHostInvocation,
  wrapCommandArgv,
  peekFlag,
  formatFilePaths,
  answerUnknownCommand,
  modifiersNotTakenRefusal,
  type HostInvocation,
} from "./host.js";
import { cliRegistry, renderTopLevelHelp } from "./cli-registry.js";
import { dispatchesUnstored, storedReRenderRefusal, unstoredRunIdRefusal } from "./storedRun.js";
import { settlingRefusal } from "./outputLocation.js";

/** Dispatch a command to its handler with the given (clean or store-wrapped) argv; true when it wrote its report. */
function runCommand(command: string, argv: string[]): boolean {
  switch (command) {
    case "balance":
      return runBalance(argv);
    case "allocate":
      runAllocate(argv);
      return false;
    default: {
      const answer = answerUnknownCommand(command, renderTopLevelHelp(cliRegistry));
      process.stderr.write(answer.stderr);
      process.exitCode = answer.exitCode;
      return false;
    }
  }
}

/**
 * Refuse, at the usage status, what the leading tokens get wrong, before any command or stored run
 * starts, so nothing is written anywhere: a usage fault among them, or modifiers
 * that would keep a run given to a command, or a re-render, that keeps none, or a run-id with no
 * store to keep the run it names. True when it refused.
 */
function refuseLeadingFaults(inv: HostInvocation): boolean {
  const refusal =
    inv.refusal ?? modifiersNotTakenRefusal(inv) ?? storedReRenderRefusal(inv) ?? unstoredRunIdRefusal(inv);
  if (refusal === undefined) return false;
  process.stderr.write(refusal + "\n");
  process.exitCode = 2;
  return true;
}

function main(hostArgv: string[]): void {
  const inv = parseHostInvocation(hostArgv);
  if (refuseLeadingFaults(inv)) return;
  const command = inv.command;

  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(renderTopLevelHelp(cliRegistry) + "\n");
    return;
  }

  // No store directive, or a request for help → dispatch the command directly; its output is unchanged.
  if (dispatchesUnstored(inv) || inv.store === undefined) {
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

  const spec: KeptRunSpec = {
    storeRoot: inv.store,
    target,
    runId,
    formatPaths: formatFilePaths(inv.commandArgs),
    inputs: inputsReadBy(parseArgs(inv.commandArgs), NODE_INPUT_READER),
  };
  // `mode` is the command's run kind; only `balance` ships today (analyse/migrate are the
  // private engine's, added when it lands).
  // The TOOL's own identity — which spec-controller produced this run, read
  // from the tool's OWN dir (never cwd, which is the target). "unknown" for a null SHA,
  // matching sourceSha's own fallback so run.yaml is internally consistent.
  const toolIdentity = resolveToolIdentity();
  const meta: RunManifestMeta = {
    sourceSha,
    toolSha: toolIdentity.toolSha ?? "unknown",
    toolVersion: toolIdentity.toolVersion,
    mode: "balance",
    date: new Date().toISOString(),
  };

  const route: RouteOutputs = (formatSpecs) => runCommand(command, wrapCommandArgv(inv.commandArgs, [...formatSpecs]));
  const plan = settlingRefusal(() => executeKeptRun(spec, meta, route), undefined);

  // The command's report was routed into the run dir, so tell the operator where it landed.
  if (plan !== undefined) process.stdout.write(plan.runDir + "\n");
}

main(process.argv.slice(2));
