/**
 * The `@unit` arms for @SCN-API-006 — a subpath the manifest publishes with no surface written down
 * for it reds the guard. ONE ARM, and its subject is this workspace's own manifests, barrels and
 * surfaces.
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
 * barrel, under which every configured fitness row's own check stayed green while
 * the arm below reded. So this workspace's actual manifests, actual published subpaths and actual
 * exports are held here or nowhere.
 *
 * THE PLANTED-WORKSPACE ARM WENT AT 3F-3245, and its removal cost this guard no reading of the
 * repository. It drove an invented workspace on disk, authored from this module's implementation by
 * that implementation's author — one author keeping both books, so its green proved the check does
 * what its author wrote rather than what the rule requires. The anti-vacuity terms the arm below
 * carries are what stop a green over a narrowed or empty read passing for a clean workspace.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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


/** The surface written down for the planted barrel, and the specifier a consumer would write. */


/** A manifest handed straight over, for the refusals about a manifest's CONTENT rather than a tree. */

/** Write the planted workspace to a real directory, read it, and take it away again. */

/** What a call answered, or the message it raised — so one `expect` can hold both kinds of answer. */

/** This repository's own manifest at one path, so the real-tree arm fails saying which was missing. */
function manifestAt(path: string): WorkspaceManifest {
  const found = workspaceManifests().find((manifest) => manifest.path === path);
  if (found === undefined) {
    throw new Error(`no manifest found at ${path} — the workspace read found nothing there`);
  }
  return found;
}

describe("[SCN-API-006] every subpath these packages publish is held to a surface written down for it", () => {
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
          written: [31, 37],
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
