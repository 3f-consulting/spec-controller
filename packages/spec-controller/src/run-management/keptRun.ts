import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { APP_MESSAGES, AppMessage } from "../messages.js";
import { firstSharingFile, inputAt, refuse, writeOrRefuse, type ReadInput } from "../outputLocation.js";

export const RECONCILIATION_DOCUMENT = "spec-reconciliation.md";
export const RECONCILIATION_JSON = "spec-reconciliation.json";

export const RUN_MANIFEST = "run.yaml";

const RUN_MANIFEST_SCHEMA_VERSION = 2;

type RunMode = "balance" | "analyse" | "migrate";

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

export type RouteOutputs = (formatSpecs: readonly string[]) => boolean;

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
  writeOrRefuse(APP_MESSAGES[AppMessage.StoredRunDirectoryNotCreated](), plan.runDir, () =>
    mkdirSync(plan.runDir, { recursive: true }),
  );
  const manifestPath = join(plan.runDir, RUN_MANIFEST);
  const sharesManifest = firstSharingFile(manifestPath, spec.formatPaths ?? []);
  if (sharesManifest !== undefined) {
    refuse(APP_MESSAGES[AppMessage.FormatNamesStoredRunManifest](sharesManifest, manifestPath, plan.runDir));
  }
  const readManifest = inputAt(manifestPath, spec.inputs ?? []);
  if (readManifest !== undefined) {
    refuse(APP_MESSAGES[AppMessage.StoredRunReadsItsManifest](manifestPath, readManifest.path, readManifest.subject));
  }
  if (!route([`md:${plan.documentPath}`, `json:${plan.reconciliationJsonPath}`])) return undefined;
  const manifest = planRunManifest({ runId: spec.runId, target: spec.target, ...meta });
  writeOrRefuse(APP_MESSAGES[AppMessage.StoredRunManifestNotWritten](), manifestPath, () =>
    writeFileSync(manifestPath, serialiseRunManifest(manifest)),
  );
  return plan;
}
