import { isFeaturePart } from "@3f-consulting/spec-controller-core";
import {
  checkArgvShape,
  checkUnknownFlags,
  parseArgs,
  positionalArguments,
} from "../cliArgs.js";
import type { CliRegistry } from "../cliRegistry.js";
import { AppError } from "../messages.js";
import { refusal, type Refusal } from "../refusal.js";

export interface AllocateRequest {
  readonly part: string;
  readonly isNew: boolean;
}

export function readRequest(
  argv: readonly string[],
  registry: CliRegistry,
  toolVersion: string,
): AllocateRequest | { readonly usageError: Refusal } {
  const why = argvRefusal(argv, registry, toolVersion) ?? partRefusal(positionalArguments(argv, registry, "allocate")[0]);
  if (why !== null) return { usageError: why };
  return { part: positionalArguments(argv, registry, "allocate")[0] ?? "", isNew: argv.includes("--new") };
}

function argvRefusal(argv: readonly string[], registry: CliRegistry, toolVersion: string): Refusal | null {
  const args = parseArgs(argv);
  return (
    checkArgvShape(argv, registry, "allocate") ??
    checkUnknownFlags(args, registry, "allocate", toolVersion)
  );
}

function partRefusal(part: string | undefined): Refusal | null {
  if (part === undefined) return refusal(AppError.NoFeaturePartGiven, {});
  if (isFeaturePart(part)) return null;
  return refusal(AppError.NotAFeaturePart, { part });
}
