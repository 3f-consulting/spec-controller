/**
 * The local ladder's emitter — `pnpm ladder`. Reads a repository's CI workflow and package
 * manifest and prints the gates `pnpm verify` should run, one `<script>\t<command>` line each,
 * in ci.yml's order. `scripts/verify.sh` consumes this instead of holding a list of its own.
 *
 * THE OMISSION GOES TO stderr, WITH ITS REASON, EVERY RUN. `scripts/verify.sh` already held
 * that "an unexplained gap in a green-check is the exact failure mode this file exists to
 * close" — as a comment somebody had to keep true by hand, which is the arrangement 3F-2444
 * found had already stopped being true. Printing it puts the gap where a human looking at the
 * green-check will see it, rather than where a reader of the source might.
 *
 * TWO STREAMS, BECAUSE THEY HAVE TWO CONSUMERS. stdout is machine-read by the shell and holds
 * gates and nothing else; stderr is the human's, and holds the omission and any fault. Mixing
 * them would make the ladder's own commentary parse as a gate.
 *
 * THE SCRIPT NAME CARRIES NO OBSERVED PREFIX, AND CI DOES NOT RUN IT — both deliberate.
 * `runningStaticChecks` treats a package.json script as a RUNNING static check when its name
 * starts with an observed prefix (`lint:` / `guard:`) and a CI `run:` step invokes it. Calling
 * this `lint:ladder` would register a phantom static check on spec-controller's own ledger and
 * red `lint:self-balance` as an uncited one. This is the reasoning `verify` itself already
 * carries, applied to its helper.
 *
 * `--root <dir>` moves the read to another repository — how both evidence arms drive it over
 * planted trees. It never narrows WHAT is read, so the emitter under test is the emitter
 * `pnpm verify` runs.
 *
 * @SCN-LAD-004 — features/local-ladder.feature.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { CI_ONLY_EXCLUSIONS, deriveLocalLadder } from "./localLadder.js";

/** The `--root <dir>` argument, or the working directory. */
function rootFromArgv(argv: readonly string[]): string {
  const flag = argv.indexOf("--root");
  const value = flag === -1 ? undefined : argv[flag + 1];
  if (flag !== -1 && value === undefined) {
    console.error("local ladder: --root needs a directory");
    process.exit(2);
  }
  return value ?? process.cwd();
}

const root = rootFromArgv(process.argv.slice(2));
const ciPath = path.join(root, ".github", "workflows", "ci.yml");

let ladder;
try {
  ladder = deriveLocalLadder(
    readFileSync(ciPath, "utf8"),
    JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")),
    CI_ONLY_EXCLUSIONS,
  );
} catch (err) {
  // A ladder that cannot be built is a usage fault, not a verdict about the code — the
  // distinction `lint:self-balance` draws with its own exit 2, and for the same reason.
  console.error(`local ladder: cannot read ${ciPath} or its package.json — ${String(err)}`);
  process.exit(2);
}

for (const entry of ladder.stale) {
  console.error(
    `local ladder: the exclusion for ${entry.script} is stale — CI does not run it. Its recorded reason was: ${entry.reason}`,
  );
}
if (ladder.stale.length > 0) {
  console.error(
    "local ladder: remove the entry, or restore the CI step it excuses. An exclusion covering nothing excuses nothing, and sits on as licence for the next script to take the name.",
  );
  process.exit(1);
}

for (const entry of ladder.late) {
  console.error(
    `local ladder: ${entry.script} is excluded from the local ladder and CI runs it behind ${entry.gatesAhead.length} gate(s) — ${entry.gatesAhead.join(", ")}. It has no local run to fall back on: ${entry.reason}`,
  );
}
if (ladder.late.length > 0) {
  console.error(
    "local ladder: move the step ahead of every gate in ci.yml. A red in any gate ahead of it aborts the job and takes it off the board without reporting it unrun, and an excluded step has no second run to lose.",
  );
  process.exit(1);
}

for (const step of ladder.unsupported) {
  console.error(`local ladder: cannot gate ${step.script} — ${step.why}`);
  console.error(`  the step CI runs: ${step.command.split("\n").join(" ⏎ ")}`);
}
if (ladder.unsupported.length > 0) {
  console.error(
    "local ladder: split the step into one command per gate, or exclude it in CI_ONLY_EXCLUSIONS with a reason. Running a subset silently is what this ladder exists to stop.",
  );
  process.exit(1);
}

for (const omission of ladder.omitted) {
  console.error(`local ladder: ${omission.script} runs in CI and not here — ${omission.reason}`);
}

for (const gate of ladder.gates) {
  process.stdout.write(`${gate.script}\t${gate.command}\n`);
}
