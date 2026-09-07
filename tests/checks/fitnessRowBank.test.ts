/**
 * The @unit arm of @SCN-SLF-004 — the banking rule itself (3F-3192).
 *
 * WHAT THIS ARM OWNS AND WHAT IT DOES NOT. The rule: the count comes off the manifest, it is
 * written upward, a fall is refused by name, and the record's other bytes are left alone. Whether
 * a real command actually WROTE a real file is the @integration arm's, in
 * `tests/steps/fitnessRowBank.steps.ts`, because a projection over strings cannot tell a written
 * file from one nobody wrote.
 *
 * THE RECORD TEXTS HERE CARRY COMMENTS ON PURPOSE. `quality-thresholds.yml` is mostly comment —
 * every bar's justification lives in it — so a recorder that re-serialised a parsed document would
 * delete the reasoning for the very bar it was raising, in the same commit that claims to be
 * strengthening it, with the number perfectly correct. The byte-for-byte assertions below are what
 * make that impossible rather than unlikely.
 *
 * @SCN-SLF-004 — bidirectional evidence marker. Grepping SCN-SLF-004 returns the scenario in
 * `features/self-reconciliation.feature`, this file, and the step block that runs the real command.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { MalformedRecordError } from "../../packages/spec-controller/src/mutation-ratchet/record.js";

import {
  bankedFitnessRowsText,
  FitnessFallRefusedError,
  fitnessRowCountAt,
} from "./fitnessRowBank.js";

/** The name a refusal is told to quote, so a reader is sent to a file rather than to a concept. */
const RECORD_FILE = "quality-thresholds.yml";

/** A record whose fitness block sits between two others, so a rewrite has somewhere wrong to go. */
function recordText(rows: string): string {
  return [
    "# spec-controller's own quality bars — the counts its gates last banked.",
    "",
    "mutation-gates:",
    "  # The pure engine. THE ALLOWANCE IS ZERO BECAUSE IT WAS MEASURED ZERO.",
    "  domain:",
    "    detected: 694",
    "    total: 697",
    "",
    "# IT READS UPWARD AND IT IS BANKED, NEVER TYPED.",
    "fitness-axis:",
    rows,
    "",
    "other-section:",
    "  rows: 999",
    "",
  ].join("\n");
}

/** A tree holding exactly the rows a manifest spells, written where a reader has to go and find it. */
function treeHolding(rows: unknown): string {
  const root = mkdtempSync(path.join(tmpdir(), "spec-controller-slf004-"));
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "planted", specController: { fitnessChecks: rows } }) + "\n",
    "utf8",
  );
  return root;
}

// @SCN-SLF-004
describe("[SCN-SLF-004] the fitness axis's row count is banked from the tree, upward only", () => {
  it("reads the count off the MANIFEST, through the reading that raises the obligations", () => {
    const root = treeHolding([
      { scn: "SCN-FIT-001", characteristic: "complexity", command: "eslint" },
      { scn: "SCN-FIT-004", characteristic: "vocab", command: "pnpm lint:blocked-vocabulary" },
      { scn: "SCN-FIT-007", characteristic: "traceability", command: "pnpm lint:feature-codes" },
    ]);

    expect(fitnessRowCountAt(root)).toBe(3);
  });

  it("counts only the rows a lookup can act on, never the entries a manifest happens to list", () => {
    // A row naming neither of its two terms says nothing a lookup can use and is dropped whole by
    // the ledger's own reader, so a count that included it would hold the bar against a population
    // the obligations were never raised over.
    const root = treeHolding([
      { scn: "SCN-FIT-001", characteristic: "complexity", command: "eslint" },
      { command: "pnpm lint:nothing" },
    ]);

    expect(fitnessRowCountAt(root)).toBe(1);
  });

  it("reads the emptied axis as zero rather than throwing, because config is data from outside", () => {
    // The fault this whole scenario exists for: `fitnessChecks` mistyped, so the key holds nothing
    // a reader recognises. Zero is the honest reading, and zero is a fall.
    const root = mkdtempSync(path.join(tmpdir(), "spec-controller-slf004-"));
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "planted", specController: { fitnessCheks: [{ scn: "SCN-FIT-001" }] } }) + "\n",
      "utf8",
    );

    expect(fitnessRowCountAt(root)).toBe(0);
  });

  it("writes the count upward, leaving every other byte of the record as it was", () => {
    const before = recordText("  rows: 12");

    const after = bankedFitnessRowsText(before, 16, RECORD_FILE);

    expect(after).toBe(recordText("  rows: 16"));
    // Stated as a difference as well as an equality: the justification comments are the thing a
    // re-dumping recorder would delete, silently, while getting the numeral right.
    expect(after).toContain("# IT READS UPWARD AND IT IS BANKED, NEVER TYPED.");
    expect(after).toContain("  # The pure engine. THE ALLOWANCE IS ZERO BECAUSE IT WAS MEASURED ZERO.");
  });

  it("keeps the author's own spacing on the one line it rewrites", () => {
    const after = bankedFitnessRowsText(recordText("  rows:    12"), 16, RECORD_FILE);

    expect(after).toBe(recordText("  rows:    16"));
  });

  it("stays inside the fitness block when a sibling section writes a line of the same name", () => {
    // `other-section` also states `rows:`. A rewriter that took the first matching line after the
    // file's start, or searched on past the block's end, would raise somebody else's figure and
    // report success on this one.
    const after = bankedFitnessRowsText(recordText("  rows: 12"), 16, RECORD_FILE);

    expect(after).toContain("other-section:\n  rows: 999");
  });

  it("refuses a fall, naming both counts and the one route down", () => {
    const before = recordText("  rows: 16");

    expect(() => bankedFitnessRowsText(before, 15, RECORD_FILE)).toThrow(FitnessFallRefusedError);
    try {
      bankedFitnessRowsText(before, 15, RECORD_FILE);
    } catch (refused) {
      const said = (refused as Error).message;
      expect(said).toContain("15");
      expect(said).toContain("16");
      expect(said).toContain(RECORD_FILE);
      expect(said).toContain("by hand");
    }
  });

  it("refuses an emptied axis as the fall it is, rather than banking a zero over the record", () => {
    expect(() => bankedFitnessRowsText(recordText("  rows: 16"), 0, RECORD_FILE)).toThrow(
      FitnessFallRefusedError,
    );
  });

  it("refuses an equal count, because a record rewritten to say what it said reads as a banking", () => {
    expect(() => bankedFitnessRowsText(recordText("  rows: 16"), 16, RECORD_FILE)).toThrow(
      FitnessFallRefusedError,
    );
  });

  it("refuses a record writing no fitness block by name, rather than defaulting it to nothing", () => {
    // Absent read as zero would make every count on earth a raise — a bar nobody wrote, enforced as
    // though somebody had.
    const before = ["mutation-gates:", "  domain:", "    detected: 694", "    total: 697", ""].join("\n");

    expect(() => bankedFitnessRowsText(before, 16, RECORD_FILE)).toThrow(MalformedRecordError);
  });

  it("refuses a fitness block holding no count line, naming the line rather than passing it over", () => {
    const before = ["fitness-axis:", "  banked-on: 2026-09-07", ""].join("\n");

    expect(() => bankedFitnessRowsText(before, 16, RECORD_FILE)).toThrow(MalformedRecordError);
  });

  it("offers no input that writes a fall — asserted over the bank's own bytes, not trusted", () => {
    // @SCN-RAT-012's shape. `quality-thresholds.yml`'s header states why the absence is deliberate:
    // an escape hatch a tool holds open is one nobody ever has to justify, and it would be reached
    // for on the first red night rather than the first honest one. A comment saying so would agree
    // with the code until somebody added the flag; this reads the files.
    const here = path.dirname(fileURLToPath(import.meta.url));
    const bytes = ["fitnessRowBank.ts", "fitnessRowBankCli.ts"]
      .map((file) => readFileSync(path.join(here, file), "utf8"))
      .join("\n");

    for (const hatch of ["--force", "--down", "--record-down", "--lower", "--allow-fall"]) {
      expect(bytes).not.toContain(hatch);
    }
  });
});
