import { afterEach, describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { walkTree } from "./readTree.js";
import { taken, withholdDirectory as withhold } from "./repository.test-utils.js";
import { thrownBy } from "./answered.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
});

function tree(): string {
  const root = temporaryDirectory("allocate-walk-");
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "docs", "notes.md"), "Cites CLM-ONE-004.\n");
  return root;
}

describe("[CLM-ALC-018] a path allocate is not permitted to read is refused, naming the path and saying it was not permitted", () => {
  it("refuses a file in the tree it may not read, naming it", () => {
    const root = tree();
    const file = join(root, "docs", "notes.md");
    withhold(file, 0o000);
    expect(thrownBy(() => walkTree(root, "ONE"))).toMatchObject({ name: "UnreadableInput", subject: "a file in the tree", path: file });
  });

  it("still reads a tree it may read", () => {
    expect(walkTree(tree(), "ONE").map((occurrence) => occurrence.path)).toEqual(["docs/notes.md"]);
  });
});
