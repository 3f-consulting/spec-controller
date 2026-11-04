import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export const NODE = process.execPath;

export const SPEC_CONTROLLER_BIN = join(repoRoot, "packages", "spec-controller", "dist", "cli.js");

export const PUBLISHED_SCHEMA = join(dirname(SPEC_CONTROLLER_BIN), "spec-reconciliation.schema.json");

export const SPEC_CONTROLLER_ARGV: readonly string[] = [SPEC_CONTROLLER_BIN];
