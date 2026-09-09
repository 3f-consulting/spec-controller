/**
 * WHAT A PACKAGE DIRECTORY BECOMES WHEN A RELEASE PACKS IT — the one reading of a workspace
 * manifest that both callers of @SCN-REL-001's clean-room recipe share.
 *
 * THREE FIELDS, AND EVERY ONE OF THEM DECIDES SOMETHING DOWNSTREAM. The name and the version decide
 * which file `pnpm pack` writes; the command decides what the clean room starts once the tarball is
 * installed. `cleanRoomPlan` derives all three of those from this shape precisely so no caller
 * spells a tarball itself — and a second reading of the manifest, in the caller that runs the smoke
 * for a release, would put the first of them back.
 *
 * IT LIVES HERE BECAUSE IT READS A DISK. `cleanRoomInstall.ts` states in its own words that nothing
 * in it touches one — that is what lets the whole recipe be pinned by equality in a `@unit` arm —
 * so the manifest read cannot go there, and `tests/checks/` is where the check tree's own
 * disk-reading scaffolding already sits (`sourceFiles.ts`, on the same reasoning).
 *
 * Parent: 3F-3249, under 3F-2811 — one release process, over an artefact it verified first.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PackedPackage } from "./cleanRoomInstall.js";

/**
 * The package a directory holds, as this release would pack it.
 *
 * THE FIRST `bin` ENTRY, AND ONLY WHERE THERE IS ONE. A package installing no command is ordinary —
 * the engine is one — and the recipe's own refusal is what decides whether a set of packages
 * between them installs exactly one thing to start. Answering that here would be a second arbiter
 * for it.
 */
export function packedPackageAt(packageDir: string): PackedPackage {
  const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")) as {
    name: string;
    version: string;
    bin?: Record<string, string>;
  };
  const [bin] = Object.keys(manifest.bin ?? {});
  return { name: manifest.name, version: manifest.version, ...(bin === undefined ? {} : { bin }) };
}
