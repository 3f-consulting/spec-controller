// Every input a run can read, in the order the provenance names them.
export const INPUT_KINDS = ["features", "vitest", "jest", "pytest", "junit", "rspec", "cucumber", "workflows", "stepRecord", "manifest"] as const;

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

const BALANCE_FLAGS: readonly Flag[] = [
  { name: "features", value: "<dir>", input: "features", byDefault: "features" },
  { name: "vitest", value: "<report.json>", input: "vitest" },
  { name: "jest", value: "<report.json>", input: "jest" },
  { name: "pytest", value: "<report.xml>", input: "pytest" },
  { name: "junit", value: "<report.xml|dir>", input: "junit" },
  { name: "rspec", value: "<report.json>", input: "rspec" },
  { name: "cucumber", value: "<report.json>", input: "cucumber" },
  { name: "ci", value: "<workflow.yml|dir>", input: "workflows", byDefault: ".github/workflows" },
  { name: "ci-steps", value: "<record.json>", input: "stepRecord" },
  { name: "package-json", value: "<path>", input: "manifest", byDefault: "package.json" },
  { name: "target", value: "<name>" },
  { name: "source-sha", value: "<sha>" },
  { name: "format", value: "<fmt>[:<path>]", repeats: true },
  { name: "strict" },
  { name: "exit-zero" },
  HELP,
];

const ALLOCATE_FLAGS: readonly Flag[] = [{ name: "new" }, HELP];

export const COMMANDS = { balance: BALANCE_FLAGS, allocate: ALLOCATE_FLAGS } as const;

export type Command = keyof typeof COMMANDS;

export const isCommand = (word: string | undefined): word is Command => word !== undefined && Object.hasOwn(COMMANDS, word);

export const isHelp = (arg: string): boolean => arg === "--help" || arg === "-h";
