import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { checkUnknownFlags } from "./cli-args.js";

const REFUSING_TOOL_VERSION = "9.9.9-test";

const MEASUREMENTS_RETIRED_IN = "0.1.0-alpha.5";

describe("[SCN-CLI-023] checkUnknownFlags refuses a flag balance has retired as retired, offering no pin", () => {
  const refusal = checkUnknownFlags({ measurements: "x.json" }, cliRegistry, "balance", REFUSING_TOOL_VERSION);

  it("refuses the flag, naming it as retired with the version that retired it", () => {
    expect(refusal).not.toBeNull();
    expect(refusal).toContain("--measurements");
    expect(refusal).toMatch(/retired/i);
    expect(refusal).toContain(MEASUREMENTS_RETIRED_IN);
  });

  it("names what replaced it: the check's own CI step outcome, read through --ci-steps", () => {
    expect(refusal).toContain("--ci-steps");
    expect(refusal).toMatch(/outcome/i);
  });

  it("advises no pin toward a version that still accepts the flag", () => {
    expect(refusal).not.toMatch(/bump the pin/i);
    expect(refusal).not.toMatch(/accepts --measurements/);
  });

  it("leaves the drift advice on a flag that is merely unregistered", () => {
    const unregistered = checkUnknownFlags({ bogus: "true" }, cliRegistry, "balance", REFUSING_TOOL_VERSION);
    expect(unregistered).toMatch(/bump the pin/i);
    expect(unregistered).not.toMatch(/retired/i);
  });
});
