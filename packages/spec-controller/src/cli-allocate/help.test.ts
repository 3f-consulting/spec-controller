import { beforeEach, describe, it, expect } from "vitest";
import {
  allocateCommand,
  cliRegistry,
  renderCommandHelp,
  type CliRegistry,
  type CommandSpec,
  type PositionalSpec,
} from "../cliRegistry.js";
import { AppMessage } from "../messages.js";
import { message } from "../appText.js";
import { withAllocatePositional } from "./registry.test-utils.js";

describe("[CLM-ALC-013] allocate --help answers first, listing <FFF> and --new", () => {
  let help: string;
  let allocatePositionals: readonly PositionalSpec[];

  beforeEach(() => {
    help = renderCommandHelp(allocateCommand);
    allocatePositionals = cliRegistry.commands.find((c) => c.name === "allocate")?.positionals ?? [];
  });

  it.each([
    ["shows how the command is called, with its feature part", /^Usage: spec-controller allocate <FFF> \[options\]$/m],
    ["names the feature part it takes, and what it is", /^ {2}<FFF>\s+The feature part: a feature file's header code/m],
  ] as const)("%s", (_title, line) => {
    expect(help).toMatch(line);
  });

  it("lists --new and --help among its options", () => {
    expect(help).toMatch(/^ {2}--new\s+Start a part/m);
    expect(help).toMatch(/^ {2}--help, -h\s+Show this help and exit\.$/m);
  });

  function argumentsBlockOf(registry: CliRegistry, positionals: readonly PositionalSpec[]): string[] {
    const lines = renderCommandHelp(registry.commands.find((c) => c.name === "allocate") as CommandSpec).split("\n");
    expect(lines[0]).toBe(`spec-controller allocate — ${message(AppMessage.AllocateSummary)}`);
    expect(lines.slice(1, 5)).toEqual([
      "",
      `${message(AppMessage.HelpUsage)} spec-controller allocate ${positionals.map((p) => p.name).join(" ")} [options]`,
      "",
      message(AppMessage.HelpArguments),
    ]);
    const rows = lines.slice(5, 5 + positionals.length);
    expect(lines[5 + positionals.length]).toBe("");
    expect(lines[6 + positionals.length]).toBe(message(AppMessage.HelpOptions));
    return rows;
  }

  function expectAlignedRows(rows: readonly string[], positionals: readonly PositionalSpec[]): void {
    const descriptionAt = 2 + Math.max(...positionals.map((p) => p.name.length)) + 2;
    expect(rows).toHaveLength(positionals.length);
    rows.forEach((row, i) => {
      const positional = positionals[i] as PositionalSpec;
      expect(row.slice(0, descriptionAt)).toBe(`  ${positional.name}`.padEnd(descriptionAt));
      expect(row.slice(descriptionAt)).toBe(positional.description);
    });
  }

  it("opens with its title, a blank line, the usage line naming its part, a blank line, the arguments heading and the part's row, before its options", () => {
    expect(allocatePositionals.map((p) => p.name)).toEqual(["<FFF>"]);
    expectAlignedRows(argumentsBlockOf(cliRegistry, allocatePositionals), allocatePositionals);
  });

  it("names every part a registry gives it in the usage line, space-separated, and aligns each description at the longest part's width", () => {
    const longer: PositionalSpec = { name: "<LONGER-PART>", description: "A part registered later." };
    const positionals = [...allocatePositionals, longer];
    expectAlignedRows(argumentsBlockOf(withAllocatePositional(longer), positionals), positionals);
  });
});
