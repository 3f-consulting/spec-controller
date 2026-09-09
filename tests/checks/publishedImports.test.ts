/**
 * The `@unit` guard for @SCN-API-007 — a module that travels in the tarball importing a subpath no
 * manifest publishes reds the check.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `describe` / `it` strings carry the
 * SCN-API-007 id matching features/public-api.feature, so a grep of that id returns both halves of
 * the pair. `@unit` only — this Vitest run IS the observed evidence, and no Cucumber block is owed.
 *
 * ONE ARM, AND ITS SUBJECT IS THIS REPOSITORY'S OWN PUBLISHED MODULES. It reports the whole
 * verdict in a single comparison, and the floors beside it are what make the empty `drift` mean
 * something — a scan that reached no modules, or reached modules crossing no package boundary,
 * reads exactly like a clean workspace, and the denominators are the only thing telling the two
 * apart.
 *
 * THE PLANTED-WORKSPACE ARM WENT AT 3F-3245. It drove an invented workspace on disk, authored from
 * this module's implementation by that implementation's author — one author keeping both books, so
 * its green proved the check does what its author wrote rather than what the rule requires.
 *
 * WHY THE REAL-TREE ARM STAYS (3F-3218 Ruling B, measured at 3F-3228 rather than inherited).
 * `publishedImports.ts` is imported by NOTHING outside this file — no fitness row in
 * `specController.fitnessChecks` names it, no `lint:` script invokes it, no Cucumber step reaches
 * it, and no sibling arm borrows it as an instrument. So the arm below is this check's only contact
 * with the repository — the check itself, rather than a second opinion about it. It is also the
 * reading that cannot be
 * had any other way: every gate in this tree resolves through the workspace `exports` map, and npm
 * REPLACES that map with `publishConfig.exports` rather than merging them, so a module reaching an
 * un-published subpath is correct in-workspace and unresolvable once installed.
 *
 * WHAT THE CUT COST, NAMED RATHER THAN LEFT TO BE DISCOVERED. Three arms went that asserted
 * `publishedModulesOf` RAISES on input it cannot read — a package with no `tsconfig.build.json`, an
 * `include` glob it cannot expand, a manifest naming no `files`. Those refusals are the module's
 * own anti-vacuity design (its header argues them) and they are no longer unit-proven: a refusal
 * cannot be planted into the same corpus as the crossings, because it aborts the read that produces
 * the verdict. The behaviour is unchanged and still fails loudly at the build — it is the PROOF
 * that is now carried by the code alone, and this paragraph is where a reader is told so.
 */

import { readFileSync } from "node:fs";
import {} from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  publishedModulesOf,
  reconcilePublishedImports,
  siblingSpecifiersIn,
  unpublishedImportReport,
} from "./publishedImports.js";
import { workspaceManifests } from "./publishedSurfaces.js";

describe("[SCN-API-007] every module these packages publish imports only what these manifests publish", () => {
  it("[SCN-API-007] holds this repository's own published modules to the specifiers its manifests publish", () => {
    // The dogfood green, and this check's only contact with the repository (Ruling B, above): any
    // published module that starts reaching an un-published subpath reds HERE and nowhere else.
    const manifests = workspaceManifests();
    const published = manifests.flatMap((manifest) => publishedModulesOf(manifest, process.cwd()));
    const names = manifests.map((manifest) => manifest.content["name"] as string);
    const crossings = published.flatMap((module) =>
      siblingSpecifiersIn(readFileSync(join(process.cwd(), module), "utf8"), module, names),
    );
    const found = reconcilePublishedImports(manifests, process.cwd());

    expect({
      drift: found,
      report: unpublishedImportReport(found),
      // The anti-vacuity floor over the REAL tree. `drift: []` from a scan that found no modules,
      // or found modules that cross no package boundary, reads exactly like a clean workspace. The
      // two barrels are named because they are the entry points a consumer actually loads, and the
      // counts are FLOORS rather than transcriptions — 58 modules and 15 crossings on the tree this
      // arm was last measured against, so a floor well under each reds on a scan that has been
      // narrowed or emptied without redding on an ordinary module being added or retired.
      readsBothPackages: [
        published.includes(join("packages", "core", "src", "index.ts")),
        published.includes(join("packages", "spec-controller", "src", "cli.ts")),
      ],
      scannedEnough: published.length >= 40,
      crossedTheBoundary: [
        [...new Set(crossings)],
        crossings.length >= 8,
      ],
    }).toEqual({
      drift: [],
      report: "",
      readsBothPackages: [true, true],
      scannedEnough: true,
      crossedTheBoundary: [["@3f-consulting/spec-controller-core"], true],
    });
  });
});
