/**
 * WHAT THE ARTEFACT SAYS ABOUT ITSELF to somebody who has never seen this repository
 * (@SCN-REL-002; features/release.feature).
 *
 * THE SUBJECT IS THE MANIFEST IN THE TARBALL, AND IT IS NOT THE ONE IN THIS TREE. `pnpm pack`
 * performs the whole transformation a publish performs: `workspace:*` becomes the concrete version
 * the workspace resolved, and every field `publishConfig` declares REPLACES its development
 * counterpart wholesale rather than merging with it. The clean room next door installs the result
 * and starts it; this module reads the document a consumer resolves against, which is the half a
 * successful install still says nothing about — an install resolves what the manifest names, so a
 * manifest naming the wrong thing fails later, somewhere else, for a reader who has no checkout.
 *
 * FIVE PROPERTIES, AND THREE OF THEM HELD BEFORE ANY OF THIS WAS WRITTEN. They held because pnpm
 * behaves well, not because anything held it to that, and the value of the check is entirely in the
 * arms that red. So each property is stated as a FAULT with an instance, never as a shape the
 * current output happens to have: the scenario's negative arm runs this same reading over the
 * packages as the WORKSPACE holds them — where three of the five are live faults sitting in the
 * tree, permanently, by design.
 *
 * THE OTHER TWO CANNOT RED IN THAT ARM, AND THEIR COUNTER-CASE IS THIS REPOSITORY'S OWN HISTORY.
 * `repository` is in the source manifests as well as the tarballs; a front page is AUTHORED in the
 * package directory rather than injected at pack time, so once it exists it stands on both sides of
 * the reading. Each redded on real tarballs on its first run, before the field or the file existed,
 * and neither can be made to red here a second time without taking it away again.
 *
 * THE READING IS THE SAME ONE BOTH TIMES, WHICH IS WHAT MAKES THE NEGATIVE ARM WORTH ANYTHING. A
 * second reader written for the workspace side would agree with this one by diligence and then
 * drift, and its disagreement would be evidence about the two readers rather than about the two
 * documents. One reader, two documents, and the difference between them is the whole subject.
 *
 * NOTHING HERE PACKS, EXTRACTS OR READS A DISK. It is handed a manifest, a publish-time
 * declaration, and the list of files an artefact carries; the getting of those is the caller's, so
 * the whole reading is cheap and the `@integration` arm spends the seconds a real pack costs.
 *
 * PATHS ARRIVE RELATIVE TO THE PACKAGE ROOT, NOT AS THE TARBALL SPELLS THEM. npm roots every
 * tarball at `package/`, and a rule that knew that prefix could only ever be applied to a tarball —
 * which would leave the negative arm reading a different shape through a different code path. The
 * caller strips the prefix; both readings then hand this module the same kind of list.
 *
 * Parent: 3F-3248, under 3F-2811 — one release process, over an artefact it verified first.
 */

/** One file an artefact carries, named relative to the package root. */
export interface CarriedFile {
  readonly path: string;
  readonly bytes: number;
}

/** A manifest as a consumer resolves it — the fields this reading names, and whatever else it holds. */
export interface ConsumedManifest {
  readonly name: string;
  readonly license?: string;
  readonly repository?: unknown;
  readonly [field: string]: unknown;
}

/** One package as a consumer meets it, against what this workspace promised about it. */
export interface PublishedPackage {
  /** Where in the workspace this package lives, as the repository names the directory. */
  readonly packedFrom: string;
  /** The publish-time declaration its workspace manifest carried. */
  readonly publishConfig: Readonly<Record<string, unknown>>;
  /** The manifest the artefact carries. */
  readonly manifest: ConsumedManifest;
  /** Every file the artefact carries. */
  readonly carries: readonly CarriedFile[];
}

/** One way the document a consumer resolves is incomplete for somebody with no checkout. */
export interface PackedManifestFault {
  readonly kind:
    | "workspace-specifier-survived"
    | "publish-time-field-not-applied"
    | "licence-did-not-travel"
    | "repository-absent"
    | "repository-names-another-directory"
    | "readme-did-not-travel";
  readonly message: string;
}

/**
 * The dependency maps a consumer's installer resolves.
 *
 * `devDependencies` IS DELIBERATELY OUTSIDE IT. Nothing installs it from a published package, so a
 * workspace specifier there is unreachable rather than broken — and including it would red this
 * check for a reason that never reaches a consumer, which is how a check acquires a reputation for
 * crying wolf and then gets narrowed by somebody in a hurry.
 */
const RESOLVED_BY_A_CONSUMER = ["dependencies", "optionalDependencies", "peerDependencies"] as const;

/**
 * The `publishConfig` keys npm consumes as its OWN configuration rather than lifting into the
 * manifest.
 *
 * A WRITTEN-DOWN LIST, AND THE DIRECTION IT FAILS IN IS THE REASON IT IS ALLOWED TO BE ONE. Every
 * key not named here is treated as a manifest field and must stand in the packed manifest, so a
 * client key npm adds tomorrow REDS this check rather than slipping past it. A list that narrows
 * loudly is a list; a list that narrows quietly is a hole.
 */
const NPM_CLIENT_KEYS = new Set(["access", "registry", "tag", "provenance"]);

/** The licence spellings a package root may carry, as npm itself recognises them. */
const LICENCE_NAMES = /^licen[sc]e(\.|$)/i;

/** The front-page spellings a package root may carry, as npm itself recognises them. */
const README_NAMES = /^readme(\.|$)/i;

/** Everything this document fails to tell a consumer, in the order the Rule states the properties. */
export function packedManifestFaults(published: PublishedPackage): PackedManifestFault[] {
  return [
    ...workspaceSpecifiersIn(published.manifest),
    ...unappliedPublishTimeFields(published),
    ...absentLicence(published),
    ...repositoryFaults(published),
    ...absentFrontPage(published),
  ];
}

/** A dependency named by a specifier only this workspace could ever resolve. */
function workspaceSpecifiersIn(manifest: ConsumedManifest): PackedManifestFault[] {
  return RESOLVED_BY_A_CONSUMER.flatMap((section) =>
    Object.entries(dependencyMapAt(manifest, section))
      .filter(([, specifier]) => specifier.startsWith("workspace:"))
      .map(([dependency, specifier]) => ({
        kind: "workspace-specifier-survived" as const,
        message:
          `${manifest.name} names ${dependency} as "${specifier}" in ${section}. ` +
          "Nothing outside this workspace can resolve that, so the install fails where nobody can read it.",
      })),
  );
}

/** One dependency section of a manifest, as a map of specifiers, or an empty one. */
function dependencyMapAt(manifest: ConsumedManifest, section: string): Record<string, string> {
  const map = manifest[section];
  return typeof map === "object" && map !== null ? (map as Record<string, string>) : {};
}

/**
 * A field the package publishes differently from the way it develops, that did not travel that way.
 *
 * BOTH FAILURES ARE ONE FAULT, and they are: a field the packer never lifted (the development value
 * stands, and it points at source this tarball does not carry), and a field it MERGED rather than
 * replaced (the published map keeps a subpath the publish-time map dropped). Compared by equality
 * over the whole value, so the second is caught at all — a containment test satisfied by the
 * published entries being present would pass a merge forever.
 */
function unappliedPublishTimeFields(published: PublishedPackage): PackedManifestFault[] {
  const { publishConfig, manifest } = published;
  return Object.entries(publishConfig)
    .filter(([field]) => !NPM_CLIENT_KEYS.has(field))
    .filter(([field, declared]) => !sameValue(manifest[field], declared))
    .map(([field]) => ({
      kind: "publish-time-field-not-applied" as const,
      message:
        `${manifest.name} declares a publish-time ${field}, and the artefact carries a different one. ` +
        "A consumer resolves the map in the tarball, so what this repository develops against is what they get.",
    }));
}

/** Whether the artefact carries the value the workspace declared it would publish. */
function sameValue(carried: unknown, declared: unknown): boolean {
  return JSON.stringify(carried ?? null) === JSON.stringify(declared ?? null);
}

/**
 * A declared licence with no licence beside it.
 *
 * THE MANIFEST'S OWN DECLARATION IS THE TRIGGER, so this says nothing about a package that claims no
 * licence — that is a different argument, and one this Rule has no standing to make. What it will
 * not allow is the pair that misleads: a manifest telling a consumer the terms while the terms
 * themselves stayed behind in a workspace they cannot see.
 */
function absentLicence(published: PublishedPackage): PackedManifestFault[] {
  const { manifest, carries } = published;
  if (manifest.license === undefined) return [];

  const travelled = carries.filter((file) => LICENCE_NAMES.test(file.path) && file.bytes > 0);
  if (travelled.length > 0) return [];

  return [
    {
      kind: "licence-did-not-travel",
      message:
        `${manifest.name} declares the ${manifest.license} licence and carries no licence of that name. ` +
        "The terms a consumer is held to are the ones in their copy, and their copy has none.",
    },
  ];
}

/**
 * The link back to where the artefact came from, and whether it points at this package.
 *
 * `directory` IS RECONCILED AGAINST WHERE THE PACKAGE WAS ACTUALLY PACKED FROM rather than against a
 * value written down twice. A monorepo publishing two packages from one repository has one `url` and
 * two directories, so the field that distinguishes them is the field most easily copied from the
 * sibling — and a `repository` naming the wrong half of the tree sends a reader to somebody else's
 * source with nothing to tell them so.
 */
function repositoryFaults(published: PublishedPackage): PackedManifestFault[] {
  const { manifest, packedFrom } = published;
  const repository = manifest.repository;
  const url = fieldOf(repository, "url");
  if (url === undefined) {
    return [
      {
        kind: "repository-absent",
        message:
          `${manifest.name} does not say where it came from. ` +
          "A consumer reading the package has no route to its source, its history or its issues.",
      },
    ];
  }

  const directory = fieldOf(repository, "directory");
  if (directory === packedFrom) return [];
  return [
    {
      kind: "repository-names-another-directory",
      message:
        `${manifest.name} was packed from ${packedFrom} and points at ${directory ?? "the repository root"}. ` +
        "In a repository publishing more than one package, that is a link to somebody else's source.",
    },
  ];
}

/**
 * A package that opens on nothing.
 *
 * NOTHING TRIGGERS THIS ONE, AND THAT IS THE WHOLE OF THE ASYMMETRY WITH THE LICENCE. `absentLicence`
 * fires only where the manifest DECLARES a `license`, because a package claiming no terms is making
 * a different argument and this Rule has no standing to answer it. No manifest field declares a front
 * page — there is nothing for the reading to be conditional ON — and no package a stranger installs
 * is better off without one. So the obligation is unconditional, and the absence of a field
 * announcing it is not the absence of it.
 *
 * NON-EMPTY, for the reason `absentLicence` already gives in its own words: an empty copy is exactly
 * what a copy step that ran and did nothing leaves behind, and a file list cannot tell the two apart.
 */
function absentFrontPage(published: PublishedPackage): PackedManifestFault[] {
  const { manifest, carries } = published;
  const travelled = carries.filter((file) => README_NAMES.test(file.path) && file.bytes > 0);
  if (travelled.length > 0) return [];

  return [
    {
      kind: "readme-did-not-travel",
      message:
        `${manifest.name} carries no front page a reader could open. ` +
        "The first thing somebody who has just installed it looks for is the one file it does not have.",
    },
  ];
}

/** One string field of a manifest value that may not be an object at all. */
function fieldOf(value: unknown, field: string): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const held = (value as Record<string, unknown>)[field];
  return typeof held === "string" && held.length > 0 ? held : undefined;
}
