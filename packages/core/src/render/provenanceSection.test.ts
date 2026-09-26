/**
 * The Run-provenance header's "Not supplied" line — the rendering
 * half of the pair whose derivation packages/core/src/provenance/provenance.test.ts pins, and
 * whose persisted form the @integration arm in tests/steps/report.steps.ts reads back off a
 * real CLI run. Bidirectional evidence (Evidence Manifesto §9): the describe carries the id.
 *
 * IT IS ITS OWN FILE RATHER THAN THREE MORE ARMS IN markdown.test.ts, and the reason is the
 * complexity gate rather than taste. That file is far over the 400-code-line ceiling, so under
 * the complexity gate any change touching it reds until it comes back under the standard; appending
 * arms to it is the one move that cannot work. Which files carry that debt is not written down
 * anywhere and must not be — `pnpm exec eslint` reports every standing violation on every run.
 * The provenance section is a self-contained emitter and its arms travel with it.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";

/** The reconciliation around a Ledger fixture — `summaryOf` is the concept's own tally. */
const er = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false, false), ledger });

/**
 * A minimal balanced balance, RECONCILER-TRUE (evidence-manifesto §11A): one `@unit` scenario and
 * the passing credit that satisfies it, through the real `reconcile()`. A scenario that declares
 * nothing cannot reconcile `balanced` (it degenerates to `both-missing`), so the obligation is
 * what makes this the smallest honest balanced run.
 */
const balance: Ledger = reconcile(
  [{ scnId: "SCN-RPT-028", evidenceObligations: [{ qualityCheck: "unit" }] }],
  [{ qualityCheck: "unit", scnId: "SCN-RPT-028", status: "passed" }],
);

const handed = (inputs: RunContext["inputs"]): RunContext => ({
  target: "partly-handed-target",
  inputs,
  runStart: new Date("2026-09-06T15:30:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
});

/** The one rendered "- Not supplied:" line, or a stated null when the render carries none. */
const notSuppliedLine = (md: string): string | null =>
  md.split("\n").find((line) => line.startsWith("- Not supplied:")) ?? null;

describe("[SCN-RPT-028] the Run provenance names the canonical inputs the run did not receive", () => {
  it("names the flags with no value on a line of their own, beneath the Inputs list", () => {
    const md = renderMarkdown(er(balance), handed({ features: "features", ciSteps: "ci-steps.json" }));
    // The WHOLE rendered line, not a membership test: an equality reds just as loudly on a
    // line that names a flag the run WAS handed as on one that names none of the absent ones.
    expect(notSuppliedLine(md)).toBe("- Not supplied: `--vitest`, `--cucumber`, `--ci`, `--package-json`");
    // Beneath the Inputs list and above the timestamp — the reader meets it while still
    // reading what the run was handed, not after the SHAs.
    expect(md.indexOf("  - `--ci-steps ci-steps.json`")).toBeGreaterThan(-1);
    expect(md.indexOf("  - `--ci-steps ci-steps.json`")).toBeLessThan(md.indexOf("- Not supplied:"));
    expect(md.indexOf("- Not supplied:")).toBeLessThan(md.indexOf("- Run timestamp (UTC):"));
  });

  it("says nothing about absence when the run was handed every canonical stream", () => {
    const md = renderMarkdown(
      er(balance),
      handed({
        features: "features",
        vitest: "vitest.json",
        cucumber: "cucumber.json",
        ci: ".github/workflows",
        packageJson: "package.json",
        ciSteps: "ci-steps.json",
      })
    );
    // A "none supplied" line on the healthy path would be noise in a facts-only block.
    expect(notSuppliedLine(md)).toBeNull();
  });

  it("keeps the none-specified Inputs branch reachable, and names every canonical flag beside it", () => {
    // The whole reason this is a separate line rather than an interleaved marker: threading
    // absent entries INTO the list would make this branch unreachable and silently rewrite a
    // rendering that already exists.
    const md = renderMarkdown(er(balance), handed({}));
    expect(md.split("\n")).toContain("- Inputs: none specified");
    expect(notSuppliedLine(md)).toBe(
      "- Not supplied: `--features`, `--vitest`, `--cucumber`, `--ci`, `--package-json`, `--ci-steps`"
    );
  });
});
