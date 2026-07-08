/**
 * Unit tests for the pure CLI-edge guards in the balance command (the runReconcile arm is
 * split out to ingest/ingestQualityChecks.test.ts with its function).
 *
 * The legacy-`--json` guard (@SCN-FMT-006) and the provenance target sourcing
 * (@SCN-RPT-001 Update — Fork A) — both PURE functions at the CLI edge.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * @SCN-FMT-006 / @SCN-RPT-001 ids matching features/output-format.feature and
 * features/report.feature, so a grep of an id returns both halves of the pair (each
 * @unit + its @integration Cucumber step-block over the REAL CLI subprocess).
 */

import { describe, it, expect } from "vitest";
import { checkLegacyJson, sourceTarget } from "./cli.js";

describe("[SCN-FMT-006] checkLegacyJson rejects the removed --json flag with a migration hint", () => {
  it("returns the typed migration-hint error naming --format json:<path> when --json is present", () => {
    // Teeth: the removed flag must NEVER silently no-op — the guard returns a non-null
    // error message, and that message must name the replacement (--format json:<path>) so
    // the operator knows where their output moved. A guard that returned null here would
    // let the CLI drop the JSON output silently.
    const error = checkLegacyJson({ json: "out.json" });
    expect(error).not.toBeNull();
    expect(error).toMatch(/--json/);
    expect(error).toMatch(/--format json:<path>/);
  });

  it("returns null when --json is absent, so the CLI proceeds", () => {
    // The guard only fires for the removed flag; a normal invocation (or a --format one)
    // passes through untouched.
    expect(checkLegacyJson({})).toBeNull();
    expect(checkLegacyJson({ format: "json:out.json" })).toBeNull();
  });
});

describe("[SCN-RPT-001] sourceTarget sources the provenance target from --target verbatim", () => {
  it("returns the --target value verbatim when given", () => {
    // Teeth: the operator's --target is recorded exactly as typed — no normalisation, no
    // resolution. A CLI that transformed the value would diverge from what the operator was
    // told it reconciled.
    expect(sourceTarget({ target: "an-adopters-repository" })).toBe("an-adopters-repository");
    expect(sourceTarget({ target: "some/scoped-name" })).toBe("some/scoped-name");
  });

  it("defaults to unknown-target when --target is omitted", () => {
    // Teeth: the parallel of sourceSha's "unknown" — an omitted target is an explicit
    // "unknown-target", never absent (the "Target repo:" line always renders).
    expect(sourceTarget({})).toBe("unknown-target");
  });

  it("does NOT guess the target from --features (no basename resolution; the degenerate '.' is impossible)", () => {
    // Teeth: the load-bearing change. The old resolveTarget derived basename(dirname(
    // --features)) when no --target was given — yielding "an-adopters-repository" here, or the
    // degenerate "." for a bare --features. sourceTarget never inspects --features, so the
    // omit path is always the explicit default regardless of any --features value.
    expect(sourceTarget({ features: "../an-adopters-repository/features" })).toBe("unknown-target");
    expect(sourceTarget({ features: "features" })).toBe("unknown-target");
  });
});
