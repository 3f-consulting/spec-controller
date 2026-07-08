#!/usr/bin/env node
/**
 * The `spec-controller` binary — the top-level command dispatcher.
 *
 * Today it exposes a single subcommand, `balance` — the deterministic
 * reconciliation of declared scenarios against observed evidence, running
 * standalone on the public core + app layer, no engine required. The
 * `analyse` / `migrate` capabilities are a separate, closed offering built on
 * the same core; optional-engine detection is a later slice.
 *
 * Usage:
 *   spec-controller balance [--features <dir>] [--vitest <report.json>]
 *                           [--cucumber <report.json>] [--ci <ci.yml>]
 *                           [--package-json <path>] [--target <name>]
 *                           [--format <fmt>[:<path>]] ...
 */

import { runBalance } from "./cli-balance/cli.js";

const USAGE = `spec-controller — reconcile declared behaviour against observed evidence

Usage:
  spec-controller balance [options]

Commands:
  balance    Reconcile Gherkin scenarios against test/CI evidence and emit the
             Evidence Reconciliation (Markdown to stdout by default).

Run \`spec-controller balance --help\` semantics via the flags documented in
doc/how_to_use.md.`;

function main(argv: string[]): void {
  const [subcommand, ...rest] = argv;

  switch (subcommand) {
    case "balance":
      runBalance(rest);
      return;
    case undefined:
    case "--help":
    case "-h":
    case "help":
      process.stdout.write(USAGE + "\n");
      return;
    default:
      process.stderr.write(`spec-controller: unknown command "${subcommand}".\n\n${USAGE}\n`);
      process.exit(1);
  }
}

main(process.argv.slice(2));
