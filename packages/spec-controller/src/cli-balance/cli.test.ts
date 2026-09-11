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

import { describe, it, expect, vi } from "vitest";
import {
  checkInputsExist,
  checkInputsParse,
  checkLegacyJson,
  checkRenderFromJson,
  runBalance,
  sourceTarget,
} from "./cli.js";
import { cliRegistry } from "../cli-registry.js";
// `checkUnknownFlags` MOVED TO THE SHARED ARGV MODULE (3F-3300) and took a `command`
// parameter with it — the bounding is per-command now, so a second command gets it by
// construction. What this arm asks is unchanged: `balance`, against `balance`'s scope.
import { checkUnknownFlags } from "../cli-args.js";

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

describe("[SCN-CLI-014] checkInputsParse rejects a supplied report that exists but cannot be parsed", () => {
  // The JSON-BEARING flags — the only ones whose CONTENT is parsed, and so the only ones
  // whose content can throw. Readability is decided by the injected `read` fn — no fs.
  const jsonFlags = ["vitest", "cucumber", "package-json"] as const;

  it.each(jsonFlags)(
    "returns a typed error naming --%s, the path and the parse failure when the report is not valid JSON",
    (flag) => {
      // Teeth: the file EXISTS (checkInputsExist passed it), so only a readability check
      // can catch this. Without it the reader throws mid-parse and Node's default exit 1
      // makes a CRASH indistinguishable from an out-of-balance VERDICT (3F-1742).
      const path = `reports/${flag}.json`;
      const error = checkInputsParse({ [flag]: path }, () => "not valid json at all {{{");

      expect(error).not.toBeNull();
      expect(error).toContain(`--${flag}`);
      expect(error).toContain(path);
      // The operator must be told WHY — the file name alone sends them hunting.
      expect(error).toMatch(/JSON/i);
    },
  );

  it("returns null when every supplied JSON input parses, so the CLI proceeds to reconcile", () => {
    const args = {
      vitest: "reports/vitest.json",
      cucumber: "reports/cucumber.json",
      "package-json": "package.json",
    };
    expect(checkInputsParse(args, () => '{"ok": true}')).toBeNull();
  });

  it("never reads --features or --ci: neither is JSON, and neither can crash the process", () => {
    // Confirmed empirically at Discovery (3F-1742): --ci is read as raw TEXT and scanned
    // for `run:` steps; --features is Gherkin-parsed tolerantly. On garbage input both
    // reconcile normally and exit 1 as a TRUE verdict — they are not a third instance of
    // the collision, so the guard must not touch them (a false exit 2 would be its own bug).
    const read = (): string => {
      throw new Error("checkInputsParse must not read --features or --ci");
    };
    expect(checkInputsParse({ features: "features", ci: ".github/workflows/ci.yml" }, read)).toBeNull();
  });

  it("returns null when no input flags are supplied (each is legitimately optional)", () => {
    expect(checkInputsParse({}, () => "")).toBeNull();
  });

  it("reports an empty file as unparseable — the /dev/null case that surfaced the bug", () => {
    // `--vitest /dev/null` reads as "" and JSON.parse("") throws. This is the exact
    // invocation that crashed to exit 1 during the 3F-1703 verification.
    const error = checkInputsParse({ vitest: "/dev/null" }, () => "");
    expect(error).not.toBeNull();
    expect(error).toContain("/dev/null");
  });

  it("reports an UNREADABLE file as the same input fault rather than letting it escape as a crash", () => {
    // A read that throws (a race after the existence check, a permissions fault) must be
    // caught by the same guard — anything that escapes here lands on Node's default exit 1,
    // which is the collision this scenario exists to close.
    const read = (): string => {
      throw new Error("EACCES: permission denied");
    };
    const error = checkInputsParse({ vitest: "reports/vitest.json" }, read);
    expect(error).not.toBeNull();
    expect(error).toContain("reports/vitest.json");
  });
});

describe("[SCN-CLI-015] checkRenderFromJson rejects a saved report the tool cannot read", () => {
  it("returns a typed error naming the path when the saved report is MISSING", () => {
    // The ENOENT case. @SCN-CLI-002 already promises exit 2 for a supplied-but-absent input
    // path — but --render-from-json returns before that guard ever runs, so the CLI shipped
    // a guard that half-honoured its own Rule (3F-1764). A `read` that throws is exactly how
    // readFileSync behaves on an absent path.
    const missing = "saved/does-not-exist.json";
    const read = (): string => {
      throw new Error(`ENOENT: no such file or directory, open '${missing}'`);
    };

    const error = checkRenderFromJson({ "render-from-json": missing }, read);
    expect(error).not.toBeNull();
    expect(error).toContain("--render-from-json");
    expect(error).toContain(missing);
  });

  it("returns a typed error naming the path when the saved report is UNPARSEABLE", () => {
    // The SyntaxError case — the same fault as CLI-014, on the flag the lane never reached.
    const path = "saved/spec-reconciliation.json";
    const error = checkRenderFromJson(
      { "render-from-json": path },
      () => "not a saved report at all {{{",
    );

    expect(error).not.toBeNull();
    expect(error).toContain("--render-from-json");
    expect(error).toContain(path);
    expect(error).toMatch(/JSON/i);
  });

  it("returns null when the saved report reads and parses, so the CLI proceeds to render", () => {
    const error = checkRenderFromJson(
      { "render-from-json": "saved/spec-reconciliation.json" },
      () => '{"summary": {}}',
    );
    expect(error).toBeNull();
  });

  it("returns null when --render-from-json is omitted (the ordinary reconcile path)", () => {
    // The boundary that keeps the rule honest: the flag is optional. Its absence must not
    // fire the guard, and `read` must never even be consulted.
    const read = (): string => {
      throw new Error("checkRenderFromJson must not read when the flag is omitted");
    };
    expect(checkRenderFromJson({}, read)).toBeNull();
    expect(checkRenderFromJson({ vitest: "reports/vitest.json" }, read)).toBeNull();
  });
});

describe("[SCN-CLI-004] runBalance sets the out-of-balance exit code AFTER emitting the report in full, never a truncating process.exit", () => {
  it("emits the whole Evidence Reconciliation to stdout AND sets process.exitCode = 1, returning normally", () => {
    // The ordering the gate MUST honour (@SCN-CLI-004): map the out-of-balance verdict via
    // `process.exitCode = 1; return` — NOT `process.exit(1)`, which can truncate the
    // buffered report mid-write. This test proves the write happens IN FULL, THEN the exit
    // code is set, THEN runBalance RETURNS. Reaching the assertions at all is half the proof:
    // a `process.exit(1)` would tear the worker down and never return here.
    const savedExitCode = process.exitCode;
    const chunks: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      });
    try {
      // The shared out-of-balance fixture under the tool's own default --ci/--package-json:
      // SCN-TGT-002's @integration obligation is missing (no --cucumber supplied), plus a
      // phantom scenario and a suspense row — out-of-balance many times over.
      runBalance([
        "--features",
        "tests/fixtures/evidence-observation/features",
        "--vitest",
        "tests/fixtures/evidence-observation/vitest.json",
      ]);

      const emitted = chunks.join("");
      // The report is emitted IN FULL (header + the out-of-balance body) BEFORE the exit
      // code is set — the write was never truncated by an abrupt exit.
      expect(emitted).toMatch(/^# Evidence Reconciliation/m);
      expect(emitted).toMatch(/out-of-balance/);
      // And the exit code is EXACTLY 1 — set on process.exitCode, not process.exit'd.
      expect(process.exitCode).toBe(1);
    } finally {
      writeSpy.mockRestore();
      // Never leak a non-zero exit code into the vitest run itself.
      process.exitCode = savedExitCode;
    }
  });
});

describe("[SCN-CLI-012] runBalance exits 4 for a run carrying broken evidence, PRE-EMPTING the out-of-balance verdict", () => {
  it("emits the report in full AND sets process.exitCode = 4 — not the 1 the same run's out-of-balance verdict would otherwise give", () => {
    // THE DOMINANCE ORDER (@SCN-CLI-012). The broken fixture's run is out-of-balance TOO —
    // its `broken` item sits on the suspense row, so `isBalanced` is already false. That is
    // exactly why the order is load-bearing: unless `hasBrokenEvidence` is checked BEFORE
    // `isBalanced`, exit 4 is unreachable and the collection failure stays masked as an
    // honest disagreement (exit 1). Teeth: asserting EXACTLY 4 fails under the old order,
    // which would give 1 over this very fixture.
    //
    // The report must still flush IN FULL before the code is set — process.exitCode, never
    // process.exit (reaching these assertions at all is half the proof: a process.exit would
    // tear the worker down and never return here). Same discipline as the CLI-004 gate.
    const savedExitCode = process.exitCode;
    process.exitCode = 0;
    const chunks: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      });
    try {
      // The broken fixture: one @unit scenario whose proving suite failed to COLLECT
      // (status "failed", zero assertionResults). Guardless --package-json, so the only
      // suspense item is the broken one — exit 4 can only come from the broken evidence.
      runBalance([
        "--features",
        "tests/fixtures/broken/features",
        "--vitest",
        "tests/fixtures/broken/vitest.json",
        "--package-json",
        "tests/fixtures/broken/package.json",
      ]);

      const emitted = chunks.join("");
      expect(emitted).toMatch(/^# Evidence Reconciliation/m);
      // The run genuinely IS out-of-balance as well — proof the 4 pre-empted a live 1 rather
      // than filling a vacuum.
      expect(emitted).toMatch(/out-of-balance/);
      expect(process.exitCode).toBe(4);
    } finally {
      writeSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  });
});

describe("[SCN-CLI-010] runBalance leaves the exit code 0 for an only-Pending-Items run when --strict is not given", () => {
  it("emits the balanced-with-pending report AND leaves process.exitCode at its default 0, returning normally", () => {
    // The LENIENT DEFAULT (@SCN-CLI-010): a reconciliation balanced except for Pending Items
    // is run-neutral without --strict — Pending Items partition off (slice 2 / @SCN-PND-008)
    // contributing NO reconciling item, so `isBalanced` is true and the gate leaves
    // process.exitCode at 0. This is the predicate side of the @e2e real-binary scenario:
    // runBalance in-process over the pending-only fixture must NOT escalate. Reaching the
    // assertions proves runBalance RETURNED (no truncating process.exit), mirroring CLI-004.
    const savedExitCode = process.exitCode;
    // Normalise the starting exit code so the assertion reflects THIS run, not vitest's
    // ambient state: the balanced-with-pending gate must LEAVE it 0, so start it at 0.
    process.exitCode = 0;
    const chunks: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      });
    try {
      // The pending-only fixture: two @*pending scenarios, guardless --package-json,
      // no evidence report — balanced-with-pending, the only exception being Pending Items.
      runBalance([
        "--features",
        "tests/fixtures/pending-only/features",
        "--package-json",
        "tests/fixtures/pending-only/package.json",
      ]);

      const emitted = chunks.join("");
      // The report is emitted IN FULL and genuinely carries a Pending Item — proof the run is
      // balanced-WITH-pending, not a trivially empty balanced run.
      expect(emitted).toMatch(/^# Evidence Reconciliation/m);
      expect(emitted).toMatch(/Pending Item/);
      // The teeth: NO reconciling item anywhere → the gate leaves the exit code at 0. A future
      // --strict escalation (@SCN-CLI-011) must not leak into the no-strict default.
      expect(process.exitCode).toBe(0);
    } finally {
      writeSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  });
});

describe("[SCN-CLI-009] checkUnknownFlags bounds balance to the flags the registry names", () => {
  // The registry-bounded parser (operator constraint 1): `balance` accepts ONLY registered
  // flags. parseArgs strips the `--`, so the predicate reads the bare-name keys and compares
  // them against the balance command's registered flag names (+ aliases). Pure and
  // @unit-testable at the CLI edge, like checkLegacyJson / checkInputsExist.
  it("returns null when every parsed flag is registered", () => {
    // Registered flags pass through: features/vitest/format/render-from-json/help are all in
    // the balance scope, so the bounded parser accepts them and the reconcile proceeds.
    expect(checkUnknownFlags({ features: "features", vitest: "v.json" }, cliRegistry, "balance")).toBeNull();
    expect(
      checkUnknownFlags({ format: "json:out.json", "render-from-json": "r.json" }, cliRegistry, "balance"),
    ).toBeNull();
    // No flags at all is trivially all-registered.
    expect(checkUnknownFlags({}, cliRegistry, "balance")).toBeNull();
  });

  it("returns a typed usage error naming an unregistered flag (the swallowed-typo footgun)", () => {
    // Teeth: an unregistered flag — a bare `--bogus`, or a typo like `--strcit` for --strict —
    // must NEVER be silently swallowed the way the old permissive parseArgs did. The predicate
    // returns a non-null message that NAMES the offending flag, which runBalance routes to
    // stderr + exit 2 (usage, per 3F-1414's 0/1/2 taxonomy), never exit 1, never a silent
    // reconcile against the wrong intent.
    const bogus = checkUnknownFlags({ bogus: "true" }, cliRegistry, "balance");
    expect(bogus).not.toBeNull();
    expect(bogus).toContain("--bogus");

    const typo = checkUnknownFlags({ strcit: "true" }, cliRegistry, "balance");
    expect(typo).not.toBeNull();
    expect(typo).toContain("--strcit");
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

/**
 * THE ANTI-DRIFT INVARIANT (@SCN-CLI-013) — the guard that would have CAUGHT 3F-1703 rather
 * than fixed it.
 *
 * The bug was THREE VIEWS OF ONE RUN DISAGREEING. Each view was internally consistent, and
 * NOTHING pinned them together, so they drifted: the tally read `141 | 141 | 0` (a pass), the
 * verdict was out-of-balance, and the process exited 1. A failing run read as a clean board for
 * as long as anyone cared to look. The three views:
 *
 *   1. THE TALLY     — `summary.scenarioReconciliations.outOfBalance`, rendered as the Evidence
 *                      reconciliation table's Scenario Reconciliation row (assemble/report.ts),
 *   2. THE HEADLINE  — the `### Run verdict` line and the exit code it NAMES (render/markdown.ts),
 *   3. THE EXIT CODE — what the process actually returns (the dominance ladder in this file's
 *                      `runBalance`).
 *
 * They are three INDEPENDENT derivations, and this suite deliberately leaves them independent —
 * folding them into one source would make drift impossible by construction but would also make
 * this guard blind to it. Pinning them TOGETHER is the point: no future change can move one
 * without moving the others.
 *
 * The @unit arm sees all three because `runBalance` is called IN-PROCESS (the established
 * @SCN-CLI-004 / @SCN-CLI-012 pattern): stdout is spied for the tally + the headline, and the
 * exit code is read off `process.exitCode` — the very variable the gate sets. The @e2e arm
 * (tests/steps/cliBalance.steps.ts) proves the same three views over the REAL subprocess, where
 * the exit code is the PROCESS's own status. Both arms are needed: only the subprocess proves the
 * code actually leaves the process, and only that view drifted unnoticed in the first place.
 *
 * Bidirectional evidence: the describe string carries @SCN-CLI-013, matching
 * features/cli-balance.feature.
 */
describe("[SCN-CLI-013] the tally, the verdict headline and the process exit code name the same outcome", () => {
  /**
   * The three run shapes whose verdicts are DETERMINATE from the reconciliation alone (exit 3 is
   * excluded on purpose: it depends on the CLI-edge `--strict` flag the core cannot see, so the
   * headline names it only conditionally — see `runVerdictSection`).
   *
   * The expectations are LITERAL, not re-derived from the predicates the code under test asks —
   * a derived expectation would move WITH a mutation and prove nothing.
   */
  const RUNS = [
    {
      // BALANCED — the acceptance's second arm: `0`, BALANCED / exit 0, process exits 0.
      name: "an all-balanced run",
      argv: [
        "--features", "tests/fixtures/balanced/features",
        "--vitest", "tests/fixtures/balanced/vitest.json",
        "--package-json", "tests/fixtures/balanced/package.json",
      ],
      outOfBalance: 0,
      word: "BALANCED",
      exit: 0,
    },
    {
      // SUSPENSE-ONLY — the load-bearing arm: an adopter's repository 17-36-50Z shape, where every REAL
      // scenario balances and the run's only reconciling item is the uncited static-check's
      // uncited credit on the `(no scenario)` row. The scenario-only tally read a clean `2 | 2 | 0`
      // here; the tally that counts every Scenario Reconciliation reads 1 out-of-balance and
      // agrees with the exit code.
      name: "a run whose only out-of-balance row is the suspense reconciliation",
      argv: [
        "--features", "tests/fixtures/suspense-only/features",
        "--vitest", "tests/fixtures/suspense-only/vitest.json",
        "--package-json", "tests/fixtures/suspense-only/package.json",
        "--ci", "tests/fixtures/suspense-only/ci.yml",
      ],
      outOfBalance: 1,
      word: "OUT-OF-BALANCE",
      exit: 1,
    },
    {
      // UNSOUND — the dominance arm. This run is out-of-balance TOO (the `broken` item sits on the
      // suspense row), so it pins that the headline follows the CLI's dominance order rather than
      // asking `isBalanced` first: a headline saying exit 1 over a process that exits 4 is exactly
      // the drift (lived: 3F-1642).
      name: "an unsound run carrying a collection-failed suite",
      argv: [
        "--features", "tests/fixtures/broken/features",
        "--vitest", "tests/fixtures/broken/vitest.json",
        "--package-json", "tests/fixtures/broken/package.json",
      ],
      outOfBalance: 2,
      word: "UNSOUND",
      exit: 4,
    },
  ] as const;

  /** Run `balance` in-process and return the three views of that one run. */
  function threeViewsOf(argv: readonly string[]): { outOfBalance: number; word: string; headlineExit: number; exitCode: number } {
    const savedExitCode = process.exitCode;
    // Normalise so the reading reflects THIS run, not vitest's ambient state (a balanced run
    // LEAVES the code untouched, so it must start at 0).
    process.exitCode = 0;
    const chunks: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      });
    try {
      runBalance([...argv]);
      const emitted = chunks.join("");
      // VIEW 1 — the tally: `| Scenario Reconciliation | <total> | <balanced> | <outOfBalance> |`.
      const tally = emitted.match(/^\| Scenario Reconciliation \| (\d+) \| (\d+) \| (\d+) \|/m);
      expect(tally, `expected a Scenario Reconciliation tally row; got:\n${emitted}`).not.toBeNull();
      // VIEW 2 — the headline: `**OUT-OF-BALANCE** — … (exit 1)`. Both halves: the drift can move
      // the verdict WORD or the exit code it NAMES.
      const headline = emitted.match(/^\*\*(BALANCED|OUT-OF-BALANCE|UNSOUND)\*\* — .*\(exit (\d+)\)$/m);
      expect(headline, `expected a run-verdict headline; got:\n${emitted}`).not.toBeNull();
      return {
        outOfBalance: Number(tally?.[3]),
        word: String(headline?.[1]),
        headlineExit: Number(headline?.[2]),
        // VIEW 3 — the exit code: the very variable the gate sets. Read BEFORE the finally block
        // restores it.
        exitCode: Number(process.exitCode ?? 0),
      };
    } finally {
      writeSpy.mockRestore();
      // Never leak a non-zero exit code into the vitest run itself.
      process.exitCode = savedExitCode;
    }
  }

  for (const run of RUNS) {
    it(`names one outcome across all three views for ${run.name}`, () => {
      const views = threeViewsOf(run.argv);

      // Each view against its LITERAL expectation — so a mutation of any ONE view reds here.
      expect(views.outOfBalance).toBe(run.outOfBalance);
      expect(views.word).toBe(run.word);
      expect(views.headlineExit).toBe(run.exit);
      expect(views.exitCode).toBe(run.exit);

      // And the views against EACH OTHER — the invariant proper, which no single literal can
      // state. A change that moves one view without the others reds here even if someone
      // "helpfully" updated its literal above.
      expect(views.headlineExit).toBe(views.exitCode);
      expect(views.outOfBalance > 0).toBe(views.exitCode !== 0);
      expect(views.word === "BALANCED").toBe(views.outOfBalance === 0);
    });
  }
});
