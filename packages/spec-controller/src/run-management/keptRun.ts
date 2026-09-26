/**
 * The KEPT-RUN scaffold — the thin app-layer that turns a bare tool invocation into a
 * STORED run (the run-management layer). A kept run is a consultancy / product-dev artefact (NOT CI):
 * it makes a per-run directory under a caller-INJECTED store root and routes the tool's
 * `--format` outputs into it. The tool holds no storage opinion (the `--format` surface); this
 * scaffold adds only the directory + the routing.
 *
 * Split by the three-layer architecture:
 *   - PURE planner (`planKeptRun`): given `{ storeRoot, target, runId }`, yields the run
 *     dir `<storeRoot>/<target>/<runId>/` and the two file-dest paths — no IO, proven
 *     `@unit`.
 *   - IMPURE runner (`executeKeptRun`): `mkdir -p` the run dir, then route the tool's
 *     `--format` outputs into the two files by handing an injected tool-invoker the two
 *     file-dest `--format` specs. The ONLY IO, proven `@integration` (the real on-disk
 *     files under a temp root + the repo untouched — never a planner re-run).
 *
 * The store root is an INJECTED parameter — never hardcoded — so the scaffold is
 * location-agnostic (proven against a temp root; the repo is never written).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { writeOrRefuse } from "../outputLocation.js";

/** The two artefact filenames a kept run routes the tool's outputs into. */
export const RECONCILIATION_DOCUMENT = "spec-reconciliation.md";
/**
 * The machine artefact filename — renamed `ledger.json` →
 * `spec-reconciliation.json` (parity with `spec-reconciliation.md`): it is the machine form
 * of the WHOLE reconciliation document, not just the ledger.
 */
export const RECONCILIATION_JSON = "spec-reconciliation.json";

/** The manifest filename a kept run stamps in the run dir. */
export const RUN_MANIFEST = "run.yaml";

/**
 * The run.yaml schema version this scaffold stamps. Bumped 1 → 2 when it added
 * the tool identity (`tool_sha` / `tool_version`) — so a reader can tell a run that
 * predates tool-identity recording (schema 1) from one that should carry it (schema 2).
 * run.yaml is write-only (no production reader), so the bump breaks no read path.
 */
export const RUN_MANIFEST_SCHEMA_VERSION = 2;

/** The stored-run modes (run.yaml `mode`). */
export type RunMode = "balance" | "analyse" | "migrate";

/**
 * The manifest-only metadata a kept run stamps that the path spec (`KeptRunSpec`) does not
 * carry — the source SHA, the run mode, and the ISO date.
 */
export interface RunManifestMeta {
  readonly sourceSha: string;
  /**
   * The TOOL's own git SHA — which spec-controller produced this run, distinct
   * from the target's `sourceSha`. A string ("unknown" when the tool is not a git
   * checkout), mirroring `sourceSha`'s own "unknown" fallback — so run.yaml is internally
   * consistent (both facts use the same absent-marker, never a bare null).
   */
  readonly toolSha: string;
  /** The tool's package version — always present. */
  readonly toolVersion: string;
  readonly mode: RunMode;
  readonly date: string;
}

/** The full manifest input: the path spec's run-id + target, plus the manifest-only meta. */
export interface RunManifestInput extends RunManifestMeta {
  readonly runId: string;
  readonly target: string;
}

/**
 * The run.yaml manifest — the decided light field set. `purpose`/`links` default EMPTY (the ad-hoc default; slugs are
 * added by operator hand-edit afterward). `category`/`use_case` are NOT stamped (`purpose`
 * subsumes them). Keys are listed in the decided stamp order.
 */
export interface RunManifest {
  readonly schema_version: number;
  readonly run_id: string;
  readonly target: string;
  readonly source_sha: string;
  /** The TOOL's identity — which spec-controller produced the run. */
  readonly tool_sha: string;
  readonly tool_version: string;
  readonly mode: RunMode;
  readonly date: string;
  readonly purpose: readonly string[];
  readonly links: readonly string[];
  readonly artefacts: {
    readonly document: string;
    readonly reconciliation: string;
  };
}

/** The kept-run inputs: the injected store root, the target, and the run-id. */
export interface KeptRunSpec {
  readonly storeRoot: string;
  readonly target: string;
  readonly runId: string;
}

/** The planned run: the run dir plus the two file-dest paths inside it. */
export interface KeptRunPlan {
  readonly runDir: string;
  readonly documentPath: string;
  readonly reconciliationJsonPath: string;
}

/**
 * Invokes the reconciliation tool with the given `--format <fmt>:<path>` specs. INJECTED so
 * the scaffold stays the tool's black-box caller (the real CLI subprocess in the
 * `@integration` arm) and holds no opinion on HOW the tool is run — only WHERE its outputs
 * land (the two file-dest paths the runner hands it).
 */
export type RouteOutputs = (formatSpecs: readonly string[]) => void;

/**
 * PURE planner: yield the run dir `<storeRoot>/<target>/<runId>/` and the two file-dest
 * paths (`<dir>/spec-reconciliation.md`, `<dir>/spec-reconciliation.json`) from the spec. No
 * IO — the store root is threaded straight through `join`, so it is a parameter, never
 * hardcoded.
 */
export function planKeptRun(spec: KeptRunSpec): KeptRunPlan {
  const runDir = join(spec.storeRoot, spec.target, spec.runId);
  return {
    runDir,
    documentPath: join(runDir, RECONCILIATION_DOCUMENT),
    reconciliationJsonPath: join(runDir, RECONCILIATION_JSON),
  };
}

/**
 * Options for the pure run-id resolver: the operator's OPTIONAL `--run-id` mnemonic
 * and the INJECTED clock instant the default timestamp derives from.
 */
export interface ResolveRunIdOptions {
  /** The operator's `--run-id` mnemonic when supplied; overrides the timestamp default, verbatim. */
  readonly runId?: string;
  /**
   * The injected instant the default ISO-timestamp run-id derives from — the deterministic-@unit
   * seam. Never a bare `new Date()` inside the resolver, so the default run-id is pin-testable.
   */
  readonly now: Date;
}

/**
 * PURE run-id resolver — the CLI/edge seam that turns an OPTIONAL `--run-id` into the concrete
 * run-id naming the run dir (feeds `KeptRunSpec.runId`). No `--run-id` → an ISO-8601 UTC
 * timestamp derived from the INJECTED `now` (filesystem-safe: no colons, no millis — matching
 * the existing store run dir); `--run-id <mnemonic>` → that mnemonic verbatim (`acme-q3`, `e1`
 * — an earlier precedent), which ignores the clock. No IO — proven `@unit`.
 * The clock is injected (never a bare `new Date()`) so the default timestamp is deterministic
 * under test (the discipline the old `formatRunTimestamp` used). Just default-vs-override — no
 * sanitisation / collision policy (deferred).
 */
export function resolveRunId(options: ResolveRunIdOptions): string {
  // The operator mnemonic, when given, names the run dir verbatim — the clock is ignored.
  if (options.runId !== undefined) {
    return options.runId;
  }
  // Otherwise the run-id defaults to the injected instant as a filesystem-safe timestamp.
  return formatRunTimestamp(options.now);
}

/**
 * Format an injected instant as a filesystem-safe ISO-8601 UTC timestamp: `toISOString()`
 * yields `2026-06-30T10:04:01.123Z`; drop the milliseconds, then swap the time-separator
 * colons for hyphens so the string is a safe directory name (`2026-06-30T10-04-01Z` — the
 * form the existing store run dir uses).
 */
function formatRunTimestamp(instant: Date): string {
  return instant.toISOString().replace(/\.\d+Z$/, "Z").replace(/:/g, "-");
}

/**
 * PURE: build the run.yaml manifest object from the run metadata. `purpose` and
 * `links` are stamped EMPTY (the ad-hoc default; slugs are added by operator hand-edit of
 * run.yaml afterward — the documented curation convention); `artefacts` carry the decided
 * filenames. No IO — proven `@unit`.
 */
export function planRunManifest(input: RunManifestInput): RunManifest {
  return {
    schema_version: RUN_MANIFEST_SCHEMA_VERSION,
    run_id: input.runId,
    target: input.target,
    source_sha: input.sourceSha,
    tool_sha: input.toolSha,
    tool_version: input.toolVersion,
    mode: input.mode,
    date: input.date,
    // EMPTY defaults — the ad-hoc run; slugs/links are added by operator hand-edit of
    // run.yaml afterward (no --purpose flag, no vocab enforcement — both deferred).
    purpose: [],
    links: [],
    artefacts: {
      document: RECONCILIATION_DOCUMENT,
      reconciliation: RECONCILIATION_JSON,
    },
  };
}

/** PURE: serialise the manifest to YAML text the impure runner writes verbatim. */
export function serialiseRunManifest(manifest: RunManifest): string {
  return stringify(manifest);
}

/**
 * IMPURE runner: `mkdir -p` the run dir, route the tool's `--format` outputs into the two files
 * via the injected `route` — the document as `md:<documentPath>`, the reconciliation JSON as
 * `json:<reconciliationJsonPath>` — and stamp `run.yaml` from the spec + `meta`. Returns the
 * plan it realised. The `mkdir` is load-bearing: the tool's writer creates no directories, so the
 * scaffold creates the one the location-agnostic tool writes into.
 */
export function executeKeptRun(
  spec: KeptRunSpec,
  meta: RunManifestMeta,
  route: RouteOutputs
): KeptRunPlan {
  const plan = planKeptRun(spec);
  writeOrRefuse("The stored run's directory could not be created", plan.runDir, () =>
    mkdirSync(plan.runDir, { recursive: true }),
  );
  route([`md:${plan.documentPath}`, `json:${plan.reconciliationJsonPath}`]);
  const manifest = planRunManifest({ runId: spec.runId, target: spec.target, ...meta });
  const manifestPath = join(plan.runDir, RUN_MANIFEST);
  writeOrRefuse("The stored run's run.yaml could not be written", manifestPath, () =>
    writeFileSync(manifestPath, serialiseRunManifest(manifest)),
  );
  return plan;
}
