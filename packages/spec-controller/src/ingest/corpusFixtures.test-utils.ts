import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { corpusFeatureFiles } from "./ingestScenarios.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

export function discover(dir: string): { returned: unknown; thrown: unknown } {
  let returned: unknown;
  let thrown: unknown;
  try {
    returned = corpusFeatureFiles(dir);
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

function buildEmptyCorpus(root: string): void {
  mkdirSync(join(root, CORPUS_DIR));
}

export const EMPTY_CORPUS: Shape = {
  shape: "an empty corpus",
  build: buildEmptyCorpus,
};

export function targetIn({ build }: Shape): string {
  const root = temporaryDirectory(`scn-cli-018-${process.pid}-`);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "new-client-target", scripts: {} })
  );
  build(root);
  return root;
}
