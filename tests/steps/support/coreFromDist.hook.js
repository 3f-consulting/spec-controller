import { pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const coreDist = join(repoRoot, "packages", "core", "dist");

const PUBLISHED_RESOLUTION = new Map([
  ["@3f-consulting/spec-controller-core", pathToFileURL(join(coreDist, "index.js")).href],
  ["@3f-consulting/spec-controller-core/internal", pathToFileURL(join(coreDist, "internal.js")).href],
]);

export function resolve_(specifier, context, nextResolve) {
  const published = PUBLISHED_RESOLUTION.get(specifier);
  if (published !== undefined) return { url: published, format: "module", shortCircuit: true };
  return nextResolve(specifier, context);
}

export { resolve_ as resolve };
