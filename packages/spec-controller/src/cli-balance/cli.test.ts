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
import { checkInputsExist, checkLegacyJson, sourceTarget } from "./cli.js";

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

describe("[SCN-CLI-002] checkInputsExist rejects a supplied input path that does not exist", () => {
  // The five input flags are Examples of one boundary rule; parseArgs strips the `--`,
  // so the predicate reads the keys `vitest` / `cucumber` / `features` / `ci` /
  // `package-json`. Existence is decided by the injected `exists` fn — no fs.
  const flags = ["vitest", "cucumber", "features", "ci", "package-json"] as const;

  it.each(flags)(
    "returns a typed error naming --%s and the missing path when that flag's path is absent",
    (flag) => {
      // Teeth: a supplied-but-absent input must NEVER be reconciled silently — the
      // predicate returns a non-null message that names BOTH the offending flag (so the
      // operator knows which path to fix) and the path itself. A predicate that returned
      // null here is exactly the dogfooding fault: a mistyped path → false all-red report.
      const missing = `does/not/exist/${flag}.missing`;
      const error = checkInputsExist({ [flag]: missing }, () => false);
      expect(error).not.toBeNull();
      expect(error).toContain(`--${flag}`);
      expect(error).toContain(missing);
    },
  );

  it("returns null when every supplied input path exists, so the CLI proceeds to reconcile", () => {
    // supplied-and-present → ok. All five flags supplied, exists returns true for each.
    const args = {
      vitest: "reports/vitest.json",
      cucumber: "reports/cucumber.json",
      features: "features",
      ci: ".github/workflows/ci.yml",
      "package-json": "package.json",
    };
    expect(checkInputsExist(args, () => true)).toBeNull();
  });

  it("returns null when no input flags are supplied (each flag is legitimately optional)", () => {
    // The boundary that keeps the rule honest: an OMITTED flag is not an error — it is
    // simply no evidence of that kind. The predicate must not fire on `exists` alone; it
    // fires only on supplied-but-absent. `exists` is never even consulted here.
    expect(checkInputsExist({}, () => false)).toBeNull();
    expect(checkInputsExist({ target: "some-target" }, () => false)).toBeNull();
  });

  it("reports the FIRST supplied-but-absent flag when several are missing", () => {
    // Deterministic: with several bad paths the predicate returns one typed error (the
    // first in flag order), not an aggregate — the operator fixes and re-runs.
    const error = checkInputsExist(
      { cucumber: "bad/cucumber.json", ci: "bad/ci.yml" },
      () => false,
    );
    expect(error).toContain("--cucumber");
  });
});

describe("[SCN-CLI-003] checkInputsExist treats an OMITTED optional flag as nothing-to-validate, not missing", () => {
  it("returns null for an omitted flag even when other flags are supplied and present", () => {
    // The positive boundary that keeps CLI-002 honest: absence-of-flag stays legal
    // (reconcile whatever WAS supplied); only supplied-but-absent errors. Here --vitest
    // and --features are supplied AND present (`exists` → true for them), while
    // --cucumber / --ci / --package-json are OMITTED (undefined). The predicate must
    // treat an undefined path as "nothing to validate" and NOT consult `exists` for it,
    // so it returns null.
    //
    // Teeth: `exists` returns FALSE for anything other than the two present paths, so a
    // tightening that over-reached into the legitimate optional path — dropping the
    // `path !== undefined` guard, or requiring all inputs once ANY is supplied — would
    // call `exists(undefined)` → false → a spurious error for the omitted --cucumber, and
    // this assertion would red. This case pins that boundary specifically: the
    // omit-with-NOTHING-supplied case (`{}` → every flag undefined) does NOT catch a
    // supply-one-require-all tightening, but an omitted flag ALONGSIDE supplied-present
    // ones does.
    const args = { vitest: "reports/vitest.json", features: "features" };
    const exists = (path: string) =>
      path === "reports/vitest.json" || path === "features";
    expect(checkInputsExist(args, exists)).toBeNull();
  });
});
