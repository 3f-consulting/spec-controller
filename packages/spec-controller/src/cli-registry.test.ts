/**
 * @SCN-CLI-006 (@unit) — the per-command help renderer over the two-scope command/flag
 * registry. The renderer walks THE NAMED command's per-command scope and emits a line
 * per registered flag (name + arg-placeholder + description) — proof the registry is the
 * single source `<command> --help` renders from. The command is a PARAMETER (3F-3298);
 * before that it was found by the name `balance` inside the renderer, so a second
 * registered command had no help surface at all — not an empty one, no way to ask.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the
 * [SCN-CLI-006] id, matching features/cli-balance.feature and the `// @SCN-CLI-006`
 * @e2e step-block in tests/steps/cliBalance.steps.ts — a grep of the id returns both
 * halves (the @unit renderer proof here + the @e2e real-binary proof there).
 */

import { describe, it, expect } from "vitest";
import { cliRegistry, renderCommandHelp, renderTopLevelHelp, type CliRegistry } from "./cli-registry.js";
import { DEFAULT_DEFERRAL_TAGS } from "./deferralTags.js";

describe("[SCN-CLI-006] renderCommandHelp renders a line per flag the registry gives that command", () => {
  const balanceFlags = cliRegistry.commands.find((c) => c.name === "balance")?.flags ?? [];

  it("registers the balance command's full flag scope in the registry (the single source)", () => {
    // Teeth: the registry IS the single source — balance's 9 flags + --help/-h must be
    // registered, so the renderer, the completeness guard (@SCN-CLI-008) and the
    // registry-bounded parser (@SCN-CLI-009) all see the same set. A flag that exists but
    // isn't registered would silently drop out of help — exactly the drift this closes.
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
    // Teeth: the renderer is driven BY the registry, not a hand-kept list — every
    // registered flag's name, its value placeholder, and its migrated description appear,
    // and there is EXACTLY one rendered flag line per registered flag (none dropped, none
    // doubled). A renderer that hard-coded a subset, or dropped the arg/description, reds.
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
    // Teeth, and the arm that could not be WRITTEN against the old signature: with a second
    // command registered, ask for THAT command. `renderBalanceHelp(registry)` took no command
    // argument, so it rendered `balance` whatever the registry held — a second command's
    // scope was unreachable (the 3F-3298 plant transcript, on the ticket and the commit).
    // Constructed locally, never pushed into `cliRegistry`: standing up a real second command
    // is 3F-3300's, and this arm is about the parameter, not about which commands exist.
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
    // And it is the SECOND command's scope, not balance's, so no balance-only flag leaks in.
    expect(out).not.toContain("--render-from-json");
    // Nor balance's config block: `specController.deferralTags` is a field BALANCE reads
    // (@SCN-PND-021), so it is carried on balance's registry entry rather than appended
    // unconditionally by the renderer. Appended unconditionally it would document, under
    // every future command, a config field that command does not read.
    expect(out).not.toContain("specController.deferralTags");
  });
});

describe("[SCN-CLI-007] renderTopLevelHelp renders the commands and the global scope", () => {
  it("lists each registered command by name and its exact registry summary", () => {
    // Teeth: the top-level surface is driven BY the registry's command set — every
    // registered command's name AND its verbatim summary appear. A renderer that dropped a
    // command, or reworded/wrapped its summary (as the hand-kept USAGE did), reds.
    expect(cliRegistry.commands.length).toBeGreaterThan(0);
    const out = renderTopLevelHelp(cliRegistry);
    for (const command of cliRegistry.commands) {
      expect(out).toContain(command.name);
      expect(out).toContain(command.summary);
    }
  });

  it("documents each global host modifier — name, arg-placeholder and exact description", () => {
    // Teeth: the global scope (`--store <root>`, `--run-id <id>`) is rendered from the
    // registry's global list, each with its verbatim description contiguous — proof the
    // top-level help sources the host modifiers from the registry, not a hand-kept string.
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

/**
 * @SCN-CLI-008 (@unit) — the completeness guard. Where @SCN-CLI-006/007 pin each
 * renderer against a KNOWN set, this guard is the structural capstone: it walks the
 * registry itself and asserts NOTHING it LISTS is missing from its help surface,
 * per scope. The per-command scope means EVERY registered command (3F-3299), each
 * rendered through `renderCommandHelp` and checked against its own entries; it used to
 * name `balance` and render that alone, so a second command's flags were unwalked. Adding a flag/command/modifier to `cliRegistry` without it reaching the
 * matching renderer leaves a non-empty `missing` set — the guard reds. That is the
 * mechanism that makes "all further additions reach help" structural, not a note (the
 * Pending-Items increment's `--strict` reds this until it is in help).
 *
 * @unit-only: a structural test over the registry + renderers — no binary, no runtime.
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the
 * [SCN-CLI-008] id, matching the @unit @SCN-CLI-008 scenario in
 * features/cli-balance.feature (a grep of the id returns both halves).
 */
describe("[SCN-CLI-008] the completeness guard — no registry entry is missing from its help surface", () => {
  it("finds every command's registry entries in that command's --help render (per-command scope)", () => {
    // Teeth: iterate EVERY command's scope, not `balance`'s looked up by literal. The old
    // arm rendered the one command it named and checked that render, which read as
    // structural and was not — a flag registered on a SECOND command could be absent from
    // that command's help and this arm stayed green, because it never rendered that
    // command at all. Each miss is reported as `<command> <entry>`, so a failure names
    // which command's entry fell out rather than only that something did.
    //
    // A command's `configHelp` is a registry entry too — 3F-3298 moved balance's
    // `specController.deferralTags` block onto its own entry precisely so it renders under
    // the command that reads that field and under nothing else, which is a per-command
    // help surface obligation exactly as its flags are.
    const entryCount = cliRegistry.commands.reduce(
      (total, command) => total + command.flags.length + (command.configHelp?.length ?? 0),
      0,
    );
    // The floor the sibling arms carry, kept as the set widens: a loop over an empty set
    // reports a clean workspace. Zero commands, and commands whose scopes are all empty,
    // both collapse to zero entries here.
    expect(entryCount).toBeGreaterThan(0);
    const missing = cliRegistry.commands.flatMap((command) => {
      const out = renderCommandHelp(cliRegistry, command.name);
      return [
        ...command.flags.filter((flag) => !out.includes(flag.name)).map((flag) => `${command.name} ${flag.name}`),
        ...(command.configHelp ?? [])
          .filter((line) => !out.includes(line))
          .map((line) => `${command.name} configHelp: ${line.trim()}`),
      ];
    });
    expect(missing).toEqual([]);
  });

  it("finds every global host modifier in the top-level --help render (global scope)", () => {
    // Teeth: iterate the WHOLE global scope; a modifier added to cliRegistry.global but
    // not reaching renderTopLevelHelp lands in `missing` and reds.
    expect(cliRegistry.global.length).toBeGreaterThan(0);
    const out = renderTopLevelHelp(cliRegistry);
    const missing = cliRegistry.global.filter((flag) => !out.includes(flag.name)).map((flag) => flag.name);
    expect(missing).toEqual([]);
  });

  it("finds every registered command in the top-level --help render (command scope)", () => {
    // Teeth: iterate the WHOLE command set; a command added to cliRegistry.commands but
    // not reaching renderTopLevelHelp lands in `missing` and reds.
    expect(cliRegistry.commands.length).toBeGreaterThan(0);
    const out = renderTopLevelHelp(cliRegistry);
    const missing = cliRegistry.commands.filter((command) => !out.includes(command.name)).map((command) => command.name);
    expect(missing).toEqual([]);
  });
});

/**
 * @SCN-PND-021 (@unit) — `balance --help` documents the `specController.deferralTags` config field
 * and lists the recognised starter set, SINGLE-SOURCED from DEFAULT_DEFERRAL_TAGS (the 3F-1405
 * completeness discipline: the help renderer reads the constant, it does not hardcode the list, so
 * the documented set can never drift from the recognised one). The config surface is discoverable.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the [SCN-PND-021] id,
 * matching features/pending-items.feature and the @integration arm in
 * tests/steps/pendingItems.steps.ts (a grep of the id returns both halves), plus the config-union
 * @unit arm in packages/spec-controller/src/ingest/ingestQualityChecks.test.ts.
 */
describe("[SCN-PND-021] balance --help documents specController.deferralTags and the starter set", () => {
  it("documents the specController.deferralTags config field", () => {
    // Teeth: the help surface names the config field so a project can discover it. Reds while the
    // help renderer says nothing about the config namespace.
    const out = renderCommandHelp(cliRegistry, "balance");
    expect(out).toContain("specController.deferralTags");
  });

  it("lists the recognised starter set, single-sourced from DEFAULT_DEFERRAL_TAGS", () => {
    // Teeth: EVERY built-in deferral tag appears in the help, iterated FROM the constant — not a
    // hand-kept copy. A tag added to DEFAULT_DEFERRAL_TAGS but absent from the render reds here, so
    // the documented set cannot drift from the recognised one (the completeness discipline).
    expect(DEFAULT_DEFERRAL_TAGS.length).toBeGreaterThan(0);
    const out = renderCommandHelp(cliRegistry, "balance");
    const missing = DEFAULT_DEFERRAL_TAGS.filter((tag) => !out.includes(tag));
    expect(missing).toEqual([]);
  });
});
