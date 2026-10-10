import { afterAll, afterEach, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { walkTree } from "./readTree.js";
import { taken, withholdDirectory as withhold } from "./repository.testkit.js";
import { thrownBy } from "./answered.testkit.js";

afterEach(() => {
  while (taken.length > 0) taken.pop()?.();
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const made: string[] = [];

function tree(): string {
  const root = mkdtempSync(join(tmpdir(), "allocate-walk-"));
  made.push(root);
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "docs", "notes.md"), "Cites SCN-ONE-004.\n");
  return root;
}

describe("[SCN-ALC-018] a path allocate is not permitted to read is refused, naming the path and saying it was not permitted", () => {
  it("refuses a file in the tree it may not read, naming it", () => {
    const root = tree();
    const file = join(root, "docs", "notes.md");
    withhold(file, 0o000);
    expect(thrownBy(() => walkTree(root, "ONE"))).toMatchObject({ name: "UnreadableInput", subject: "a file in the tree", path: file });
  });

  it("still reads a tree it may read", () => {
    expect(walkTree(tree(), "ONE").map((sighting) => sighting.path)).toEqual(["docs/notes.md"]);
  });
});
