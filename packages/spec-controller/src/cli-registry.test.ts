/**
 * @SCN-CLI-006 (@unit) — the balance-help renderer over the two-scope command/flag
 * registry. The renderer walks the `balance` command's per-command scope and emits a
 * line per registered flag (name + arg-placeholder + description) — proof the registry
 * is the single source `balance --help` renders from.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the
 * [SCN-CLI-006] id, matching features/cli-balance.feature and the `// @SCN-CLI-006`
 * @e2e step-block in tests/steps/cliBalance.steps.ts — a grep of the id returns both
 * halves (the @unit renderer proof here + the @e2e real-binary proof there).
 */

import { describe, it, expect } from "vitest";
import { cliRegistry, renderBalanceHelp, renderTopLevelHelp } from "./cli-registry.js";
import { DEFAULT_DEFERRAL_TAGS } from "./deferralTags.js";

describe("[SCN-CLI-006] renderBalanceHelp renders a line per registered balance flag", () => {
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
    const out = renderBalanceHelp(cliRegistry);
    for (const flag of balanceFlags) {
      expect(out).toContain(flag.name);
      expect(out).toContain(flag.description);
      if (flag.arg !== undefined) expect(out).toContain(flag.arg);
    }
    const flagLines = out.split("\n").filter((line) => /(^|\s)--[a-z]/.test(line));
    expect(flagLines).toHaveLength(balanceFlags.length);
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
 * registry itself and asserts NOTHING it declares is missing from its help surface,
 * per scope. Adding a flag/command/modifier to `cliRegistry` without it reaching the
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
  it("finds every per-command balance flag in the balance --help render (per-command scope)", () => {
    // Teeth: iterate the WHOLE per-command scope; a flag added to the registry but not
    // reaching renderBalanceHelp lands in `missing` and reds. Naming the missing flag
    // (rather than a bare toContain per known flag, @SCN-CLI-006) is the completeness
    // framing: the guard reports exactly which registered flag fell out of help.
    const balanceFlags = cliRegistry.commands.find((c) => c.name === "balance")?.flags ?? [];
    expect(balanceFlags.length).toBeGreaterThan(0);
    const out = renderBalanceHelp(cliRegistry);
    const missing = balanceFlags.filter((flag) => !out.includes(flag.name)).map((flag) => flag.name);
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
    const out = renderBalanceHelp(cliRegistry);
    expect(out).toContain("specController.deferralTags");
  });

  it("lists the recognised starter set, single-sourced from DEFAULT_DEFERRAL_TAGS", () => {
    // Teeth: EVERY built-in deferral tag appears in the help, iterated FROM the constant — not a
    // hand-kept copy. A tag added to DEFAULT_DEFERRAL_TAGS but absent from the render reds here, so
    // the documented set cannot drift from the recognised one (the completeness discipline).
    expect(DEFAULT_DEFERRAL_TAGS.length).toBeGreaterThan(0);
    const out = renderBalanceHelp(cliRegistry);
    const missing = DEFAULT_DEFERRAL_TAGS.filter((tag) => !out.includes(tag));
    expect(missing).toEqual([]);
  });
});
