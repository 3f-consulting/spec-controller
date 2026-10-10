import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readHeaderCodes } from "./readParts.js";

const made: string[] = [];

function freshDirectory(): string {
  const dir = mkdtempSync(join(tmpdir(), "allocate-parts-"));
  made.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-ALC-017] a path allocate reads that is not the kind it reads is refused, naming the path", () => {

  it("still reads a missing features directory as no corpus", () => {
    expect(readHeaderCodes(join(freshDirectory(), "features"))).toEqual([]);
  });
});
