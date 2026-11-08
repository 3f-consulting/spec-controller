import { describe, it, expect } from "vitest";
import { parseJunitEvidenceObservations, parsePytestEvidenceObservations, type JunitXmlReport } from "./junit.js";
import { remarkWordsOf } from "../render/remarkWords.js";

describe("[CLM-PYT-001] parsePytestEvidenceObservations posts a passing testcase to the scenario its clm property cites", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "tests.test_widget",
              name: "test_the_widget_turns",
              properties: { property: [{ name: "clm", value: "CLM-FOO-001" }] },
            },
          ],
        },
      ],
    },
  };

  it("emits one passed unit observation citing that code, located at the test", () => {
    expect(parsePytestEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-FOO-001", status: "passed", locator: "tests.test_widget::test_the_widget_turns" },
    ]);
  });
});

describe("[CLM-PYT-002] parsePytestEvidenceObservations posts a failing testcase to the scenario its clm property cites", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "tests.test_widget",
              name: "test_the_widget_jams",
              properties: { property: [{ name: "clm", value: "CLM-FOO-002" }] },
              failure: { message: "assert 1 == 2" },
            },
          ],
        },
      ],
    },
  };

  it("emits one failed unit observation citing that code, located at the test", () => {
    expect(parsePytestEvidenceObservations(report)).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-FOO-002", status: "failed", locator: "tests.test_widget::test_the_widget_jams" },
    ]);
  });
});

describe("[CLM-PYT-003] parsePytestEvidenceObservations posts nothing for a skipped testcase", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "tests.test_widget",
              name: "test_the_widget_is_not_built_yet",
              properties: { property: [{ name: "clm", value: "CLM-FOO-003" }] },
              skipped: { message: "the behaviour is not built yet" },
            },
          ],
        },
      ],
    },
  };

  it("emits no observation for a skipped testcase, though it cites a scenario", () => {
    expect(parsePytestEvidenceObservations(report)).toEqual([]);
  });
});

describe("[CLM-PYT-005] parsePytestEvidenceObservations posts a testcase with no clm property as a passed observation citing no scenario", () => {
  const reportOf = (properties?: { property: { name: string; value: string }[] }): JunitXmlReport => ({
    testsuites: {
      testsuite: [
        {
          testcase: [{ classname: "tests.test_widget", name: "test_the_widget_spins", ...(properties ? { properties } : {}) }],
        },
      ],
    },
  });

  it("emits one unit observation citing no scenario for a testcase with no clm property", () => {
    expect(parsePytestEvidenceObservations(reportOf())).toEqual([
      { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "tests.test_widget::test_the_widget_spins" },
    ]);
  });

  it("emits one unit observation citing no scenario for a clm property whose value is not a claim code", () => {
    expect(
      parsePytestEvidenceObservations(reportOf({ property: [{ name: "clm", value: "FOO-005" }] }))
    ).toEqual([
      { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "tests.test_widget::test_the_widget_spins" },
    ]);
  });

  it("emits one unit observation citing no scenario for a testcase whose only property of another name holds a claim code", () => {
    expect(
      parsePytestEvidenceObservations(reportOf({ property: [{ name: "owner", value: "CLM-PYT-001" }] }))
    ).toEqual([
      { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "tests.test_widget::test_the_widget_spins" },
    ]);
  });
});

describe("[CLM-PYT-006] parsePytestEvidenceObservations credits no scenario for a testcase carrying two clm properties", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "tests.test_widget",
              name: "test_the_widget_spins_and_turns",
              properties: {
                property: [
                  { name: "clm", value: "CLM-FOO-004" },
                  { name: "clm", value: "CLM-FOO-005" },
                ],
              },
            },
          ],
        },
      ],
    },
  };

  it("emits one unit observation citing no scenario, with a note of both codes and no message", () => {
    expect(parsePytestEvidenceObservations(report)).toEqual([
      {
        qualityCheckKind: "unit",
        claimCode: null,
        status: "passed",
        locator: "tests.test_widget::test_the_widget_spins_and_turns",
        notes: [{ kind: "several-claim-codes", codes: ["CLM-FOO-004", "CLM-FOO-005"] }],
      },
    ]);
  });

  it("words its note as every reader words it, in claim codes rather than clm properties", () => {
    const [observation] = parsePytestEvidenceObservations(report);

    expect(remarkWordsOf(observation ?? {})).toContain("2 claim codes cite CLM-FOO-004, CLM-FOO-005");
  });

  it("credits the scenario when the one code is carried twice", () => {
    const repeated: JunitXmlReport = {
      testsuites: {
        testsuite: [
          {
            testcase: [
              {
                classname: "tests.test_widget",
                name: "test_the_widget_spins",
                properties: {
                  property: [
                    { name: "clm", value: "CLM-FOO-004" },
                    { name: "clm", value: "CLM-FOO-004" },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    expect(parsePytestEvidenceObservations(repeated)).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-FOO-004", status: "passed", locator: "tests.test_widget::test_the_widget_spins" },
    ]);
  });
});

describe("[CLM-PYT-007] parsePytestEvidenceObservations posts a collection failure as broken evidence citing no scenario", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "",
              name: "test_widget",
              error: {
                message: "collection failure",
                "#text": "E   ModuleNotFoundError: No module named 'widget'",
              },
            },
          ],
        },
      ],
    },
  };

  it("emits one broken unit observation citing no scenario, located at the module, carrying the error text", () => {
    expect(parsePytestEvidenceObservations(report)).toEqual([
      {
        qualityCheckKind: "unit",
        claimCode: null,
        status: "failed",
        locator: "test_widget",
        broken: true,
        message: "E   ModuleNotFoundError: No module named 'widget'",
      },
    ]);
  });
});

describe("[CLM-PYT-008] parsePytestEvidenceObservations posts a test whose setup errored as broken evidence citing its scenario", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "tests.test_widget",
              name: "test_the_widget_needs_a_resource",
              properties: { property: [{ name: "clm", value: "CLM-FOO-008" }] },
              error: {
                message: 'failed on setup with "RuntimeError: no resource"',
                "#text": "E       RuntimeError: no resource",
              },
            },
          ],
        },
      ],
    },
  };

  it("emits one broken unit observation citing that code, located at the test, carrying the error text", () => {
    expect(parsePytestEvidenceObservations(report)).toEqual([
      {
        qualityCheckKind: "unit",
        claimCode: "CLM-FOO-008",
        status: "failed",
        locator: "tests.test_widget::test_the_widget_needs_a_resource",
        broken: true,
        message: "E       RuntimeError: no resource",
      },
    ]);
  });
});

describe("[CLM-GOT-007] parseJunitEvidenceObservations posts a Go package that failed to compile as broken evidence naming the package", () => {
  type Testcase = NonNullable<NonNullable<NonNullable<JunitXmlReport["testsuites"]>["testsuite"]>[number]["testcase"]>[number];
  const observationsOf = (testcase: Testcase) =>
    parseJunitEvidenceObservations({ testsuites: { testsuite: [{ name: "example.com/m/broken", testcase: [testcase] }] } });

  it.each([
    ["with its failure's text read from the element", { "#text": "FAIL\texample.com/m/broken [build failed]" }],
    ["with its failure written as bare text", "FAIL\texample.com/m/broken [build failed]"],
  ])("reads gotestsum's build-failure row as broken, %s", (_how, failure) => {
    expect(observationsOf({ classname: "", name: "TestMain", failure })).toEqual([
      {
        qualityCheckKind: "unit",
        claimCode: null,
        status: "failed",
        locator: "example.com/m/broken",
        broken: true,
        message: "FAIL\texample.com/m/broken [build failed]",
      },
    ]);
  });

  it.each([
    ["a TestMain row in a package", { classname: "example.com/m/broken", name: "TestMain", failure: { "#text": "[build failed]" } }],
    ["a row with no package that is not TestMain", { classname: "", name: "TestOther", failure: { "#text": "[build failed]" } }],
    ["a failing TestMain row with no package whose build did not fail", { classname: "", name: "TestMain", failure: { "#text": "FAIL\texample.com/m/broken" } }],
    ["a passing TestMain row with no package", { classname: "", name: "TestMain" }],
  ])("reads %s as a test that ran, not as a build failure", (_what, testcase) => {
    expect(observationsOf(testcase)[0]?.broken).toBeUndefined();
  });
});

describe("[CLM-JAV-003] parseJunitEvidenceObservations reads a code in a JUnit 5 test's own display name before a code in its class's display name", () => {
  const classname = "[CLM-JVF-013] an outer class that cites a scenario";
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            { classname, name: "[CLM-JVF-003] a test whose own display name cites a scenario" },
            { classname, name: "a test in the outer class whose own display name cites nothing" },
          ],
        },
      ],
    },
  };

  it("credits a test that cites a code of its own to that code, and a test that cites none to its class's code", () => {
    expect(parseJunitEvidenceObservations(report)).toEqual([
      {
        qualityCheckKind: "unit",
        claimCode: "CLM-JVF-003",
        status: "passed",
        locator: `${classname}::[CLM-JVF-003] a test whose own display name cites a scenario`,
      },
      {
        qualityCheckKind: "unit",
        claimCode: "CLM-JVF-013",
        status: "passed",
        locator: `${classname}::a test in the outer class whose own display name cites nothing`,
      },
    ]);
  });
});

describe("[CLM-JAV-004] parseJunitEvidenceObservations credits a JUnit 5 test with no code of its own to the innermost class around it that cites one", () => {
  const observationOf = (classname: string) =>
    parseJunitEvidenceObservations({
      testsuites: { testsuite: [{ testcase: [{ classname, name: "a test whose own display name cites nothing" }] }] },
    })[0];

  it("credits a test in an inner class that cites a scenario to the inner class's code, not the outer class's", () => {
    const observation = observationOf(
      "[CLM-JVF-013] an outer class that cites a scenario [CLM-JVF-004] an inner class that cites a scenario"
    );
    expect(observation?.claimCode).toBe("CLM-JVF-004");
    expect(observation?.notes).toBeUndefined();
  });

  it("credits a test in an inner class that cites nothing to the outer class's code", () => {
    const observation = observationOf("[CLM-JVF-013] an outer class that cites a scenario an inner class that cites nothing");
    expect(observation?.claimCode).toBe("CLM-JVF-013");
  });
});

describe("[CLM-JAV-008] parseJunitEvidenceObservations posts a JUnit 5 test that throws as a failing observation citing its scenario", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "example.CitedTest",
              name: "[CLM-JVF-010] a test that throws cites its scenario",
              error: {
                message: "the resource could not be reached",
                "#text": "java.lang.IllegalStateException: the resource could not be reached",
              },
            },
          ],
        },
      ],
    },
  };

  it("emits one failing unit observation citing that code, located at the test, never broken", () => {
    expect(parseJunitEvidenceObservations(report)).toEqual([
      {
        qualityCheckKind: "unit",
        claimCode: "CLM-JVF-010",
        status: "failed",
        locator: "example.CitedTest::[CLM-JVF-010] a test that throws cites its scenario",
      },
    ]);
  });

  it("keeps the same testcase broken when it is read as a pytest report", () => {
    expect(parsePytestEvidenceObservations(report)[0]?.broken).toBe(true);
  });
});

describe("[CLM-JAV-009] parseJunitEvidenceObservations posts a JUnit 5 class whose setup before all its tests failed as broken evidence citing no scenario", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "[CLM-JVF-014] a class that cites a scenario",
              name: "",
              error: {
                message: "the shared resource could not be set up",
                "#text": "java.lang.IllegalStateException: the shared resource could not be set up",
              },
            },
          ],
        },
      ],
    },
  };

  it("emits one broken observation located at the class, carrying the error that stopped it", () => {
    expect(parseJunitEvidenceObservations(report)).toEqual([
      {
        qualityCheckKind: "unit",
        claimCode: null,
        status: "failed",
        locator: "[CLM-JVF-014] a class that cites a scenario",
        broken: true,
        message: "java.lang.IllegalStateException: the shared resource could not be set up",
      },
    ]);
  });
});
