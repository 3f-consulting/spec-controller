import { describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readHeaderCodes } from "./readParts.js";

/** What `read` throws, or a failure when it reads without throwing. */
function thrownBy(read: () => unknown): unknown {
  try {
    read();
  } catch (err) {
    return err;
  }
  throw new Error("expected the read to be refused, and it read");
}

/** A features directory holding one feature file headed ONE. */
function corpus(): string {
  const dir = join(mkdtempSync(join(tmpdir(), "allocate-parts-")), "features");
  mkdirSync(dir);
  writeFileSync(join(dir, "one.feature"), "@ONE\nFeature: one\n");
  return dir;
}

describe("[SCN-ALC-017] a path allocate reads that is not the kind it reads is refused, naming the path", () => {
  it("refuses a features path that is a regular file, naming it", () => {
    const path = join(mkdtempSync(join(tmpdir(), "allocate-parts-")), "features");
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
    expect(readHeaderCodes(join(mkdtempSync(join(tmpdir(), "allocate-parts-")), "features"))).toEqual([]);
  });

  it("reads the header codes of a readable corpus", () => {
    expect(readHeaderCodes(corpus())).toEqual(["ONE"]);
  });
});
