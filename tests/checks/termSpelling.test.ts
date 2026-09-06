/**
 * @unit for @SCN-TRM-001 — the APP-SIDE ports of "a term names the same pair however its author
 * spaced it around the sigil": a target's configured deferral tags, and the identity a
 * measurement row is de-duplicated by.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describes carry [SCN-TRM-001], matching
 * features/term-spelling.feature, the @integration arm in tests/steps/termSpelling.steps.ts, and
 * the core-side ports in packages/core/src/lib/bareTerm.test.ts. The split is the package
 * boundary and nothing else — `packages/core` cannot import the app, so a single file could not
 * hold both halves without the dependency cycle the `/internal` seam exists to refuse.
 *
 * THE DEFERRAL PORT WAS THE WORST OF THEM. `resolveDeferralTags` stripped with no trim at all, so
 * `"@wip  "` failed as well as `"  @wip"` — a target that configured a deferral tag with a stray
 * space either side got a tag that defers nothing, and a scenario carrying it raises its full
 * obligations and reads out-of-balance for a reason nobody wrote down.
 *
 * THE ARTEFACT PORT IS THE ONE WHOSE MISS POSTS TWICE. A row this reader rejects as different and
 * `parseMeasuredEvidenceObservations` accepts as the same reaches the ledger as two credits for
 * one debit. The two now agree by construction rather than by a comment saying they must
 * (3F-2976's Ruling 2), and this pin is what says so from the outside.
 */

import { describe, it, expect } from "vitest";

import { resolveDeferralTags } from "@3f-consulting/spec-controller-core/internal";
import { DEFAULT_DEFERRAL_TAGS } from "../../packages/spec-controller/src/deferralTags.js";
import { measurementArtefactWith } from "./measurementArtefact.js";

describe("[SCN-TRM-001] a configured deferral tag defers however the target spaced it", () => {
  /** The resolver as the app edge calls it — the starter set is the application layer's (3F-3087). */
  const resolveConfigured = (deferralTags: readonly unknown[]): readonly string[] =>
    resolveDeferralTags({ specController: { deferralTags } }, DEFAULT_DEFERRAL_TAGS);

  it("recognises a tag padded in front of its sigil", () => {
    expect(resolveConfigured(["  @spike"])).toContain("spike");
  });

  it("recognises a tag padded AFTER its term, which this port never trimmed at all", () => {
    expect(resolveConfigured(["@spike  "])).toContain("spike");
  });

  it("recognises a tag spelled with a space between the sigil and the term", () => {
    expect(resolveConfigured(["@ spike"])).toContain("spike");
  });

  it("recognises nothing at all from an entry that is only whitespace and a sigil", () => {
    // Dropped as an empty entry is. A blank tag in the recognised set is a tag no scenario can
    // carry, so it is inert — but it is also a term the target did not author, and the set is what
    // every deferral decision is read against.
    expect(new Set(resolveConfigured(["  @  "]))).toEqual(new Set(DEFAULT_DEFERRAL_TAGS));
  });

  it("keeps a doubled sigil and an interior @ exactly as the target spelled them", () => {
    const resolved = resolveConfigured(["  @@spike", "  para@llel  "]);
    expect(resolved).toContain("@spike");
    expect(resolved).toContain("para@llel");
  });
});

describe("[SCN-TRM-001] a measurement row keys to the same row however its terms were spaced", () => {
  it("replaces its own row when the posted row spells its terms padded", () => {
    // A step that runs twice owes its bar ONE measurement. Read with a padded term the earlier row
    // is a different row, so both survive and the reconciler is handed two credits for a debit
    // owed once.
    const artefact = measurementArtefactWith(
      { scnId: "SCN-MSD-001", checkTag: "ci-run-time", measured: 40 },
      JSON.stringify({
        measurements: [{ scnId: "  @SCN-MSD-001", checkTag: "  @ci-run-time", measured: 96.4 }],
      })
    );
    expect(artefact.measurements).toHaveLength(1);
    expect(artefact.measurements[0]?.measured).toBe(40);
  });

  it("keeps a row whose interior @ makes it a genuinely different pair", () => {
    // The must-not-move side of the same reading: `cucumber@e2e` is not `cucumber`, so the two
    // rows are two rows and the earlier one survives.
    const artefact = measurementArtefactWith(
      { scnId: "SCN-MSD-001", checkTag: "cucumber", measured: 40 },
      JSON.stringify({
        measurements: [{ scnId: "  @SCN-MSD-001", checkTag: "cucumber@e2e", measured: 96.4 }],
      })
    );
    expect(artefact.measurements).toHaveLength(2);
  });
});
