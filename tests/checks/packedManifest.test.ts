/**
 * The packed manifest's planted arm — one of every fault at once (@SCN-REL-002).
 *
 * ONE ARM PER CHECK MODULE (3F-3218 / 3F-3239), and here the arm is doing the work the scenario
 * could not otherwise get done. Three of this Rule's four properties HOLD in this repository
 * today — a fresh pack carries concrete versions, an applied publish-time map and the workspace
 * root's licence — so an arm reading a real tarball can only ever say "still true". What it cannot
 * say is that the reading would have noticed had any of them stopped being true, and a check whose
 * teeth nobody has seen is a snapshot wearing a green tick.
 *
 * SO EVERY FAULT IS PLANTED HERE, INCLUDING THE THREE THAT CANNOT BE PLANTED ANYWHERE ELSE. The
 * three artefacts below carry, between them, an instance of all five ways this document fails a
 * consumer, and the fourth object is the sound package that must produce none of them — because a
 * reading that reds on everything is as useless as one that reds on nothing, and only having both
 * in one comparison shows which it is.
 *
 * BY EQUALITY OVER THE WHOLE RETURN, never by containment. The messages are pinned verbatim: they
 * are what a releaser reads at three in the morning with no checkout in front of them, and a
 * message is the one part of a check that goes stale without ever failing.
 *
 * THE EMPTY LICENCE IS DELIBERATE AND IS NOT THE SAME PLANT AS AN ABSENT ONE. A zero-byte file at
 * the right path satisfies "the licence travelled" for any reading that asks whether the name is in
 * the list, and it is precisely what a copy step that ran and did nothing leaves behind. The absent
 * case is planted for real by the scenario's negative arm, where neither package directory in this
 * workspace holds a licence at all.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe and the it both carry [SCN-REL-002],
 * matching features/release.feature. The verdict over real tarballs is the `@integration` arm's, in
 * tests/steps/release.steps.ts, which drives this same reading over packages it packed.
 */

import { describe, expect, it } from "vitest";

import { packedManifestFaults, type PublishedPackage } from "./packedManifest.js";

const PUBLISH_TIME_EXPORTS = { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } };
const WORKSPACE_EXPORTS = { ".": "./src/index.ts", "./internal": "./src/internal.ts" };

const PUBLISH_CONFIG = {
  access: "public",
  main: "./dist/index.js",
  exports: PUBLISH_TIME_EXPORTS,
};

/** A package as a consumer should meet it: concrete, applied, licensed, and sourced. */
const SOUND: PublishedPackage = {
  packedFrom: "packages/core",
  publishConfig: PUBLISH_CONFIG,
  manifest: {
    name: "@3f-consulting/spec-controller-core",
    license: "MIT",
    main: "./dist/index.js",
    exports: PUBLISH_TIME_EXPORTS,
    dependencies: { yaml: "^2.9.0" },
    repository: {
      type: "git",
      url: "git+https://github.com/3f-consulting/spec-controller.git",
      directory: "packages/core",
    },
  },
  carries: [
    { path: "package.json", bytes: 1024 },
    { path: "LICENSE", bytes: 1073 },
    { path: "dist/index.js", bytes: 4096 },
  ],
};

/**
 * The same package as this workspace develops it, which is three faults at once.
 *
 * A workspace specifier nothing outside can resolve; a publish-time map MERGED rather than replaced,
 * so the workspace-only subpath is still offered; and a licence file that arrived empty.
 */
const DEVELOPS: PublishedPackage = {
  ...SOUND,
  manifest: {
    ...SOUND.manifest,
    dependencies: { "@3f-consulting/spec-controller-core": "workspace:*", yaml: "^2.9.0" },
    exports: { ...PUBLISH_TIME_EXPORTS, ...WORKSPACE_EXPORTS },
  },
  carries: [
    { path: "package.json", bytes: 1024 },
    { path: "LICENSE", bytes: 0 },
  ],
};

/** A package with no route back to its source at all. */
const UNSOURCED: PublishedPackage = {
  ...SOUND,
  manifest: { ...SOUND.manifest, repository: undefined },
};

/** A package whose link back points at its sibling's half of the tree. */
const MISPLACED: PublishedPackage = {
  ...SOUND,
  manifest: {
    ...SOUND.manifest,
    repository: { ...(SOUND.manifest.repository as object), directory: "packages/spec-controller" },
  },
};

describe("[SCN-REL-002] the packed manifest is complete for somebody who has never seen this repository", () => {
  it("[SCN-REL-002] a sound artefact reports nothing, and every way the document fails a consumer reports itself", () => {
    expect({
      sound: packedManifestFaults(SOUND),
      develops: packedManifestFaults(DEVELOPS),
      unsourced: packedManifestFaults(UNSOURCED),
      misplaced: packedManifestFaults(MISPLACED),
    }).toEqual({
      sound: [],
      develops: [
        {
          kind: "workspace-specifier-survived",
          message:
            '@3f-consulting/spec-controller-core names @3f-consulting/spec-controller-core as "workspace:*" ' +
            "in dependencies. Nothing outside this workspace can resolve that, so the install fails where " +
            "nobody can read it.",
        },
        {
          kind: "publish-time-field-not-applied",
          message:
            "@3f-consulting/spec-controller-core declares a publish-time exports, and the artefact carries " +
            "a different one. A consumer resolves the map in the tarball, so what this repository develops " +
            "against is what they get.",
        },
        {
          kind: "licence-did-not-travel",
          message:
            "@3f-consulting/spec-controller-core declares the MIT licence and carries no licence of that " +
            "name. The terms a consumer is held to are the ones in their copy, and their copy has none.",
        },
      ],
      unsourced: [
        {
          kind: "repository-absent",
          message:
            "@3f-consulting/spec-controller-core does not say where it came from. A consumer reading the " +
            "package has no route to its source, its history or its issues.",
        },
      ],
      misplaced: [
        {
          kind: "repository-names-another-directory",
          message:
            "@3f-consulting/spec-controller-core was packed from packages/core and points at " +
            "packages/spec-controller. In a repository publishing more than one package, that is a link to " +
            "somebody else's source.",
        },
      ],
    });
  });
});
