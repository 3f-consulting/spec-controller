/**
 * The `@unit` arms for @SCN-API-006 — a subpath the manifest publishes with no surface written down
 * for it reds the guard. TWO ARMS: one planted violation carrying an instance of every drift this
 * module reports, and one run over this repository.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `describe` / `it` strings carry the
 * SCN-API-006 id matching features/public-api.feature, so a grep of that id returns both halves of
 * the pair. `@unit` only, as the scenario is tagged — this Vitest run IS the observed evidence, and
 * no Cucumber block is owed.
 *
 * WHY @SCN-API-006 IS THE ONE THAT SURVIVED, AND IT WAS MEASURED RATHER THAN ARGUED (3F-3229). This
 * file used to credit three scenarios across thirty-one arms — @SCN-API-004 over the value surface,
 * @SCN-API-005 over the type surface, @SCN-API-006 over which subpaths are published at all — and
 * one arm credits exactly one scenario, so two of the three had to go. The reading that decided it:
 * @SCN-API-004's and @SCN-API-005's real-tree subject is the value and type surface of every
 * published subpath, which today is core's `.` barrel alone, and that barrel is held to both halves
 * in both directions with its own floor by @SCN-API-001's real-tree arm in
 * `coreBarrelSurface.test.ts`. Their retirement costs no reading of this repository.
 * @SCN-API-006's subject — the SET of subpaths the manifests publish, reconciled against the SET
 * somebody wrote a list for — is held nowhere else: @SCN-API-001 reads one barrel and cannot see a
 * second published subpath ARRIVING beside it, and @SCN-API-007 reads what published modules
 * import, not what manifests publish. That gap is the `./internal` fault itself, and the feature
 * file's own Rule says so in as many words.
 *
 * RULING B — THIS CHECK IS RUN BY NOTHING ELSE, MEASURED FROM BOTH ENDS (3F-3229). No fitness row
 * invokes it and no cucumber twin exists; the measurement was an export planted on the real core
 * barrel, under which `pnpm cucumber:fitness` — every configured fitness row — stayed green while
 * the real-tree arm below reded. So the second arm is not redundancy: this workspace's actual
 * manifests, actual published subpaths and actual exports are held here or nowhere.
 *
 * TEETH ARE PLANTED, NOT INFERRED FROM THE GREEN. The real workspace passing says nothing about
 * whether the reconciliation would notice if it stopped, so the first arm drives a planted
 * workspace belonging to a project that shares no term with this repository: a reader with any of
 * these packages' names written into it agrees with the planted case by coincidence or not at all.
 *
 * THE PLANT RUNS OVER A WHOLE WORKSPACE ON DISK, not over manifests and barrels handed straight to
 * the readers. What this module has to get right is what npm does at publish time, what pnpm calls
 * a package, and how the compiler follows a `export type { … } from "./x.js"` alias — and a fixture
 * passed directly to the reconciliations would exercise none of the three (evidence-manifesto
 * §11A). So the planted workspace carries its own `pnpm-workspace.yaml`, two packages under the
 * pattern it names, one directory under that pattern which is not a package at all, and a real
 * two-file barrel for the reflection to build a Program over.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import * as coreBarrel from "@3f-consulting/spec-controller-core";

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
 * Keyed by specifier and asserted EXHAUSTIVE against the registry in the real-tree arm, so a
 * surface added to the registry with no import here reds instead of being skipped in silence — the
 * coverage hole this whole rule exists to close, reproduced one layer in.
 *
 * THE BARREL ARRIVES BY THE SPECIFIER A CONSUMER WRITES, NOT BY A RELATIVE PATH. Reaching it
 * through a relative path into its own package would reflect the same object and prove strictly
 * less: it would pass while the manifest key that makes the subpath importable at all was broken or
 * absent. Resolution through the manifest is part of what the real-tree arm asserts.
 */
const REFLECTED: Readonly<Record<string, object>> = {
  "@3f-consulting/spec-controller-core": coreBarrel,
};

/** The planted workspace's own file, kept apart so the arms that plant a broken one can substitute. */
const PLANTED_WORKSPACE_FILE = `packages:
  - "lib/*"
`;

/**
 * A workspace belonging to a fictional project, planted for the occasion.
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
 *
 * `lib/routing/index.ts` IS A REAL BARREL, so the type reflection has a Program to build. The two
 * types cross it through `export type { … }`, which binds a symbol whose own flags say only
 * "alias" — following it is the step that fails silently when the resolution settings are wrong.
 * The `.js` specifier is the spelling this whole workspace writes, so a reflection that could not
 * follow it would find nothing here and nothing on the real barrel either. And `tariffTable` is a
 * value carried across the same hop: a reflection that kept it would be reporting the value surface
 * a second time under the type surface's name.
 */
const PLANTED_FILES: Readonly<Record<string, string>> = {
  "lib/routing/package.json": JSON.stringify({
    name: "parcel-co-routing",
    exports: { ".": "./src/index.ts", "./tariffs": "./src/tariffs.ts" },
    publishConfig: {
      exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
    },
  }),
  "lib/routing/tariffs.ts": `export interface Band {
  readonly ceiling: number;
}

export type Zone = "inner" | "outer";

export const tariffTable: Record<Zone, Band> = {
  inner: { ceiling: 2 },
  outer: { ceiling: 5 },
};
`,
  "lib/routing/index.ts": `export type { Band, Zone } from "./tariffs.js";
export { tariffTable } from "./tariffs.js";
`,
  "lib/depot/package.json": JSON.stringify({
    name: "parcel-co-depot",
    exports: { "./intake": "./src/intake.ts" },
  }),
  "lib/scratch/notes.md": "not a package\n",
};

/** The surface written down for the planted barrel, and the specifier a consumer would write. */
const PLANTED: PublishedSurface = {
  package: "parcel-co-routing",
  subpath: "./tariffs",
  barrel: "lib/routing/index.ts",
  values: ["bandFor", "tariffTable"],
  types: ["Band"],
};
const PLANTED_SPECIFIER = "parcel-co-routing/tariffs";

/**
 * A registry entry naming one subpath and nothing else about it.
 *
 * The subpath half compares SETS OF SUBPATHS, so the value and type lists are not what is under
 * test there and are left empty rather than invented — inventing them would suggest that half reads
 * them, which is what the two lists above are for.
 */
function writtenFor(packageName: string, subpath: string): PublishedSurface {
  return { package: packageName, subpath, barrel: "lib/unused.ts", values: [], types: [] };
}

/** A manifest handed straight over, for the refusals about a manifest's CONTENT rather than a tree. */
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

/** What a call answered, or the message it raised — so one `expect` can hold both kinds of answer. */
function outcomeOf(call: () => unknown): unknown {
  try {
    return { answered: call() };
  } catch (error) {
    return { raised: error instanceof Error ? error.message : String(error) };
  }
}

/** This repository's own manifest at one path, so the real-tree arm fails saying which was missing. */
function manifestAt(path: string): WorkspaceManifest {
  const found = workspaceManifests().find((manifest) => manifest.path === path);
  if (found === undefined) {
    throw new Error(`no manifest found at ${path} — the workspace read found nothing there`);
  }
  return found;
}

describe("[SCN-API-006] every subpath these packages publish is held to a surface written down for it", () => {
  it("[SCN-API-006] reports every drift this module detects, each direction, over one planted workspace", () => {
    // THE TEETH, AND THE WHOLE VERDICT IN ONE COMPARISON. Neuter any half of the reconciliation and
    // this arm reds while the real workspace below is still clean — which is the failure the second
    // arm cannot see. Each direction is planted separately, because a reconciliation that checked
    // only one of them is a half-guard that reads exactly like a whole one.
    const found = withPlantedWorkspace((root) => {
      const manifests = workspaceManifestsIn(root);
      const barrel = join(root, "lib", "routing", "index.ts");
      const reflectedTypes = reflectTypeSurface(barrel);

      return {
        // The discovery, and the floor under everything below it. A read that found nothing would
        // reconcile an empty published set against an empty registry and report a clean workspace.
        // `lib/scratch` is absent because pnpm does not call a manifest-less directory a package.
        discovered: manifests.map((manifest) => manifest.path),

        // The publish-time map taken WHOLESALE, on the shape `./internal` has: npm REPLACES
        // `exports` with `publishConfig.exports` rather than merging them, so `./tariffs` is not
        // published however plainly the workspace map carries it. And a package with no
        // publish-time map publishes its workspace map, which is the half a reader hard-wired to
        // `publishConfig` would miss.
        publishes: manifests.map((manifest) => [
          manifest.path,
          publishedSubpathsOf(manifest),
        ]),

        // The type reflection's own floor: two types across a `.js` specifier hop, and the value
        // that must not appear beside them.
        reflectedTypes,

        // DRIFT KIND 1 AND 2 — the value surface, each way at once.
        valueDrift: reconcileValueSurface(PLANTED, ["bandFor", "draftTariffTable"]),

        // DRIFT KIND 3 AND 4 — the type surface, each way at once, reflection into reconciliation
        // end to end. `Zone` is the ADD, which is the direction a typed-literal arrangement cannot
        // see; `Band` renamed away would land as this same pair, because nothing in a compiled
        // surface records that one name became another.
        typeDrift: reconcileTypeSurface({ ...PLANTED, types: ["Band", "Tariff"] }, reflectedTypes),

        // DRIFT KIND 5 AND 6 — the published subpath map, each way at once. The unwritten side is
        // the `./internal` fault itself: a package publishes a subpath and nobody wrote a surface
        // for it. The unpublished side lands on `./tariffs`, proving the replacement semantic a
        // second time from the other end — a reader that merged the two maps would find no drift
        // there.
        subpathDrift: reconcilePublishedSubpaths(manifests, [
          writtenFor("parcel-co-routing", "./tariffs"),
        ]),

        // And no drift when the two agree, whatever order a barrel hands its names over in. Order
        // is the barrel's business, not the contract's.
        agreed: [
          reconcileValueSurface(PLANTED, ["tariffTable", "bandFor"]),
          reconcileTypeSurface(PLANTED, ["Band"]),
          reconcilePublishedSubpaths(manifests, [
            writtenFor("parcel-co-depot", "./intake"),
            writtenFor("parcel-co-routing", "."),
          ]),
        ],

        // THE REFUSALS, AND WHY THEY ARE VERDICTS RATHER THAN TIDINESS. Every one of these is a
        // shape whose quiet answer would be an empty list — indistinguishable from a clean read,
        // and the same failure in five places. A missing barrel and a barrel with no types both
        // answer `[]`; `"exports": "./src/index.ts"` and a top-level condition map are legal npm
        // this reader does not understand, and reading no subpaths off either would publish a
        // barrel silently unheld; a pattern that expands to nothing and a workspace file naming no
        // packages both scan an empty tree. Raising says which.
        refusals: [
          outcomeOf(() => reflectTypeSurface(join(root, "lib", "routing", "no-such-barrel.ts"))),
          outcomeOf(() => publishedSubpathsOf(manifestOf({ exports: "./src/index.ts" }))),
          outcomeOf(() =>
            publishedSubpathsOf(manifestOf({ exports: { types: "./d.ts", default: "./d.js" } })),
          ),
          // A manifest publishing nothing is not a refusal — it is an answer, and this is where it
          // sits so the four beside it cannot be read as "any unusual manifest raises".
          outcomeOf(() => publishedSpecifiersOf(manifestOf({}))),
        ],
      };
    });

    const refusalsOverBrokenWorkspaceFiles = [
      outcomeOf(() => withPlantedWorkspace(workspaceManifestsIn, 'packages:\n  - "**/pkg"\n')),
      outcomeOf(() =>
        withPlantedWorkspace(workspaceManifestsIn, "allowBuilds:\n  esbuild: true\n"),
      ),
    ];

    expect({ ...found, refusalsOverBrokenWorkspaceFiles }).toEqual({
      discovered: [join("lib", "depot", "package.json"), join("lib", "routing", "package.json")],
      publishes: [
        [join("lib", "depot", "package.json"), ["./intake"]],
        [join("lib", "routing", "package.json"), ["."]],
      ],
      reflectedTypes: ["Band", "Zone"],
      valueDrift: [
        { specifier: PLANTED_SPECIFIER, kind: "unwritten-export", symbol: "draftTariffTable" },
        { specifier: PLANTED_SPECIFIER, kind: "missing-export", symbol: "tariffTable" },
      ],
      typeDrift: [
        { specifier: PLANTED_SPECIFIER, kind: "unwritten-export", symbol: "Zone" },
        { specifier: PLANTED_SPECIFIER, kind: "missing-export", symbol: "Tariff" },
      ],
      subpathDrift: [
        { specifier: "parcel-co-depot/intake", kind: "unwritten-subpath" },
        { specifier: "parcel-co-routing", kind: "unwritten-subpath" },
        { specifier: "parcel-co-routing/tariffs", kind: "unpublished-subpath" },
      ],
      agreed: [[], [], []],
      refusals: [
        { raised: expect.stringMatching(/no-such-barrel\.ts/) },
        { raised: expect.stringMatching(/lib\/depot\/package\.json/) },
        { raised: expect.stringMatching(/lib\/depot\/package\.json/) },
        { answered: [] },
      ],
      refusalsOverBrokenWorkspaceFiles: [
        { raised: expect.stringMatching(/\*\*\/pkg/) },
        { raised: expect.stringMatching(/pnpm-workspace\.yaml/) },
      ],
    });
  });

  it("[SCN-API-006] holds this workspace's own manifests, barrels and surfaces to the record written for them", () => {
    // THE ONLY READING OF THIS REPOSITORY THERE IS (Ruling B, above). Every published subpath, every
    // written surface and both package manifests, in one comparison — the drift each way on each
    // half of every entry, and the floors that stop a vacuous read passing for a clean one.
    const manifests = workspaceManifests();
    const core = manifestAt(join("packages", "core", "package.json"));

    expect({
      // EVERY ENTRY IN THE REGISTRY, NOT ONE OF THEM. The list is generated, so an emptied or
      // narrowed registry produces an empty list here and reds against the entry named below rather
      // than reading as a workspace with nothing to hold.
      surfaces: PUBLISHED_SURFACES.map((surface) => {
        const specifier = specifierOf(surface);
        return {
          specifier,
          // Values through the specifier a consumer writes; types through the compiler, because
          // they are erased and no runtime namespace can see one. Spelling each expected type into
          // a typed literal would red on a type dropped or renamed and stay green on one added.
          valueDrift: reconcileValueSurface(surface, Object.keys(REFLECTED[specifier] ?? {})),
          typeDrift: reconcileTypeSurface(surface, reflectTypeSurface(barrelPathOf(surface))),
          // The per-entry floor. Both reconciliations compare a reflection against a written list,
          // and an emptied entry would have each of them compare nothing to nothing and pass. These
          // numbers are read OFF the registry rather than transcribed a second time.
          written: [surface.values.length, surface.types.length],
        };
      }),
      // The reflection map is exhaustive against the registry, so a surface added with no import
      // here reds instead of being reflected as `{}` and quietly compared to a written list.
      reflectedExhaustive: Object.keys(REFLECTED).sort(),
      // The discovery floor over the real tree: both package manifests found, by name.
      manifestPaths: manifests.map((manifest) => manifest.path),
      // The anti-vacuity floor for the subpath half: the reconciliation below compares two sets,
      // and two empty sets reconcile perfectly. Naming what the manifests publish is what makes an
      // emptied read impossible to mistake for a clean workspace — and it holds the OTHER direction
      // too, now that `spec-controller` publishes no importable subpath at all: a map quietly
      // reappearing on its manifest reds here rather than passing as a workspace that never had one.
      publishedSpecifiers: manifests.flatMap(publishedSpecifiersOf).sort(),
      // The unpublish, pinned from both sides. `./internal` is internal by its own header and the
      // manifest now says so; the workspace entry stays because the in-repo importers of
      // `@3f-consulting/spec-controller-core/internal` resolve through it, and an unpublish that
      // took that with it would be a breaking change to this repository dressed as a correction.
      corePublishesAndKeeps: [publishedSubpathsOf(core), Object.keys(core.content["exports"] as object)],
      // The rule itself, over the real workspace: the subpaths these manifests publish are exactly
      // the subpaths a surface is written for, both directions.
      subpathDrift: reconcilePublishedSubpaths(manifests, PUBLISHED_SURFACES),
    }).toEqual({
      surfaces: [
        {
          specifier: "@3f-consulting/spec-controller-core",
          valueDrift: [],
          typeDrift: [],
          written: [29, 36],
        },
      ],
      reflectedExhaustive: ["@3f-consulting/spec-controller-core"],
      manifestPaths: [
        join("packages", "core", "package.json"),
        join("packages", "spec-controller", "package.json"),
      ],
      publishedSpecifiers: ["@3f-consulting/spec-controller-core"],
      corePublishesAndKeeps: [["."], [".", "./internal"]],
      subpathDrift: [],
    });
  });
});
