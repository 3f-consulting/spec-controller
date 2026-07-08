/**
 * The balance CLI — thin wiring over the reconciler seams. The orchestration half of
 * the old cli.ts: arg parsing, the render-from-JSON mode, and the reconcile →
 * census → provenance → plan → write sequence. The impure file reads it calls
 * (runReconcile + the read* siblings) live in ingest/ingestQualityChecks.ts; the output
 * plan/write in ./emit; the git-derived run inputs in run-management/resolveRunInputs.ts.
 *
 * Usage:
 *   pnpm reconcile [--features <dir>] [--vitest <report.json>]
 *                  [--cucumber <report.json>] [--ci <ci.yml>]
 *                  [--format <fmt>[:<path>]]
 */

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  runReconcile,
  readEvidenceObligations,
  readEvidenceObservations,
  readStaticEvidenceObservationCounts,
  readFeatureNames,
} from "../ingest/ingestQualityChecks.js";
import { planOutput } from "./emit/format.js";
import { writeOutputs } from "./emit/writer.js";
import { renderReportFromJson } from "@3f-consulting/spec-controller-core";
import { resolveSourceSha, resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import type { RunContext } from "@3f-consulting/spec-controller-core";

/** Parse `--flag value` pairs from argv into a record. */
function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a !== undefined && a.startsWith("--")) {
      const key = a.slice(2);
      const value = argv[i + 1];
      if (value !== undefined && !value.startsWith("--")) {
        args[key] = value;
        i++;
      } else {
        args[key] = "true";
      }
    }
  }
  return args;
}

/**
 * Collect the `--format <spec>` values from argv in order (the flag is REPEATABLE, unlike
 * the single-valued flags `parseArgs` records) — the raw specs `planOutput` parses. Empty
 * when no `--format` was given, which `planOutput` reads as the md→stdout default
 * (@SCN-FMT-001). Later sub-issues (FMT-004) route several specs in one invocation.
 */
function collectFormatSpecs(argv: string[]): string[] {
  const specs: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--format") {
      const value = argv[i + 1];
      if (value !== undefined && !value.startsWith("--")) {
        specs.push(value);
        i++;
      }
    }
  }
  return specs;
}

/**
 * The legacy-`--json` guard at the CLI edge (@SCN-FMT-006). The earlier
 * `--json <path>` flag is removed; supplying it must fail fast with a migration hint to
 * `--format json:<path>`, so the removed flag never silently no-ops and drops output. PURE
 * and `@unit`-testable: the removed flag is NOT a `--format` spec (planOutput never sees
 * it), so the guard reads the parsed args directly and returns the typed migration-hint
 * error message when `--json` is present — routed to stderr + a non-zero exit by main(),
 * the same handling planOutput's typed error gets (the shared error surface) — else null.
 */
export function checkLegacyJson(args: Record<string, string>): string | null {
  if (args["json"] !== undefined) {
    return (
      "The --json <path> flag has been removed. " +
      "Use --format json:<path> to write the JSON report to a file " +
      "(e.g. --format json:spec-reconciliation.json)."
    );
  }
  return null;
}

/**
 * Source the provenance "Target repo:" name for a run (@SCN-RPT-001 Update —
 * Fork A). The operator's `--target` is recorded VERBATIM — no resolution — defaulting to
 * `"unknown-target"` when omitted (parallel to `sourceSha`'s `"unknown"`; the facts
 * artefact is self-describing, so the line always renders). PURE and `@unit`-testable at
 * the CLI edge, like `checkLegacyJson`. It never inspects `--features`: the prior
 * `basename(dirname(--features))` resolution (the deleted `resolveTarget`) and its
 * degenerate `.` are impossible now — the target is only ever the given value or the
 * explicit default.
 */
export function sourceTarget(args: Record<string, string>): string {
  return args["target"] ?? "unknown-target";
}

export function runBalance(argv: string[]): void {
  // Capture the run-start instant up front — the run provenance's UTC timestamp,
  // threaded through ctx.runStart to the renderers.
  const runStart = new Date();
  const args = parseArgs(argv);

  // Legacy-`--json` guard (@SCN-FMT-006): the earlier `--json <path>` flag is
  // removed. Reject it fast — before any reconcile or write — with a migration hint to
  // `--format json:<path>`, so the removed flag never silently no-ops and drops output. The
  // guard's typed error is routed to stderr + a non-zero exit, exactly as planOutput's error
  // is below (the shared typed-error surface).
  const legacyJsonError = checkLegacyJson(args);
  if (legacyJsonError) {
    process.stderr.write(legacyJsonError + "\n");
    process.exit(1);
  }

  // Render-from-saved-JSON mode (@SCN-RMD-007): regenerate the human markdown from a
  // banked spec-reconciliation.json ALONE — no reconcile, no live inputs, no RunContext. Reads
  // the file, JSON.parses it back into the whole-document report model, renders the markdown via
  // renderReport, and writes it to stdout (the same trailing-newline convention as the writer's
  // stdout path). The load-bearing proof that the JSON IS the model — returns before any reconcile.
  const rehydratePath = args["render-from-json"];
  if (rehydratePath !== undefined) {
    const savedReport = readFileSync(rehydratePath, "utf8");
    process.stdout.write(renderReportFromJson(savedReport) + "\n");
    return;
  }

  const inputs = {
    features: args["features"],
    vitest: args["vitest"],
    cucumber: args["cucumber"],
    ci: args["ci"],
    packageJson: args["package-json"],
  };

  const balance = runReconcile(inputs);

  // Read the declared-corpus census alongside the balance (@SCN-RPT-008) —
  // the raw-vs-declared @SCN-occurrence delta over the same discovered feature corpus.
  // A sibling to the balance, threaded to the renderers via writeOutputs like ctx.
  const evidenceObligations = readEvidenceObligations(args["features"]);

  // Read the evidenceObservations reconciliation alongside the balance (@SCN-RPT-010) — the
  // observed test evidenceObservations counted by kind against the @SCN anchor in one shared pass, so the
  // by-level evidenceObservations + the balancing identity hold by construction. A 4th sibling,
  // threaded to the renderers via writeOutputs like ctx/corpus.
  const evidenceObservations = readEvidenceObservations(inputs);

  // Read the static-guard kind-counts alongside the balance (@SCN-USG-001) —
  // the guard observations COUNTED by kind (a guard that runs in CI with no @lint is an
  // unattributed static-guard). A 6th sibling, threaded to the renderers via writeOutputs like
  // ctx/evidenceObligations/evidenceObservations.
  const guards = readStaticEvidenceObservationCounts(inputs);

  // Read the target's feature-code→slug map alongside the balance (@SCN-RPT-006)
  // — the by-feature cut's full-name labels. The 5th sibling, threaded to the MARKDOWN
  // renderer via writeOutputs only (markdown-only; the by-feature cut isn't on JSON).
  const featureNames = readFeatureNames(args["features"]);

  // Build the run provenance ONCE (project design §1) — a sibling RunContext, the
  // EvidenceReconciliation staying pure — reusing the existing runStart. The target is the
  // operator's --target VERBATIM (unknown-target on omit; Fork A — no
  // resolution, no basename guessing). Source SHA via the read-only target read, with
  // --source-sha as the override (resolveSourceSha).
  const ctx: RunContext = {
    target: sourceTarget(args),
    inputs,
    runStart,
    sourceSha: resolveSourceSha({
      sourceSha: args["source-sha"],
      targetDir: args["features"] !== undefined ? dirname(args["features"]) : undefined,
    }),
    // The TARGET repo root the recorded input paths are made portable against (fixed to
    // the target root, not the run cwd, by @SCN-RPT-016) — the SAME
    // root readEvidenceObservations passes to countRuntimeEvidenceObservationKinds, derived from
    // --features, so a cross-repo reconcile records inputs relative (`features`) rather
    // than leaking the target's absolute path.
    root: resolveTargetRoot({ features: inputs.features }),
  };

  // Plan the outputs from the --format specs (no flag → md→stdout) and write them via
  // the writer — the pure plan / impure writer split (@SCN-FMT-001). The plan
  // parse+validate is pure; the writer is the only IO for the emitted report. This is
  // the SOLE output path: the tool emits via --format and holds no storage opinion — the
  // legacy runs/<target>/<ISO>/ auto-archive was removed with @SCN-RUN-001, the
  // caller now routes stored runs (spec-controller's run-management layer).
  const planResult = planOutput(collectFormatSpecs(argv));
  if (!planResult.ok) {
    process.stderr.write(planResult.error + "\n");
    process.exit(1);
  }
  writeOutputs(planResult.plan, { balance, ctx, evidenceObligations, evidenceObservations, guards, featureNames });
}

// Only run the balance command when this module is executed directly
// (`tsx cli-balance/cli.ts`), NOT when imported by the top-level `spec-controller`
// bin dispatcher or by a test that exercises the pure edge guards.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) runBalance(process.argv.slice(2));
