/**
 * Ingest the target's feature files — the IMPURE reader that walks features/ on disk
 * and parses each file's feature code + scenario codes into DiscoveredFeature
 * records (split out of the old spec/featureCodes.ts). The pure per-source
 * parsers (extractFeatureCode / parseScenarioCodes) live here with their sole consumer;
 * the `scnId → feature-code` grammar helper is engine-side (packages/core/src/lib/
 * featureCode.ts); the duplicate-code lint is engine-side too since 3F-3313, as @SCN-STG-010 in
 * parse/corpusFaults.ts, and no longer a private check under tests/checks/.
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
  /** Every @SCN-<FFF>-<NNN> scenario code in the file, in order, duplicates kept. */
  scenarioCodes: string[];
}

/**
 * Read the Feature-level @<FFF> header tag from a feature file's source — the
 * first tag immediately preceding the `Feature:` keyword that is not an @SCN id
 * or a recognised evidence/routing tag. Returns null if absent.
 */
export function extractFeatureCode(source: string): string | null {
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith("Feature:")) {
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j]!.trim();
        if (prev === "") continue;
        if (!prev.startsWith("@")) break;
        const tags = prev.split(/\s+/).filter((t) => t.startsWith("@"));
        for (const tag of tags) {
          const bare = tag.slice(1);
          if (bare.startsWith("SCN-")) continue;
          if (["unit", "integration", "e2e", "performance", "smoke"].includes(bare)) continue;
          if (CODE_PATTERN.test(bare)) return bare;
        }
      }
      return null;
    }
  }
  return null;
}

/**
 * Parse every @SCN-<FFF>-<NNN> scenario code in a feature file's source, in
 * document order, duplicates preserved. Only genuine TAG LINES are scanned (a
 * line whose first non-blank character is `@` and whose every whitespace-
 * separated token is a tag) — prose that merely mentions a code is skipped.
 */
export function parseScenarioCodes(source: string): string[] {
  const codes: string[] = [];
  const codePattern = /^SCN-[A-Z0-9]+-\d+$/;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("@")) continue;
    const tokens = line.split(/\s+/);
    if (!tokens.every((t) => t.startsWith("@"))) continue;
    for (const token of tokens) {
      const bare = token.slice(1);
      if (codePattern.test(bare)) codes.push(bare);
    }
  }
  return codes;
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
 * List the corpus directory, REFUSING an absent one by name rather than by `ENOENT` (@SCN-CLI-017,
 * 3F-3345).
 *
 * Absence stays a REFUSAL AT THE READER — what changed is that it is typed, so a caller can decide.
 * `balance` opts in to reporting on a target that has no corpus (most targets have no `features/`
 * at all, and `new-client` is a supported adoption state); `tags` keeps refusing, unedited, because
 * a `MissingFeatureCorpusError` is still an `Error` and still lands in its generic catch. Returning
 * `[]` here instead would make that decision for both, and measured it turns two named refusals
 * into `tags: OK …` at exit 0.
 *
 * ONLY `ENOENT`. A `features` path that exists but is a FILE, or one the process may not read, is
 * a different fault and is not ours to reinterpret — it rethrows.
 *
 * A SUPPLIED `--features` never reaches here absent: `checkInputsExist` refuses it at the CLI edge
 * with exit 2 (@SCN-CLI-002). Supplied-but-absent is the operator mistyping; absent-by-default is
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
 * Discover every feature file on disk and its header code — REFUSING a corpus the Gherkin
 * parser rejects (@SCN-GPG-001, 3F-2817).
 *
 * The refusal lives HERE, in the one reader every corpus consumer already goes through, so a
 * consumer INHERITS it rather than restating it. It is not a second parser: it is the existing
 * `parseErrorsIn` — cucumber's own — reached from the shared discovery instead of only from the
 * balance CLI's edge. One answer to "what is a feature file".
 *
 * WHY THE WHOLE CORPUS, NOT THE FIRST BAD FILE. `featureCorpusParseErrors` reports every
 * unreadable file and the balance CLI prints them all (@SCN-CLI-016). Refusing at the first
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
      return { name, path, source: readFileSync(path, "utf8") };
    });

  const parseErrors = files.flatMap(({ path, source }) => parseErrorsIn(path, source));
  if (parseErrors.length > 0) throw new UnreadableFeatureCorpusError(parseErrors);

  return files.map(({ name, path, source }) => ({
    slug: name.replace(/\.feature$/, ""),
    path,
    featureCode: extractFeatureCode(source),
    scenarioCodes: parseScenarioCodes(source),
  }));
}
