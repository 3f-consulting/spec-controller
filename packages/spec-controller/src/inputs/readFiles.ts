import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface FeatureSource {
  readonly file: string;
  readonly source: string;
}

export function featureSourcesIn(folder: string): FeatureSource[] {
  return readdirSync(folder)
    .filter((name) => name.endsWith(".feature"))
    .map((file) => ({ file, source: readFileSync(join(folder, file), "utf8") }));
}

export interface WorkflowSource {
  readonly workflow: string;
  readonly source: string;
}

export function workflowSourcesIn(folder: string): WorkflowSource[] {
  return readdirSync(folder)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((workflow) => ({ workflow, source: readFileSync(join(folder, workflow), "utf8") }));
}

// Every feature file under the folder, at any depth; no folder holds none.
export function featureSourcesUnder(folder: string): FeatureSource[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".feature"))
    .map((path) => ({ file: join(folder, path), source: readFileSync(join(folder, path), "utf8") }));
}

export const jsonAt = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
