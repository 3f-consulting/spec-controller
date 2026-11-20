import { BALANCE_SETTINGS, EVIDENCE_REPORT_FORMATS, type BalanceSettingName } from "@3f-consulting/spec-controller-core";

// Every input a run can read, in the order the provenance names them.
export const INPUT_KINDS = ["features", ...EVIDENCE_REPORT_FORMATS.map(({ kind }) => kind), "workflows", "stepRecord", "manifest"] as const;

export type InputKind = (typeof INPUT_KINDS)[number];

// A flag a command takes. Its description is the catalogue's text under flag-<name>.
export interface Flag {
  readonly name: string;
  readonly short?: string;
  // What its value is, in the help; a flag with none takes no value.
  readonly value?: string;
  readonly repeats?: boolean;
  readonly input?: InputKind;
  // The path an input left out is read from.
  readonly byDefault?: string;
}

const HELP: Flag = { name: "help", short: "h" };

// The settings file balance reads; it is no setting of its own.
const CONFIG: Flag = { name: "config", value: "<file>" };

const FEATURES: Flag = { name: "features", value: "<dir>", input: "features", byDefault: "features" };

const RUNNER: Omit<Flag, "name"> = { value: "<runner>[:<format>:<report>]" };

// What the help says each of balance's settings takes, and the input it names.
const BALANCE_FLAG_DETAILS: Readonly<Record<BalanceSettingName, Omit<Flag, "name" | "repeats">>> = {
  features: FEATURES,
  unit: RUNNER,
  integration: RUNNER,
  e2e: RUNNER,
  performance: RUNNER,
  "not-check": { value: "<workflow>:<job>:<step>" },
  "deferral-tag": { value: "<tag>" },
  ci: { value: "<workflow.yml|dir>", input: "workflows", byDefault: ".github/workflows" },
  "ci-steps": { value: "<record.json>", input: "stepRecord" },
  "package-json": { value: "<path>", input: "manifest", byDefault: "package.json" },
  target: { value: "<name>" },
  "source-sha": { value: "<sha>" },
  format: { value: "<fmt>[:<path>]" },
  strict: {},
  "exit-zero": {},
  "written-claims-only": {},
};

// A flag for each of balance's settings, in their order; a setting that takes a list repeats.
const BALANCE_FLAGS: readonly Flag[] = [
  ...BALANCE_SETTINGS.map(({ name, shape }): Flag => ({ ...BALANCE_FLAG_DETAILS[name], name, ...(shape === "list" && { repeats: true }) })),
  CONFIG,
  HELP,
];

const ALLOCATE_FLAGS: readonly Flag[] = [FEATURES, { name: "new" }, HELP];

export const COMMANDS = { balance: BALANCE_FLAGS, allocate: ALLOCATE_FLAGS } as const;

export type Command = keyof typeof COMMANDS;

export const isCommand = (word: string): word is Command => Object.hasOwn(COMMANDS, word);

export const isHelp = (arg: string): boolean => arg === "--help" || arg === "-h";
