/**
 * Ingest the target's feature files — the IMPURE reader that walks features/ on disk
 * and reads each file's header code into DiscoveredFeature records (split out of the old
 * spec/featureCodes.ts). The pure header parser (extractFeatureCode) lives here with its sole
 * consumer; the `scnId → feature-code` grammar helper is engine-side (packages/core/src/lib/
 * featureCode.ts); the duplicate-code lint is engine-side too, in
 * parse/scenarioCodeErrors.ts, and no longer a private check under tests/checks/.
 *
 * NO PER-FILE LIST OF SCENARIO CODES. One used to ride here, read by a copy of the
 * @SCN grammar of its own, and nothing but its own test read it; a scenario's code is read by the
 * engine's scenario walk, which is the reading the ledger's accounts are minted from.
 *
 * The foundation, folded into the @LDG runtime spine.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  MissingFeatureCorpusError,
  UnreadableFeatureCorpusError,
  parseErrorsIn,
} from "./gherkinValidation.js";

/** A code is valid when it is 2–5 uppercase alphanumerics. */
const CODE_PATTERN = /^[A-Z0-9]{2,5}$/;

/** A feature file discovered on disk, with its `@<FFF>` header code (if any). */
export interface DiscoveredFeature {
  /** The feature-file basename without the .feature extension. */
  slug: string;
  /** Absolute path to the feature file. */
  path: string;
  featureCode: string | null;
}

/**
 * Read the Feature-level @<FFF> header tag from a feature file's source — the
 * first tag immediately preceding the `Feature:` keyword that is not an @SCN id
 * or a recognised evidence/routing tag. Returns null if absent.
 */
export function extractFeatureCode(source: string): string | null {
  const lines = source.split(/\r?\n/);
  const featureLine = lines.findIndex((line) => line.trim().startsWith("Feature:"));
  if (featureLine < 0) return null;
  return headerTagsAbove(lines, featureLine).find(isHeaderCode) ?? null;
}

/** The tags a tier or routing concern owns, which are never a file's header code. */
const NON_CODE_TAGS = ["unit", "integration", "e2e", "performance", "smoke"];

/** Is this bare tag the file's header code — not an @SCN id, not a tier tag, and code-shaped? */
function isHeaderCode(bare: string): boolean {
  return !bare.startsWith("SCN-") && !NON_CODE_TAGS.includes(bare) && CODE_PATTERN.test(bare);
}

/**
 * The bare tags on the tag lines directly above the `Feature:` line, nearest line first and each
 * line left to right. Blank lines are passed over; the first line that is not a tag line ends it.
 */
function headerTagsAbove(lines: readonly string[], featureLine: number): string[] {
  const tags: string[] = [];
  for (let j = featureLine - 1; j >= 0; j--) {
    const prev = lines[j]!.trim();
    if (prev === "") continue;
    if (!prev.startsWith("@")) break;
    tags.push(...prev.split(/\s+/).filter((t) => t.startsWith("@")).map((t) => t.slice(1)));
  }
  return tags;
}

/**
 * Locate the default features/ directory — `./features` under the current
 * working directory. This is the target repo's own features dir: the directory
 * a user runs `spec-controller balance` from, and the workspace root when the
 * feature-code lint runs in CI. Callers that reconcile a different tree pass an
 * explicit `--features <dir>`, which overrides this default.
 */
function featuresDir(): string {
  return join(process.cwd(), "features");
}

/**
 * List the corpus directory, REFUSING an absent one by name rather than by `ENOENT`.
 *
 * Absence stays a REFUSAL AT THE READER — what changed is that it is typed, so a caller can decide.
 * `balance` opts in to reporting on a target that has no corpus (most targets have no `features/`
 * at all, and `new-client` is a supported adoption state) by catching `MissingFeatureCorpusError` by
 * name. Returning `[]` here instead would make that decision for every caller, and one that
 * certifies a corpus would certify an absent one as empty.
 *
 * ONLY `ENOENT`. A `features` path that exists but is a FILE, or one the process may not read, is
 * a different fault and is not ours to reinterpret — it rethrows.
 *
 * A SUPPLIED `--features` never reaches here absent: `checkInputsExist` refuses it at the CLI edge
 * with exit 2. Supplied-but-absent is the operator mistyping; absent-by-default is
 * the target's honest shape.
 */
function corpusFileNames(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new MissingFeatureCorpusError(dir);
    throw err;
  }
}

/**
 * A feature file's text. A read the operating system refuses keeps its error, and gains the file's
 * path when it has none: reading a directory fails with no path at all.
 */
function readFeatureSource(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    const errno = err as NodeJS.ErrnoException;
    errno.path ??= path;
    throw err;
  }
}

/**
 * Discover every feature file on disk and its header code — REFUSING a corpus the Gherkin
 * parser rejects.
 *
 * The refusal lives HERE, in the one reader every corpus consumer already goes through, so a
 * consumer INHERITS it rather than restating it. It is not a second parser: it is the existing
 * `parseErrorsIn` — cucumber's own — reached from the shared discovery instead of only from the
 * balance CLI's edge. One answer to "what is a feature file".
 *
 * WHY THE WHOLE CORPUS, NOT THE FIRST BAD FILE. `featureCorpusParseErrors` reports every
 * unreadable file and the balance CLI prints them all. Refusing at the first
 * failure would silently narrow that message, so every file is parsed and the refusal is raised
 * once, carrying the lot in discovery order.
 *
 * And NO PARTIAL CORPUS is ever returned: a caller that could scan the readable half of a
 * rejected tree would be back to reporting a verdict over a corpus it cannot read.
 */
export function discoverFeatures(dir: string = featuresDir()): DiscoveredFeature[] {
  const files = corpusFileNames(dir)
    .filter((name) => name.endsWith(".feature"))
    .sort()
    .map((name) => {
      const path = join(dir, name);
      return { name, path, source: readFeatureSource(path) };
    });

  const parseErrors = files.flatMap(({ path, source }) => parseErrorsIn(path, source));
  if (parseErrors.length > 0) throw new UnreadableFeatureCorpusError(parseErrors);

  return files.map(({ name, path, source }) => ({
    slug: name.replace(/\.feature$/, ""),
    path,
    featureCode: extractFeatureCode(source),
  }));
}
