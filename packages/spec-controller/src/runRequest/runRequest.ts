import type { OutputRequest } from "@3f-consulting/spec-controller-core";
import { parseArgs } from "node:util";
import type { RunEnding } from "../runEnding/runEnding.js";
import { COMMANDS, isCommand, isHelp, type Command, type Flag, type InputKind } from "./flags.js";

export { INPUT_KINDS } from "./flags.js";

type ReportFormat = "md" | "json";

// byDefault: the command line did not name it, so its default path was filled in.
export interface InputRequest {
  readonly kind: InputKind;
  readonly path: string;
  readonly byDefault: boolean;
}

export type RunRequest =
  | { readonly command: "help"; readonly about?: Command }
  | {
      readonly command: "balance";
      readonly inputs: readonly InputRequest[];
      readonly target?: string;
      readonly sourceSha?: string;
      readonly outputs: readonly OutputRequest<ReportFormat>[];
      readonly strict: boolean;
      readonly exitZero: boolean;
    }
  | { readonly command: "allocate"; readonly featureCode: string; readonly asNewFeatureCode: boolean };

export type UsageError = Extract<RunEnding, { ending: "usage-error" }>;

const TOP_HELP = "spec-controller --help";

const helpFor = (command: Command): string => `spec-controller ${command} --help`;

const refused = (key: string, values: Readonly<Record<string, string>>): UsageError => ({ ending: "usage-error", refusals: [{ key, values }] });

// Each flag's values in the order given, and the arguments that are no flag's.
interface FlagsRead {
  readonly values: ReadonlyMap<string, readonly string[]>;
  readonly positionals: readonly string[];
}

const flagNamed = (flags: readonly Flag[], name: string): Flag | undefined => flags.find((flag) => flag.name === name);

// An argument straight after a flag that takes no value was given to it as a value.
function positionalRefusal(command: Command, flags: readonly Flag[], before: Token | undefined, at: number, argument: string, positionals: number): UsageError | undefined {
  const help = helpFor(command);
  if (command === "allocate" && positionals === 0) return undefined;
  if (before?.kind === "option" && before.index === at - 1 && flagNamed(flags, before.name)?.value === undefined) {
    return refused("unwanted-value", { flag: before.rawName, value: argument, help });
  }
  return command === "allocate" ? refused("extra-argument", { argument, help }) : refused("stray-argument", { argument, help });
}

const tokensOf = (flags: readonly Flag[], args: readonly string[]) =>
  parseArgs({
    args: [...args],
    options: Object.fromEntries(
      flags.map((flag) => [flag.name, { type: flag.value === undefined ? ("boolean" as const) : ("string" as const), multiple: true, ...(flag.short === undefined ? {} : { short: flag.short }) }]),
    ),
    strict: false,
    allowPositionals: true,
    tokens: true,
  }).tokens;

type Token = ReturnType<typeof tokensOf>[number];

// A flag's own fault, if it has one: given a value it does not take, joined to its value, or missing it.
function flagRefusal(command: Command, flag: Flag, token: Extract<Token, { kind: "option" }>): UsageError | undefined {
  const help = helpFor(command);
  const value = token.value ?? "";
  if (token.inlineValue === true) {
    return flag.value === undefined
      ? refused("unwanted-value", { flag: token.rawName, value, help })
      : refused("equals-form", { given: `${token.rawName}=${value}`, spelling: `${token.rawName} ${value}`, help });
  }
  // The next argument is another flag, not this one's value.
  if (flag.value !== undefined && (token.value === undefined || token.value.startsWith("-"))) return refused("missing-value", { flag: token.rawName, help });
  return undefined;
}

// Every argument is read as what it is, or the first that is not is refused.
function flagsRead(command: Command, args: readonly string[]): FlagsRead | UsageError {
  const flags = COMMANDS[command];
  const values = new Map<string, string[]>();
  const positionals: string[] = [];
  const tokens = tokensOf(flags, args);
  for (const [at, token] of tokens.entries()) {
    if (token.kind === "option-terminator") continue;
    if (token.kind === "positional") {
      const refusal = positionalRefusal(command, flags, tokens[at - 1], token.index, token.value, positionals.length);
      if (refusal !== undefined) return refusal;
      positionals.push(token.value);
      continue;
    }
    const flag = flagNamed(flags, token.name);
    if (flag === undefined) return refused("unknown-flag", { command, flag: token.rawName, help: helpFor(command) });
    const refusal = flagRefusal(command, flag, token);
    if (refusal !== undefined) return refusal;
    const given = values.get(flag.name) ?? [];
    if (given.length > 0 && flag.repeats !== true) return refused("repeated-flag", { flag: token.rawName, help: helpFor(command) });
    values.set(flag.name, [...given, token.value ?? ""]);
  }
  return { values, positionals };
}

const REPORT_FORMATS: readonly string[] = ["md", "json"] satisfies ReportFormat[];

const DEFAULT_OUTPUT: OutputRequest<ReportFormat> = { format: "md", destination: { to: "standard-output" } };

// Each --format names a format and, after its first colon, the file it goes to; with none, Markdown on standard output.
function outputsOf(formats: readonly string[]): OutputRequest<ReportFormat>[] | UsageError {
  const outputs: OutputRequest<ReportFormat>[] = [];
  for (const value of formats) {
    const colon = value.indexOf(":");
    const format = colon === -1 ? value : value.slice(0, colon);
    if (!REPORT_FORMATS.includes(format)) return refused("unknown-format", { format, formats: REPORT_FORMATS.join(", "), help: helpFor("balance") });
    outputs.push({ format: format as ReportFormat, destination: colon === -1 ? { to: "standard-output" } : { to: "file", path: value.slice(colon + 1) } });
  }
  return outputs.length === 0 ? [DEFAULT_OUTPUT] : outputs;
}

// Each input in the order balance's flags list them: as named, or at its default path.
const inputsOf = ({ values }: FlagsRead): InputRequest[] =>
  COMMANDS.balance.flatMap(({ name, input, byDefault }): InputRequest[] => {
    if (input === undefined) return [];
    const named = values.get(name)?.[0];
    if (named !== undefined) return [{ kind: input, path: named, byDefault: false }];
    return byDefault === undefined ? [] : [{ kind: input, path: byDefault, byDefault: true }];
  });

function balanceRequested(read: FlagsRead): RunRequest | UsageError {
  const outputs = outputsOf(read.values.get("format") ?? []);
  if ("ending" in outputs) return outputs;
  const target = read.values.get("target")?.[0];
  const sourceSha = read.values.get("source-sha")?.[0];
  return {
    command: "balance",
    inputs: inputsOf(read),
    ...(target === undefined ? {} : { target }),
    ...(sourceSha === undefined ? {} : { sourceSha }),
    outputs,
    strict: read.values.has("strict"),
    exitZero: read.values.has("exit-zero"),
  };
}

function allocateRequested({ values, positionals }: FlagsRead): RunRequest | UsageError {
  const [featureCode] = positionals;
  if (featureCode === undefined) return refused("no-feature-code", { help: helpFor("allocate") });
  return { command: "allocate", featureCode, asNewFeatureCode: values.has("new") };
}

// Help answers first, unless it follows a command the tool does not have.
export function runRequestOf(args: readonly string[]): RunRequest | UsageError {
  const [command, ...rest] = args;
  if (command === undefined || command === "help") return { command: "help" };
  if (command.startsWith("-")) return args.some(isHelp) ? { command: "help" } : refused("flag-before-command", { flag: command, help: TOP_HELP });
  if (!isCommand(command)) return refused("unknown-command", { command, help: TOP_HELP });
  if (rest.some(isHelp)) return { command: "help", about: command };
  const read = flagsRead(command, rest);
  if ("ending" in read) return read;
  return command === "balance" ? balanceRequested(read) : allocateRequested(read);
}
