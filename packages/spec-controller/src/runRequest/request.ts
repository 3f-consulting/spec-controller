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
): AllocateRequest | { readonly usageError: Refusal } {
  const why = argvRefusal(argv, registry);
  if (why !== null) return { usageError: why };
  const [featureCode] = positionalArguments(argv);
  if (featureCode === undefined) return { usageError: refusal(AppError.FeatureCodeNotGiven, {}) };
  if (!isFeatureCode(featureCode)) return { usageError: refusal(AppError.NotAFeatureCode, { featureCode }) };
  return { featureCode, isNew: argv.includes("--new") };
}

function argvRefusal(argv: readonly string[], registry: CliRegistry): Refusal | null {
  const args = parseArgs(argv);
  return (
    checkArgvShape(argv, registry, "allocate") ??
    checkUnknownFlags(args, registry, "allocate")
  );
}
