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
import { cliRegistry, renderBalanceHelp } from "./cli-registry.js";

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
