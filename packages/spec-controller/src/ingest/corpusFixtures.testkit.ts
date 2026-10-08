import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discoverFeatures } from "./ingestScenarios.js";

// Each test file passes its own list of made directories and removes them in its own hook.
export function temporaryDirectoryIn(made: string[]): (prefix: string) => string {
  return function temporaryDirectory(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    made.push(dir);
    return dir;
  };
}

export function discover(dir: string): { returned: unknown; thrown: unknown } {
  let returned: unknown;
  let thrown: unknown;
  try {
    returned = discoverFeatures(dir);
  } catch (err) {
    thrown = err;
  }
  return { returned, thrown };
}

export const CORPUS_DIR = "features";

export interface Shape {
  shape: string;
  build: (root: string) => void;
}

export const EMPTY_CORPUS: Shape = {
  shape: "an empty corpus",
  build: (root) => mkdirSync(join(root, CORPUS_DIR)),
};

export function targetMaker(made: string[]): (shape: Shape) => string {
  return function targetFor({ build }: Shape): string {
    const root = mkdtempSync(join(tmpdir(), `scn-cli-018-${process.pid}-`));
    made.push(root);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "new-client-target", scripts: {} })
    );
    build(root);
    return root;
  };
}
