import { isFeaturePart } from "@3f-consulting/spec-controller-core";
import {
  checkArgvShape,
  checkMisplacedHostModifiers,
  checkUnknownFlags,
  parseArgs,
  positionalArguments,
} from "../cli-args.js";
import type { CliRegistry } from "../cli-registry.js";

export interface AllocateRequest {
  readonly part: string;
  readonly isNew: boolean;
}

export function readRequest(
  argv: readonly string[],
  registry: CliRegistry,
  toolVersion: string,
): AllocateRequest | { readonly usageError: string } {
  const why = argvRefusal(argv, registry, toolVersion) ?? partRefusal(positionalArguments(argv, registry, "allocate")[0]);
  if (why !== null) return { usageError: `spec-controller allocate: usage error — ${why}` };
  return { part: positionalArguments(argv, registry, "allocate")[0] ?? "", isNew: argv.includes("--new") };
}

function argvRefusal(argv: readonly string[], registry: CliRegistry, toolVersion: string): string | null {
  const args = parseArgs(argv);
  return (
    checkMisplacedHostModifiers(args, registry, "allocate") ??
    checkArgvShape(argv, registry, "allocate") ??
    checkUnknownFlags(args, registry, "allocate", toolVersion)
  );
}

function partRefusal(part: string | undefined): string | null {
  if (part === undefined) return "no feature part was given: 'spec-controller allocate <FFF>' takes one, a feature file's header code.";
  if (isFeaturePart(part)) return null;
  return `'${part}' is not a feature part in canon's form: two to five characters, each A-Z or 0-9.`;
}
