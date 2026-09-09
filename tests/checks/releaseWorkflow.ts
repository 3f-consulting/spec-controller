/**
 * THE ORDER A RELEASE SENDS ITS TWO PACKAGES IN, and whether anything can get between them
 * (@SCN-REL-003; features/release.feature).
 *
 * `pnpm pack` REWRITES THE CLI'S DEPENDENCY ON CORE INTO A CONCRETE VERSION, so the artefact this
 * release would send names an engine by a number rather than by a workspace. That number has to be
 * resolvable at the moment a consumer asks for it, and the only thing that makes it so is this
 * release having sent core FIRST. Send the CLI first and the release is broken between its own two
 * acts: for as long as the second one takes, `npm i spec-controller` resolves an engine nobody can
 * fetch. Nothing about the two commands makes that obvious — they sit one line apart in a file and
 * either arrangement parses — which is why the order is read here rather than remembered.
 *
 * FOUR FAULTS, AND THEY ARE FOUR SHAPES OF ONE WINDOW rather than four subjects. The dependent goes
 * first; a step runs after the staging and changes what was sent; the packed manifest names an
 * engine version this release stages nowhere, which a range nothing satisfies reaches by
 * arithmetic; and the release never reaches the registry at all — the widest window of the four,
 * and the one this publisher actually has, since direct publication is switched off registry-side
 * and an ordinary publish is refused.
 *
 * NOTHING HERE READS A DISK, RUNS A WORKFLOW OR TOUCHES A REGISTRY. It is handed a release as a
 * document already parsed and an artefact already packed; the getting of both is the caller's. That
 * is also the honest limit of what a green over this module means, and the Rule says so in as many
 * words: a live release is proven once, by the tag that cuts it.
 *
 * THE TARBALL SPELLING IS BORROWED, NOT RESTATED. Which file a package becomes is @SCN-REL-001's
 * rule and lives in `cleanRoomInstall.ts`; a second spelling here would agree with `pnpm pack` by
 * diligence and then drift, and the drift would show up as a release step nobody could match to a
 * package — which reads exactly like a release that stages nothing.
 *
 * Parent: 3F-3249, under 3F-2811 — one release process, over an artefact it verified first.
 */

import { packedTarballPrefix, type PackedPackage } from "./cleanRoomInstall.js";

/** One step of a release, in the order the release runs it. */
export interface ReleaseStep {
  readonly name: string;
  /** The shell this step runs, or nothing where the step runs an action instead. */
  readonly run: string;
}

/** A release as its own workflow states it. */
export interface StatedRelease {
  /** The permissions the staging job runs under. */
  readonly permissions: Readonly<Record<string, unknown>>;
  /** Every step of the staging job, in order. */
  readonly steps: readonly ReleaseStep[];
  /**
   * The workflow with its commentary gone — the document as the runner will act on it.
   *
   * A COMMENT IS NOT A CREDENTIAL, and the reading below would not be able to tell the two apart
   * over the file as written. A workflow explaining at length that it carries no repository secret
   * would read as one that carries several, so the caller hands over the parse rather than the
   * bytes and a sentence about a secret costs nothing.
   */
  readonly body: string;
}

/** A release, the two packages it would send, and what the artefact says about itself. */
export interface StagedRelease {
  readonly stated: StatedRelease;
  /** The package everything else resolves through. Staged first, or there is a window. */
  readonly engine: PackedPackage;
  /** The package that resolves the engine. Staged second. */
  readonly dependent: PackedPackage;
  /** What the dependent's PACKED manifest names the engine by, as a consumer reads it. */
  readonly resolvedEngine: string | undefined;
}

/** One way a consumer can meet a CLI whose engine is not there. */
export interface ReleaseFault {
  readonly kind:
    | "publishes-outright"
    | "package-never-staged"
    | "dependent-staged-first"
    | "acts-after-the-staging"
    | "engine-version-nobody-stages"
    | "no-identity-to-prove"
    | "carries-a-repository-secret";
  readonly message: string;
}

/**
 * The staged form, and the ordinary one this registry refuses.
 *
 * `\bnpm\b` RATHER THAN `npm`, AND THE WORD BOUNDARY IS THE WHOLE OF IT. Every other command in
 * this release is a `pnpm` one, and `pnpm` carries `npm` inside it — a substring test would read
 * the install step as a publish and the whole reading would be about the wrong steps.
 */
const STAGES = /\bnpm\s+stage\s+publish\b/;
const PUBLISHES_OUTRIGHT = /\bnpm\s+publish\b/;

/** The permission an OIDC identity is minted under — the alternative to carrying a credential. */
const IDENTITY = "id-token";

/** How a workflow reaches a repository secret, and the only way it can hold one at all. */
const A_REPOSITORY_SECRET = "secrets.";

/** Everything about this release that would let a consumer resolve an engine that is not there. */
export function releaseFaults(release: StagedRelease): ReleaseFault[] {
  return [
    ...publishedOutright(release.stated),
    ...stagingOrderFaults(release),
    ...actsAfterTheStaging(release),
    ...engineVersionFaults(release),
    ...identityFaults(release.stated),
  ];
}

/** A step that publishes rather than staging — refused by this registry, so nothing is sent. */
function publishedOutright(stated: StatedRelease): ReleaseFault[] {
  return stated.steps
    .filter((step) => PUBLISHES_OUTRIGHT.test(step.run))
    .map((step) => ({
      kind: "publishes-outright" as const,
      message:
        `"${step.name}" publishes outright rather than staging. ` +
        "This publisher has direct publication switched off registry-side, so the release is " +
        "refused and neither package arrives — the window is the whole of it.",
    }));
}

/**
 * The engine reaching the registry after the package that resolves it, or not reaching it at all.
 *
 * A PACKAGE NOBODY STAGES IS REPORTED AHEAD OF THE ORDER RATHER THAN AS PART OF IT. With one of the
 * two absent there is no order to be wrong about, and an ordering fault raised over a release that
 * sends one package would send a reader to reorder two steps when the second one is not there.
 */
function stagingOrderFaults(release: StagedRelease): ReleaseFault[] {
  const { stated, engine, dependent } = release;
  const engineAt = stagedAt(stated, engine);
  const dependentAt = stagedAt(stated, dependent);

  const absent = ([[engine, engineAt], [dependent, dependentAt]] as const)
    .filter(([, at]) => at === undefined)
    .map(([packed]) => ({
      kind: "package-never-staged" as const,
      message:
        `${packed.name} is packed by this release and staged by none of its steps. ` +
        "A release that sends one of the two leaves the other at whatever the registry already had.",
    }));
  if (absent.length > 0) return absent;
  if ((engineAt ?? 0) < (dependentAt ?? 0)) return [];

  return [
    {
      kind: "dependent-staged-first",
      message:
        `${dependent.name} is staged before ${engine.name}, which it resolves. ` +
        "Between the two steps the registry holds a package naming an engine it cannot serve, and " +
        "the first install of it fails at resolution rather than at run time.",
    },
  ];
}

/** Where in the release a package is staged, or nothing where no step stages it. */
function stagedAt(stated: StatedRelease, packed: PackedPackage): number | undefined {
  const at = stated.steps.findIndex((step) => STAGES.test(step.run) && sends(step, packed));
  return at === -1 ? undefined : at;
}

/**
 * Whether a step names this package's tarball.
 *
 * THE SEPARATOR IS PART OF THE NEEDLE, AND WITHOUT IT THE TWO PACKAGES ARE NOT DISTINGUISHABLE.
 * `3f-consulting-spec-controller-core-` CONTAINS `spec-controller-`, so a bare containment test
 * matches the engine's step for the dependent as well and reports the two as staged in the same
 * place. The tarball is named at the end of a path in every form this release can spell it, so the
 * directory separator is what makes the prefix a prefix.
 */
function sends(step: ReleaseStep, packed: PackedPackage): boolean {
  return step.run.includes(`/${packedTarballPrefix(packed)}`);
}

/** A step running behind the last staging — after which what was sent is no longer what was read. */
function actsAfterTheStaging(release: StagedRelease): ReleaseFault[] {
  const { steps } = release.stated;
  const staged = steps.map((step, at) => (STAGES.test(step.run) ? at : -1)).filter((at) => at !== -1);
  const last = staged[staged.length - 1];
  if (last === undefined) return [];

  return steps.slice(last + 1).map((step) => ({
    kind: "acts-after-the-staging" as const,
    message:
      `"${step.name}" runs after the last staging. ` +
      "Everything this release verified, it verified before that point, so a step behind it is a " +
      "change to the artefact nothing in this release has read.",
  }));
}

/**
 * The engine version the artefact names, against the one this release actually sends.
 *
 * ONE COMPARISON COVERS BOTH HALVES OF THE TITLE. A range is not the version, and neither is a
 * version this release does not stage; the fault a consumer meets is the same in both cases, and
 * it is that the specifier resolves to nothing the registry will have.
 */
function engineVersionFaults(release: StagedRelease): ReleaseFault[] {
  const { engine, dependent, resolvedEngine } = release;
  if (resolvedEngine === engine.version) return [];

  return [
    {
      kind: "engine-version-nobody-stages",
      message:
        `${dependent.name} names ${engine.name} as ${resolvedEngine ?? "nothing at all"}, and this ` +
        `release stages ${engine.version}. A consumer resolves what the tarball says, so an ` +
        "install of it reaches for a version this release never sends.",
    },
  ];
}

/** Whether the release proves who it is, and whether it is carrying a credential to do it. */
function identityFaults(stated: StatedRelease): ReleaseFault[] {
  const faults: ReleaseFault[] = [];
  if (stated.permissions[IDENTITY] !== "write") {
    faults.push({
      kind: "no-identity-to-prove",
      message:
        `the staging job does not run with ${IDENTITY} write, so it can mint no identity to prove ` +
        "to the registry. Nothing is staged, and the release fails where a reader will read it as " +
        "a fault in the code.",
    });
  }
  if (stated.body.includes(A_REPOSITORY_SECRET)) {
    faults.push({
      kind: "carries-a-repository-secret",
      message:
        "the release reaches for a repository secret. A credential a release carries is a " +
        "credential that outlives the run, and it is the thing an identity minted per run exists " +
        "so that nobody has to hold.",
    });
  }
  return faults;
}
