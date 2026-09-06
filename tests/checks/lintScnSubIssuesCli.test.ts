/**
 * Unit tests for the scenario ⟷ sub-issue gate CLI's fork-read helper (the
 * @unit floor of @SCN-SSM-003 — the fork exemption). The pure helper decides
 * whether a PR is fork-sourced (external) from a parsed GitHub PR event payload:
 * head.repo.full_name != base.repo.full_name.
 *
 * Bidirectional evidence: the describe/it strings carry the @SCN-SSM-003 id
 * matching features/scenario-sub-issue-match.feature and the @integration steps
 * in tests/steps/scenarioSubIssueMatchExempt.steps.ts.
 *
 * Parent: 3F-1137 (the port + fork-exemption design).
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkStaticEvidenceObligations,
  parseScenarios,
  runningStaticChecks,
} from "@3f-consulting/spec-controller-core";
import {
  registeredCheckTags,
  fitnessCitations,
  parseTaggedScenarios,
} from "@3f-consulting/spec-controller-core/internal";
import { resolveCheckRegistry } from "@3f-consulting/spec-controller-core/internal";
import { isExternalPrFromEvent } from "./lintScnSubIssuesCli.js";

/** A minimal GitHub PR event payload with the given head/base repo full names. */
function eventPayload(headRepo: string, baseRepo: string): unknown {
  return {
    pull_request: {
      head: { repo: { full_name: headRepo } },
      base: { repo: { full_name: baseRepo } },
    },
  };
}

describe("[SCN-SSM-003] the fork-read helper decides external-PR status from the event payload", () => {
  it("returns true when the head repo differs from the base repo (a fork)", () => {
    expect(
      isExternalPrFromEvent(
        eventPayload("outside-contributor/spec-controller", "3f-consulting/spec-controller")
      )
    ).toBe(true);
  });

  it("returns false when the head repo equals the base repo (an internal branch)", () => {
    expect(
      isExternalPrFromEvent(
        eventPayload("3f-consulting/spec-controller", "3f-consulting/spec-controller")
      )
    ).toBe(false);
  });

  it("returns false when the payload is absent or malformed (local / non-PR runs)", () => {
    expect(isExternalPrFromEvent(undefined)).toBe(false);
    expect(isExternalPrFromEvent({})).toBe(false);
    expect(isExternalPrFromEvent({ pull_request: {} })).toBe(false);
  });
});

/**
 * @SCN-SSM-006 (3F-2366) — the check's own reconciliation, read over the REAL tree.
 *
 * The @unit half of the self-reconciliation: the two sides of the credit, read from
 * spec-controller's own ci.yml / package.json / features with the SAME production readers the
 * reconciler uses — never a hand-rolled grep, which would agree with the reconciler by
 * coincidence and drift the moment either changed.
 *
 * Debit side: a scenario NAMES lint:scn-subissues via @lint=, so the run has an Evidence
 * Obligation to settle against rather than folding onto the suspense scenario as an uncited
 * static check. Credit side: the check both EXISTS as a script and is ENFORCED over real
 * source by a CI run step — exists-without-enforcement is the watermelon, and asserting only
 * that the script is present would be asserting the check exists rather than that it fires.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readRepoFile = (relative: string): string =>
  fs.readFileSync(path.join(repoRoot, relative), "utf8");

/** The static check whose own books this block reconciles. */
const OWN_STATIC_CHECK = "lint:scn-subissues";

/** The guard-prefix set the balance CLI SETS at its edge and injects into the core. */
const GUARD_PREFIXES = ["lint:", "guard:"] as const;

describe("[SCN-SSM-006] lint:scn-subissues is reconciled on spec-controller's own Ledger", () => {
  const manifest = JSON.parse(readRepoFile("package.json")) as {
    scripts?: Record<string, string>;
    specController?: { fitnessChecks?: { scn?: string; characteristic?: string; command?: string }[] };
  };
  const corpus = readRepoFile("features/fitness-checks.feature");
  const ownRow = (manifest.specController?.fitnessChecks ?? []).find(
    (row) => row.command === `pnpm ${OWN_STATIC_CHECK}`
  );

  it("is named by a configured row, so its run has an Evidence Obligation to settle against", () => {
    // THE SAME ASSERTION, THROUGH THE SPELLING THAT NOW CARRIES IT (3F-3165). It read the
    // registry hop before this — a runnable handle resolved to a bare check tag, that tag looked
    // up in the corpus — because a DISCOVERED check is a script handle and a handle does not know
    // what it is for. A converted check is never discovered: its row states the `@SCN` and the
    // characteristic outright, and both are read from the REAL manifest here. A missing row fails
    // this exactly as a missing tag did.
    expect(ownRow?.scn).toBeDefined();
    expect(ownRow?.characteristic).toBeDefined();
  });

  it("has a scenario in the generated corpus, which is what the pass reports and the ledger credits", () => {
    // The corpus hop's successor, and it answers the same sharper question the citation read
    // answered: which scenario carries this check. A row whose scenario the corpus does not carry
    // is a check the pass never runs and the ledger never credits.
    expect(corpus).toContain(`@fitness @${ownRow?.scn ?? "(no row)"}`);
  });

  it("fires because the pass RUNS its command — it is not merely present in a manifest", () => {
    // BOTH HALVES, AS BEFORE, AND BOTH ARE NOW FACTS ABOUT THE RUN. The pair used to be `exists`
    // (a package.json script) and `enforcedOverRealSource` (a ci.yml `run:` step) — a file
    // MENTIONING a name, where exists-without-enforcement is the watermelon. Here the row's
    // command IS the script and the fitness pass executes it in this repository's own root.
    expect(ownRow?.command).toBe(`pnpm ${OWN_STATIC_CHECK}`);
    expect(manifest.scripts ?? {}).toHaveProperty(OWN_STATIC_CHECK);
  });

  it("says which ending means it examined nothing, so a skip is honest rather than incidental", () => {
    // THE ONE ROW THIS FIELD WAS BUILT FOR (3F-3170). Outside a pull request there is no body to
    // read, and the exemption question is unanswerable rather than failed — so the row names the
    // ending the command uses to say so, and the pass skips the scenario instead of passing it or
    // redding it. Without this the third answer would read as a fault and `pnpm verify` would red
    // locally on correct work.
    expect((ownRow as { notExaminedExit?: number } | undefined)?.notExaminedExit).toBe(3);
  });
});
