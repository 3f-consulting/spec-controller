/**
 * The `@unit` guard for @SCN-API-007 — a module that travels in the tarball importing a subpath no
 * manifest publishes reds the check.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `describe` / `it` strings carry the
 * SCN-API-007 id matching features/public-api.feature, so a grep of that id returns both halves of
 * the pair. `@unit` only — this Vitest run IS the observed evidence, and no Cucumber block is owed.
 *
 * TWO ARMS, AND WHICH ONE ANSWERS WHICH QUESTION (3F-3218). The first drives one planted workspace
 * on disk carrying an instance of every crossing this check detects and every near-miss it must
 * let through, and reports the whole verdict in a single comparison. The second runs that same
 * reconciliation over this repository's own published modules. Neuter `reconcilePublishedImports`
 * and the first reds while the second is still green — which is the failure the second cannot see.
 *
 * ONE ASSERTION OVER THE WHOLE VERDICT, NOT ONE ARM PER FORM. Four arms each saying "this form is
 * detected" leave ORDER and COMPLETENESS unasserted — a checker reporting the four plus a fifth, or
 * in another order, satisfies all four. The single `toEqual` closes both, and every module that
 * must NOT be reported is proven by its ABSENCE from that array: a negative control costing a line
 * rather than an arm. The `scanned` member beside it is what makes those absences mean something —
 * a decoy missing from the verdict because the scan never reached it reads exactly like a decoy
 * correctly let through, and the denominator is the only thing that tells the two apart.
 *
 * GREEN ON ITS FIRST RUN, AND THAT IS THE POINT RATHER THAN A CONCESSION. The fault this check
 * closes was repaired at 3F-3087 / 3F-3088 / 3F-3089, so there is no red left in the tree for it to
 * stage. Its teeth come from PLANTS instead, and both directions are planted rather than argued: a
 * published module reaching an unpublished subpath must red, and a module the workspace never ships
 * must be free to reach the same subpath — because that seam is what `./internal` exists for, and a
 * guard that banned it would have taken nineteen correct modules with it.
 *
 * THE PLANT RUNS OVER A WHOLE WORKSPACE ON DISK, for the reason @SCN-API-006's does next door: what
 * this arm has to get right is which sources a build turns into a tarball, and a list of module
 * paths handed straight to the reconciliation would exercise none of it. The planted project shares
 * no term with this repository, so a reader with any of these packages' names written into it
 * agrees with the planted case by coincidence or not at all.
 *
 * WHY THE REAL-TREE ARM STAYS (3F-3218 Ruling B, measured at 3F-3228 rather than inherited).
 * `publishedImports.ts` is imported by NOTHING outside this file — no fitness row in
 * `specController.fitnessChecks` names it, no `lint:` script invokes it, no Cucumber step reaches
 * it, and no sibling arm borrows it as an instrument. So the arm below is this check's only contact
 * with the repository, and deleting it would leave the check running forever over invented fixtures
 * and reporting green about a world it had stopped looking at. It is also the half that cannot be
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

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  publishedModulesOf,
  reconcilePublishedImports,
  siblingSpecifiersIn,
  unpublishedImportReport,
  type UnpublishedImport,
} from "./publishedImports.js";
import { workspaceManifests, workspaceManifestsIn } from "./publishedSurfaces.js";

/** The build config all three planted packages compile through — this workspace's own arrangement. */
const PLANTED_BUILD = JSON.stringify({
  compilerOptions: { outDir: "dist", rootDir: "src" },
  include: ["src"],
  exclude: ["src/**/*.test.ts"],
});

/** The subpath the planted workspace resolves and the planted tarball cannot — the `./internal` shape. */
const UNPUBLISHED = "harbour-co-routing/tariffs";

/** A module reaching that subpath by a plain import, wherever the corpus puts it. */
const REACHES_UNPUBLISHED = `import { tariff } from "${UNPUBLISHED}";\nexport const t = tariff;\n`;

/**
 * One workspace belonging to a fictional shipping project, planted for the occasion.
 *
 * `lib/routing`'s workspace map carries `./tariffs` and its publish-time map does not, so
 * `harbour-co-routing/tariffs` resolves inside the workspace and cannot resolve once installed —
 * exactly the crossing that took the real CLI down. FOUR modules reach it and are faults, one in
 * each of the forms a module can cross a package boundary by; FOUR more reach it or name it and are
 * not, one for each reason this check must let a module through.
 */
const PLANTED_FILES: Readonly<Record<string, string>> = {
  "pnpm-workspace.yaml": 'packages:\n  - "lib/*"\n',

  "lib/routing/package.json": JSON.stringify({
    name: "harbour-co-routing",
    files: ["dist"],
    exports: { ".": "./src/index.ts", "./tariffs": "./src/tariffs.ts" },
    publishConfig: {
      exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
    },
  }),
  "lib/routing/tsconfig.build.json": PLANTED_BUILD,
  "lib/routing/src/tariffs.ts": "export const tariff = 1;\n",
  // The anti-vacuity floor INSIDE the plant, and the three specifier kinds this check does not
  // judge. `harbour-co-depot/intake` IS a workspace crossing and the depot's manifest publishes it,
  // so it is judged and cleared — an empty answer for this module is a verdict rather than a scan
  // that found nothing to judge. A `node:` builtin, a third party and a relative path are somebody
  // else's contract or never leave the package, and none of them reaches the verdict.
  "lib/routing/src/index.ts":
    'import { readFileSync } from "node:fs";\n' +
    'import { parse } from "yaml";\n' +
    'import { tariff } from "./tariffs.js";\n' +
    'import { intake } from "harbour-co-depot/intake";\n' +
    "export const route = [readFileSync, parse, tariff, intake];\n",

  // FAULT, form 1 of 4 — a plain import.
  "lib/routing/src/berth.ts": REACHES_UNPUBLISHED,
  // FAULT, form 2 of 4 — `export … from`, which crosses the boundary at load exactly as an import
  // does and which a reader looking only for `import` would miss.
  "lib/routing/src/consign.ts": `export { tariff } from "${UNPUBLISHED}";\n`,
  // FAULT, form 3 of 4 — a type-only import. Erased by the compiler, so it is the form most easily
  // argued to be harmless; it is not, because `verbatimModuleSyntax` is not in play and the
  // declaration file emitted beside it names the same unresolvable subpath.
  "lib/routing/src/manifest.ts": `import type { Tariff } from "${UNPUBLISHED}";\nexport type T = Tariff;\n`,
  // FAULT, form 4 of 4 — a dynamic `import()`, planted one directory DOWN so the same line proves
  // the walk recurses as the compiler does rather than reading only a root's own children.
  "lib/routing/src/inland/haulage.ts": `export const haul = () => import("${UNPUBLISHED}");\n`,

  // FREE, reason 1 of 4 — inside a compiled root but matched by the build's `exclude`, so it never
  // becomes a published module. Load-bearing rather than tidy: three `*.test.ts` modules beside
  // this repository's own published sources reach its un-published subpath, correctly.
  "lib/routing/src/plant.test.ts": REACHES_UNPUBLISHED,
  // FREE, reason 2 of 4 — outside every root the build compiles, so nothing of it travels.
  "lib/routing/tools/audit.ts": REACHES_UNPUBLISHED,

  "lib/depot/package.json": JSON.stringify({
    name: "harbour-co-depot",
    files: ["dist"],
    exports: { "./intake": "./src/intake.ts" },
  }),
  "lib/depot/tsconfig.build.json": PLANTED_BUILD,
  // FREE, reason 3 of 4 — a PUBLISHED module naming the subpath in a comment and in an ordinary
  // string, importing it nowhere. The decoy this repository actually carries: `packages/core/src/
  // internal.ts` names the un-published specifier in a comment, correctly, and a match over the
  // file text reports one fault where there are none. Parsing is what makes the reading say what
  // the sentence says.
  "lib/depot/src/intake.ts":
    `// Reached through ${UNPUBLISHED} before the split; kept as a note, not an import.\n` +
    `const note = "${UNPUBLISHED}";\nexport const intake = note;\n`,

  // FREE, reason 4 of 4 — a package whose `files` does not ship what its build wrote, so no module
  // in it travels and none of them is scanned.
  "lib/wharf/package.json": JSON.stringify({ name: "harbour-co-wharf", files: ["README.md"] }),
  "lib/wharf/tsconfig.build.json": PLANTED_BUILD,
  "lib/wharf/src/quay.ts": REACHES_UNPUBLISHED,
};

/** Write the planted workspace to a real directory, read it, and take it away again. */
function withPlantedWorkspace<T>(read: (repoRoot: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), "harbour-co-workspace-"));
  try {
    for (const [path, source] of Object.entries(PLANTED_FILES)) {
      const file = join(root, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, source);
    }
    return read(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** One crossing of the planted workspace's un-published subpath, by the module that makes it. */
function crossing(...segments: readonly string[]): UnpublishedImport {
  return { module: join(...segments), specifier: UNPUBLISHED };
}

describe("[SCN-API-007] every module these packages publish imports only what these manifests publish", () => {
  it("[SCN-API-007] reports every planted crossing, in order, and nothing for the modules that never travel", () => {
    const { verdict, scanned } = withPlantedWorkspace((root) => {
      const manifests = workspaceManifestsIn(root);
      return {
        verdict: reconcilePublishedImports(manifests, root),
        scanned: manifests.flatMap((manifest) => publishedModulesOf(manifest, root)),
      };
    });

    expect({ verdict, scanned }).toEqual({
      verdict: [
        crossing("lib", "routing", "src", "berth.ts"),
        crossing("lib", "routing", "src", "consign.ts"),
        crossing("lib", "routing", "src", "inland", "haulage.ts"),
        crossing("lib", "routing", "src", "manifest.ts"),
      ],
      // The denominator, and the only thing that makes the four absences above mean anything. Every
      // module here was read and judged, so `intake.ts` clearing the verdict is the comment decoy
      // being seen through rather than skipped; and `src/plant.test.ts`, `tools/audit.ts` and every
      // module of `lib/wharf` are absent HERE, which is the check declining to scan what never
      // ships rather than scanning it and forgiving it.
      scanned: [
        join("lib", "depot", "src", "intake.ts"),
        join("lib", "routing", "src", "berth.ts"),
        join("lib", "routing", "src", "consign.ts"),
        join("lib", "routing", "src", "index.ts"),
        join("lib", "routing", "src", "inland", "haulage.ts"),
        join("lib", "routing", "src", "manifest.ts"),
        join("lib", "routing", "src", "tariffs.ts"),
      ],
    });
  });

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
