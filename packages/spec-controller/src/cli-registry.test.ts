import { describe, it, expect } from "vitest";
import { cliRegistry, renderCommandHelp, renderTopLevelHelp, type CliRegistry } from "./cli-registry.js";
import { DEFAULT_DEFERRAL_TAGS } from "./deferralTags.js";

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
    const out = renderCommandHelp(cliRegistry, "balance");
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
    const out = renderCommandHelp(twoCommands, "second");
    expect(out).toContain("--only-mine");
    expect(out).toContain("A flag only the second command carries.");
    expect(out).toContain("A second registered command — the case the renderer was blind to.");
    expect(out).not.toContain("--render-from-json");
    expect(out).not.toContain("specController.deferralTags");
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
      const out = renderCommandHelp(cliRegistry, command.name);
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

describe("[SCN-PND-021] balance --help documents specController.deferralTags and the starter set", () => {
  it("documents the specController.deferralTags config field", () => {
    const out = renderCommandHelp(cliRegistry, "balance");
    expect(out).toContain("specController.deferralTags");
  });

  it("lists the recognised starter set, single-sourced from DEFAULT_DEFERRAL_TAGS", () => {
    expect(DEFAULT_DEFERRAL_TAGS.length).toBeGreaterThan(0);
    const out = renderCommandHelp(cliRegistry, "balance");
    const missing = DEFAULT_DEFERRAL_TAGS.filter((tag) => !out.includes(tag));
    expect(missing).toEqual([]);
  });
});
