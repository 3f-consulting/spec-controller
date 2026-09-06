/**
 * @SCN-SLF-001 (3F-2354) — the @unit arm of the self-reconciliation gate.
 *
 * Two halves, and they are different in kind:
 *
 *   THE SCOPE — what the gate reaches, asserted EXHAUSTIVELY. The gate's whole value is
 *   that spec-controller's own tree cannot hide from it, so a surface silently dropped
 *   from the scan is the failure that would matter most and show least. `toEqual` (never
 *   `toMatchObject`) is what makes a narrowing red.
 *
 *   THE SEVENTH SURFACE REACHING THE VERDICT (3F-3145). The scope object and the argv are
 *   both claims about strings: a `--fitness` the balance command does not accept satisfies
 *   them and then exits 2 on the first real run. So this arm drives the flag through
 *   `runBalance` itself over a converted target fixture, and the two runs differ in exactly
 *   one argument, which is what attributes the difference to the flag.
 *
 * The gate's VERDICT over spec-controller's own tree — reds an out-of-balance tree, passes a
 * balanced one — is the @integration arm's (tests/steps/selfReconciliation.steps.ts), which
 * runs the real guard end-to-end over two planted trees. Asserting THAT verdict here would
 * only re-run the reconciler in isolation.
 *
 * THE THIRD HALF THAT LEFT (3F-3113). This file used to carry a SELF-CITATION arm — that the
 * gate was named by a scenario, existed and fired, and was one of the running static checks
 * the observer emits. It wore @SCN-SLF-001's label and asserted @SCN-SLF-003's substance, so
 * it went with the ledger presence it stood for: the reconciliation's own verdict is not an
 * entry in the reconciliation, and the handle no longer carries an observed prefix.
 */

import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  SELF_BALANCE_SCOPE,
  resolveScope,
  selfBalanceArgv,
  checkEvidenceReportsPresent,
} from "./balanceSelfCli.js";
import { runBalance } from "../../packages/spec-controller/src/cli-balance/cli.js";

describe("[SCN-SLF-001] the self-balance gate's scan scope is stated, whole, in one place", () => {
  it("reaches exactly the seven surfaces a reconciliation reads — named, observed, and wired", () => {
    // EXHAUSTIVE by design. An eighth surface, or a seventh quietly removed, must red here:
    // this object is the only statement of what spec-controller's own tree is judged on.
    expect(SELF_BALANCE_SCOPE).toEqual({
      features: "features",
      vitest: "runs/self-balance/vitest.json",
      cucumber: "runs/self-balance/cucumber.json",
      // The FITNESS pass's own report (@SCN-LNT-021, 3F-3145) — a SECOND cucumber call's
      // document, read as the converted static checks' credits rather than as runtime results.
      // It is a surface in its own right precisely because one file read two ways would leave
      // the gate guessing which half of it was which.
      fitness: "runs/self-balance/fitness.json",
      // The MEASURED stream (@SCN-CIP-006, 3F-2742), sourced from the producer's own constant
      // so the path this gate reads cannot drift from the path the timed steps write.
      measurements: "runs/self-balance/measurements.json",
      // The workflow DIRECTORY, not one file (3F-2500): the product's own default reads
      // every workflow, and a gate that read fewer would be spec-controller declining to
      // use the capability it ships — the shape @SCN-SLF-002 closed one level down.
      ci: ".github/workflows",
      packageJson: "package.json",
    });
  });

  it("[SCN-SLF-001] splits the seven between the two bases — the tree it JUDGES, and the evidence it OUTPUTS", () => {
    // EXHAUSTIVE, AND FOR THE REASON THE SCOPE OBJECT ABOVE IS (3F-3099). Which base a surface
    // resolves against is the whole of this change, and a surface that slipped from one side to the
    // other would not be loud: an evidence report resolved against the target root goes back into
    // the source tree, and a source surface resolved against the evidence root simply is not there,
    // which the gate reports as an obligation nothing settles. Two bases nothing shares, so every
    // surface has to answer for which side it is on.
    const resolved = resolveScope("/the/tree", "/the/evidence", {}, SELF_BALANCE_SCOPE);
    const sideOf = Object.fromEntries(
      Object.entries(resolved).map(([surface, where]) => [
        surface,
        where.startsWith("/the/evidence/") ? "output" : where.startsWith("/the/tree/") ? "judged" : where,
      ]),
    );

    expect(sideOf).toEqual({
      // The tree being judged. `--root` moves these and nothing else.
      features: "judged",
      ci: "judged",
      packageJson: "judged",
      // This run's own output — the four whose base used to be the tree they are about, which is
      // spec-controller writing its output into its own source.
      vitest: "output",
      cucumber: "output",
      fitness: "output",
      measurements: "output",
    });
  });

  it("hands every scope surface to the product's balance command, resolved against the root", () => {
    // The gate cannot narrow what it reconciles by omitting a flag: each surface appears
    // with its value, so dropping one from the argv reds even if the scope object is intact.
    const argv = selfBalanceArgv("/tmp/target", "/tmp/evidence", {}, () => true);

    expect(argv).toEqual([
      "--features",
      path.join("/tmp/target", "features"),
      "--vitest",
      path.join("/tmp/evidence", "runs/self-balance/vitest.json"),
      "--cucumber",
      path.join("/tmp/evidence", "runs/self-balance/cucumber.json"),
      "--measurements",
      path.join("/tmp/evidence", "runs/self-balance/measurements.json"),
      "--fitness",
      path.join("/tmp/evidence", "runs/self-balance/fitness.json"),
      "--ci",
      path.join("/tmp/target", ".github/workflows"),
      "--package-json",
      path.join("/tmp/target", "package.json"),
      "--target",
      "spec-controller",
    ]);
  });

  it("leaves the two optional artefacts' flags off where nothing wrote them, so the rows they answer reconcile missing", () => {
    // THE ASYMMETRY IS THE POINT (@SCN-CIP-006). A --measurements path the balance command cannot
    // find is a usage fault to it and exits 2, and exit 2 says "this run is broken" where the
    // truth is "a timed suite was never measured" — a verdict @SCN-CIP-006 puts on the ledger.
    // Passing the flag regardless would rebuild the hiding place inside the gate: unwrap a
    // timed script and the build would report a broken run rather than an unmeasured suite.
    const argv = selfBalanceArgv("/tmp/target", "/tmp/evidence", {}, () => false);

    expect(argv).not.toContain("--measurements");
    // THE FITNESS REPORT TAKES THE MEASUREMENT ARTEFACT'S TREATMENT, NOT THE SUITE REPORTS'
    // (3F-3145). A target that has converted nothing emits no fitness report, and a run that
    // exited 2 over its absence would call every unconverted consumer's set-up broken.
    expect(argv).not.toContain("--fitness");
    // Everything else still reaches the command — the absent artefacts narrow nothing but themselves.
    expect(argv).toContain(path.join("/tmp/evidence", "runs/self-balance/vitest.json"));
    expect(argv).toContain(path.join("/tmp/target", "features"));
  });

  it("lets a caller relocate the emitted reports without relocating the surfaces read", () => {
    // CI writes the streams where the run wrote them, so the report PATHS are an override;
    // WHICH surfaces are read is not. The three tree surfaces stay pinned to the root.
    const argv = selfBalanceArgv(
      "/tmp/target",
      "/tmp/evidence",
      { vitest: "/elsewhere/vitest.json", cucumber: "/elsewhere/cucumber.json" },
      () => true,
    );

    expect(argv).toContain("/elsewhere/vitest.json");
    expect(argv).toContain("/elsewhere/cucumber.json");
    expect(argv).toContain(path.join("/tmp/target", "features"));
    expect(argv).toContain(path.join("/tmp/target", ".github/workflows"));
    expect(argv).toContain(path.join("/tmp/target", "package.json"));
  });
});

describe("[SCN-SLF-001] the fitness pass's report is a surface the balance command accepts and reads", () => {
  // THE CONVERTED TARGET FIXTURE (@SCN-LNT-021's, reused rather than re-planted): two scenarios on
  // the bare fitness axis tag, a configured row naming each, and a fitness report holding both. Its
  // directory carries no workflow, so `--ci` at the fixture resolves to nothing and this
  // repository's own workflows cannot leak onto the planted target's books.
  const fixture = "tests/fixtures/scn-lnt-021";
  const withoutTheReport = [
    "--features", `${fixture}/features`,
    "--package-json", `${fixture}/package.json`,
    "--ci", fixture,
  ];

  /** Run `balance` in-process and read back its verdict headline and its exit code. */
  function verdictOf(argv: readonly string[]): { word: string; exitCode: number; emitted: string } {
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
      const headline = emitted.match(/^\*\*(BALANCED|OUT-OF-BALANCE|UNSOUND)\*\* /m);
      return { word: String(headline?.[1]), exitCode: Number(process.exitCode ?? 0), emitted };
    } finally {
      writeSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  }

  it("credits the converted rows when it is named, and leaves them unanswered — never a broken run — when it is not", () => {
    const named = verdictOf([...withoutTheReport, "--fitness", `${fixture}/fitness.json`]);
    const unnamed = verdictOf(withoutTheReport);

    // NAMED: the two converted obligations are settled off the report, so the target balances.
    expect(named.word, named.emitted).toBe("BALANCED");
    expect(named.exitCode).toBe(0);

    // UNNAMED, the control, and the difference is one argument. The rows reconcile MISSING and the
    // run is out-of-balance (exit 1) — never the usage code 2, which is what a precondition check
    // on this surface would have produced and what the ticket rules out: an unconverted consumer's
    // set-up is not broken by having nothing to convert.
    expect(unnamed.word, unnamed.emitted).toBe("OUT-OF-BALANCE");
    expect(unnamed.exitCode).toBe(1);
    // And the red NAMES the rows it is about, so the difference is attributable to the two
    // converted scenarios rather than to some other flaw in the fixture.
    expect(unnamed.emitted).toContain("SCN-CVT-001");
    expect(unnamed.emitted).toContain("SCN-CVT-002");
  });
});

describe("[SCN-SLF-001] an evidence stream that was never emitted is a usage fault, not a verdict", () => {
  it("names the absent report and how to emit it, rather than reconciling against zero evidence", () => {
    // The dogfooding fault @SCN-CLI-002 closed, one level up: reconciling against a report
    // that does not exist yields a terrifying all-red meaning "you forgot to run the suite",
    // not "your code is broken". The gate must never let a setup mistake wear a verdict.
    const message = checkEvidenceReportsPresent("/tmp/evidence", {}, () => false);

    expect(message).not.toBeNull();
    expect(message).toContain("runs/self-balance/vitest.json");
    expect(message).toContain("pnpm test");
  });

  it("passes the precondition once both streams are present", () => {
    expect(checkEvidenceReportsPresent("/tmp/evidence", {}, () => true)).toBeNull();
  });
});

describe("[SCN-SLF-001] no command the pipeline runs writes this run's evidence inside the working tree", () => {
  // THE TWO SHAPES A REPORT PATH ARRIVES IN, and there is no third: vitest takes
  // `--outputFile.json=<path>` and cucumber takes `--format json:<path>`. Both are read off the
  // real `ci.yml` and the real `package.json` rather than off a fixture, because the claim is
  // about THIS repository's pipeline — a fixture would agree with itself while the pipeline drifted.
  const REPORT_FLAGS = [/--outputFile\.json=\s*"?([^\s"]+)/g, /--format\s+json:\s*"?([^\s"]+)/g];

  /** Every evidence-report path named by a command this repository's pipeline runs. */
  function pipelineReportPaths(): string[] {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    // COMMENT LINES ARE DROPPED FIRST, and that is not tidying. `ci.yml` carries more prose than
    // configuration, and it explains these very flags — so a paragraph naming `--format json:<path>`
    // would arrive here as a report path the pipeline never emits and red this arm over a sentence.
    const ci = readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8")
      .split("\n")
      .filter((line) => !/^\s*#/.test(line))
      .join("\n");
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const commands = [ci, ...Object.values(manifest.scripts ?? {})].join("\n");
    return REPORT_FLAGS.flatMap((shape) => [...commands.matchAll(shape)].map((hit) => hit[1]!));
  }

  it("[SCN-SLF-001] names every emitted report against a base the caller supplies, never against the repository", () => {
    // THE ABSENCE OF A HIT IS ITSELF A FAULT. A pipeline that had stopped emitting the reports
    // satisfies "no path is repository-relative" vacuously, and the gate downstream would report
    // every obligation unobserved — "the suite did not run" — with this arm still green.
    const named = pipelineReportPaths();
    expect(named.length).toBeGreaterThan(0);

    // A path is safe when it is anchored somewhere the caller chose: an absolute path, or a shell
    // variable the job and `scripts/verify.sh` each set once. Anything else is resolved against the
    // process's working directory, which in CI and under `pnpm verify` alike IS this source tree —
    // spec-controller writing its output into its own source, which is the whole of the defect.
    expect(named.filter((where) => !where.startsWith("/") && !where.startsWith("$"))).toEqual([]);
  });
});
