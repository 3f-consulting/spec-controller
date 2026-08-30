/**
 * EVERY SUBPATH THESE PACKAGES PUBLISH, AND THE SURFACE WRITTEN DOWN FOR IT (@SCN-API-004,
 * @SCN-API-005, @SCN-API-006; features/public-api.feature).
 *
 * WHY A REGISTRY RATHER THAN A GUARD PER BARREL. `@SCN-API-001` holds the core `.` barrel to a
 * frozen list and has done its job, but a guard wired beside one barrel cannot notice a second
 * barrel arriving. Two did — core's `./internal` and `spec-controller`'s `./mutation-ratchet` —
 * and the coverage that resulted was a fact nobody was checking. Naming the surfaces in ONE place
 * turns "which subpaths are held to a list" from an accident of who remembered into something a
 * later scenario can reconcile against the manifests themselves.
 *
 * THE LISTS BELOW ARE TRANSCRIBED BY HAND FROM EACH BARREL'S `export` STATEMENTS, AND THAT IS THE
 * WHOLE MECHANISM. They are not generated, not reflected, and not copied from the per-barrel pins
 * that already exist. A list derived from the barrel it is held against is a barrel redefining its
 * own expectation — green by construction, forever, and it would have caught none of the three
 * gaps that produced this registry. The independence is the same rule a two-inspector review runs
 * on: the second reading is worth having only because it was not taken from the first.
 *
 * CORE'S OWN ENUMERATION WAS SUCH A PIN AND IS GONE (3F-2838), which is a different move
 * from tidying it away. It sat in `packages/core/src/index.test.ts` over a reflection and a
 * comparison that file also carried — the whole mechanism this module now holds, written twice.
 * Retiring the DUPLICATE MECHANISM is the point; what it cost is the second reading, and that was
 * settled before the removal rather than assumed: the barrel was transcribed a third time, from its
 * own `export` statements, before either existing list was opened. Twenty-six values and thirty-six
 * types, symbol for symbol, all three agreeing. A disagreement would have been a finding about the
 * surface and this removal would not have happened.
 *
 * WHY THIS LIVES IN `spec-controller` AND NOT IN `core`. *Every published subpath* is a property
 * of the workspace, not of either package, so it has to be stated somewhere that can see both.
 * `packages/core` is the pure library and `spec-controller` depends on it — a core module reading
 * this one would invert that and close a cycle. Reading core's tree from `static-checks/` is the
 * direction that already works: `enginePurity` and `domainPurity` both do it.
 *
 * WHAT IS HERE. Three readings and one comparison. The VALUE half of a surface, which a runtime
 * namespace reports (@SCN-API-004); the TYPE half, which only the compiler can (@SCN-API-005); and
 * the set of subpaths the MANIFESTS publish, read from the manifests themselves and reconciled
 * against the set this registry names (@SCN-API-006). The three are read by different means —
 * erased types cannot be reflected and a manifest key is not a symbol — and compared by one; see
 * `namesApart`.
 *
 * THE THIRD IS WHAT MAKES THE FIRST TWO WORTH HAVING. A registry can be perfectly correct about
 * every surface it happens to name and still be missing one, and a surface nobody wrote a list for
 * is exactly a surface no list can red on. Reconciling this registry against the manifests is what
 * turns "which subpaths are held" from something a maintainer has to remember into something the
 * tree answers — and it is the reading that would have caught `./internal` on the day it was
 * published, which the two arms above could not have, however well written.
 *
 * WHY ONE ENTRY AND NOT THREE. Both of the surfaces that motivated this registry have since
 * stopped being published, each for its own reason, and the registry narrowed with them rather
 * than being narrowed to make anything green.
 *
 * THE `./internal` CORRECTION (3F-2837). `./internal` was in
 * `packages/core/package.json`'s `publishConfig.exports` and therefore importable by an external
 * consumer, while its own header said "NOT THE PUBLIC v1 CONTRACT" and nothing held it to a list.
 * @SCN-API-006 cannot pass over a contradiction like that, and the operator ruled it be resolved in
 * the honest direction: STOP PUBLISHING IT. It is internal by name and by its own header, the
 * publish was an accident, there are no external consumers yet to break — and the two alternatives
 * are both worse. Freezing an internal surface would make every refactor behind it a change to a
 * published contract; exempting it would keep shipping internal surface from behind an exemption,
 * which is the accident with paperwork. The workspace `exports` entry STAYS: the in-repo importers
 * of `@3f-consulting/spec-controller-core/internal` resolve through it, and because npm replaces
 * `exports` with `publishConfig.exports` wholesale rather than merging them, unpublishing the
 * subpath and keeping the seam is one key.
 *
 * THE `./mutation-ratchet` DE-PUBLICATION (3F-2859). The ratchet is now a module this repository
 * keeps for its own gate, and each project owns its own no-regression gate — so nothing publishes
 * it: BOTH manifest maps went, not one. `publishedMapOf` prefers the publish-time map and falls
 * back to the workspace map, so dropping only the publish-time key would have left the subpath
 * published through the fallback — the opposite of the `./internal` case above, where the
 * workspace key is what the in-repo importers need. Its in-repo importers went to relative paths
 * instead, which is the honest spelling once no consumer can write the specifier at all.
 * `reconcile.test.ts`'s `[SCN-RAT-014]` pin stays and is now the only written list over that
 * module's surface — no longer a second reading of a published one, so this registry's
 * independence argument no longer applies to it.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";
import { parse } from "yaml";

/**
 * One subpath a manifest publishes, and the surface somebody wrote down for it.
 *
 * `subpath` is the manifest's own key — `"."` for the package entry, `"./mutation-ratchet"` for a
 * subpath — so @SCN-API-006 reconciles these against a published map without translating either
 * side.
 * `barrel` is the source the key resolves to, repo-relative, because the type arm needs a file to
 * build a Program over and a specifier is not one.
 */
export interface PublishedSurface {
  /** The package name a consumer writes, e.g. `@3f-consulting/spec-controller-core`. */
  readonly package: string;
  /** The manifest's `exports` key, e.g. `"."` or `"./mutation-ratchet"`. */
  readonly subpath: string;
  /** The barrel source that key resolves to, repo-relative. */
  readonly barrel: string;
  /** Every value the barrel exports, transcribed by hand from its `export` statements. */
  readonly values: readonly string[];
  /** Every type-only export, transcribed the same way. Read by @SCN-API-005, not by this arm. */
  readonly types: readonly string[];
}

/**
 * Which way a surface and its written list have parted company. Both are faults; naming them apart
 * is what lets a failure say whether the barrel grew or the list did, without the reader diffing
 * two hundred symbols to find out.
 */
export type SurfaceDriftKind = "unwritten-export" | "missing-export";

/** One symbol on which a published surface and the surface written for it disagree. */
export interface SurfaceDrift {
  /** The specifier a consumer imports, so a failure names the surface the way its consumer does. */
  readonly specifier: string;
  readonly kind: SurfaceDriftKind;
  readonly symbol: string;
}

/**
 * The specifier a consumer writes to reach this surface — derived from the package and the
 * manifest key rather than carried as a third field, so the two spellings cannot disagree.
 */
export function specifierOf(surface: PublishedSurface): string {
  return specifierFor(surface.package, surface.subpath);
}

/**
 * The one spelling of a specifier, from a package name and a manifest key.
 *
 * BOTH SIDES OF @SCN-API-006 ARE SPELLED BY THIS FUNCTION, and that is the point of extracting it.
 * The completeness rule compares specifiers built from the registry against specifiers built from
 * the manifests; two spellings of `"." means the bare package name` would have the two sets disagree
 * by construction, and the reconciliation would report every surface twice while proving nothing.
 */
function specifierFor(packageName: string, subpath: string): string {
  return subpath === "." ? packageName : `${packageName}/${subpath.slice(2)}`;
}

/**
 * Where the barrel sits on disk. `process.cwd()` is the repo root under every runner in this tree,
 * the same assumption `sourceFiles.ts` makes for the core-src walk.
 */
export function barrelPathOf(surface: PublishedSurface): string {
  return join(process.cwd(), surface.barrel);
}

/**
 * The comparison both arms make, over whichever half of a surface they were handed.
 *
 * ONE EMITTER, BECAUSE THE TWO ARMS DIFFER IN WHERE THE NAMES COME FROM AND IN NOTHING ELSE. The
 * value arm reads a runtime namespace and the type arm reads a compiled type surface, but once the
 * names are in hand the question is identical, and two copies of it would be two chances for one
 * half of a surface to be held to a slightly different standard than the other — the sort of
 * difference that is invisible until the day it matters.
 *
 * Both directions, because either alone is a half-guard: checking only that the written names are
 * present lets the surface widen unremarked, and checking only that the exports are written lets a
 * dropped symbol pass as a list nobody trimmed.
 */
function reconcileNames(
  specifier: string,
  written: readonly string[],
  reflected: readonly string[],
): SurfaceDrift[] {
  const { unwritten, missing } = namesApart(written, reflected);

  return [
    ...unwritten.map((symbol): SurfaceDrift => ({ specifier, kind: "unwritten-export", symbol })),
    ...missing.map((symbol): SurfaceDrift => ({ specifier, kind: "missing-export", symbol })),
  ];
}

/** The two ways a set of names present and a set of names written down can part company. */
interface NamesApart {
  /** Present, and nobody wrote them down. */
  readonly unwritten: readonly string[];
  /** Written down, and not present. */
  readonly missing: readonly string[];
}

/**
 * The set difference taken both ways, sorted, over any two lists of names.
 *
 * THE ALGEBRA IS SHARED AND THE ROW SHAPES ARE NOT, and that split is deliberate. All three arms of
 * this Rule ask the same question — what is on one side and not the other, each way — but they ask
 * it about different things: two of them about SYMBOLS on one surface, the third about SUBPATHS
 * across the workspace. One emitter for all three would have a subpath reported as an "export",
 * which is a failure message that misdirects the reader on the one occasion it is read. So the
 * comparison is written once and each arm names its own findings.
 */
function namesApart(written: readonly string[], present: readonly string[]): NamesApart {
  const writtenNames = new Set(written);
  const presentNames = new Set(present);

  return {
    unwritten: [...presentNames].filter((name) => !writtenNames.has(name)).sort(),
    missing: [...writtenNames].filter((name) => !presentNames.has(name)).sort(),
  };
}

/**
 * Reconcile the value symbols a barrel actually exports against the ones written down for it, and
 * report every symbol the two disagree on — BOTH directions, because either alone is a half-guard:
 * checking only that the written names are present lets the barrel widen unremarked, and checking
 * only that the exports are written lets a dropped symbol pass as a list nobody trimmed.
 *
 * Pure, taking the reflected names as data: the `import * as` that produces them belongs in the
 * citing test, so the planted surfaces that prove this has teeth need no barrel to exist at all.
 */
export function reconcileValueSurface(
  surface: PublishedSurface,
  reflected: readonly string[],
): SurfaceDrift[] {
  return reconcileNames(specifierOf(surface), surface.values, reflected);
}

/**
 * The settings the type surface is read under, and they are load-bearing rather than incidental.
 *
 * They mirror `tsconfig.json`'s resolution surface — ESM modules, Bundler resolution, `.js`
 * specifiers pointing at `.ts` sources — because that is how every barrel in this workspace spells
 * its re-exports. Under any other resolution those specifiers point at files that are not there,
 * every alias fails to resolve, and the reading comes back empty. Not with an error: EMPTY. So a
 * mistake here does not red this check, it hollows it out, and the planted barrel the citing test
 * drives is there to make exactly that failure loud.
 *
 * No type-checking is asked for — binding and symbol resolution answer the whole question, and they
 * are what keeps a per-surface reading cheap enough to run on all three.
 */
const TYPE_SURFACE_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
};

/**
 * Read the type-only export names off a barrel's COMPILED TYPE SURFACE.
 *
 * WHY THIS CANNOT BE THE VALUE ARM WITH A DIFFERENT ARGUMENT. Types are erased, so the runtime
 * namespace `@SCN-API-004` reflects contains no trace of them; and the substitute this workspace
 * reached for instead — spelling each expected type into a typed literal, as `./mutation-ratchet`
 * does — answers only half the question. A type dropped or renamed stops that literal compiling; a
 * type ADDED reds nothing, because nothing references what nobody wrote. Asking the compiler for
 * the surface itself is what makes the addition visible.
 *
 * A NAME IS KEPT WHEN THE SYMBOL BEHIND IT CARRIES TYPE MEANING AND NOT VALUE MEANING. That
 * excludes classes and enums, which are both at once and therefore already on the value list —
 * counting them twice would have the two arms disagree about one symbol by construction. Each
 * export is followed through its alias first, because `export type { X } from "./x.js"` binds a
 * symbol whose own flags say only "alias"; the name reported is the EXPORTED one, so a type
 * crossing the line under a new spelling is judged by the spelling a consumer writes.
 *
 * Fast enough to run per surface: the Program binds and resolves symbols, and never type-checks.
 */
export function reflectTypeSurface(barrelPath: string): string[] {
  const program = ts.createProgram([barrelPath], TYPE_SURFACE_OPTIONS);
  const checker = program.getTypeChecker();

  const source = program.getSourceFile(barrelPath);
  if (source === undefined) {
    throw new Error(`no barrel source could be loaded at ${barrelPath}`);
  }
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (moduleSymbol === undefined) {
    // Both raises say the same thing, and saying it is the point: a barrel that could not be read
    // and a barrel with nothing on it both answer `[]`, and one of those is this check having
    // stopped working. An empty answer must never be reachable except by a barrel that really is
    // empty.
    throw new Error(`${barrelPath} resolved to no module — is it a module?`);
  }

  return checker
    .getExportsOfModule(moduleSymbol)
    .filter((exported) => carriesTypeMeaningOnly(checker, exported))
    .map((exported) => exported.name)
    .sort();
}

/**
 * Whether one export's symbol stands for a type and for nothing else.
 *
 * The alias hop is the whole subtlety. `export type { X } from "./x.js"` binds a local symbol whose
 * own flags say "alias" and nothing about what it aliases, so a reader that looked no further would
 * find every re-exported type invisible — and would find it invisible SILENTLY, which is how this
 * arm goes vacuous rather than red.
 */
function carriesTypeMeaningOnly(checker: ts.TypeChecker, exported: ts.Symbol): boolean {
  const target =
    (exported.flags & ts.SymbolFlags.Alias) === 0 ? exported : checker.getAliasedSymbol(exported);

  return (target.flags & ts.SymbolFlags.Type) !== 0 && (target.flags & ts.SymbolFlags.Value) === 0;
}

/**
 * Reconcile the types a barrel actually exports against the ones written down for it — the type
 * half of `reconcileValueSurface`, reporting the same drift in the same shape, so a failure reads
 * identically whichever half of a surface parted company.
 *
 * A RENAME ARRIVES HERE AS TWO FAULTS, NOT ONE, and that is the honest reading rather than a
 * shortcoming. Nothing in a compiled surface records that `MutationVerdict` became `RatchetVerdict`
 * — what is observable is a name the surface no longer carries and a name nobody wrote down, which
 * is exactly what a consumer's build sees. Pairing them into a "rename" would be this module
 * guessing at intent it has no evidence for.
 */
export function reconcileTypeSurface(
  surface: PublishedSurface,
  reflected: readonly string[],
): SurfaceDrift[] {
  return reconcileNames(specifierOf(surface), surface.types, reflected);
}

/**
 * One package manifest this workspace holds, read as JSON hands it over.
 *
 * `content` is deliberately UNTYPED BEYOND "an object with unknown values", because that is what a
 * manifest on disk is: nothing checks it before this reader does, and a shape asserted here would be
 * an assumption dressed as a type. Every field it reads is narrowed at the point of reading, and a
 * field in a form the reader does not understand raises rather than being coerced past — see
 * `publishedSubpathsOf`.
 *
 * `path` is repo-relative so a reader chasing a fault has the file to open, and so the arm that
 * pins which manifests were found names them the way the tree does.
 */
export interface WorkspaceManifest {
  /** The manifest's repo-relative path, e.g. `packages/core/package.json`. */
  readonly path: string;
  /** The manifest's parsed content — every value unknown until narrowed. */
  readonly content: Readonly<Record<string, unknown>>;
}

/**
 * Which way the set of subpaths published and the set of surfaces written down have parted company.
 * Named apart for the reason `SurfaceDriftKind` is: a failure should say whether a barrel arrived
 * unheld or a written surface stopped being published, without the reader diffing two lists.
 */
export type SubpathDriftKind = "unwritten-subpath" | "unpublished-subpath";

/** One subpath on which what the manifests publish and what the registry names disagree. */
export interface SubpathDrift {
  /** The specifier a consumer imports, spelled by the one rule both sides are spelled by. */
  readonly specifier: string;
  readonly kind: SubpathDriftKind;
}

/** The file that names which directories of this workspace hold packages. */
const WORKSPACE_FILE = "pnpm-workspace.yaml";

/**
 * The subpaths a manifest publishes to an EXTERNAL consumer — its EFFECTIVE PUBLISHED MAP's keys.
 *
 * npm REPLACES `exports` with `publishConfig.exports` at publish time; it does not merge them. So
 * what a consumer of the published package can import is the publish-time map where a manifest has
 * one and the workspace map where it does not, and the two maps are free to differ — which is the
 * whole reason this repository can go on resolving `./internal` in-workspace while publishing
 * nothing of the sort. A reader that merged the two would hold surfaces nobody outside this
 * repository can reach, and would report the manifests as publishing something they do not.
 *
 * A FORM THIS READER DOES NOT UNDERSTAND RAISES RATHER THAN READING NOTHING OFF IT. Two other
 * shapes are legal npm and neither is used here: a bare string, and a top-level map of CONDITIONS
 * (`types` / `default`) which is sugar for the `.` subpath. Answering `[]` for either would publish
 * a barrel with no surface written for it, silently — this Rule's own fault arriving through the
 * reader meant to catch it. Answering with the condition names would invent two subpaths that do
 * not exist. Saying "this is a form I cannot read, in this file" is the only honest third option.
 */
export function publishedSubpathsOf(manifest: WorkspaceManifest): string[] {
  return Object.keys(publishedMapOf(manifest)).sort();
}

/** The specifiers a consumer writes to reach this manifest's published subpaths. */
export function publishedSpecifiersOf(manifest: WorkspaceManifest): string[] {
  const subpaths = publishedSubpathsOf(manifest);
  if (subpaths.length === 0) {
    // Asked for its name before knowing it publishes anything, a package that publishes nothing
    // would have to carry a name to satisfy a reader that never needed one.
    return [];
  }

  return subpaths.map((subpath) => specifierFor(packageNameOf(manifest), subpath));
}

/**
 * Every package manifest under `repoRoot` that this workspace names.
 *
 * DISCOVERED, NOT LISTED, AND THAT IS THIS ARM'S WHOLE CLAIM. Two package paths written into this
 * module would hold today's two packages and leave the NEXT one unscanned — the same
 * somebody-has-to-remember arrangement that let `./internal` and `./mutation-ratchet` both arrive
 * unheld, reproduced one layer further out. The list of packages already exists, stated once, in
 * the file pnpm reads for the same question; reading it is what makes a new package arrive already
 * inside the scan.
 *
 * Parameterised by root so the whole reading — the workspace file, the pattern expansion, the
 * manifests — can be driven over a workspace planted for the occasion. A reader that could only be
 * pointed at this repository could only be proven by the tree it was written against.
 */
export function workspaceManifestsIn(repoRoot: string): WorkspaceManifest[] {
  return packageDirsIn(repoRoot)
    .map((dir) => join(dir, "package.json"))
    .filter((file) => existsSync(file))
    .map((file) => ({
      path: relative(repoRoot, file),
      content: JSON.parse(readFileSync(file, "utf8")) as Readonly<Record<string, unknown>>,
    }));
}

/** The same reading, over the repository the run is sitting in. */
export function workspaceManifests(): WorkspaceManifest[] {
  return workspaceManifestsIn(process.cwd());
}

/**
 * Reconcile the subpaths these manifests publish against the subpaths a surface is written for —
 * BOTH DIRECTIONS, for the reason the other two arms give and one of their own.
 *
 * A published subpath with no surface written for it is the fault this Rule exists to close: a
 * barrel a consumer can import that nothing holds to a list, arriving because somebody added a
 * manifest key and nobody thought about the guard. A surface written for a subpath nothing
 * publishes is the same list going stale from the other end — an entry that goes on being
 * reconciled, green, over a barrel no consumer can reach, which is coverage that reads real and is
 * not.
 *
 * Both sides are compared as SPECIFIERS spelled by one function; see `specifierFor`.
 */
export function reconcilePublishedSubpaths(
  manifests: readonly WorkspaceManifest[],
  surfaces: readonly PublishedSurface[],
): SubpathDrift[] {
  const { unwritten, missing } = namesApart(
    surfaces.map(specifierOf),
    manifests.flatMap(publishedSpecifiersOf),
  );

  return [
    ...unwritten.map((specifier): SubpathDrift => ({ specifier, kind: "unwritten-subpath" })),
    ...missing.map((specifier): SubpathDrift => ({ specifier, kind: "unpublished-subpath" })),
  ];
}

/** The map a consumer of the published package resolves its imports through. */
function publishedMapOf(manifest: WorkspaceManifest): Readonly<Record<string, unknown>> {
  const publishConfig = manifest.content["publishConfig"];
  const atPublish = isRecord(publishConfig) ? publishConfig["exports"] : undefined;
  const effective = atPublish ?? manifest.content["exports"];

  if (effective === undefined) {
    return {};
  }
  if (!isRecord(effective) || Object.keys(effective).some((key) => !key.startsWith("."))) {
    throw new Error(
      `${manifest.path} publishes through a map this reader cannot read as subpaths: ${JSON.stringify(effective)}`,
    );
  }

  return effective;
}

/** The package name a consumer writes, raised for rather than guessed at. */
function packageNameOf(manifest: WorkspaceManifest): string {
  const name = manifest.content["name"];
  if (typeof name !== "string") {
    throw new Error(`${manifest.path} publishes subpaths under no package name`);
  }

  return name;
}

/**
 * The package directories this workspace names, in path order.
 *
 * A PATTERN THIS READER CANNOT EXPAND RAISES, and a workspace file naming no packages raises too.
 * Both would otherwise expand to nothing, and a discovery that found nothing reconciles an empty
 * published set against an emptied registry and reports a clean workspace — the check having
 * stopped working, wearing the face of the check having passed.
 */
function packageDirsIn(repoRoot: string): string[] {
  const named = parse(readFileSync(join(repoRoot, WORKSPACE_FILE), "utf8")) as {
    packages?: unknown;
  };
  const patterns = named.packages;
  if (!Array.isArray(patterns) || patterns.length === 0) {
    throw new Error(`${WORKSPACE_FILE} names no packages — the scan would cover nothing`);
  }

  return patterns.flatMap((pattern) => dirsMatching(repoRoot, pattern)).sort();
}

/**
 * One workspace pattern, expanded.
 *
 * Only the two forms this workspace uses are understood — a literal directory, and one trailing
 * `*` naming every directory under a parent. That is not a shortcoming to be finished later: a
 * general glob written here would be a second, unproven implementation of pnpm's matching, and the
 * failure mode of getting it subtly wrong is a package that is silently not scanned. Refusing the
 * forms it cannot expand keeps the difference loud.
 */
function dirsMatching(repoRoot: string, pattern: unknown): string[] {
  if (typeof pattern !== "string" || (pattern.includes("*") && !isTrailingStar(pattern))) {
    throw new Error(
      `${WORKSPACE_FILE} names packages by ${JSON.stringify(pattern)}, a form this reader cannot expand`,
    );
  }
  if (!pattern.includes("*")) {
    return [join(repoRoot, pattern)];
  }

  const parent = join(repoRoot, pattern.slice(0, -2));
  return readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(parent, entry.name));
}

/** Whether a pattern is the one wildcard form understood: a single `*` in its final segment. */
function isTrailingStar(pattern: string): boolean {
  return pattern.endsWith("/*") && !pattern.slice(0, -2).includes("*");
}

/** Whether a parsed JSON value is an object with named members, rather than an array or a scalar. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Every subpath these packages publish today, in manifest order.
 *
 * An entry is added here by READING the barrel — see the header. Adding one by pasting a list from
 * anywhere else, including the per-barrel pins, buys nothing: the second reading is the guard.
 */
export const PUBLISHED_SURFACES: readonly PublishedSurface[] = [
  {
    // The frozen v1 contract — the surface `@SCN-API-001` names, and since 3F-2838 the only list
    // this repository holds it to. This entry was written as a SECOND reading of the barrel, taken
    // from its `export` statements rather than from the enumeration `@SCN-API-001` carried at the
    // time; a third reading agreed with both before that older one was retired.
    package: "@3f-consulting/spec-controller-core",
    subpath: ".",
    barrel: "packages/core/src/index.ts",
    values: [
      // Scenario parse (parse/scenarios.ts)
      "parseScenarios",
      "countScnOccurrences",
      "parseUntaggedScenarios",
      "proseOnlyCodes",
      // Evidence-obligation census (census/evidenceObligations.ts)
      "evidenceObligations",
      // Evidence Reconciliation (domain/evidenceReconciliation.ts) and the Ledger's own predicates
      "reconcile",
      "evidenceReconciliationOf",
      "isBalanced",
      "hasPendingItems",
      "hasBrokenEvidence",
      // Result and CI readers (parse/*)
      "parseVitestEvidenceObservations",
      "parseCucumberEvidenceObservations",
      "checkStaticEvidenceObligations",
      "runningStaticChecks",
      "ciRunCommands",
      "commandInvokesScript",
      // The render input the adapters frame around the reconciliation (assemble/renderInput.ts)
      "assembleRenderInput",
      // Render — model to string (render/*)
      "renderJson",
      "renderMarkdown",
      "renderReport",
      "renderReportFromJson",
      // Provenance — the pure subset (provenance/provenance.ts)
      "provenanceObject",
      "projectProvenance",
      "projectProvenanceObject",
      // Pure helpers (lib/*)
      "featureCodeOf",
      "relativizeToRoot",
    ],
    types: [
      // Model (model.ts)
      "QualityCheck",
      "RuntimeQualityCheck",
      "EvidenceStatus",
      "EvidenceObligation",
      "Scenario",
      "RuntimeEvidenceObservation",
      "GuardEvidenceObservation",
      "EvidenceObservation",
      "Outcome",
      "ScenarioVerdict",
      "ScenarioKind",
      "QualityCheckReconciliation",
      "ScenarioReconciliation",
      "Ledger",
      // Evidence-obligation census (census/evidenceObligations.ts)
      "EvidenceObligations",
      "UntaggedScenario",
      // Result and CI readers (parse/*)
      "VitestJsonReport",
      "CucumberJsonReport",
      "PackageJsonScripts",
      // The render input (assemble/renderInput.ts)
      "EvidenceReconciliation",
      "RenderInput",
      "ReportMetadata",
      "Summary",
      "ScenarioReconciliationTotals",
      "EvidenceObligationTotals",
      "MissingByQualityCheck",
      "TestVolumeTotals",
      "StaticCheckTotals",
      "LintTally",
      "EvidenceObligationsSection",
      // Render (render/*)
      "FeatureNames",
      // Provenance — the pure subset (provenance/provenance.ts)
      "RunContext",
      "RunInputs",
      "ProvenanceObject",
      "ProvenanceFacts",
      "ProvenanceInput",
    ],
  },
];
