/**
 * The `@unit` arms for @SCN-API-004 — a value symbol added to or dropped from a published subpath
 * reds the guard — and @SCN-API-005, the same property over the half a runtime reflection cannot
 * see.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `describe` / `it` strings carry the
 * SCN-API-004 and SCN-API-005 ids matching features/public-api.feature, so a grep of either id
 * returns both halves of its pair. `@unit` only, as @SCN-API-001 is — this Vitest run IS the
 * observed evidence, and no Cucumber block is owed.
 *
 * THE TWO ARMS REACH THEIR SURFACES BY DIFFERENT ROUTES, AND EACH ROUTE IS PART OF WHAT IT PROVES.
 * The value arm imports the three specifiers; the type arm builds a Program over the barrel SOURCE,
 * because there is no runtime object that carries a type. So the type arm's imports are paths where
 * the value arm's are specifiers, and neither substitutes for the other: a manifest key could break
 * without the type arm noticing, and a type could be added without the value arm noticing.
 *
 * THE BARRELS ARRIVE BY THE SPECIFIER A CONSUMER WRITES, NOT BY A RELATIVE PATH. Reaching
 * `./mutation-ratchet` through `../src/mutation-ratchet/index.js` would reflect the same object and
 * prove strictly less: it would pass while the manifest key that makes the subpath importable at
 * all was broken or absent. The three imports below are the three specifiers, so resolution through
 * each manifest is part of what this arm asserts. (`[SCN-RAT-014]` makes the same argument for the
 * one subpath it pins; this is that argument applied to all three.)
 *
 * TEETH ARE PLANTED, NOT INFERRED FROM THE GREEN. The real three passing says nothing about whether
 * the reconciliation would notice if they stopped, so the drift arms below drive planted surfaces
 * belonging to a project that shares no term with this repository: a reconciler with any of these
 * packages' names written into it agrees with the planted case by coincidence or not at all. Each
 * direction is planted separately, because a reconciliation that checked only one of them is a
 * half-guard that reads exactly like a whole one.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import * as coreBarrel from "@3f-consulting/spec-controller-core";
import * as mutationRatchet from "spec-controller/mutation-ratchet";

import {
  barrelPathOf,
  PUBLISHED_SURFACES,
  publishedSpecifiersOf,
  publishedSubpathsOf,
  reconcilePublishedSubpaths,
  reconcileTypeSurface,
  reconcileValueSurface,
  reflectTypeSurface,
  specifierOf,
  workspaceManifests,
  workspaceManifestsIn,
  type PublishedSurface,
  type WorkspaceManifest,
} from "./publishedSurfaces.js";

/**
 * The runtime namespace each published specifier resolves to.
 *
 * Keyed by specifier and asserted EXHAUSTIVE against the registry below, so a surface added to the
 * registry with no import here reds instead of being skipped in silence — the coverage hole this
 * whole rule exists to close, reproduced one layer in.
 */
const REFLECTED: Readonly<Record<string, object>> = {
  "@3f-consulting/spec-controller-core": coreBarrel,
  "spec-controller/mutation-ratchet": mutationRatchet,
};

/**
 * A surface belonging to somebody else's project, written down as this registry writes one. Its
 * package, its subpath and every symbol on it are terms this repository does not use, so nothing
 * in the reconciliation can agree with it by having read this tree.
 */
const PLANTED: PublishedSurface = {
  package: "parcel-co-routing",
  subpath: "./tariffs",
  barrel: "lib/tariffs/index.ts",
  values: ["bandFor", "tariffTable"],
  types: ["Band"],
};

/** The specifier a consumer of that planted package would write. */
const PLANTED_SPECIFIER = "parcel-co-routing/tariffs";

/**
 * That same planted package as SOURCE — a two-file barrel the type arm can build a Program over.
 *
 * WHAT EACH LINE IS DOING THERE. The two types cross the barrel through `export type { … }`, which
 * binds a symbol whose own flags say only "alias" — following it is the step that fails silently
 * when the resolution settings are wrong. The `.js` specifier is the spelling this whole workspace
 * writes, so a reflection that could not follow it would find nothing here and nothing on the three
 * real barrels either. And `tariffTable` is a value carried across the same hop: a reflection that
 * kept it would be reporting the value surface a second time under the type surface's name.
 */
const PLANTED_BARREL_SOURCES: Readonly<Record<string, string>> = {
  "tariffs.ts": `export interface Band {
  readonly ceiling: number;
}

export type Zone = "inner" | "outer";

export const tariffTable: Record<Zone, Band> = {
  inner: { ceiling: 2 },
  outer: { ceiling: 5 },
};
`,
  "index.ts": `export type { Band, Zone } from "./tariffs.js";
export { tariffTable } from "./tariffs.js";
`,
};

/**
 * Write the planted barrel to a real directory, read it, and take it away again.
 *
 * On disk rather than in memory because the reflection resolves modules the way the compiler does,
 * against a filesystem — a fixture handed straight to the reader would exercise everything except
 * the resolution this arm exists to hold (evidence-manifesto §11A).
 */
function withPlantedBarrel<T>(read: (barrelPath: string) => T): T {
  const planted = mkdtempSync(join(tmpdir(), "parcel-co-routing-tariffs-"));
  try {
    for (const [name, source] of Object.entries(PLANTED_BARREL_SOURCES)) {
      writeFileSync(join(planted, name), source);
    }
    return read(join(planted, "index.ts"));
  } finally {
    rmSync(planted, { recursive: true, force: true });
  }
}

describe("[SCN-API-004] a published subpath's value exports reconcile against the surface written for it", () => {
  it("[SCN-API-004] flags a value symbol the barrel exports that the written surface does not name", () => {
    const drift = reconcileValueSurface(PLANTED, ["bandFor", "tariffTable", "draftTariffTable"]);

    expect(drift).toEqual([
      { specifier: PLANTED_SPECIFIER, kind: "unwritten-export", symbol: "draftTariffTable" },
    ]);
  });

  it("[SCN-API-004] flags a value symbol the written surface names that the barrel does not export", () => {
    const drift = reconcileValueSurface(PLANTED, ["bandFor"]);

    expect(drift).toEqual([
      { specifier: PLANTED_SPECIFIER, kind: "missing-export", symbol: "tariffTable" },
    ]);
  });

  it("[SCN-API-004] flags both directions at once when the two lists have parted company each way", () => {
    const drift = reconcileValueSurface(PLANTED, ["bandFor", "draftTariffTable"]);

    expect(drift).toEqual([
      { specifier: PLANTED_SPECIFIER, kind: "unwritten-export", symbol: "draftTariffTable" },
      { specifier: PLANTED_SPECIFIER, kind: "missing-export", symbol: "tariffTable" },
    ]);
  });

  it("[SCN-API-004] finds no drift when the two agree, whatever order the barrel hands its names over in", () => {
    // Order is the barrel's business, not the contract's — a surface that reds because a maintainer
    // moved an `export` line would be a guard nobody could keep green honestly.
    expect(reconcileValueSurface(PLANTED, ["tariffTable", "bandFor"])).toEqual([]);
  });
});

describe("[SCN-API-004] every subpath these packages publish is held to a value surface written for it", () => {
  it("[SCN-API-004] holds one entry per published subpath, and one reflection per entry", () => {
    // The anti-vacuity floor for this whole arm: the per-surface examples below are generated from
    // the registry, so an emptied or narrowed registry would produce no examples and read as a
    // clean run. Naming the three here is what makes that impossible.
    expect(PUBLISHED_SURFACES.map(specifierOf)).toEqual([
      "@3f-consulting/spec-controller-core",
      "spec-controller/mutation-ratchet",
    ]);
    expect(Object.keys(REFLECTED).sort()).toEqual(PUBLISHED_SURFACES.map(specifierOf).sort());
  });

  for (const surface of PUBLISHED_SURFACES) {
    const specifier = specifierOf(surface);

    it(`[SCN-API-004] ${specifier} exports exactly the values written down for it, both directions`, () => {
      const reflected = Object.keys(REFLECTED[specifier] ?? {});

      // Two assertions over one fact, and both earn their place. The first fails with the two lists
      // side by side, which is what a maintainer reconciling a real change wants to read; the
      // second is the reconciliation the planted arms above proved has teeth, so what greens here
      // is the mechanism under test rather than a second comparison written beside it.
      expect(reflected.sort()).toEqual([...surface.values].sort());
      expect(reconcileValueSurface(surface, reflected)).toEqual([]);
    });
  }
});

// -----------------------------------------------------------------------------------------------
// @SCN-API-005 — the TYPE half. Erased at runtime, so the arm above cannot reach it and this one
// asks the compiler instead. The plants below run in the order the scenario states them: the ADD
// first, because it is the only one of the three the typed-literal arrangement this replaces
// cannot see, and therefore the one whose teeth are worth proving before either of the others.
// -----------------------------------------------------------------------------------------------

describe("[SCN-API-005] a published subpath's type exports reconcile against the surface written for it", () => {
  it("[SCN-API-005] flags a type its barrel exports that the written surface does not name", () => {
    const drift = reconcileTypeSurface(PLANTED, ["Band", "Zone"]);

    expect(drift).toEqual([
      { specifier: PLANTED_SPECIFIER, kind: "unwritten-export", symbol: "Zone" },
    ]);
  });

  it("[SCN-API-005] flags a type its barrel exports under a new name, as both a gain and a loss", () => {
    // Nothing in a compiled surface records that one name became another, and this reports what is
    // observable rather than what was meant: a consumer's build sees a name that stopped resolving
    // and a name nobody had written down, which is these two rows.
    const drift = reconcileTypeSurface(PLANTED, ["TariffBand"]);

    expect(drift).toEqual([
      { specifier: PLANTED_SPECIFIER, kind: "unwritten-export", symbol: "TariffBand" },
      { specifier: PLANTED_SPECIFIER, kind: "missing-export", symbol: "Band" },
    ]);
  });

  it("[SCN-API-005] flags a type the written surface names that its barrel no longer exports", () => {
    expect(reconcileTypeSurface(PLANTED, [])).toEqual([
      { specifier: PLANTED_SPECIFIER, kind: "missing-export", symbol: "Band" },
    ]);
  });

  it("[SCN-API-005] finds no drift when the two agree", () => {
    expect(reconcileTypeSurface(PLANTED, ["Band"])).toEqual([]);
  });
});

describe("[SCN-API-005] the compiled type surface is read, and a barrel that will not load reds", () => {
  it("[SCN-API-005] reads a barrel's type-only exports and leaves its values off", () => {
    // THE ANTI-VACUITY ARM, and the reason it is driven over a barrel written for the occasion
    // rather than over one of the three real ones. The resolution settings are load-bearing: get
    // them wrong and every `export type { … } from "./x.js"` alias fails to resolve, the reflection
    // answers with nothing, and each per-surface example below quietly compares one empty list to
    // another. A planted barrel whose answer is KNOWN — two types across a `.js` specifier hop, one
    // value that must not appear — is what makes that failure loud instead of green.
    expect(withPlantedBarrel(reflectTypeSurface)).toEqual(["Band", "Zone"]);
  });

  it("[SCN-API-005] reports a type added to a barrel that the written surface does not name, end to end", () => {
    // The ADD through both halves at once — reflection into reconciliation, over a surface whose
    // package, subpath and every symbol belong to a project sharing no term with this repository.
    const drift = withPlantedBarrel((barrelPath) =>
      reconcileTypeSurface(PLANTED, reflectTypeSurface(barrelPath)),
    );

    expect(drift).toEqual([
      { specifier: PLANTED_SPECIFIER, kind: "unwritten-export", symbol: "Zone" },
    ]);
  });

  it("[SCN-API-005] refuses a barrel it cannot load rather than answering with an empty surface", () => {
    // A missing barrel and a barrel with no types are indistinguishable in the answer `[]`, and one
    // of them is a broken check reading as a clean one. Raising says which.
    expect(() => reflectTypeSurface(join(tmpdir(), "parcel-co-routing-no-such-barrel.ts"))).toThrow(
      /parcel-co-routing-no-such-barrel\.ts/,
    );
  });
});

describe("[SCN-API-005] every subpath these packages publish is held to a type surface written for it", () => {
  it("[SCN-API-005] writes at least one type down for every published subpath", () => {
    // The second half of the anti-vacuity floor. The arm above proves the reflection finds types
    // when they are there; this proves there is something to find on all three, so no per-surface
    // example can pass by comparing an empty reflection to an empty list.
    expect(PUBLISHED_SURFACES.map((surface) => [specifierOf(surface), surface.types.length])).toEqual([
      ["@3f-consulting/spec-controller-core", 36],
      ["spec-controller/mutation-ratchet", 7],
    ]);
  });

  for (const surface of PUBLISHED_SURFACES) {
    const specifier = specifierOf(surface);

    it(`[SCN-API-005] ${specifier} exports exactly the types written down for it, both directions`, () => {
      const reflected = reflectTypeSurface(barrelPathOf(surface));

      // Two assertions over one fact, for the reason the value arm gives: the first fails with the
      // two lists side by side, the second is the reconciliation the plants above proved has teeth.
      expect(reflected).toEqual([...surface.types].sort());
      expect(reconcileTypeSurface(surface, reflected)).toEqual([]);
    });
  }
});

// -----------------------------------------------------------------------------------------------
// @SCN-API-006 — the COMPLETENESS half. The two arms above hold each surface in the registry to its
// list; neither of them can notice a surface with no list at all, which is precisely how
// `./internal` came to be published unheld with nobody having decided it should be. This arm
// reconciles the SET of subpaths the manifests publish against the SET a surface is written for.
//
// THE PLANTS RUN OVER A WHOLE WORKSPACE ON DISK, not over manifests handed straight to the reader.
// What this arm has to get right is what npm does at publish time and what pnpm calls a package,
// and a fixture passed directly to the reconciliation would exercise neither: the discovery would
// never be driven and `publishConfig.exports` would never have to stand in for anything
// (evidence-manifesto §11A). So the planted workspace carries its own `pnpm-workspace.yaml`, two
// packages under the pattern it names, and one directory under that pattern which is not a package
// at all.
// -----------------------------------------------------------------------------------------------

/**
 * The planted workspace's own file, kept apart from the packages so the arms that plant a workspace
 * file this reader cannot expand have something to substitute.
 */
const PLANTED_WORKSPACE_FILE = `packages:
  - "lib/*"
`;

/**
 * A workspace belonging to that same fictional project, planted for the occasion.
 *
 * `lib/routing` IS THE `./internal` SHAPE, deliberately. Its workspace map carries two subpaths and
 * its publish-time map carries one, so a reader that MERGED the two would report `./tariffs` as
 * published when no consumer of the published package could import it — the exact reading npm does
 * not do, and the one an implementer reaches for first.
 *
 * `lib/depot` has no publish-time map at all, so its workspace map is what it publishes: the other
 * half of the same rule, and the half a reader hard-wired to `publishConfig` would miss.
 *
 * `lib/scratch` sits under the same pattern with no manifest in it. pnpm does not call that a
 * package and neither may this reader, or a stray directory becomes a scan that raises.
 */
const PLANTED_WORKSPACE_PACKAGES: Readonly<Record<string, string>> = {
  "lib/routing/package.json": JSON.stringify({
    name: "parcel-co-routing",
    exports: { ".": "./src/index.ts", "./tariffs": "./src/tariffs.ts" },
    publishConfig: {
      exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
    },
  }),
  "lib/depot/package.json": JSON.stringify({
    name: "parcel-co-depot",
    exports: { "./intake": "./src/intake.ts" },
  }),
  "lib/scratch/notes.md": "not a package\n",
};

/**
 * A registry entry naming one subpath and nothing else about it.
 *
 * The completeness arm compares SETS OF SUBPATHS, so the value and type lists are not what is under
 * test here and are left empty rather than invented — inventing them would suggest this arm reads
 * them, which is @SCN-API-004's and @SCN-API-005's job over the real registry.
 */
function writtenFor(packageName: string, subpath: string): PublishedSurface {
  return { package: packageName, subpath, barrel: "lib/unused.ts", values: [], types: [] };
}

/** A manifest handed straight over, for the arms about a manifest's CONTENT rather than the tree. */
function manifestOf(content: Readonly<Record<string, unknown>>): WorkspaceManifest {
  return { path: "lib/depot/package.json", content };
}

/** Write the planted workspace to a real directory, read it, and take it away again. */
function withPlantedWorkspace<T>(
  read: (repoRoot: string) => T,
  workspaceFile: string = PLANTED_WORKSPACE_FILE,
): T {
  const root = mkdtempSync(join(tmpdir(), "parcel-co-workspace-"));
  try {
    writeFileSync(join(root, "pnpm-workspace.yaml"), workspaceFile);
    for (const [path, source] of Object.entries(PLANTED_WORKSPACE_PACKAGES)) {
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

/** This repository's own manifest at one path, so an arm about it fails saying which was missing. */
function manifestAt(path: string): WorkspaceManifest {
  const found = workspaceManifests().find((manifest) => manifest.path === path);
  if (found === undefined) {
    throw new Error(`no manifest found at ${path} — the workspace read found nothing there`);
  }
  return found;
}

describe("[SCN-API-006] what a manifest publishes is its publish-time map, standing in for its workspace map", () => {
  it("[SCN-API-006] takes the publish-time map WHOLESALE, so a subpath only the workspace map carries is not published", () => {
    // The whole subtlety, on the shape `./internal` has. npm REPLACES `exports` with
    // `publishConfig.exports` at publish time rather than merging them, so a subpath present in one
    // and absent from the other is absent from what a consumer can import. A merge would read
    // `./tariffs` as published and hold a surface nobody outside the repository can reach.
    expect(publishedSubpathsOf(withPlantedWorkspace((root) => plantedManifest(root, "routing")))).toEqual([
      ".",
    ]);
  });

  it("[SCN-API-006] takes the workspace map when there is no publish-time map to stand in for it", () => {
    expect(publishedSubpathsOf(withPlantedWorkspace((root) => plantedManifest(root, "depot")))).toEqual([
      "./intake",
    ]);
  });

  it("[SCN-API-006] refuses a published map that is not a map of subpaths at all", () => {
    // `"exports": "./src/index.ts"` is legal npm and means the `.` subpath. This reader does not
    // understand it, and the honest answer to a form it does not understand is to say so: reading
    // no subpaths off it would publish a barrel silently unheld, which is the fault this rule
    // exists to close arriving by the back door.
    expect(() => publishedSubpathsOf(manifestOf({ exports: "./src/index.ts" }))).toThrow(
      /lib\/depot\/package\.json/,
    );
  });

  it("[SCN-API-006] refuses a published map whose keys are conditions rather than subpaths", () => {
    // The other legal form this reader does not understand: a top-level condition map, sugar for
    // the `.` subpath. Its keys are `types` / `default`, and reading them AS subpaths would report
    // two published surfaces that do not exist.
    expect(() =>
      publishedSubpathsOf(manifestOf({ exports: { types: "./d.ts", default: "./d.js" } })),
    ).toThrow(/lib\/depot\/package\.json/);
  });

  it("[SCN-API-006] reads no subpaths off a manifest that publishes none, without asking its name", () => {
    expect(publishedSpecifiersOf(manifestOf({}))).toEqual([]);
  });
});

describe("[SCN-API-006] every package manifest the workspace names is found, and only those", () => {
  it("[SCN-API-006] finds each package under the pattern, and skips a directory that holds no manifest", () => {
    // The anti-vacuity floor for the discovery. A read that found nothing would reconcile an empty
    // published set against an empty registry and report a clean workspace — the same shape as a
    // reflection whose resolution settings are wrong, and just as quiet.
    expect(withPlantedWorkspace((root) => workspaceManifestsIn(root).map((m) => m.path))).toEqual([
      join("lib", "depot", "package.json"),
      join("lib", "routing", "package.json"),
    ]);
  });

  it("[SCN-API-006] refuses a workspace pattern it cannot expand rather than expanding it to nothing", () => {
    expect(() => withPlantedWorkspace(workspaceManifestsIn, 'packages:\n  - "**/pkg"\n')).toThrow(
      /\*\*\/pkg/,
    );
  });

  it("[SCN-API-006] refuses a workspace file that names no packages", () => {
    expect(() => withPlantedWorkspace(workspaceManifestsIn, "allowBuilds:\n  esbuild: true\n")).toThrow(
      /pnpm-workspace\.yaml/,
    );
  });
});

describe("[SCN-API-006] the subpaths published reconcile against the surfaces written down, both directions", () => {
  it("[SCN-API-006] flags a subpath a manifest publishes that no surface is written for", () => {
    // The `./internal` fault itself, on a workspace that shares no term with this repository: a
    // package publishes a subpath and nobody wrote a surface for it. This is the direction that
    // would have reded on the day `./internal` was published.
    const drift = withPlantedWorkspace((root) =>
      reconcilePublishedSubpaths(workspaceManifestsIn(root), [writtenFor("parcel-co-routing", ".")]),
    );

    expect(drift).toEqual([{ specifier: "parcel-co-depot/intake", kind: "unwritten-subpath" }]);
  });

  it("[SCN-API-006] flags a surface written for a subpath no manifest publishes any longer", () => {
    // The stale direction, and it lands on `./tariffs` — the subpath the planted workspace map
    // carries and its publish-time map does not. So this arm proves the replacement semantic a
    // second time from the other side: a reader that merged the two maps would find no drift here.
    const drift = withPlantedWorkspace((root) =>
      reconcilePublishedSubpaths(workspaceManifestsIn(root), [
        writtenFor("parcel-co-depot", "./intake"),
        writtenFor("parcel-co-routing", "."),
        writtenFor("parcel-co-routing", "./tariffs"),
      ]),
    );

    expect(drift).toEqual([
      { specifier: "parcel-co-routing/tariffs", kind: "unpublished-subpath" },
    ]);
  });

  it("[SCN-API-006] flags both directions at once when the two sets have parted company each way", () => {
    const drift = withPlantedWorkspace((root) =>
      reconcilePublishedSubpaths(workspaceManifestsIn(root), [
        writtenFor("parcel-co-routing", "./tariffs"),
      ]),
    );

    expect(drift).toEqual([
      { specifier: "parcel-co-depot/intake", kind: "unwritten-subpath" },
      { specifier: "parcel-co-routing", kind: "unwritten-subpath" },
      { specifier: "parcel-co-routing/tariffs", kind: "unpublished-subpath" },
    ]);
  });

  it("[SCN-API-006] finds no drift when a surface is written for exactly what the workspace publishes", () => {
    const drift = withPlantedWorkspace((root) =>
      reconcilePublishedSubpaths(workspaceManifestsIn(root), [
        writtenFor("parcel-co-depot", "./intake"),
        writtenFor("parcel-co-routing", "."),
      ]),
    );

    expect(drift).toEqual([]);
  });
});

describe("[SCN-API-006] this workspace publishes exactly the subpaths a surface is written for", () => {
  it("[SCN-API-006] finds both of this repository's package manifests", () => {
    expect(workspaceManifests().map((manifest) => manifest.path)).toEqual([
      join("packages", "core", "package.json"),
      join("packages", "spec-controller", "package.json"),
    ]);
  });

  it("[SCN-API-006] publishes core's `.` alone, while its workspace map keeps ./internal for in-repo consumers", () => {
    // The unpublish, pinned from both sides in one place. `./internal` is internal by its own
    // header and the manifest now says so; the workspace entry stays because the in-repo importers
    // of `@3f-consulting/spec-controller-core/internal` resolve through it, and an unpublish that
    // took that with it would be a breaking change to this repository dressed as a correction.
    const core = manifestAt(join("packages", "core", "package.json"));

    expect(publishedSubpathsOf(core)).toEqual(["."]);
    expect(Object.keys(core.content["exports"] as object)).toEqual([".", "./internal"]);
  });

  it("[SCN-API-006] publishes exactly these two specifiers, and this is the list a surface is owed for", () => {
    // The anti-vacuity floor for the real read: the reconciliation below compares two sets, and two
    // empty sets reconcile perfectly. Naming what the manifests publish is what makes an emptied
    // read impossible to mistake for a clean workspace.
    expect(workspaceManifests().flatMap(publishedSpecifiersOf).sort()).toEqual([
      "@3f-consulting/spec-controller-core",
      "spec-controller/mutation-ratchet",
    ]);
  });

  it("[SCN-API-006] holds the registry to those manifests, both directions", () => {
    expect(reconcilePublishedSubpaths(workspaceManifests(), PUBLISHED_SURFACES)).toEqual([]);
  });
});
