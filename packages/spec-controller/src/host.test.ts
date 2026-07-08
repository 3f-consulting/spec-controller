/**
 * The @unit arm of @SCN-RMG-004 — the host rule in isolation.
 *
 * Bidirectional evidence: the describe/it carry SCN-RMG-004, matching
 * features/run-management.feature's @SCN-RMG-004 scenario (whose @e2e arm proves the
 * same behaviour through the real binary).
 */

import { describe, it, expect } from "vitest";
import { parseHostInvocation, wrapCommandArgv, peekFlag } from "./host.js";

describe("[SCN-RMG-004] the global --store host modifier parses and wraps before dispatch", () => {
  it("parses leading --store/--run-id as host options and leaves the command its clean args", () => {
    const inv = parseHostInvocation(["--store", "/s", "--run-id", "r1", "balance", "--features", "f"]);
    expect(inv).toEqual({ store: "/s", runId: "r1", command: "balance", commandArgs: ["--features", "f"] });
  });

  it("reports no store and passes the command's args untouched when no --store is given", () => {
    const inv = parseHostInvocation(["balance", "--features", "f"]);
    expect(inv).toEqual({ store: undefined, runId: undefined, command: "balance", commandArgs: ["--features", "f"] });
  });

  it("does NOT consume a --store that appears AFTER the command (global before command)", () => {
    // Teeth: --store is a HOST option only in leading position. After the command it is the
    // command's own arg — never a host store directive. A parser that consumed it anywhere
    // would silently store when the operator meant to pass a flag to the command.
    const inv = parseHostInvocation(["balance", "--store", "/s"]);
    expect(inv.store).toBeUndefined();
    expect(inv.command).toBe("balance");
    expect(inv.commandArgs).toEqual(["--store", "/s"]);
  });

  it("wraps the command's clean args with one --format per store-dir spec", () => {
    // Teeth: the wrapped argv is the command's own args PLUS a --format per spec, so the
    // command's writer produces the stored artefacts — no writer duplication, byte-identical.
    expect(
      wrapCommandArgv(
        ["--features", "f"],
        ["md:/d/spec-reconciliation.md", "json:/d/spec-reconciliation.json"],
      ),
    ).toEqual([
      "--features",
      "f",
      "--format",
      "md:/d/spec-reconciliation.md",
      "--format",
      "json:/d/spec-reconciliation.json",
    ]);
  });

  it("peeks a provenance flag's value without consuming it", () => {
    expect(peekFlag(["--target", "demo", "--features", "f"], "target")).toBe("demo");
    expect(peekFlag(["--features", "f"], "target")).toBeUndefined();
    expect(peekFlag(["--target"], "target")).toBeUndefined();
  });
});
