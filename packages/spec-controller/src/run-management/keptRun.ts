import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse, stringify } from "yaml";
import { AppError } from "../messages.js";
import { refusal } from "../refusal.js";
import { firstSharingFile, inputAt, refuse, writeOrRefuse, type ReadInput } from "../outputLocation.js";

const RECONCILIATION_DOCUMENT = "spec-reconciliation.md";
const RECONCILIATION_JSON = "spec-reconciliation.json";

export const RUN_MANIFEST = "run.yaml";

const RUN_MANIFEST_SCHEMA_VERSION = 2;

type RunMode = "balance";

export interface RunManifestMeta {
  readonly sourceSha: string;
  readonly toolSha: string;
  readonly toolVersion: string;
  readonly mode: RunMode;
  readonly date: string;
}

export interface RunManifestInput extends RunManifestMeta {
  readonly runId: string;
  readonly target: string;
}

export interface RunManifest {
  readonly schema_version: number;
  readonly run_id: string;
  readonly target: string;
  readonly source_sha: string;
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

export interface KeptRunSpec {
  readonly storeRoot: string;
  readonly target: string;
  readonly runId: string;
  readonly formatPaths?: readonly string[];
  readonly inputs?: readonly ReadInput[];
}

export interface KeptRunPlan {
  readonly runDir: string;
  readonly documentPath: string;
  readonly reconciliationJsonPath: string;
}

export type RouteOutputs = (formatSpecs: readonly string[], runDir: string) => boolean;

export function earlierStoredRunDirOf(path: string, ownRunDir: string | undefined): string | undefined {
  const dir = existsSync(path) ? dirname(realpathSync(path)) : realpathSync(dirname(path));
  if (ownRunDir !== undefined && dir === realpathSync(ownRunDir)) return undefined;
  return holdsRunManifest(dir) ? dir : undefined;
}

function holdsRunManifest(dir: string): boolean {
  return readsAsRunManifest(runManifestDocumentIn(dir));
}

function runManifestDocumentIn(dir: string): unknown {
  try {
    return parse(readFileSync(join(dir, RUN_MANIFEST), "utf8"));
  } catch {
    // A run.yaml that is absent, unreadable or not YAML reads as no document.
  }
  return undefined;
}

function readsAsRunManifest(document: unknown): boolean {
  if (typeof document !== "object" || document === null) return false;
  const fields = document as Record<string, unknown>;
  return (
    fields["schema_version"] !== undefined &&
    fields["run_id"] !== undefined &&
    typeof fields["artefacts"] === "object" &&
    fields["artefacts"] !== null
  );
}

export function planKeptRun(spec: KeptRunSpec): KeptRunPlan {
  const runDir = join(spec.storeRoot, spec.target, spec.runId);
  return {
    runDir,
    documentPath: join(runDir, RECONCILIATION_DOCUMENT),
    reconciliationJsonPath: join(runDir, RECONCILIATION_JSON),
  };
}

export interface ResolveRunIdOptions {
  readonly runId?: string;
  readonly now: Date;
}

export function resolveRunId(options: ResolveRunIdOptions): string {
  if (options.runId !== undefined) {
    return options.runId;
  }
  return formatRunTimestamp(options.now);
}

function formatRunTimestamp(instant: Date): string {
  return instant.toISOString().replace(/\.\d+Z/, "Z").replace(/:/g, "-");
}

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
    purpose: [],
    links: [],
    artefacts: {
      document: RECONCILIATION_DOCUMENT,
      reconciliation: RECONCILIATION_JSON,
    },
  };
}

export function serialiseRunManifest(manifest: RunManifest): string {
  return stringify(manifest);
}

export function executeKeptRun(
  spec: KeptRunSpec,
  meta: RunManifestMeta,
  route: RouteOutputs
): KeptRunPlan | undefined {
  const plan = planKeptRun(spec);
  writeOrRefuse({ kind: "stored-run-directory" }, plan.runDir, () =>
    mkdirSync(plan.runDir, { recursive: true }),
  );
  const manifestPath = join(plan.runDir, RUN_MANIFEST);
  const sharesManifest = firstSharingFile(manifestPath, spec.formatPaths ?? []);
  if (sharesManifest !== undefined) {
    refuse(refusal(AppError.FormatNamesStoredRunManifest, { formatPath: sharesManifest, manifestPath, runDir: plan.runDir }));
  }
  const readManifest = inputAt(manifestPath, spec.inputs ?? []);
  if (readManifest !== undefined) {
    refuse(refusal(AppError.StoredRunReadsItsManifest, { manifestPath, inputPath: readManifest.path, inputSubject: readManifest.subject }));
  }
  if (!route([`md:${plan.documentPath}`, `json:${plan.reconciliationJsonPath}`], plan.runDir)) return undefined;
  const manifest = planRunManifest({ runId: spec.runId, target: spec.target, ...meta });
  writeFileSync(manifestPath, serialiseRunManifest(manifest));
  return plan;
}
