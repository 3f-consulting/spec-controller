import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { readHeaderCodes } from "./readParts.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

function freshDirectory(): string {
  const dir = temporaryDirectory("allocate-parts-");
  return dir;
}

describe("[SCN-ALC-017] a path allocate reads that is not the kind it reads is refused, naming the path", () => {

  it("still reads a missing features directory as no corpus", () => {
    expect(readHeaderCodes(join(freshDirectory(), "features"))).toEqual([]);
  });
});
