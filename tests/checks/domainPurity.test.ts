/**
 * The domain-purity check, running over this repository (@SCN-DPG-001).
 *
 * THE SUBJECT IS THE PRODUCT'S OWN SOURCE, WHICH IS WHY THIS IS A CHECK AND NOT A TEST ABOUT ONE.
 * It walks `packages/core/src/domain` and reds if a production domain module imports an adapter
 * layer or escapes into the app package. Spec in Gherkin, implementation here, runner vitest — the
 * arrangement every @unit scenario in this repository uses.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the @SCN-DPG-001 id
 * matching features/domain-purity.feature, so a grep of the id returns both halves of the pair.
 * `@unit`-only — Cucumber skips it; this run IS the observed evidence.
 *
 * NOTHING ELSE IN THE REPOSITORY RUNS THIS CHECK, measured rather than inherited: no row of
 * package.json's specController.fitnessChecks invokes `checkDomainPurity`, no `lint:` script does,
 * and no step definition imports it. `checkDomainPurity` is referenced from exactly one file — this
 * one. That is what makes this the check rather than a second opinion about it.
 *
 * THE PLANTED ARM WENT AT 3F-3245, and its removal cost this guard no reading of the repository. It
 * was authored from this module's implementation, by that implementation's author, from that
 * author's reading of the rule — so its green proved the check does what its author wrote, never
 * what the rule requires. One author, both books. The population floor below stays LOCAL: the
 * domain subtree is much smaller than the core-src one enginePurity and noParallelStore share, and
 * adopting their floor of 10 would invent a constraint that does not exist (3F-2266).
 */

import { describe, expect, it } from "vitest";

import { checkDomainPurity } from "./domainPurity.js";
import { collectSourceFiles, domainRoot, resolveRepositoryRoot } from "./sourceFiles.js";

/** The repository this guard is asked about, resolved ONCE and passed down (3F-3207). */
const REPOSITORY_ROOT = resolveRepositoryRoot();

describe("[SCN-DPG-001] a domain module imports only the domain layer and pure standard types", () => {
  it("passes clean over the REAL packages/core/src/domain tree (the seam holds today)", () => {
    // The dogfood green, and this guard's only contact with the repository: any future stray
    // adapter or app import in a production domain file reds here.
    const domainFiles = collectSourceFiles(domainRoot(REPOSITORY_ROOT), REPOSITORY_ROOT);
    // Sanity: the tree was actually scanned, not an empty walk masquerading as green. This floor is
    // LOCAL and stays local — a different, much smaller population than the core-src one the other
    // two guards share, so their floor of 10 would be a constraint invented here (3F-2266).
    expect(domainFiles.length).toBeGreaterThan(0);
    expect(checkDomainPurity(domainFiles)).toEqual([]);
  });
});
