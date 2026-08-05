/**
 * Ingest the target's feature files — the IMPURE reader that walks features/ on disk
 * and parses each file's feature code + scenario codes into DiscoveredFeature
 * records (split out of the old spec/featureCodes.ts). The pure per-source
 * parsers (extractFeatureCode / parseScenarioCodes) live here with their sole consumer;
 * the `scnId → feature-code` grammar helper is engine-side (packages/core/src/lib/
 * featureCode.ts); the duplicate-code lint is product-side (static-checks/featureCodes.ts).
 *
 * The foundation, folded into the @LDG runtime spine.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

/** Discover every feature file on disk and its header code. */
export function discoverFeatures(dir: string = featuresDir()): DiscoveredFeature[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".feature"))
    .sort()
    .map((name) => {
      const path = join(dir, name);
      const source = readFileSync(path, "utf8");
      return {
        slug: name.replace(/\.feature$/, ""),
        path,
        featureCode: extractFeatureCode(source),
        scenarioCodes: parseScenarioCodes(source),
      };
    });
}
