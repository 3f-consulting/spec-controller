import type { OutputRequest } from "@3f-consulting/spec-controller-core";
import { parseArgs } from "node:util";
import type { Refusal } from "../runEnding/runEnding.js";
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

export interface UsageError {
  readonly refusals: readonly Refusal[];
}

const TOP_HELP = "spec-controller --help";

const helpFor = (command: Command): string => `spec-controller ${command} --help`;

const refused = (key: string, values: Readonly<Record<string, string>>): UsageError => ({ refusals: [{ key, values }] });

// Each value-taking flag's values in the order given, each other flag given, and the arguments that are no flag's.
interface FlagsRead {
  readonly values: ReadonlyMap<string, readonly string[]>;
  readonly on: ReadonlySet<string>;
  readonly positionals: readonly string[];
}

// An argument straight after a flag that takes no value was given to it as a value.
function positionalRefusal(command: Command, flags: readonly Flag[], before: Token | undefined, argument: string, positionals: number): UsageError | undefined {
  const help = helpFor(command);
  if (command === "allocate" && positionals === 0) return undefined;
  if (before?.kind === "option" && flags.some(({ name, value }) => name === before.name && value === undefined)) {
    return refused("unwanted-value", { flag: before.rawName, value: argument, help });
  }
  return command === "allocate" ? refused("extra-argument", { argument, help }) : refused("stray-argument", { argument, help });
}

const tokensOf = (flags: readonly Flag[], args: readonly string[]) =>
  parseArgs({
    args: [...args],
    options: Object.fromEntries(
      flags.map((flag) => [flag.name, { type: flag.value === undefined ? ("boolean" as const) : ("string" as const) }]),
    ),
    strict: false,
    allowPositionals: true,
    tokens: true,
  }).tokens;

type Token = ReturnType<typeof tokensOf>[number];

// A flag's own fault, if it has one: joined to its value, missing it, or given again when it does not repeat.
function flagRefusal(command: Command, flag: Flag, token: Extract<Token, { kind: "option" }>, given: boolean): UsageError | undefined {
  const help = helpFor(command);
  if (token.inlineValue === true) return refused("equals-form", { given: `${token.rawName}=${String(token.value)}`, spelling: `${token.rawName} ${String(token.value)}`, help });
  // The next argument is another flag, not this one's value.
  if (flag.value !== undefined && (token.value === undefined || token.value.startsWith("-"))) return refused("missing-value", { flag: token.rawName, help });
  if (given && flag.repeats !== true) return refused("repeated-flag", { flag: token.rawName, help });
  return undefined;
}

// Every argument is read as what it is, or the first that is not is refused.
function flagsRead(command: Command, args: readonly string[]): FlagsRead | UsageError {
  const flags = COMMANDS[command];
  const values = new Map<string, string[]>();
  const on = new Set<string>();
  const positionals: string[] = [];
  const tokens = tokensOf(flags, args);
  for (const [at, token] of tokens.entries()) {
    // -- is no flag any command takes.
    if (token.kind === "option-terminator") return refused("unknown-flag", { command, flag: "--", help: helpFor(command) });
    if (token.kind === "positional") {
      const refusal = positionalRefusal(command, flags, tokens[at - 1], token.value, positionals.length);
      if (refusal !== undefined) return refusal;
      positionals.push(token.value);
      continue;
    }
    const flag = flags.find(({ name }) => name === token.name);
    if (flag === undefined) return refused("unknown-flag", { command, flag: token.rawName, help: helpFor(command) });
    const refusal = flagRefusal(command, flag, token, values.has(flag.name) || on.has(flag.name));
    if (refusal !== undefined) return refusal;
    if (token.value === undefined) on.add(flag.name);
    else values.set(flag.name, [...(values.get(flag.name) ?? []), token.value]);
  }
  return { values, on, positionals };
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
  if ("refusals" in outputs) return outputs;
  return {
    command: "balance",
    inputs: inputsOf(read),
    target: read.values.get("target")?.[0],
    sourceSha: read.values.get("source-sha")?.[0],
    outputs,
    strict: read.on.has("strict"),
    exitZero: read.on.has("exit-zero"),
  };
}

function allocateRequested({ on, positionals }: FlagsRead): RunRequest | UsageError {
  const [featureCode] = positionals;
  if (featureCode === undefined) return refused("no-feature-code", { help: helpFor("allocate") });
  return { command: "allocate", featureCode, asNewFeatureCode: on.has("new") };
}

// Help answers first, unless it follows a command the tool does not have.
export function runRequestOf(args: readonly string[]): RunRequest | UsageError {
  const [command, ...rest] = args;
  if (command === undefined || command === "help") return { command: "help" };
  if (command.startsWith("-")) return args.some(isHelp) ? { command: "help" } : refused("flag-before-command", { flag: command, help: TOP_HELP });
  if (!isCommand(command)) return refused("unknown-command", { command, help: TOP_HELP });
  if (rest.some(isHelp)) return { command: "help", about: command };
  const read = flagsRead(command, rest);
  if ("refusals" in read) return read;
  return command === "balance" ? balanceRequested(read) : allocateRequested(read);
}
