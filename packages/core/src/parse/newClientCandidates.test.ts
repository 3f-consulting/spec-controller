/**
 * Unit tests for the `new-client` STATE (@SCN-USG-017, 3F-3343) — what a target that has named no
 * runners and no non-checks gets when its pipeline is read.
 *
 * ITS OWN FILE, and the seam is a subject rather than a size. The two files beside it pin the two
 * halves of the recognition — `recognisedRunners.test.ts` pins rule D over targets that HAVE named
 * runners, `runningStaticChecks.test.ts` pins the observer over targets that have named their
 * checks — and both are about a manifest that said something. This one is about the manifest that
 * said nothing, which is the state the free rung is sold on and the only one where every
 * disposition but "candidate" is unreachable by construction.
 *
 * THE CONTROL IS IN THE FILE, not implied by its siblings. Every arm below is a claim that the set
 * of candidates is the WHOLE pipeline, and a reader incapable of taking any step out satisfies all
 * of them — so the last arm names one runner over the same bytes and watches exactly one step
 * leave. That is also the consumer's own remedy, in the one line it takes.
 *
 * Parent: @SCN-USG-017 (the new-client state); @SCN-USG-011 (the recognition the control uses).
 */

import { describe, it, expect } from "vitest";
import { recognisedRunners, runningStaticChecks } from "./runningStaticChecks.js";
import { resolveRunners } from "./targetManifest.js";
import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";

describe("[SCN-USG-017] a target that has named no runners — every step of its pipeline is a candidate", () => {
  // A CONSUMER WHO INSTALLED IT AND DID NOTHING ELSE. The block is present and empty, which is the
  // shape the parent's planted consumer had: `specController` exists because something else could
  // go in it, and it names no runner, no non-check and no static check of any kind.
  const manifest = {
    scripts: { lint: "eslint .", typecheck: "tsc --noEmit", test: "vitest run" },
    specController: {},
  };
  const pkg: PackageJsonScripts = { scripts: manifest.scripts };

  // AN ORDINARY PIPELINE, IN BOTH FORMS. Two actions of plumbing, one install command, two checks
  // whose script names match no convention of this tool's, the target's own unit suite, and one
  // quality check that is an action. Nothing here is spelled the way the retired prefix rule
  // wanted, and nothing here is taken out by anything.
  const ci = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/setup-node@v4",
    "      - run: pnpm install --frozen-lockfile",
    "      - name: Lint",
    "        run: pnpm lint",
    "      - name: Typecheck",
    "        run: pnpm typecheck",
    "      - name: Unit tests",
    "        run: pnpm test",
    "      - uses: github/codeql-action/analyze@v3",
  ].join("\n");

  /** The handle each candidate is named by, in the order the observer emits them. */
  const candidateHandles = (runners: Readonly<Record<string, string | null>>): string[] =>
    runningStaticChecks([ci], pkg, runners).map((observation) => observation.staticCheck);

  it("reads a manifest that has said nothing as a target that has said nothing, and calls it no error", () => {
    // THE PREMISE, AND IT IS ALSO HALF THE CLAIM. An absent block is a supported state rather than
    // an incomplete one: the reader returns a target with no tier named and nothing unrecognised,
    // and there is no third channel — no throw, no fault, nothing for a caller to report — for the
    // absence to arrive on.
    expect(resolveRunners(manifest)).toStrictEqual({ tiers: {}, unrecognisedKeys: [] });
  });

  it("makes every step of the pipeline a candidate fitness check, whatever form it takes", () => {
    // THE EXACT SET, NOT A COUNT. A total is reachable two ways — a reader that dropped the two
    // action steps and gained two elsewhere would report seven — and this claim is about WHICH
    // steps reached the books. Sorted by handle, which is the order the observer emits in.
    expect(candidateHandles(resolveRunners(manifest).tiers)).toEqual([
      "actions/checkout@v4",
      "actions/setup-node@v4",
      "github/codeql-action/analyze@v3",
      "lint",
      "pnpm install --frozen-lockfile",
      "test",
      "typecheck",
    ]);
  });

  it("leaves the target's own test suite a candidate like any other step", () => {
    // ASSERTED RATHER THAN QUIETLY EXEMPTED, and it is the arm this scenario would be dishonest
    // without. With no runner named, `pnpm test` is a step; a reader that let it out would be
    // holding a rule about what a test step is CALLED or what it LOOKS like, which is a runner
    // list of ours arriving at the one step where it would look most reasonable. The false
    // positive is the direction this axis chose: it is visible, and the arm below is its remedy.
    expect(candidateHandles(resolveRunners(manifest).tiers)).toContain("test");
    expect(recognisedRunners([ci], pkg, resolveRunners(manifest).tiers)).toEqual([]);
  });

  it("takes exactly one step out when one runner is named — the control, and the consumer's remedy", () => {
    // THE SAME BYTES, ONE LINE OF CONFIGURATION APART. Without this arm every claim above is
    // satisfied by a reader that cannot take any step out of discovery at all, and the whole file
    // would pass over a tool with no exclusion left in it. It is also what the report's false
    // positive costs to correct: one tier named, and the suite step leaves the books.
    const named = resolveRunners({ specController: { runners: { unit: "vitest" } } }).tiers;
    expect(recognisedRunners([ci], pkg, named)).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
    expect(candidateHandles(named)).toEqual([
      "actions/checkout@v4",
      "actions/setup-node@v4",
      "github/codeql-action/analyze@v3",
      "lint",
      "pnpm install --frozen-lockfile",
      "typecheck",
    ]);
  });
});
