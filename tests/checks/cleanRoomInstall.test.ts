/**
 * The clean-room recipe's planted arm — one request, one plan, one reading (@SCN-REL-001).
 *
 * ONE ARM PER CHECK MODULE (3F-3218 / 3F-3239). The pure half of this check is a RECIPE and a
 * READING: which tarball each packed package becomes, what is run where to install them, what is
 * run to start the reconciler afterwards, and what the two outcomes mean. None of that touches a
 * disk, all of it is wrong in ways an installed consumer meets and this repository cannot, and the
 * single object below carries an instance of every one of them at once.
 *
 * BY EQUALITY OVER THE WHOLE RETURN, never by containment on a field. A plan that named ONE of the
 * two tarballs satisfies "the install mentions the core tarball" and satisfies it forever; the
 * comparison below pins every argument in order, both refusals and both readings, so a rule that
 * stops being applied moves this object rather than going quiet.
 *
 * THE SCOPED AND UNSCOPED SPELLINGS ARE BOTH HERE BECAUSE THEY ARE THE ONE THING THIS MODULE
 * CANNOT GET RIGHT BY ACCIDENT. npm drops the leading sigil and flattens the slash, so
 * `@3f-consulting/spec-controller-core` becomes `3f-consulting-spec-controller-core-<version>.tgz`
 * while `spec-controller` keeps its own name — and a plan naming a tarball that is not on disk
 * fails as "no such file", which reads exactly like a pack that did not run.
 *
 * THE THREE REFUSALS ARE THE VACUITY FENCE. A request naming no packages, or naming packages that
 * install no command, or naming two commands, has no clean room to build — and a recipe that
 * answered any of them with something runnable would install nothing, start nothing, and report a
 * clean room. That is the vacuous green this repository is named for, one layer in.
 *
 * WHAT THIS ARM IS NOT. It never packs, installs or starts anything: the verdict over a real
 * artefact is the @integration arm's, in tests/steps/release.steps.ts, which drives this same
 * recipe over tarballs it packed. Bidirectional evidence (Evidence Manifesto §9): the describe and
 * the it both carry [SCN-REL-001], matching features/release.feature.
 */

import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  cleanRoomFaults,
  cleanRoomPlan,
  packedTarballName,
  type CleanRoomRequest,
} from "./cleanRoomInstall.js";

const PACK_DIR = "/packs";
const CLEAN_ROOM = "/clean-room";

/** The two packages, spelled the two ways npm names a tarball, with the command on the second. */
const PACKAGES = [
  { name: "@3f-consulting/spec-controller-core", version: "0.1.0-alpha.1" },
  { name: "spec-controller", version: "0.1.0-alpha.1", bin: "spec-controller" },
] as const;

const REQUEST: CleanRoomRequest = {
  packages: PACKAGES,
  packDir: PACK_DIR,
  cleanRoom: CLEAN_ROOM,
  ask: ["balance", "--help"],
};

/** What a request that cannot become a clean room says, as one string a reader can compare. */
function refusalOf(request: CleanRoomRequest): string {
  try {
    cleanRoomPlan(request);
    return "no refusal";
  } catch (raised) {
    return raised instanceof Error ? raised.message : String(raised);
  }
}

const CORE_TARBALL = join(PACK_DIR, "3f-consulting-spec-controller-core-0.1.0-alpha.1.tgz");
const CLI_TARBALL = join(PACK_DIR, "spec-controller-0.1.0-alpha.1.tgz");

const PLAN = cleanRoomPlan(REQUEST);

describe("[SCN-REL-001] the packed artefacts install into a tree holding nothing else", () => {
  it("[SCN-REL-001] one request yields one recipe, one reading of both outcomes, and a refusal for every request that has no clean room in it", () => {
    expect({
      names: PACKAGES.map(packedTarballName),
      plan: PLAN,
      // The hollow tarball's own shape: npm installs it happily and never creates the command,
      // so the run cannot start and reports neither a status nor a signal.
      hollow: cleanRoomFaults(PLAN, { status: 0, signal: null }, { status: null, signal: null }),
      refused: cleanRoomFaults(PLAN, { status: 1, signal: null }, { status: 0, signal: null }),
      sound: cleanRoomFaults(PLAN, { status: 0, signal: null }, { status: 0, signal: null }),
      refusals: [
        refusalOf({ ...REQUEST, packages: [] }),
        refusalOf({ ...REQUEST, packages: [PACKAGES[0]] }),
        refusalOf({ ...REQUEST, packages: [PACKAGES[1], { ...PACKAGES[1], bin: "balance" }] }),
      ],
    }).toEqual({
      names: [
        "3f-consulting-spec-controller-core-0.1.0-alpha.1.tgz",
        "spec-controller-0.1.0-alpha.1.tgz",
      ],
      plan: {
        tarballs: [CORE_TARBALL, CLI_TARBALL],
        install: {
          command: "npm",
          // `--prefer-offline` keeps this out of the network's way; the three quiet flags keep a
          // registry audit and a funding banner out of a step whose subject is neither.
          args: [
            "install",
            "--prefer-offline",
            "--no-audit",
            "--no-fund",
            "--loglevel=error",
            CORE_TARBALL,
            CLI_TARBALL,
          ],
          cwd: CLEAN_ROOM,
        },
        run: {
          command: join(CLEAN_ROOM, "node_modules", ".bin", "spec-controller"),
          args: ["balance", "--help"],
          cwd: CLEAN_ROOM,
        },
      },
      hollow: [
        {
          kind: "reconciler-did-not-run",
          message:
            "the installed spec-controller command did not run in the clean room (exit 1). The " +
            "tarballs installed, so what a consumer resolves is not what this release verified.",
        },
      ],
      refused: [
        {
          kind: "install-refused",
          message:
            "the packed tarballs would not install into a tree holding nothing else (exit 1). " +
            "Nothing downstream of the install has been established.",
        },
      ],
      sound: [],
      refusals: [
        "a clean room over no packages would install nothing and report nothing",
        "none of the packed packages installs a command, so nothing can be started in the clean room",
        "2 of the packed packages install a command (balance, spec-controller); the clean room starts exactly one",
      ],
    });
  });
});
