import { afterAll, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readHeaderCodes } from "./readParts.js";
import { thrownBy } from "./answered.testkit.js";

const made: string[] = [];

function freshDirectory(): string {
  const dir = mkdtempSync(join(tmpdir(), "allocate-parts-"));
  made.push(dir);
  return dir;
}

function corpus(): string {
  const dir = join(freshDirectory(), "features");
  mkdirSync(dir);
  writeFileSync(join(dir, "one.feature"), "@ONE\nFeature: one\n");
  return dir;
}

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-017] a path allocate reads that is not the kind it reads is refused, naming the path", () => {
  it("refuses a features path that is a regular file, naming it", () => {
    const path = join(freshDirectory(), "features");
    writeFileSync(path, "not a directory\n");
    expect(thrownBy(() => readHeaderCodes(path))).toMatchObject({ name: "UnreadableInput", subject: "the feature corpus", path });
  });

  it("refuses a feature file that is a directory, naming it", () => {
    const dir = corpus();
    mkdirSync(join(dir, "two.feature"));
    expect(thrownBy(() => readHeaderCodes(dir))).toMatchObject({ name: "UnreadableInput", subject: "a feature file", path: join(dir, "two.feature") });
  });

  it("refuses a feature file that links to nothing, naming it", () => {
    const dir = corpus();
    symlinkSync(join(dir, "nowhere.feature"), join(dir, "two.feature"));
    expect(thrownBy(() => readHeaderCodes(dir))).toMatchObject({ name: "UnreadableInput", subject: "a feature file", path: join(dir, "two.feature") });
  });

  it("still reads a missing features directory as no corpus", () => {
    expect(readHeaderCodes(join(freshDirectory(), "features"))).toEqual([]);
  });

  it("reads the header codes of a readable corpus", () => {
    expect(readHeaderCodes(corpus())).toEqual(["ONE"]);
  });
});
