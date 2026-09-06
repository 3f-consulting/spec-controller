/**
 * The `@unit` arm for @SCN-API-007 — a module that travels in the tarball importing a subpath no
 * manifest publishes reds the guard.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `describe` / `it` strings carry the
 * SCN-API-007 id matching features/public-api.feature, so a grep of that id returns both halves of
 * the pair. `@unit` only, as its three siblings in that file are — this Vitest run IS the observed
 * evidence, and no Cucumber block is owed.
 *
 * GREEN ON ITS FIRST RUN, AND THAT IS THE POINT RATHER THAN A CONCESSION. The fault this guard
 * closes was repaired three sub-issues earlier (3F-3087 / 3F-3088 / 3F-3089), so there is no red
 * left in the tree for it to stage. Its teeth come from PLANTS instead, and both directions are
 * planted here rather than argued: a published module reaching an unpublished subpath must red, and
 * a module the workspace never ships must be free to reach the same subpath — because that seam is
 * what `./internal` exists for, and a guard that banned it would have taken nineteen correct
 * modules with it.
 *
 * THE PLANTS RUN OVER A WHOLE WORKSPACE ON DISK, for the reason @SCN-API-006's do next door: what
 * this arm has to get right is which sources a build turns into a tarball, and a list of module
 * paths handed straight to the reconciliation would exercise none of it. The planted project shares
 * no term with this repository, so a reader with any of these packages' names written into it
 * agrees with the planted case by coincidence or not at all.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  importedSpecifiersIn,
  publishedModulesOf,
  reconcilePublishedImports,
  siblingSpecifiersIn,
  unpublishedImportReport,
} from "./publishedImports.js";
import {
  workspaceManifests,
  workspaceManifestsIn,
  type WorkspaceManifest,
} from "./publishedSurfaces.js";

/** The planted workspace's own file, kept apart so an arm can substitute a package it cannot read. */
const PLANTED_WORKSPACE_FILE = `packages:
  - "lib/*"
`;

/** The build config both planted packages compile through — this workspace's own arrangement. */
const PLANTED_BUILD = JSON.stringify({
  compilerOptions: { outDir: "dist", rootDir: "src" },
  include: ["src"],
  exclude: ["src/**/*.test.ts"],
});

/**
 * A workspace belonging to a fictional shipping project, planted for the occasion.
 *
 * `lib/routing` IS THE `./internal` SHAPE. Its workspace map carries `./tariffs` and its
 * publish-time map does not, so `harbour-co-routing/tariffs` is a specifier that resolves inside
 * the workspace and cannot resolve once installed — exactly the crossing that took the real CLI
 * down. Three modules reach it here and only one of them is a fault: `src/plant.ts` is compiled and
 * shipped, `src/plant.test.ts` is excluded from the build, and `tools/audit.ts` sits outside every
 * root the build compiles. All three are added per arm, so the base workspace is clean.
 *
 * `lib/depot/src/intake.ts` MENTIONS the same specifier inside a comment and imports it nowhere.
 * That is the decoy this repository actually carries, twice, in published modules.
 */
const PLANTED_FILES: Readonly<Record<string, string>> = {
  "lib/routing/package.json": JSON.stringify({
    name: "harbour-co-routing",
    files: ["dist"],
    exports: { ".": "./src/index.ts", "./tariffs": "./src/tariffs.ts" },
    publishConfig: {
      exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
    },
  }),
  "lib/routing/tsconfig.build.json": PLANTED_BUILD,
  "lib/routing/src/index.ts": 'import { intake } from "harbour-co-depot/intake";\nexport const route = intake;\n',
  "lib/routing/src/tariffs.ts": "export const tariff = 1;\n",
  "lib/depot/package.json": JSON.stringify({
    name: "harbour-co-depot",
    files: ["dist"],
    exports: { "./intake": "./src/intake.ts" },
  }),
  "lib/depot/tsconfig.build.json": PLANTED_BUILD,
  "lib/depot/src/intake.ts":
    '// Reached through harbour-co-routing/tariffs before the split; kept as a note, not an import.\n' +
    'const note = "harbour-co-routing/tariffs";\nexport const intake = note;\n',
};

/** A module reaching the subpath the planted workspace does not publish, wherever it is put. */
const REACHES_TARIFFS = 'import { tariff } from "harbour-co-routing/tariffs";\nexport const t = tariff;\n';

/** Write the planted workspace to a real directory, read it, and take it away again. */
function withPlantedWorkspace<T>(
  read: (repoRoot: string) => T,
  extra: Readonly<Record<string, string>> = {},
): T {
  const root = mkdtempSync(join(tmpdir(), "harbour-co-workspace-"));
  try {
    writeFileSync(join(root, "pnpm-workspace.yaml"), PLANTED_WORKSPACE_FILE);
    for (const [path, source] of Object.entries({ ...PLANTED_FILES, ...extra })) {
      const file = join(root, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, source);
    }
    return read(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** One planted package's manifest by directory name, so an arm names what it reads rather than indexing. */
function plantedManifest(repoRoot: string, packageDir: string): WorkspaceManifest {
  const wanted = join("lib", packageDir, "package.json");
  const found = workspaceManifestsIn(repoRoot).find((manifest) => manifest.path === wanted);
  if (found === undefined) {
    throw new Error(`the planted workspace read found no manifest at ${wanted}`);
  }
  return found;
}

/** A manifest handed straight over, for the arms about a manifest's CONTENT rather than a tree. */
function manifestOf(content: Readonly<Record<string, unknown>>): WorkspaceManifest {
  return { path: "lib/depot/package.json", content };
}

/** One of this repository's published modules, read the way the reconciliation reads it. */
function readSource(module: string): string {
  return readFileSync(join(process.cwd(), module), "utf8");
}

/** This repository's own manifest at one path, so an arm about it fails saying which was missing. */
function manifestAt(path: string): WorkspaceManifest {
  const found = workspaceManifests().find((manifest) => manifest.path === path);
  if (found === undefined) {
    throw new Error(`no manifest found at ${path} — the workspace read found nothing there`);
  }
  return found;
}

describe("[SCN-API-007] the modules a package would publish are what `files` and the build together ship", () => {
  it("[SCN-API-007] finds the sources the build compiles, recursing as the compiler does", () => {
    const modules = withPlantedWorkspace(
      (root) => publishedModulesOf(plantedManifest(root, "routing"), root),
      { "lib/routing/src/inland/depot.ts": "export const inland = 1;\n" },
    );

    expect(modules).toEqual([
      join("lib", "routing", "src", "index.ts"),
      join("lib", "routing", "src", "inland", "depot.ts"),
      join("lib", "routing", "src", "tariffs.ts"),
    ]);
  });

  it("[SCN-API-007] leaves out a source the build excludes, which is what keeps a test module off the boat", () => {
    // Load-bearing rather than tidy: three `*.test.ts` modules beside this repository's published
    // sources reach the un-published subpath, correctly, and are never compiled into the tarball.
    const modules = withPlantedWorkspace(
      (root) => publishedModulesOf(plantedManifest(root, "routing"), root),
      { "lib/routing/src/plant.test.ts": REACHES_TARIFFS },
    );

    expect(modules).not.toContain(join("lib", "routing", "src", "plant.test.ts"));
  });

  it("[SCN-API-007] finds no published modules in a package whose files list does not ship what the build wrote", () => {
    const modules = withPlantedWorkspace(
      (root) => publishedModulesOf(plantedManifest(root, "depot"), root),
      { "lib/depot/package.json": JSON.stringify({ name: "harbour-co-depot", files: ["README.md"] }) },
    );

    expect(modules).toEqual([]);
  });

  it("[SCN-API-007] refuses a package with no build config rather than reading no modules off it", () => {
    // The quiet failure this reader must not have. A third package arrives under the same pattern
    // with nothing beside it saying what it compiles; scanned for nothing, it would be reported
    // clean, and every module in it would travel unheld.
    expect(() =>
      withPlantedWorkspace((root) => publishedModulesOf(plantedManifest(root, "wharf"), root), {
        "lib/wharf/package.json": JSON.stringify({ name: "harbour-co-wharf", files: ["dist"] }),
        "lib/wharf/src/berth.ts": REACHES_TARIFFS,
      }),
    ).toThrow(/lib\/wharf\/package\.json/);
  });

  it("[SCN-API-007] refuses an include it cannot expand rather than expanding it to nothing", () => {
    expect(() =>
      withPlantedWorkspace((root) => publishedModulesOf(plantedManifest(root, "depot"), root), {
        "lib/depot/tsconfig.build.json": JSON.stringify({
          compilerOptions: { outDir: "dist" },
          include: ["src/**/*.ts"],
        }),
      }),
    ).toThrow(/src\/\*\*\/\*\.ts/);
  });

  it("[SCN-API-007] refuses a package that names no list of files to ship", () => {
    expect(() => publishedModulesOf(manifestOf({ name: "harbour-co-depot" }), tmpdir())).toThrow(
      /lib\/depot\/package\.json/,
    );
  });
});

describe("[SCN-API-007] a module's imports are read off its import statements, never off its text", () => {
  it("[SCN-API-007] reads a plain import, an `export … from`, a type-only import and a dynamic import()", () => {
    const source = [
      'import { a } from "harbour-co-depot/intake";',
      'export { b } from "harbour-co-routing/tariffs";',
      'import type { C } from "harbour-co-routing";',
      'const d = await import("harbour-co-depot");',
    ].join("\n");

    expect(importedSpecifiersIn(source, "plant.ts")).toEqual([
      "harbour-co-depot/intake",
      "harbour-co-routing/tariffs",
      "harbour-co-routing",
      "harbour-co-depot",
    ]);
  });

  it("[SCN-API-007] reads no specifier out of a comment or out of an ordinary string", () => {
    // The decoy this repository actually carries. `packages/core/src/internal.ts` is a PUBLISHED
    // module and names the un-published specifier inside a comment, correctly; a match over the file
    // text finds it and reports one fault where there are none. Measured on the tree this arm first
    // ran over: 56 published modules, one text-match hit, zero imports.
    const source = PLANTED_FILES["lib/depot/src/intake.ts"] as string;

    expect(importedSpecifiersIn(source, "intake.ts")).toEqual([]);
  });

  it("[SCN-API-007] judges only the specifiers that name a package of this workspace", () => {
    const source = [
      'import { readFileSync } from "node:fs";',
      'import { parse } from "yaml";',
      'import { local } from "./local.js";',
      'import { intake } from "harbour-co-depot/intake";',
    ].join("\n");

    expect(siblingSpecifiersIn(source, "plant.ts", ["harbour-co-routing", "harbour-co-depot"])).toEqual([
      "harbour-co-depot/intake",
    ]);
  });
});

describe("[SCN-API-007] a published module importing a subpath the manifests do not publish reds the guard", () => {
  it("[SCN-API-007] flags a published module importing a workspace subpath no manifest publishes", () => {
    // The fault itself, on the `./internal` shape: the workspace map carries `./tariffs`, the
    // publish-time map does not, and npm REPLACES one with the other rather than merging them. This
    // is the direction that would have reded on the day the installed CLI could not start.
    const found = withPlantedWorkspace(
      (root) => reconcilePublishedImports(workspaceManifestsIn(root), root),
      { "lib/routing/src/plant.ts": REACHES_TARIFFS },
    );

    expect(found).toEqual([
      { module: join("lib", "routing", "src", "plant.ts"), specifier: "harbour-co-routing/tariffs" },
    ]);
  });

  it("[SCN-API-007] lets a module this workspace never publishes import that same subpath", () => {
    // The half that keeps the seam. `./internal` is un-published AND its workspace key is kept so
    // in-repo modules go on resolving it; a guard that reded on those would have banned the very
    // arrangement it exists to protect. Both ways a module stays home are planted — outside every
    // root the build compiles, and inside one but excluded from the compilation.
    const found = withPlantedWorkspace(
      (root) => reconcilePublishedImports(workspaceManifestsIn(root), root),
      { "lib/routing/tools/audit.ts": REACHES_TARIFFS, "lib/routing/src/plant.test.ts": REACHES_TARIFFS },
    );

    expect(found).toEqual([]);
  });

  it("[SCN-API-007] finds no drift when every published module imports a specifier the manifests publish", () => {
    // The anti-vacuity floor for the plant above: `lib/routing/src/index.ts` DOES cross a package
    // boundary, to `harbour-co-depot/intake`, which the depot's manifest publishes. An empty answer
    // here has to be a judgement rather than a scan that found nothing to judge.
    const crossings = siblingSpecifiersIn(
      PLANTED_FILES["lib/routing/src/index.ts"] as string,
      "index.ts",
      ["harbour-co-routing", "harbour-co-depot"],
    );

    expect(crossings).toEqual(["harbour-co-depot/intake"]);
    expect(withPlantedWorkspace((root) => reconcilePublishedImports(workspaceManifestsIn(root), root))).toEqual([]);
  });

  it("[SCN-API-007] names the module, the specifier and what an installed consumer would hit", () => {
    const report = unpublishedImportReport([
      { module: join("lib", "routing", "src", "plant.ts"), specifier: "harbour-co-routing/tariffs" },
    ]);

    expect(report).toContain(join("lib", "routing", "src", "plant.ts"));
    expect(report).toContain("harbour-co-routing/tariffs");
    expect(report).toContain("ERR_PACKAGE_PATH_NOT_EXPORTED");
  });
});

describe("[SCN-API-007] every module these packages publish imports only what these manifests publish", () => {
  it("[SCN-API-007] finds published modules in both packages, and workspace crossings among them", () => {
    // The anti-vacuity floor over the REAL tree. The arm below asserts an empty answer, and an empty
    // answer from a scan that found no modules, or found modules that cross no package boundary,
    // reads exactly like a clean workspace.
    const core = publishedModulesOf(manifestAt(join("packages", "core", "package.json")), process.cwd());
    const app = publishedModulesOf(manifestAt(join("packages", "spec-controller", "package.json")), process.cwd());
    const names = workspaceManifests().map((manifest) => manifest.content["name"] as string);
    const crossings = app.flatMap((module) =>
      siblingSpecifiersIn(readSource(module), module, names),
    );

    expect(core).toContain(join("packages", "core", "src", "index.ts"));
    expect(app).toContain(join("packages", "spec-controller", "src", "cli.ts"));
    expect(crossings).toContain("@3f-consulting/spec-controller-core");
  });

  it("[SCN-API-007] holds this repository's published modules to the specifiers its manifests publish", () => {
    const found = reconcilePublishedImports(workspaceManifests(), process.cwd());

    expect(unpublishedImportReport(found)).toBe("");
    expect(found).toEqual([]);
  });
});
