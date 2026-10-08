import { describe, it, expect } from "vitest";
import {
  allocateCommand,
  balanceCommand,
  cliRegistry,
  renderCommandHelp,
  renderTopLevelHelp,
  type CliRegistry,
  type CommandSpec,
  type FlagSpec,
} from "./cli-registry.js";
import { DEFAULT_DEFERRAL_TAGS } from "./deferralTags.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

describe("[SCN-CLI-006] renderCommandHelp renders a line per flag the registry gives that command", () => {
  const balanceFlags = cliRegistry.commands.find((c) => c.name === "balance")?.flags ?? [];

  it("registers the balance command's full flag scope in the registry (the single source)", () => {
    const names = balanceFlags.map((f) => f.name);
    for (const expected of [
      "--features",
      "--vitest",
      "--cucumber",
      "--ci",
      "--package-json",
      "--target",
      "--source-sha",
      "--format",
      "--render-from-json",
      "--help",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("renders one line per registered flag, each carrying its name, arg-placeholder and description", () => {
    expect(balanceFlags.length).toBeGreaterThan(0);
    const out = renderCommandHelp(balanceCommand);
    for (const flag of balanceFlags) {
      expect(out).toContain(flag.name);
      expect(out).toContain(flag.description);
      if (flag.arg !== undefined) expect(out).toContain(flag.arg);
    }
    const flagLines = out.split("\n").filter((line) => /(^|\s)--[a-z]/.test(line));
    expect(flagLines).toHaveLength(balanceFlags.length);
  });

  it("renders whichever command it is given, not the one the renderer was written against", () => {
    const twoCommands: CliRegistry = {
      global: cliRegistry.global,
      commands: [
        ...cliRegistry.commands,
        {
          name: "second",
          summary: "A second registered command — the case the renderer was blind to.",
          flags: [{ name: "--only-mine", arg: "<dir>", description: "A flag only the second command carries." }],
        },
      ],
    };
    const out = renderCommandHelp(twoCommands.commands.find((c) => c.name === "second") as CommandSpec);
    expect(out).toContain("--only-mine");
    expect(out).toContain("A flag only the second command carries.");
    expect(out).toContain("A second registered command — the case the renderer was blind to.");
    expect(out).not.toContain("--render-from-json");
    expect(out).not.toContain("specController.deferralTags");
  });

  function commandOf(name: string): CommandSpec {
    const command = cliRegistry.commands.find((c) => c.name === name);
    expect(command).toBeDefined();
    return command as CommandSpec;
  }

  function expectFlagRows(rows: string[], flags: readonly FlagSpec[]): void {
    expect(rows).toHaveLength(flags.length);
    rows.forEach((row, i) => {
      expect(row.startsWith(`  ${flags[i]?.name}`)).toBe(true);
      expect(row.endsWith(flags[i]?.description ?? "")).toBe(true);
    });
  }

  it("lays out balance's help as its title, a blank line, the options heading and rows, a blank line, then its configuration block", () => {
    const balance = commandOf("balance");
    const configHelp = balance.configHelp ?? [];
    expect(configHelp.length).toBeGreaterThan(0);
    const lines = renderCommandHelp(balanceCommand).split("\n");
    expect(lines.slice(0, 3)).toEqual([
      `spec-controller balance — ${APP_MESSAGES[AppMessage.BalanceSummary]()}`,
      "",
      APP_MESSAGES[AppMessage.HelpOptions](),
    ]);
    expectFlagRows(lines.slice(3, 3 + balance.flags.length), balance.flags);
    expect(lines.slice(3 + balance.flags.length)).toEqual(["", ...configHelp]);
  });

  it("shows, on each balance flag's row that takes a value, a placeholder right after the flag's name", () => {
    const valueFlags = balanceCommand.flags.filter((flag) => flag.arg !== undefined);
    expect(valueFlags.length).toBeGreaterThan(0);
    const rows = renderCommandHelp(balanceCommand).split("\n");
    for (const flag of valueFlags) {
      const row = rows.find((line) => line.startsWith(`  ${flag.name} `));
      expect(row, flag.name).toBeDefined();
      expect(row?.slice(`  ${flag.name} `.length), flag.name).toMatch(/^<\S/);
    }
  });

  it("indents balance's configuration key by two spaces and each line explaining it by six", () => {
    const lines = renderCommandHelp(balanceCommand).split("\n");
    const headingAt = lines.indexOf(APP_MESSAGES[AppMessage.ConfigurationHeading]());
    expect(headingAt).toBeGreaterThan(0);
    const [key, ...explanation] = lines.slice(headingAt + 1);
    expect(key).toMatch(/^ {2}\S/);
    expect(explanation).toHaveLength(3);
    for (const line of explanation) expect(line).toMatch(/^ {6}\S/);
  });

  it("lists the built-in deferral tags in balance's configuration block, each as its tag, a comma and a space apart", () => {
    expect(DEFAULT_DEFERRAL_TAGS.length).toBeGreaterThan(1);
    const out = renderCommandHelp(balanceCommand);
    expect(out).toContain(DEFAULT_DEFERRAL_TAGS.map((tag) => `@${tag}`).join(", "));
  });

  it("ends allocate's help at its last option row, with no configuration block and no trailing blank line, as it has no configuration", () => {
    const allocate = commandOf("allocate");
    expect(allocate.configHelp).toBeUndefined();
    const lines = renderCommandHelp(allocateCommand).split("\n");
    expect(lines[0]).toBe(`spec-controller allocate — ${APP_MESSAGES[AppMessage.AllocateSummary]()}`);
    const optionsAt = lines.indexOf(APP_MESSAGES[AppMessage.HelpOptions]());
    expect(optionsAt).toBeGreaterThan(0);
    expect(lines[optionsAt - 1]).toBe("");
    expectFlagRows(lines.slice(optionsAt + 1), allocate.flags);
  });
});

describe("[SCN-CLI-007] renderTopLevelHelp renders the commands and the global scope", () => {
  it("lists each registered command by name and its exact registry summary", () => {
    expect(cliRegistry.commands.length).toBeGreaterThan(0);
    const out = renderTopLevelHelp(cliRegistry);
    for (const command of cliRegistry.commands) {
      expect(out).toContain(command.name);
      expect(out).toContain(command.summary);
    }
  });

  it("documents each global host modifier — name, arg-placeholder and exact description", () => {
    expect(cliRegistry.global.length).toBeGreaterThanOrEqual(2);
    const out = renderTopLevelHelp(cliRegistry);
    for (const flag of cliRegistry.global) {
      expect(out).toContain(flag.name);
      expect(out).toContain(flag.description);
      if (flag.arg !== undefined) expect(out).toContain(flag.arg);
    }
    expect(out).toContain("--store");
    expect(out).toContain("--run-id");
  });

  it("lays out the title, usage, commands, host modifiers and pointer as blank-line-separated blocks", () => {
    const lines = renderTopLevelHelp(cliRegistry).split("\n");
    const commandsAt = 6;
    const modifiersAt = commandsAt + cliRegistry.commands.length + 2;
    expect(lines.slice(0, commandsAt)).toEqual([
      APP_MESSAGES[AppMessage.HelpTitle](),
      "",
      APP_MESSAGES[AppMessage.HelpUsage](),
      lines[3],
      "",
      APP_MESSAGES[AppMessage.HelpCommands](),
    ]);
    expect(lines[modifiersAt - 2]).toBe("");
    expect(lines[modifiersAt - 1]).toBe(APP_MESSAGES[AppMessage.HelpHostModifiers]());
    expect(lines.slice(modifiersAt + cliRegistry.global.length)).toEqual(["", APP_MESSAGES[AppMessage.HelpPointer]()]);
  });

  it("lists every host modifier on the usage line in brackets, in registry order, before the command", () => {
    const usage = renderTopLevelHelp(cliRegistry).split("\n")[3] ?? "";
    const match = /^ {2}spec-controller (.*) <command> \[command-args\]$/.exec(usage);
    expect(match).not.toBeNull();
    const groups = (match?.[1] ?? "").split("] [");
    expect(groups).toHaveLength(cliRegistry.global.length);
    expect(match?.[1]?.startsWith("[")).toBe(true);
    expect(match?.[1]?.endsWith("]")).toBe(true);
    cliRegistry.global.forEach((flag, i) => {
      const group = (groups[i] ?? "").replace(/^\[|\]$/g, "");
      expect(group.startsWith(flag.name)).toBe(true);
      if (flag.arg !== undefined) expect(group.endsWith(` ${flag.arg}`)).toBe(true);
    });
  });

  function rowsOf(block: string[], descriptions: string[]): { label: string; column: number }[] {
    return block.map((row, i) => {
      const description = descriptions[i] ?? "";
      expect(row.startsWith("  ")).toBe(true);
      expect(row.endsWith(description)).toBe(true);
      const column = row.length - description.length;
      return { label: row.slice(2, column).trimEnd(), column };
    });
  }

  it("aligns every command's summary one gutter of four past the longest command name", () => {
    const lines = renderTopLevelHelp(cliRegistry).split("\n");
    const commands = cliRegistry.commands;
    const rows = rowsOf(
      lines.slice(6, 6 + commands.length),
      commands.map((c) => c.summary),
    );
    const longest = Math.max(...commands.map((c) => c.name.length));
    expect(rows.map((r) => r.label)).toEqual(commands.map((c) => c.name));
    for (const row of rows) expect(row.column).toBe(2 + longest + 4);
  });

  it("aligns every host modifier's description one gutter of three past the longest modifier label", () => {
    const lines = renderTopLevelHelp(cliRegistry).split("\n");
    const modifiers = cliRegistry.global;
    const at = 6 + cliRegistry.commands.length + 2;
    const rows = rowsOf(
      lines.slice(at, at + modifiers.length),
      modifiers.map((f) => f.description),
    );
    const usageGroups = (/^ {2}spec-controller (.*) <command>/.exec(lines[3] ?? "")?.[1] ?? "")
      .split("] [")
      .map((group) => group.replace(/^\[|\]$/g, ""));
    expect(rows.map((r) => r.label)).toEqual(usageGroups);
    const longest = Math.max(...rows.map((r) => r.label.length));
    expect(new Set(rows.map((r) => r.label.length)).size).toBeGreaterThan(1);
    for (const row of rows) expect(row.column).toBe(2 + longest + 3);
  });
});

describe("[SCN-CLI-008] the completeness guard — no registry entry is missing from its help surface", () => {
  it("finds every command's registry entries in that command's --help render (per-command scope)", () => {
    const entryCount = cliRegistry.commands.reduce(
      (total, command) =>
        total + command.flags.length + (command.positionals?.length ?? 0) + (command.configHelp?.length ?? 0),
      0,
    );
    expect(entryCount).toBeGreaterThan(0);
    const missing = cliRegistry.commands.flatMap((command) => {
      const out = renderCommandHelp(command);
      return [
        ...command.flags.filter((flag) => !out.includes(flag.name)).map((flag) => `${command.name} ${flag.name}`),
        ...(command.positionals ?? [])
          .filter((positional) => !out.includes(positional.name) || !out.includes(positional.description))
          .map((positional) => `${command.name} ${positional.name}`),
        ...(command.configHelp ?? [])
          .filter((line) => !out.includes(line))
          .map((line) => `${command.name} configHelp: ${line.trim()}`),
      ];
    });
    expect(missing).toEqual([]);
  });

  it("counts a positional argument among the entries it guards, so a command's positionals cannot fall out unseen", () => {
    const positionals = cliRegistry.commands.flatMap((command) => command.positionals ?? []);
    expect(positionals.length).toBeGreaterThan(0);
  });

  it("finds every global host modifier in the top-level --help render (global scope)", () => {
    expect(cliRegistry.global.length).toBeGreaterThan(0);
    const out = renderTopLevelHelp(cliRegistry);
    const missing = cliRegistry.global.filter((flag) => !out.includes(flag.name)).map((flag) => flag.name);
    expect(missing).toEqual([]);
  });

  it("finds every registered command in the top-level --help render (command scope)", () => {
    expect(cliRegistry.commands.length).toBeGreaterThan(0);
    const out = renderTopLevelHelp(cliRegistry);
    const missing = cliRegistry.commands.filter((command) => !out.includes(command.name)).map((command) => command.name);
    expect(missing).toEqual([]);
  });
});
