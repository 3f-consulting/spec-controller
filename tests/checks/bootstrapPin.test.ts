/**
 * @SCN-SLF-009's `@unit` arm — the pin this repository reconciles itself with is ONE EXACT
 * PUBLISHED VERSION.
 *
 * WHY A PIN AT ALL. 3F-3105 makes this repository a consumer of its own published product: the
 * reconciler that reaches the verdict is resolved from npm rather than run out of the tree it is
 * judging. The version it resolves is the single declaration of WHICH reader judges this tree, and a
 * declaration that can drift is not one — `latest` hands a stranger's publish the power to red this
 * build, and a range does the same on a narrower day.
 *
 * WHAT THIS ARM CAN AND CANNOT SEE. It reads the manifest, so it proves the DECLARATION is exact.
 * It says nothing about which binary actually ran; that is @SCN-SLF-009's `@integration` arm, which
 * reads the reader's own provenance rather than the manifest that asked for it. Neither arm is
 * sufficient alone — a manifest can be exact and the binary still be the workspace copy.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The package whose resolved binary reaches this repository's own verdict. */
const RECONCILER = "spec-controller";

/**
 * Everything a specifier may not be.
 *
 * `workspace:` IS ON THIS LIST AND IS THE ONE THAT MATTERS MOST, because it is what this repository
 * held before 3F-3105 and it is the failure this whole slice exists to end: resolving the reconciler
 * out of the tree under change, so a reconciler defect could suppress its own out-of-balance.
 */
const FLOATING = [
  { specifier: "^0.1.0-alpha.2", why: "a caret range" },
  { specifier: "~0.1.0-alpha.2", why: "a tilde range" },
  { specifier: ">=0.1.0-alpha.2", why: "an open range" },
  { specifier: "0.1.x", why: "a wildcard" },
  { specifier: "*", why: "any version at all" },
  { specifier: "latest", why: "a dist-tag that moves" },
  { specifier: "alpha", why: "the dist-tag this release actually publishes under" },
  { specifier: "workspace:*", why: "the tree under change — the fault 3F-3105 ends" },
];

/** An exact semver, prerelease included, and nothing else. */
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function rootManifest(): { devDependencies?: Record<string, string>; scripts?: Record<string, string> } {
  return JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as ReturnType<
    typeof rootManifest
  >;
}

describe("[SCN-SLF-009] the reconciler is pinned to one exact published version", () => {
  it("declares spec-controller as an exact version, not a range, a dist-tag or a workspace link", () => {
    const declared = rootManifest().devDependencies?.[RECONCILER];

    expect(
      declared,
      `the root manifest must declare ${RECONCILER}: it is the reader that reaches this repository's own verdict`,
    ).toBeDefined();

    expect(
      declared,
      `${RECONCILER} is pinned to "${String(declared)}", which is not one exact published version`,
    ).toMatch(EXACT);
  });

  it("reds on every floating specifier, so the pin cannot quietly become a range", () => {
    // TEETH. The assertion above passes on exactly one shape; this one proves it FAILS on the
    // shapes that matter, including the `workspace:` link this repository actually held. Without
    // it, a regex that accepted everything would read as green.
    for (const { specifier, why } of FLOATING) {
      expect(specifier, `${specifier} (${why}) must not read as an exact pin`).not.toMatch(EXACT);
    }
  });

  it("routes the root script to the installed binary rather than to this tree's own source", () => {
    // THE SCRIPT STAYS, AND DELETING IT WAS THE WRONG CALL — measured. `pnpm spec-controller …`
    // does fall through to node_modules/.bin when no script of that name exists, so deleting it
    // put the pinned binary in the judge's seat. But `localLadder` derives the local ladder by
    // mapping each CI step to a package.json SCRIPT, so with no script the two steps that invoke
    // this tool stopped being gates: `pnpm ladder` yielded 7 where CI runs 9, and @SCN-LAD-002 red.
    // `pnpm verify` had quietly stopped running the corpus-tags check AND the self-reconciliation —
    // the two gates this whole slice exists to make trustworthy.
    //
    // A script whose body is the bare binary name is not recursion: pnpm puts node_modules/.bin on
    // PATH, so the shell finds the installed executable, not this script. Measured, not assumed.
    const script = rootManifest().scripts?.[RECONCILER];

    expect(
      script,
      `the root "${RECONCILER}" script must exist: localLadder maps CI steps to scripts, and without it ` +
        "the corpus-tags check and the self-reconciliation stop being local gates",
    ).toBeDefined();

    // THE TEETH. The fault this slice ends is the tool being run out of the tree it judges, and the
    // way that comes back is a script body naming this repository's own source.
    expect(
      script,
      `the root "${RECONCILER}" script runs this tree's own source ("${String(script)}"), which puts the ` +
        "code under change back in the judge's seat",
    ).not.toMatch(/packages[/\\]spec-controller/);
    expect(script, "the root script must invoke the resolved binary").toBe(RECONCILER);
  });
});
