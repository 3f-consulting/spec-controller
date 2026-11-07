import { describe, it, expect } from "vitest";
import { parseRspecEvidenceObservations, type RspecJsonReport } from "./rspec.js";

describe("[CLM-RSP-003] parseRspecEvidenceObservations reads an example's own code before its groups' codes", () => {
  const claimCodeOf = (description: string, full_description: string) => {
    const report: RspecJsonReport = {
      examples: [{ description, full_description, status: "passed", file_path: "./spec/a_spec.rb" }],
    };
    return parseRspecEvidenceObservations(report)[0]?.claimCode;
  };

  it("credits the example's own code inside a group that cites another", () => {
    expect(claimCodeOf("[CLM-AAA-002] leaf", "[CLM-AAA-001] group [CLM-AAA-002] leaf")).toBe("CLM-AAA-002");
  });

  it("credits the group's code to an example whose own description cites nothing", () => {
    expect(claimCodeOf("leaf", "[CLM-AAA-001] group leaf")).toBe("CLM-AAA-001");
  });

  it("reads two citing groups' codes together, so an example citing nothing inside both credits neither", () => {
    expect(claimCodeOf("leaf", "[CLM-AAA-001] outer [CLM-AAA-002] inner leaf")).toBeNull();
  });

  it("credits nothing to an example citing nothing inside groups citing nothing", () => {
    expect(claimCodeOf("leaf", "group leaf")).toBeNull();
  });
});

describe("[CLM-RSP-004] parseRspecEvidenceObservations credits neither code an example's description cites when it cites two", () => {
  const observationOf = (description: string, full_description: string) => {
    const report: RspecJsonReport = {
      examples: [{ description, full_description, status: "passed", file_path: "./spec/a_spec.rb" }],
    };
    return parseRspecEvidenceObservations(report)[0];
  };

  it("posts one observation citing no scenario, with a note of both codes", () => {
    expect(observationOf("[CLM-AAA-001] [CLM-AAA-002] two", "group [CLM-AAA-001] [CLM-AAA-002] two")).toEqual({
      qualityCheckKind: "unit",
      claimCode: null,
      status: "passed",
      locator: "spec/a_spec.rb",
      testName: "group [CLM-AAA-001] [CLM-AAA-002] two",
      notes: [{ kind: "several-claim-codes", codes: ["CLM-AAA-001", "CLM-AAA-002"] }],
    });
  });

  it("reads two groups' codes by the same rule when the example cites none", () => {
    expect(observationOf("leaf", "[CLM-AAA-001] outer [CLM-AAA-002] inner leaf")).toMatchObject({
      claimCode: null,
      notes: [{ kind: "several-claim-codes", codes: ["CLM-AAA-001", "CLM-AAA-002"] }],
    });
  });

  it.each([
    ["one code", "[CLM-AAA-001] one"],
    ["one code repeated", "[CLM-AAA-001] once [CLM-AAA-001] again"],
  ])("CONTROL: a description with %s credits it, with no note", (_, description) => {
    const observation = observationOf(description, `group ${description}`);
    expect(observation).toMatchObject({ claimCode: "CLM-AAA-001" });
    expect(observation).not.toHaveProperty("notes");
  });
});

describe("[CLM-RSP-005] parseRspecEvidenceObservations posts nothing for an example that did not run", () => {
  const observationsOf = (status: string) =>
    parseRspecEvidenceObservations({
      examples: [{ description: "[CLM-AAA-001] leaf", full_description: "group [CLM-AAA-001] leaf", status, file_path: "./spec/a_spec.rb" }],
    });

  it("posts no observation for a pending example", () => {
    expect(observationsOf("pending")).toEqual([]);
  });

  it.each(["passed", "failed"])("CONTROL: posts one observation for a %s example", (status) => {
    expect(observationsOf(status)).toMatchObject([{ claimCode: "CLM-AAA-001", status }]);
  });
});

describe("[CLM-RSP-006] parseRspecEvidenceObservations posts a failing observation for a pending example that passes", () => {
  it("posts the failed status RSpec writes for a pending example whose body passed", () => {
    const fixedPending = {
      description: "[CLM-AAA-001] leaf",
      full_description: "group [CLM-AAA-001] leaf",
      status: "failed",
      file_path: "./spec/a_spec.rb",
      pending_message: "not yet",
    };

    expect(parseRspecEvidenceObservations({ examples: [fixedPending] })).toEqual([{
      qualityCheckKind: "unit",
      claimCode: "CLM-AAA-001",
      status: "failed",
      locator: "spec/a_spec.rb",
      testName: "group [CLM-AAA-001] leaf",
    }]);
  });
});

describe("[CLM-RSP-007] parseRspecEvidenceObservations posts a failing observation for an example a failing before hook stopped", () => {
  it.each([
    ["before", "the resource could not be set up", 8],
    ["before(:context)", "the shared resource could not be set up", 3],
  ])("posts the failed status RSpec writes for an example whose %s hook raised", (_, message, hookLine) => {
    const stoppedByHook = {
      description: "[CLM-AAA-001] leaf",
      full_description: "group [CLM-AAA-001] leaf",
      status: "failed",
      file_path: "./spec/a_spec.rb",
      line_number: 10,
      exception: { class: "RuntimeError", message, backtrace: [`./spec/a_spec.rb:${hookLine}:in 'block (2 levels) in <top (required)>'`] },
    };

    expect(parseRspecEvidenceObservations({ examples: [stoppedByHook] })).toEqual([{
      qualityCheckKind: "unit",
      claimCode: "CLM-AAA-001",
      status: "failed",
      locator: "spec/a_spec.rb",
      testName: "group [CLM-AAA-001] leaf",
    }]);
  });
});

describe("[CLM-RSP-008] parseRspecEvidenceObservations posts a broken item for a spec file that failed to load", () => {
  const syntaxError = "\nWhile loading ./spec/unloadable_spec.rb a `raise SyntaxError` occurred, RSpec will now quit.\nFailure/Error: __send__(method, file)\n";
  const raisedWhileLoading = "\nAn error occurred while loading ./spec/raising_spec.rb.\nFailure/Error: raise \"no\"\n";
  const passing = { description: "[CLM-AAA-001] leaf", full_description: "group [CLM-AAA-001] leaf", status: "passed", file_path: "./spec/a_spec.rb" };

  it.each([
    ["a syntax error", syntaxError, "spec/unloadable_spec.rb"],
    ["an error raised while loading", raisedWhileLoading, "spec/raising_spec.rb"],
  ])("posts one broken item citing no scenario for a file that failed to load with %s, located at that file, carrying RSpec's message", (_, message, locator) => {
    const report: RspecJsonReport = { examples: [], summary: { errors_outside_of_examples_count: 1 }, messages: [message] };

    expect(parseRspecEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "unit", claimCode: null, status: "failed", locator, broken: true, message },
    ]);
  });

  it("relativises the broken item's locator to the run root, as it does every example's", () => {
    const report: RspecJsonReport = {
      examples: [],
      summary: { errors_outside_of_examples_count: 1 },
      messages: ["\nAn error occurred while loading /r/spec/raising_spec.rb.\n"],
    };

    expect(parseRspecEvidenceObservations(report, "/r")[0]?.locator).toBe("spec/raising_spec.rb");
  });

  it("posts the broken item beside the observations of the examples other files ran", () => {
    const report: RspecJsonReport = { examples: [passing], summary: { errors_outside_of_examples_count: 1 }, messages: [syntaxError] };

    expect(parseRspecEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-AAA-001", status: "passed", locator: "spec/a_spec.rb", testName: "group [CLM-AAA-001] leaf" },
      { qualityCheckKind: "unit", claimCode: null, status: "failed", locator: "spec/unloadable_spec.rb", broken: true, message: syntaxError },
    ]);
  });

  it("posts one broken item for each file that failed to load", () => {
    const report: RspecJsonReport = { examples: [], summary: { errors_outside_of_examples_count: 2 }, messages: [syntaxError, raisedWhileLoading] };

    expect(parseRspecEvidenceObservations(report).map((o) => o.locator)).toEqual(["spec/unloadable_spec.rb", "spec/raising_spec.rb"]);
  });

  it("posts one more broken item for the run, holding the other messages, when RSpec counts more errors than files it names", () => {
    const suiteHook = "\nAn error occurred in a `before(:suite)` hook.\nFailure/Error: raise \"no\"\n";
    const report: RspecJsonReport = {
      examples: [],
      summary: { errors_outside_of_examples_count: 2 },
      messages: [syntaxError, suiteHook],
    };

    expect(parseRspecEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "unit", claimCode: null, status: "failed", locator: "spec/unloadable_spec.rb", broken: true, message: syntaxError },
      { qualityCheckKind: "unit", claimCode: null, status: "failed", broken: true, message: suiteHook },
    ]);
  });

  it("posts the run's extra broken item with no message when RSpec gives none beside the files it names", () => {
    const report: RspecJsonReport = { examples: [], summary: { errors_outside_of_examples_count: 2 }, messages: [syntaxError] };

    const observations = parseRspecEvidenceObservations(report);

    expect(observations).toEqual([
      { qualityCheckKind: "unit", claimCode: null, status: "failed", locator: "spec/unloadable_spec.rb", broken: true, message: syntaxError },
      { qualityCheckKind: "unit", claimCode: null, status: "failed", broken: true, message: undefined },
    ]);
    expect(observations[1]?.message).toBeUndefined();
  });

  it("posts the run's extra broken item with every other message, each on its own line, when RSpec gives several", () => {
    const hookA = "\nAn error occurred in a `before(:suite)` hook.\nFailure/Error: raise \"a\"\n";
    const hookB = "\nAn error occurred in an `after(:suite)` hook.\nFailure/Error: raise \"b\"\n";
    const report: RspecJsonReport = {
      examples: [],
      summary: { errors_outside_of_examples_count: 3 },
      messages: [syntaxError, hookA, hookB],
    };

    expect(parseRspecEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "unit", claimCode: null, status: "failed", locator: "spec/unloadable_spec.rb", broken: true, message: syntaxError },
      { qualityCheckKind: "unit", claimCode: null, status: "failed", broken: true, message: hookA + "\n" + hookB },
    ]);
  });

  it.each([
    ["an empty run's message", { examples: [], summary: { errors_outside_of_examples_count: 0 }, messages: ["No examples found."] }],
    ["a summary with no count", { examples: [], summary: {}, messages: ["No examples found."] }],
    ["a report with no summary", { examples: [] }],
  ])("CONTROL: posts nothing for %s", (_, report: RspecJsonReport) => {
    expect(parseRspecEvidenceObservations(report)).toEqual([]);
  });
});
