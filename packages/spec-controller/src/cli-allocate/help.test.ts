import { describe, it, expect } from "vitest";
import { cliRegistry, renderCommandHelp } from "../cli-registry.js";

describe("[SCN-ALC-013] allocate --help answers first, listing <FFF> and --new", () => {
  const help = renderCommandHelp(cliRegistry, "allocate");

  it("shows how the command is called, with its feature part", () => {
    expect(help).toMatch(/^Usage: spec-controller allocate <FFF> \[options\]$/m);
  });

  it("names the feature part it takes, and what it is", () => {
    expect(help).toMatch(/^ {2}<FFF>\s+The feature part: a feature file's header code/m);
  });

  it("lists --new and --help among its options", () => {
    expect(help).toMatch(/^ {2}--new\s+Start a part/m);
    expect(help).toMatch(/^ {2}--help, -h\s+Show this help and exit\.$/m);
  });
});
