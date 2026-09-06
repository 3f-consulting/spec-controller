/**
 * WHAT THE MODULES THAT TRAVEL IN THE TARBALL IMPORT (@SCN-API-007; features/public-api.feature).
 *
 * THE REGISTRY BESIDE THIS ONE READS THE MANIFESTS AND STOPS THERE. `publishedSurfaces.ts` holds
 * every published subpath to a written surface and reconciles the SET of published subpaths against
 * the set a surface exists for, both directions. All three of its arms were green on the day
 * `spec-controller balance --help` threw ERR_PACKAGE_PATH_NOT_EXPORTED out of an installed tarball,
 * and none of them was wrong: every subpath published WAS held to a list. The half nobody asked is
 * the other direction of the same boundary — whether the modules that travel import only what those
 * same manifests publish (3F-3086).
 *
 * WHY NOTHING IN THIS TREE COULD RED ON IT. 3F-2837 un-published core's `./internal` and KEPT the
 * workspace `exports` key, so in-repo importers go on resolving it — which is right, and is exactly
 * the blind spot: every gate here resolves through the workspace map, and npm REPLACES that map
 * with the publish-time one rather than merging them. A module reaching `./internal` is correct
 * in-workspace and unresolvable once installed, and the two readings differ nowhere else.
 *
 * SO THE SUBJECT IS THE PUBLISHED MODULE SET, NEVER THE SOURCE TREE. Nineteen modules under
 * `tests/checks/` reach `./internal` today and every one of them is correct: `tsconfig.build.json`
 * never emits them and `files` never ships them, so no consumer can be handed one. A source-tree
 * reading would have to excuse all nineteen by name, and a list of nineteen exemptions nobody
 * maintains is the accident with paperwork 3F-2837's own note refused. What ships is read from the
 * two files that decide it — `files` and the build config — so a module joining the tarball joins
 * this scan by the same edit that put it there.
 *
 * IMPORT STATEMENTS ARE READ, NEVER THE TEXT. Measured on the tree this guard first ran over: 56
 * published modules, and one of them — `packages/core/src/internal.ts` — carries the specifier
 * `@3f-consulting/spec-controller-core/internal` inside a COMMENT naming the subpath it is the
 * source of. It is correct, it travels into `dist/internal.js` and `dist/internal.d.ts` with the
 * module, and a match over the file text reds on it: one fault reported, zero faults present. A
 * guard that has to be argued with on a green tree is one somebody eventually quiets by deleting
 * the comment that explains the seam. Parsing is what makes the reading say what the sentence says.
 *
 * ONE READER FOR WHAT A CONSUMER CAN WRITE. `publishedSpecifiersOf` already answers it, publish-time
 * map standing in for workspace map exactly as npm does; this module reuses it rather than reading
 * the manifests a second time. A second reading would be the two-lists-that-never-reconcile shape
 * one layer out again — the very shape `publishedSurfaces.ts` exists to have removed.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import ts from "typescript";

import {
  packageNameOf,
  publishedSpecifiersOf,
  type WorkspaceManifest,
} from "./publishedSurfaces.js";

/** The build config a package's `build` script compiles through. */
const BUILD_CONFIG = "tsconfig.build.json";

/**
 * One import a published module makes that no manifest in this workspace publishes.
 *
 * The module is repo-relative so a reader chasing a red has the file to open, and the specifier is
 * spelled the way its author wrote it — the failure names what to delete, not a normalised form the
 * author would have to translate back.
 */
export interface UnpublishedImport {
  /** The published module making the import, repo-relative. */
  readonly module: string;
  /** The specifier it imports, as written. */
  readonly specifier: string;
}

/**
 * The source modules a package would ship — what `files` and the build together decide.
 *
 * BOTH HALVES ARE READ, BECAUSE EITHER ALONE ANSWERS A DIFFERENT QUESTION. The build config says
 * which sources become `dist`; `files` says whether `dist` is in the tarball at all. A package that
 * builds and ships nothing has no published modules, and a package that ships a directory it never
 * builds ships nothing of this kind either.
 *
 * A FORM THIS READER DOES NOT UNDERSTAND RAISES RATHER THAN READING NOTHING OFF IT — the rule
 * `publishedSubpathsOf` is written to next door, for the same reason. Answering `[]` for a package
 * whose build config is arranged in a way this reader has not met would silently unscan every
 * module in it, and a scan that covers nothing reports a clean workspace.
 */
export function publishedModulesOf(manifest: WorkspaceManifest, repoRoot: string): string[] {
  const packageDir = join(repoRoot, dirname(manifest.path));
  const build = buildConfigOf(manifest, packageDir);
  if (!shipsBuildOutput(manifest, build.outDir)) {
    return [];
  }

  return build.roots
    .flatMap((root) => sourcesUnder(join(packageDir, root)))
    .filter((file) => !build.omitted.some((suffix) => file.endsWith(suffix)))
    .map((file) => relative(repoRoot, file))
    .sort();
}

/**
 * The specifiers a module imports that name a package of this workspace.
 *
 * Third-party specifiers and `node:` builtins are somebody else's contract and are not this rule's
 * business; a relative path resolves inside the module's own package and never crosses a manifest.
 * What is left is exactly the set of crossings a manifest has to have published.
 */
export function siblingSpecifiersIn(
  source: string,
  fileName: string,
  packageNames: readonly string[],
): string[] {
  return importedSpecifiersIn(source, fileName).filter((specifier) =>
    packageNames.some((name) => specifier === name || specifier.startsWith(`${name}/`)),
  );
}

/**
 * Every specifier a module imports, read off its import statements.
 *
 * PARSED, NOT MATCHED. See the header: two published modules of this repository name the
 * un-published subpath inside a comment, correctly, and a text match reds on both. The parse also
 * reaches the forms a match would have to grow a case for one at a time — `export … from`, a
 * type-only import, a dynamic `import()` — each of which crosses the package boundary exactly as a
 * plain import does once the tarball is installed.
 */
export function importedSpecifiersIn(source: string, fileName: string): string[] {
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const specifier = specifierAt(node);
    if (specifier !== undefined) {
      found.push(specifier);
    }
    ts.forEachChild(node, visit);
  };

  visit(parsed);
  return found;
}

/**
 * Reconcile what the published modules import against what the manifests publish.
 *
 * ONE DIRECTION ONLY, AND THAT IS NOT THE HALF-GUARD IT LOOKS LIKE. The arms next door reconcile
 * two written-down sets and owe both directions, because a list going stale is a fault of its own.
 * Here one side is not a list: it is what the modules DO. A published specifier nobody imports is
 * not a fault — it is a barrel a consumer may reach that this repository happens not to use.
 */
export function reconcilePublishedImports(
  manifests: readonly WorkspaceManifest[],
  repoRoot: string,
): UnpublishedImport[] {
  const names = manifests.map(packageNameOf);
  const published = new Set(manifests.flatMap(publishedSpecifiersOf));

  return manifests
    .flatMap((manifest) => publishedModulesOf(manifest, repoRoot))
    .flatMap((module) =>
      siblingSpecifiersIn(readFileSync(join(repoRoot, module), "utf8"), module, names)
        .filter((specifier) => !published.has(specifier))
        .map((specifier): UnpublishedImport => ({ module, specifier })),
    )
    .sort((left, right) => `${left.module} ${left.specifier}`.localeCompare(`${right.module} ${right.specifier}`));
}

/** What the operator is told when the guard reds — which module, which specifier, and why it cannot resolve. */
export function unpublishedImportReport(imports: readonly UnpublishedImport[]): string {
  if (imports.length === 0) {
    return "";
  }

  return [
    `${imports.length} module(s) these packages publish import a workspace subpath the manifests ` +
      `do not publish. An installed consumer resolves through the publish-time map alone, so each ` +
      `of these throws ERR_PACKAGE_PATH_NOT_EXPORTED on first load:`,
    ...imports.map((found) => `  ${found.module} imports ${found.specifier}`),
  ].join("\n");
}

/** The one node shape that carries a specifier, in each of the forms a module can cross a package by. */
function specifierAt(node: ts.Node): string | undefined {
  const carried = (node as { moduleSpecifier?: ts.Node }).moduleSpecifier;
  if (carried !== undefined && ts.isStringLiteral(carried)) {
    return carried.text;
  }
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const [first] = node.arguments;
    return first !== undefined && ts.isStringLiteral(first) ? first.text : undefined;
  }

  return undefined;
}

/** What a package's build config says it compiles, and where it puts the result. */
interface BuildPlan {
  /** The package-relative directories the build compiles. */
  readonly roots: readonly string[];
  /** The file suffixes the build leaves out of that compilation. */
  readonly omitted: readonly string[];
  /** The package-relative directory the build writes, which `files` must ship for any of it to travel. */
  readonly outDir: string;
}

/** The build config, read for the three things that decide which sources become published modules. */
function buildConfigOf(manifest: WorkspaceManifest, packageDir: string): BuildPlan {
  const file = join(packageDir, BUILD_CONFIG);
  if (!existsSync(file)) {
    throw new Error(`${manifest.path} ships a build this reader cannot find: no ${BUILD_CONFIG} beside it`);
  }
  const config = JSON.parse(readFileSync(file, "utf8")) as Readonly<Record<string, unknown>>;
  const outDir = (config["compilerOptions"] as { outDir?: unknown } | undefined)?.outDir;
  if (typeof outDir !== "string") {
    throw new Error(`${manifest.path}'s ${BUILD_CONFIG} names no outDir, so what it ships cannot be read`);
  }

  return {
    roots: literalDirs(manifest, config["include"]),
    omitted: omittedSuffixes(manifest, config["exclude"]),
    outDir,
  };
}

/**
 * The `include` entries, which this reader understands only as literal directories.
 *
 * A glob here would be a second, unproven implementation of the compiler's own matching, and the
 * failure mode of getting it subtly wrong is a module that is silently not scanned — the same
 * argument `dirsMatching` makes next door about pnpm's patterns.
 */
function literalDirs(manifest: WorkspaceManifest, include: unknown): string[] {
  if (!Array.isArray(include) || include.length === 0) {
    throw new Error(`${manifest.path}'s ${BUILD_CONFIG} names nothing to compile — the scan would cover nothing`);
  }

  return include.map((entry) => {
    if (typeof entry !== "string" || entry.includes("*")) {
      throw new Error(
        `${manifest.path}'s ${BUILD_CONFIG} compiles ${JSON.stringify(entry)}, a form this reader cannot expand`,
      );
    }
    return entry;
  });
}

/**
 * The `exclude` entries, understood as the one form this workspace uses: everything under a root
 * ending in a given suffix. It is load-bearing rather than tidy — three `*.test.ts` modules beside
 * the published sources reach the un-published subpath, correctly, and are never compiled.
 */
function omittedSuffixes(manifest: WorkspaceManifest, exclude: unknown): string[] {
  if (exclude === undefined) {
    return [];
  }
  if (!Array.isArray(exclude)) {
    throw new Error(`${manifest.path}'s ${BUILD_CONFIG} excludes by a form this reader cannot read`);
  }

  return exclude.map((entry) => {
    const suffix = typeof entry === "string" ? /^[^*]*\/\*\*\/\*(\.[^*/]+)$/.exec(entry) : null;
    if (suffix === null) {
      throw new Error(
        `${manifest.path}'s ${BUILD_CONFIG} excludes ${JSON.stringify(entry)}, a form this reader cannot expand`,
      );
    }
    return suffix[1] as string;
  });
}

/** Whether the tarball carries what the build wrote. `files` absent would ship by npm's own defaults, which this reader does not model. */
function shipsBuildOutput(manifest: WorkspaceManifest, outDir: string): boolean {
  const files = manifest.content["files"];
  if (!Array.isArray(files) || files.some((entry) => typeof entry !== "string")) {
    throw new Error(`${manifest.path} names no list of files to ship, so what travels cannot be read`);
  }

  return files.includes(outDir);
}

/** Every TypeScript source under a directory, in path order, recursing as the compiler does. */
function sourcesUnder(dir: string): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? sourcesUnder(join(dir, entry.name)) : [join(dir, entry.name)],
    )
    .filter((file) => file.endsWith(".ts"))
    .sort();
}
