import { isFeatureCode } from "@3f-consulting/spec-controller-core";
import {
  checkArgvShape,
  checkUnknownFlags,
  parseArgs,
  positionalArguments,
} from "./cliArgs.js";
import type { CliRegistry } from "./cliRegistry.js";
import { AppError } from "../messages/messages.js";
import { refusal, type Refusal } from "../runEnding/refusal.js";

export interface AllocateRequest {
  readonly featureCode: string;
  readonly isNew: boolean;
}

export function readRequest(
  argv: readonly string[],
  registry: CliRegistry,
  toolVersion: string,
): AllocateRequest | { readonly usageError: Refusal } {
  const why = argvRefusal(argv, registry, toolVersion);
  if (why !== null) return { usageError: why };
  const [part] = positionalArguments(argv, registry, "allocate");
  if (part === undefined) return { usageError: refusal(AppError.NoFeaturePartGiven, {}) };
  if (!isFeatureCode(part)) return { usageError: refusal(AppError.NotAFeaturePart, { part }) };
  return { featureCode: part, isNew: argv.includes("--new") };
}

function argvRefusal(argv: readonly string[], registry: CliRegistry, toolVersion: string): Refusal | null {
  const args = parseArgs(argv);
  return (
    checkArgvShape(argv, registry, "allocate") ??
    checkUnknownFlags(args, registry, "allocate", toolVersion)
  );
}
