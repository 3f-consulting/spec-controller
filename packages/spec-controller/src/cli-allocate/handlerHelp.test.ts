import { afterEach, describe, expect, it, vi } from "vitest";
import { allocateCommand, renderCommandHelp } from "../cliRegistry.js";
import { repositoryHeadedOneCarrying003 } from "./repository.test-utils.js";
import { allocateIn } from "./answered.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

const HELP_REQUEST: readonly (readonly [request: string, argv: string[]])[] = [
  ["alone", ["--help"]],
  ["by its short name, alone", ["-h"]],
  ["after a part", ["ONE", "--help"]],
  ["after a part not in the scenario-code form", ["fit", "--help"]],
  ["beside a flag the command does not take", ["--bogus", "--help"]],
];

describe("[SCN-ALC-013] allocate --help answers first, listing <FFF> and --new, and exits 0 whatever else is given", () => {
  it.each(HELP_REQUEST)("answers with allocate's help and gives no code, asked %s", (_request, argv) => {
    const answered = allocateIn(repositoryHeadedOneCarrying003("allocate-help-"), argv);

    expect(answered.stdout).toBe(renderCommandHelp(allocateCommand) + "\n");
    expect(answered.stdout).toContain("<FFF>");
    expect(answered.stdout).toContain("--new");
    expect(answered.stdout).not.toMatch(/^SCN-/m);
    expect(answered.stderr).toBe("");
    expect(answered.exitCode).toBeUndefined();
  });
});
