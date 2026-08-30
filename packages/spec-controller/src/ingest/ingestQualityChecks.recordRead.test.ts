/**
 * @SCN-MUT-013 (@unit) — the record is opened ONCE PER RESOLUTION PASS, not once per reference.
 *
 * IT IS ITS OWN FILE BECAUSE THE ONLY HONEST PROBE IS A WRAPPED `readFileSync`, and a module mock
 * is per-file in Vitest. Two references to one record cannot be made to disagree by any fixture a
 * test can write — the file does not change between two reads of it — so the property has to be
 * observed at the read rather than inferred from the answers. `vi.spyOn` cannot reach a node
 * builtin's namespace (it is not configurable), which leaves the module factory below.
 *
 * WHY THE PROPERTY IS WORTH A FILE. A manifest may name several gates, and a resolver reading the
 * record per entry would let two references to one record answer for two different states of it —
 * a rewrite landing mid-pass, a gate present for one reader and absent for the next. One read is
 * what makes the pass's answers one reading of one record.
 *
 * Parent: 3F-2788.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { reads } = vi.hoisted(() => ({ reads: [] as string[] }));

// The real reader, with every path it is handed recorded on the way through. Passthrough rather
// than a stub: the arms below assert the resolved BARS as well as the count, so a fake record
// reader would leave them asserting nothing about the resolution they are named for.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: actual,
    readFileSync: (...args: Parameters<typeof actual.readFileSync>) => {
      reads.push(String(args[0]));
      return actual.readFileSync(...args);
    },
  };
});

const { resolveThresholds } = await import("./ingestQualityChecks.js");
const { RECORD_FILE } = await import("../mutation-ratchet/index.js");

describe("[SCN-MUT-013] a resolution pass reads the record it is handed once", () => {
  const planted: string[] = [];

  afterEach(() => {
    for (const root of planted.splice(0)) rmSync(root, { recursive: true, force: true });
    reads.length = 0;
  });

  function plantRoot(text: string): string {
    const root = mkdtempSync(join(tmpdir(), "resolve-thresholds-reads-"));
    planted.push(root);
    writeFileSync(join(root, RECORD_FILE), text, "utf8");
    return root;
  }

  const TWO_GATES = `mutation-gates:
  domain:
    detected: 701
    total: 704
    slack-mutants: 2
    slack-reason: "measured non-determinism on this gate"
  adapters:
    detected: 40
    total: 40
    slack-mutants: 0
`;

  /** Two rows of one manifest, each holding its own check to a gate of the same record. */
  function manifestNamingTwoGates() {
    return {
      specController: {
        thresholds: {
          "SCN-MSD-001": { mutation: { atLeast: { mutationGate: "domain" } } },
          "SCN-MSD-002": { mutation: { atLeast: { mutationGate: "adapters" } } },
        },
      },
    };
  }

  function recordReads(): string[] {
    return reads.filter((path) => path.endsWith(RECORD_FILE));
  }

  it("opens it once for two references, and both bars are that one reading's", () => {
    const registry = resolveThresholds(manifestNamingTwoGates(), plantRoot(TWO_GATES));

    expect(recordReads()).toHaveLength(1);
    expect(registry.get("SCN-MSD-001")?.get("mutation")).toEqual({ threshold: 699, atLeast: true });
    expect(registry.get("SCN-MSD-002")?.get("mutation")).toEqual({ threshold: 40, atLeast: true });
  });

  it("opens it once for two references it cannot source either", () => {
    // THE CACHED ANSWER IS THE REFUSAL TOO. A resolver that remembered only its successes would
    // re-open an absent or unreadable record per reference, which is the same disagreement by the
    // other door — and the door a fixture is most likely to reach, since a record being rewritten
    // is unreadable for exactly the window that matters.
    const registry = resolveThresholds(
      manifestNamingTwoGates(),
      plantRoot("mutation-gates:\n  domain: 1\n  domain: 2\n")
    );

    expect(recordReads()).toHaveLength(1);
    expect(registry.get("SCN-MSD-001")?.get("mutation")).toBeNull();
    expect(registry.get("SCN-MSD-002")?.get("mutation")).toBeNull();
  });
});
