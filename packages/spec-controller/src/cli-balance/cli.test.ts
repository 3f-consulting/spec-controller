import { afterAll, describe, it, expect, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkInputsExist,
  checkInputsParse,
  checkLegacyJson,
  checkRenderFromJson,
  runBalance,
  sourceTarget,
} from "./cli.js";
import { cliRegistry } from "../cli-registry.js";
import { checkUnknownFlags } from "../cli-args.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-FMT-006] checkLegacyJson rejects the removed --json flag with a migration hint", () => {
  it("returns the typed migration-hint error naming --format json:<path> when --json is present", () => {
    const error = checkLegacyJson({ json: "out.json" });
    expect(error).not.toBeNull();
    expect(error).toMatch(/--json/);
    expect(error).toMatch(/--format json:<path>/);
  });

  it("returns null when --json is absent, so the CLI proceeds", () => {
    expect(checkLegacyJson({})).toBeNull();
    expect(checkLegacyJson({ format: "json:out.json" })).toBeNull();
  });
});

describe("[SCN-RPT-001] sourceTarget sources the provenance target from --target verbatim", () => {
  it("returns the --target value verbatim when given", () => {
    expect(sourceTarget({ target: "an-adopters-repository" })).toBe("an-adopters-repository");
    expect(sourceTarget({ target: "some/scoped-name" })).toBe("some/scoped-name");
  });

  it("defaults to unknown-target when --target is omitted", () => {
    expect(sourceTarget({})).toBe("unknown-target");
  });

  it("does NOT guess the target from --features (no basename resolution; the degenerate '.' is impossible)", () => {
    expect(sourceTarget({ features: "../an-adopters-repository/features" })).toBe("unknown-target");
    expect(sourceTarget({ features: "features" })).toBe("unknown-target");
  });
});

describe("[SCN-CLI-002] checkInputsExist rejects a supplied input path that does not exist", () => {
  const flags = ["vitest", "cucumber", "features", "ci", "package-json"] as const;

  it.each(flags)(
    "returns a typed error naming --%s and the missing path when that flag's path is absent",
    (flag) => {
      const missing = `does/not/exist/${flag}.missing`;
      const error = checkInputsExist({ [flag]: missing }, () => false);
      expect(error).not.toBeNull();
      expect(error).toContain(`--${flag}`);
      expect(error).toContain(missing);
    },
  );

  it("returns null when every supplied input path exists, so the CLI proceeds to reconcile", () => {
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
    expect(checkInputsExist({}, () => false)).toBeNull();
    expect(checkInputsExist({ target: "some-target" }, () => false)).toBeNull();
  });

  it("reports the FIRST supplied-but-absent flag when several are missing", () => {
    const error = checkInputsExist(
      { cucumber: "bad/cucumber.json", ci: "bad/ci.yml" },
      () => false,
    );
    expect(error).toContain("--cucumber");
  });
});

describe("[SCN-CLI-014] checkInputsParse rejects a supplied report that exists but cannot be parsed", () => {
  const jsonFlags = ["vitest", "cucumber", "package-json"] as const;

  it.each(jsonFlags)(
    "returns a typed error naming --%s, the path and the parse failure when the report is not valid JSON",
    (flag) => {
      const path = `reports/${flag}.json`;
      const error = checkInputsParse({ [flag]: path }, () => "not valid json at all {{{");

      expect(error).not.toBeNull();
      expect(error).toContain(`--${flag}`);
      expect(error).toContain(path);
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

  it("never reads --features or --ci: neither is JSON", () => {
    const read = (): string => {
      throw new Error("checkInputsParse must not read --features or --ci");
    };
    expect(checkInputsParse({ features: "features", ci: ".github/workflows/ci.yml" }, read)).toBeNull();
  });

  it("returns null when no input flags are supplied (each is legitimately optional)", () => {
    expect(checkInputsParse({}, () => "")).toBeNull();
  });

  it("reports an empty file as unparseable — the /dev/null case that surfaced the bug", () => {
    const error = checkInputsParse({ vitest: "/dev/null" }, () => "");
    expect(error).not.toBeNull();
    expect(error).toContain("/dev/null");
  });

  it("reports an UNREADABLE file as the same input fault rather than letting it escape as a crash", () => {
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
    const read = (): string => {
      throw new Error("checkRenderFromJson must not read when the flag is omitted");
    };
    expect(checkRenderFromJson({}, read)).toBeNull();
    expect(checkRenderFromJson({ vitest: "reports/vitest.json" }, read)).toBeNull();
  });
});

describe("[SCN-CLI-004] runBalance sets the out-of-balance exit code AFTER emitting the report in full, never a truncating process.exit", () => {
  it("emits the whole Evidence Reconciliation to stdout AND sets process.exitCode = 1, returning normally", () => {
    const savedExitCode = process.exitCode;
    const chunks: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      });
    try {
      runBalance([
        "--features",
        "tests/fixtures/evidence-observation/features",
        "--vitest",
        "tests/fixtures/evidence-observation/vitest.json",
      ]);

      const emitted = chunks.join("");
      expect(emitted).toMatch(/^# Evidence Reconciliation/m);
      expect(emitted).toMatch(/out-of-balance/);
      expect(process.exitCode).toBe(1);
    } finally {
      writeSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  });
});

describe("[SCN-CLI-012] runBalance exits 4 for a run carrying broken evidence, PRE-EMPTING the out-of-balance verdict", () => {
  it("emits the report in full AND sets process.exitCode = 4 — not the 1 the same run's out-of-balance verdict would otherwise give", () => {
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
      expect(emitted).toMatch(/out-of-balance/);
      expect(process.exitCode).toBe(4);
    } finally {
      writeSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  });
});

describe("[SCN-CLI-019] runBalance exits 5 for a run with nothing to reconcile, PRE-EMPTING the vacuously-balanced verdict", () => {
  it("emits the report in full AND sets process.exitCode = 5 — not the 0 the same run's vacuously-true balance verdict would otherwise give", () => {
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
      runBalance([
        "--features",
        "tests/fixtures/nothing-to-reconcile/features",
        "--package-json",
        "tests/fixtures/nothing-to-reconcile/package.json",
        "--ci",
        "tests/fixtures/nothing-to-reconcile",
      ]);

      const emitted = chunks.join("");
      expect(emitted).toMatch(/^# Evidence Reconciliation/m);
      expect(emitted).toMatch(/^\| Scenario Reconciliation \| 0 \| 0 \| 0 \|/m);
      expect(process.exitCode).toBe(5);
    } finally {
      writeSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  });
});

describe("[SCN-CLI-010] runBalance leaves the exit code 0 for an only-Pending-Items run when --strict is not given", () => {
  it("emits the balanced-with-pending report AND leaves process.exitCode at its default 0, returning normally", () => {
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
      runBalance([
        "--features",
        "tests/fixtures/pending-only/features",
        "--package-json",
        "tests/fixtures/pending-only/package.json",
        "--ci",
        "tests/fixtures/pending-only",
      ]);

      const emitted = chunks.join("");
      expect(emitted).toMatch(/^# Evidence Reconciliation/m);
      expect(emitted).toMatch(/Pending Item/);
      expect(process.exitCode).toBe(0);
    } finally {
      writeSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  });
});

const REFUSING_TOOL_VERSION = "9.9.9-test";

describe("[SCN-CLI-009] checkUnknownFlags bounds balance to the flags the registry names", () => {
  it("returns null when every parsed flag is registered", () => {
    expect(checkUnknownFlags({ features: "features", vitest: "v.json" }, cliRegistry, "balance", REFUSING_TOOL_VERSION)).toBeNull();
    expect(
      checkUnknownFlags({ format: "json:out.json", "render-from-json": "r.json" }, cliRegistry, "balance", REFUSING_TOOL_VERSION),
    ).toBeNull();
    expect(checkUnknownFlags({}, cliRegistry, "balance", REFUSING_TOOL_VERSION)).toBeNull();
  });

  it("returns a typed usage error naming an unregistered flag (the swallowed-typo footgun)", () => {
    const bogus = checkUnknownFlags({ bogus: "true" }, cliRegistry, "balance", REFUSING_TOOL_VERSION);
    expect(bogus).not.toBeNull();
    expect(bogus).toContain("--bogus");

    const typo = checkUnknownFlags({ strcit: "true" }, cliRegistry, "balance", REFUSING_TOOL_VERSION);
    expect(typo).not.toBeNull();
    expect(typo).toContain("--strcit");
  });

  it("names the version that refused and the bump as the cure, so a pinned reader's skew is legible", () => {
    const refusal = checkUnknownFlags({ bogus: "true" }, cliRegistry, "balance", REFUSING_TOOL_VERSION);
    expect(refusal).not.toBeNull();
    expect(refusal).toContain(REFUSING_TOOL_VERSION);
    expect(refusal).toMatch(/bump the pin/i);
  });
});

describe("[SCN-CLI-003] checkInputsExist treats an OMITTED optional flag as nothing-to-validate, not missing", () => {
  it("returns null for an omitted flag even when other flags are supplied and present", () => {
    const args = { vitest: "reports/vitest.json", features: "features" };
    const exists = (path: string) =>
      path === "reports/vitest.json" || path === "features";
    expect(checkInputsExist(args, exists)).toBeNull();
  });
});

describe("[SCN-CLI-013] the tally, the verdict headline and the process exit code name the same outcome", () => {
  const RUNS = [
    {
      name: "an all-balanced run",
      argv: [
        "--features", "tests/fixtures/balanced/features",
        "--vitest", "tests/fixtures/balanced/vitest.json",
        "--package-json", "tests/fixtures/balanced/package.json",
        "--ci", "tests/fixtures/balanced",
      ],
      outOfBalance: 0,
      word: "BALANCED",
      exit: 0,
    },
    {
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
      name: "an unsound run carrying a collection-failed suite",
      argv: [
        "--features", "tests/fixtures/broken/features",
        "--vitest", "tests/fixtures/broken/vitest.json",
        "--package-json", "tests/fixtures/broken/package.json",
        "--ci", "tests/fixtures/broken",
      ],
      outOfBalance: 2,
      word: "UNSOUND",
      exit: 4,
    },
  ] as const;

  function threeViewsOf(argv: readonly string[]): { outOfBalance: number; word: string; headlineExit: number; exitCode: number } {
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
      runBalance([...argv]);
      const emitted = chunks.join("");
      const tally = emitted.match(/^\| Scenario Reconciliation \| (\d+) \| (\d+) \| (\d+) \|/m);
      expect(tally, `expected a Scenario Reconciliation tally row; got:\n${emitted}`).not.toBeNull();
      const headline = emitted.match(/^\*\*(BALANCED|OUT-OF-BALANCE|UNSOUND)\*\* — .*\(exit (\d+)\)$/m);
      expect(headline, `expected a run-verdict headline; got:\n${emitted}`).not.toBeNull();
      return {
        outOfBalance: Number(tally?.[3]),
        word: String(headline?.[1]),
        headlineExit: Number(headline?.[2]),
        exitCode: Number(process.exitCode ?? 0),
      };
    } finally {
      writeSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  }

  for (const run of RUNS) {
    it(`names one outcome across all three views for ${run.name}`, () => {
      const views = threeViewsOf(run.argv);

      expect(views.outOfBalance).toBe(run.outOfBalance);
      expect(views.word).toBe(run.word);
      expect(views.headlineExit).toBe(run.exit);
      expect(views.exitCode).toBe(run.exit);

      expect(views.headlineExit).toBe(views.exitCode);
      expect(views.outOfBalance > 0).toBe(views.exitCode !== 0);
      expect(views.word === "BALANCED").toBe(views.outOfBalance === 0);
    });
  }
});

describe("[SCN-STG-018] runBalance over a duplicated @SCN exits 1 with the report in full, never refusing the corpus", () => {
  function duplicateTarget(): string {
    const dir = mkdtempSync(join(tmpdir(), "scn-stg-018-unit-"));
    made.push(dir);
    mkdirSync(join(dir, "features"));
    writeFileSync(
      join(dir, "features", "dup.feature"),
      "@DUP\nFeature: dup\n\n  @unit @SCN-DUP-001\n  Scenario: first\n    Given a thing\n\n" +
        "  @unit @SCN-DUP-001\n  Scenario: second\n    Given a thing\n\n" +
        "  @unit @SCN-DUP-002\n  Scenario: its own\n    Given a thing\n"
    );
    writeFileSync(
      join(dir, "vitest.json"),
      JSON.stringify({
        testResults: [
          {
            name: "dup.test.ts",
            assertionResults: [
              { fullName: "[SCN-DUP-001] proven", status: "passed" },
              { fullName: "[SCN-DUP-002] proven", status: "passed" },
            ],
          },
        ],
      })
    );
    writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
    writeFileSync(join(dir, "package.json"), "{}\n");
    return dir;
  }

  it("emits the whole report, reconciles the other account, and sets process.exitCode = 1", () => {
    const dir = duplicateTarget();
    const savedExitCode = process.exitCode;
    process.exitCode = 0;
    const out: string[] = [];
    const err: string[] = [];
    const outSpy = vi.spyOn(process.stdout, "write").mockImplementation((c: string | Uint8Array): boolean => {
      out.push(String(c));
      return true;
    });
    const errSpy = vi.spyOn(process.stderr, "write").mockImplementation((c: string | Uint8Array): boolean => {
      err.push(String(c));
      return true;
    });
    try {
      runBalance([
        "--features", join(dir, "features"),
        "--vitest", join(dir, "vitest.json"),
        "--ci", join(dir, "ci.yml"),
        "--package-json", join(dir, "package.json"),
        "--format", "json",
      ]);
      const report = JSON.parse(out.join(""));
      const rows = report.ledger.scenarioReconciliations as { scnId: string; verdict: string }[];
      expect(rows.filter((r) => r.scnId === "SCN-DUP-001")).toHaveLength(1);
      expect(rows.find((r) => r.scnId === "SCN-DUP-002")?.verdict).toBe("balanced");
      expect(process.exitCode).toBe(1);
      expect(err.join("")).not.toMatch(/names the same @SCN on more than one scenario/);
    } finally {
      outSpy.mockRestore();
      errSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  });
});
