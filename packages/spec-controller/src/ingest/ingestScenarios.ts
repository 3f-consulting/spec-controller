import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  MissingFeatureCorpusError,
  UnreadableFeatureCorpusError,
  parseErrorsIn,
} from "./gherkinValidation.js";

const CODE_PATTERN = /^[A-Z0-9]{2,5}$/;

export interface DiscoveredFeature {
  slug: string;
  path: string;
  featureCode: string | null;
}

export function extractFeatureCode(source: string): string | null {
  const lines = source.split(/\r?\n/);
  const featureLine = lines.findIndex((line) => line.trim().startsWith("Feature:"));
  if (featureLine < 0) return null;
  return headerTagsAbove(lines, featureLine).find(isHeaderCode) ?? null;
}

const NON_CODE_TAGS = ["unit", "integration", "e2e", "performance", "smoke"];

function isHeaderCode(bare: string): boolean {
  return !bare.startsWith("SCN-") && !NON_CODE_TAGS.includes(bare) && CODE_PATTERN.test(bare);
}

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

function featuresDir(): string {
  return join(process.cwd(), "features");
}

function corpusFileNames(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new MissingFeatureCorpusError(dir);
    throw err;
  }
}

function readFeatureSource(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    const errno = err as NodeJS.ErrnoException;
    errno.path ??= path;
    throw err;
  }
}

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
