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
 *   THE SELF-CITATION — read over the REAL tree with the SAME production readers the
 *   reconciler uses, never a hand-rolled grep, which would agree with the reconciler by
 *   coincidence and drift the moment either changed. A guard that runs while no scenario
 *   names it is an uncited static check, i.e. an instance on the tool's own books of the
 *   class `uncited-static-checks.feature` exists to name.
 *
 * The gate's VERDICT — reds an out-of-balance tree, passes a balanced one — is the
 * @integration arm's (tests/steps/selfReconciliation.steps.ts), which runs the real
 * guard end-to-end over two planted trees. Asserting a verdict here would only re-run
 * the reconciler in isolation.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SELF_BALANCE_SCOPE,
  selfBalanceArgv,
  checkEvidenceReportsPresent,
} from "./lintSelfBalanceCli.js";
import {
  parseScenarios,
  checkStaticEvidenceObligations,
  runningStaticChecks,
} from "@3f-consulting/spec-controller-core";
import {
  registeredCheckTags,
  fitnessCitations,
  parseTaggedScenarios,
} from "@3f-consulting/spec-controller-core/internal";
import { resolveCheckRegistry } from "../src/ingest/ingestQualityChecks.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepoFile = (relative: string): string =>
  fs.readFileSync(path.join(repoRoot, relative), "utf8");

/** The static check this scenario both NAMES and IS. */
const OWN_STATIC_CHECK = "lint:self-balance";

/** The guard-prefix set the balance CLI SETS at its edge and injects into the core. */
const GUARD_PREFIXES = ["lint:", "guard:"] as const;

describe("[SCN-SLF-001] the self-balance gate's scan scope is stated, whole, in one place", () => {
  it("reaches exactly the six surfaces a reconciliation reads — named, observed, and wired", () => {
    // EXHAUSTIVE by design. A seventh surface, or a sixth quietly removed, must red here:
    // this object is the only statement of what spec-controller's own tree is judged on.
    expect(SELF_BALANCE_SCOPE).toEqual({
      features: "features",
      vitest: "runs/self-balance/vitest.json",
      cucumber: "runs/self-balance/cucumber.json",
      // The MEASURED stream (@SCN-CIP-013, 3F-2742), sourced from the producer's own constant
      // so the path this gate reads cannot drift from the path the timed steps write.
      timings: "runs/self-balance/timings.json",
      // The workflow DIRECTORY, not one file (3F-2500): the product's own default reads
      // every workflow, and a gate that read fewer would be spec-controller declining to
      // use the capability it ships — the shape @SCN-SLF-002 closed one level down.
      ci: ".github/workflows",
      packageJson: "package.json",
    });
  });

  it("keeps the three runtime artefacts under the never-committed runs/ tree", () => {
    // Not incidental: a reconciliation report enumerates this codebase's gaps, so it is
    // more sensitive than the code. runs/** is gitignored with no re-includes and
    // lint:no-committed-reports enforces it, so writing the streams there is what keeps
    // the gate's own inputs off the record.
    expect(SELF_BALANCE_SCOPE.vitest.startsWith("runs/")).toBe(true);
    expect(SELF_BALANCE_SCOPE.cucumber.startsWith("runs/")).toBe(true);
    expect(SELF_BALANCE_SCOPE.timings.startsWith("runs/")).toBe(true);
  });

  it("hands every scope surface to the product's balance command, resolved against the root", () => {
    // The gate cannot narrow what it reconciles by omitting a flag: each surface appears
    // with its value, so dropping one from the argv reds even if the scope object is intact.
    const argv = selfBalanceArgv("/tmp/target", {}, () => true);

    expect(argv).toEqual([
      "--features",
      path.join("/tmp/target", "features"),
      "--vitest",
      path.join("/tmp/target", "runs/self-balance/vitest.json"),
      "--cucumber",
      path.join("/tmp/target", "runs/self-balance/cucumber.json"),
      "--timings",
      path.join("/tmp/target", "runs/self-balance/timings.json"),
      "--ci",
      path.join("/tmp/target", ".github/workflows"),
      "--package-json",
      path.join("/tmp/target", "package.json"),
      "--target",
      "spec-controller",
    ]);
  });

  it("leaves --timings off where no timed step posted, so the rows it answers reconcile missing", () => {
    // THE ASYMMETRY IS THE POINT (@SCN-CIP-013). A --timings path the balance command cannot
    // find is a usage fault to it and exits 2, and exit 2 says "this run is broken" where the
    // truth is "a timed suite was never measured" — a verdict @SCN-CIP-006 puts on the ledger.
    // Passing the flag regardless would rebuild the hiding place inside the gate: unwrap a
    // timed script and the build would report a broken run rather than an unmeasured suite.
    const argv = selfBalanceArgv("/tmp/target", {}, () => false);

    expect(argv).not.toContain("--timings");
    // Everything else still reaches the command — the absent artefact narrows nothing but itself.
    expect(argv).toContain(path.join("/tmp/target", "runs/self-balance/vitest.json"));
    expect(argv).toContain(path.join("/tmp/target", "features"));
  });

  it("lets a caller relocate the emitted reports without relocating the surfaces read", () => {
    // CI writes the streams where the run wrote them, so the report PATHS are an override;
    // WHICH surfaces are read is not. The three tree surfaces stay pinned to the root.
    const argv = selfBalanceArgv(
      "/tmp/target",
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

describe("[SCN-SLF-001] an evidence stream that was never emitted is a usage fault, not a verdict", () => {
  it("names the absent report and how to emit it, rather than reconciling against zero evidence", () => {
    // The dogfooding fault @SCN-CLI-002 closed, one level up: reconciling against a report
    // that does not exist yields a terrifying all-red meaning "you forgot to run the suite",
    // not "your code is broken". The gate must never let a setup mistake wear a verdict.
    const message = checkEvidenceReportsPresent("/tmp/target", {}, () => false);

    expect(message).not.toBeNull();
    expect(message).toContain("runs/self-balance/vitest.json");
    expect(message).toContain("pnpm test");
  });

  it("passes the precondition once both streams are present", () => {
    expect(checkEvidenceReportsPresent("/tmp/target", {}, () => true)).toBeNull();
  });
});

describe("[SCN-SLF-001] the gate is reconciled on spec-controller's own Ledger", () => {
  const ciSource = readRepoFile(".github/workflows/ci.yml");
  const packageJson = JSON.parse(readRepoFile("package.json")) as {
    scripts?: Record<string, string>;
    specController?: { checkRegistry?: unknown };
  };
  const featureSource = readRepoFile("features/self-reconciliation.feature");

  it("is named by a scenario, so its run has an Evidence Obligation to settle against", () => {
    // THE SAME ASSERTION, THROUGH THE SPELLING THAT NOW CARRIES IT (3F-2589). This used to
    // read the retired @lint=<handle> form, where a scenario named the check by spelling the
    // runnable handle back at the tool. Under the one posting rule the corpus names a check
    // by a BARE tag, and which tag a handle IS comes from this repository's own registry — so
    // both hops are read from the REAL manifest and the REAL feature file here. A missing
    // registry entry now fails this exactly as a missing tag does, which is strictly more
    // than the handle-spelling read could see.
    const registry = resolveCheckRegistry(packageJson);
    const checkTag = registry.get(OWN_STATIC_CHECK);
    expect(checkTag).toBeDefined();

    // Read through the CORPUS HOP itself (`fitnessCitations`) rather than through the corpus's
    // obligation set: it answers the sharper question — which scenario carries this check — and
    // so fails on a tag that reaches no stepless scenario as well as on one that is absent. The
    // journal-side named-handle derivation this replaced was the by-name route's, and went with it
    // (3F-2590).
    const citations = fitnessCitations(
      parseTaggedScenarios(featureSource),
      registeredCheckTags(registry),
    );

    expect([...citations.keys()]).toContain(checkTag);
  });

  it("exists as a script AND is enforced over real source — it fires, it is not merely present", () => {
    // Exists-without-enforcement is the WATERMELON: a gate present in package.json that no
    // CI step invokes reds nothing while reading as a check. Both halves, or neither.
    expect(checkStaticEvidenceObligations([OWN_STATIC_CHECK], [ciSource], packageJson)).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: OWN_STATIC_CHECK,
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("is one of the running static checks the observer emits into the evidence stream", () => {
    // The `lint:` prefix is load-bearing on the other side of the same pairing:
    // runningStaticChecks observes a CI script only when its name carries an observed
    // prefix, so a name outside that set would run in CI while being invisible to
    // spec-controller's own ledger — a real gate kept off the books.
    const running = runningStaticChecks([ciSource], packageJson, GUARD_PREFIXES).map(
      (observation) => observation.staticCheck,
    );

    expect(running).toContain(OWN_STATIC_CHECK);
  });
});
