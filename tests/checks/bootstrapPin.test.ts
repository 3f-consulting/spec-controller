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
    // THE REASON THIS SCRIPT EXISTED HAS GONE, AND ITS REPLACEMENT WAS MEASURED RATHER THAN
    // ASSUMED (3F-3475). It was here because a derived local ladder mapped each CI step to a
    // package.json SCRIPT, so with no script the two steps invoking this tool stopped being local
    // gates. That derivation is deleted. Re-measured on its branch WITHOUT it — this script
    // removed, `balance` re-run over the same evidence — the report is unchanged in every cell:
    // 246/243/3 scenario reconciliations, 406/403/3 obligations, 24 steps read, 12 candidates,
    // 12 static checks run and 0 uncited, SCN-FIT-014 (`pnpm spec-controller tags`) still
    // satisfied, the reconciler still recognised at `Self-reconciliation balance`, and the
    // excluded-step list byte-identical. The product's own discovery does not need the alias.
    //
    // AND WHAT THAT MEASUREMENT DOES NOT SETTLE IS SAID RATHER THAN GLOSSED. It is a
    // RECONCILIATION read off recorded evidence, so it shows the product's DISCOVERY is indifferent
    // to the alias — it is not proof of WHICH BINARY answers when the script is absent. That claim
    // is 3F-3293's, and the arm that would catch it moving is @SCN-SLF-009's `@integration` one,
    // which reads the reader's own `Tool version:` line.
    //
    // SO WHAT THIS ARM STILL GUARDS IS THE SECOND CLAUSE, NOT THE FIRST. `pnpm spec-controller …`
    // does fall through to node_modules/.bin when no script of that name exists, so while the
    // script exists it is what decides which binary judges this tree — the fault 3F-3293 ended.
    // Whether it must exist AT ALL now belongs to 3F-3476, which deletes this whole file and takes
    // the script with it. The assertion below is left standing rather than quietly dropped, because
    // retiring an assertion is a decision and it is not the deleting slice's to take.
    //
    // A script whose body is the bare binary name is not recursion: pnpm puts node_modules/.bin on
    // PATH, so the shell finds the installed executable, not this script. Measured, not assumed.
    const script = rootManifest().scripts?.[RECONCILER];

    expect(
      script,
      `the root "${RECONCILER}" script must exist — see the comment above: its original reason left ` +
        "with the local ladder (3F-3475), and the script's own removal belongs to 3F-3476, which " +
        "deletes this file. Until then this assertion stands.",
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
