import { describe, it, expect } from "vitest";
import { parsePytestEvidenceObservations, type JunitXmlReport } from "./pytest.js";
import { remarkWordsOf } from "../render/remarkWords.js";

describe("[SCN-PYT-001] parsePytestEvidenceObservations posts a passing testcase to the scenario its scn property cites", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "tests.test_widget",
              name: "test_the_widget_turns",
              properties: { property: [{ name: "scn", value: "SCN-FOO-001" }] },
            },
          ],
        },
      ],
    },
  };

  it("emits one passed unit observation citing that code, located at the test", () => {
    expect(parsePytestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-FOO-001", status: "passed", locator: "tests.test_widget::test_the_widget_turns" },
    ]);
  });
});

describe("[SCN-PYT-002] parsePytestEvidenceObservations posts a failing testcase to the scenario its scn property cites", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "tests.test_widget",
              name: "test_the_widget_jams",
              properties: { property: [{ name: "scn", value: "SCN-FOO-002" }] },
              failure: { message: "assert 1 == 2" },
            },
          ],
        },
      ],
    },
  };

  it("emits one failed unit observation citing that code, located at the test", () => {
    expect(parsePytestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-FOO-002", status: "failed", locator: "tests.test_widget::test_the_widget_jams" },
    ]);
  });
});

describe("[SCN-PYT-003] parsePytestEvidenceObservations posts nothing for a skipped testcase", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "tests.test_widget",
              name: "test_the_widget_is_not_built_yet",
              properties: { property: [{ name: "scn", value: "SCN-FOO-003" }] },
              skipped: { message: "the behaviour is not built yet" },
            },
          ],
        },
      ],
    },
  };

  it("emits no observation for a skipped testcase, though it cites a scenario", () => {
    expect(parsePytestEvidenceObservations(report, "unit")).toEqual([]);
  });
});

describe("[SCN-PYT-005] parsePytestEvidenceObservations posts a testcase that cites no scenario citing none", () => {
  const reportOf = (properties?: { property: { name: string; value: string }[] }): JunitXmlReport => ({
    testsuites: {
      testsuite: [
        {
          testcase: [{ classname: "tests.test_widget", name: "test_the_widget_spins", ...(properties ? { properties } : {}) }],
        },
      ],
    },
  });

  it("emits one unit observation citing no scenario for a testcase with no scn property", () => {
    expect(parsePytestEvidenceObservations(reportOf(), "unit")).toEqual([
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "tests.test_widget::test_the_widget_spins" },
    ]);
  });

  it("emits one unit observation citing no scenario for a scn property whose value is not a scenario code", () => {
    expect(
      parsePytestEvidenceObservations(reportOf({ property: [{ name: "scn", value: "FOO-005" }] }), "unit")
    ).toEqual([
      { qualityCheck: "unit", scnId: null, status: "passed", locator: "tests.test_widget::test_the_widget_spins" },
    ]);
  });
});

describe("[SCN-PYT-006] parsePytestEvidenceObservations credits no scenario for a testcase carrying two scn properties", () => {
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
                  { name: "scn", value: "SCN-FOO-004" },
                  { name: "scn", value: "SCN-FOO-005" },
                ],
              },
            },
          ],
        },
      ],
    },
  };

  it("emits one unit observation citing no scenario, with a note of both codes and no message", () => {
    expect(parsePytestEvidenceObservations(report, "unit")).toEqual([
      {
        qualityCheck: "unit",
        scnId: null,
        status: "passed",
        locator: "tests.test_widget::test_the_widget_spins_and_turns",
        notes: [{ kind: "several-scn-codes", codes: ["SCN-FOO-004", "SCN-FOO-005"] }],
      },
    ]);
  });

  it("words its note as every reader words it, in scenario codes rather than scn properties", () => {
    const [observation] = parsePytestEvidenceObservations(report, "unit");

    expect(remarkWordsOf(observation ?? {})).toContain("2 scenario codes cite SCN-FOO-004, SCN-FOO-005");
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
                    { name: "scn", value: "SCN-FOO-004" },
                    { name: "scn", value: "SCN-FOO-004" },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    expect(parsePytestEvidenceObservations(repeated, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-FOO-004", status: "passed", locator: "tests.test_widget::test_the_widget_spins" },
    ]);
  });
});

describe("[SCN-PYT-007] parsePytestEvidenceObservations posts a collection failure as broken evidence citing no scenario", () => {
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
    expect(parsePytestEvidenceObservations(report, "unit")).toEqual([
      {
        qualityCheck: "unit",
        scnId: null,
        status: "failed",
        locator: "test_widget",
        broken: true,
        message: "E   ModuleNotFoundError: No module named 'widget'",
      },
    ]);
  });
});

describe("[SCN-PYT-008] parsePytestEvidenceObservations posts a test whose setup errored as broken evidence citing its scenario", () => {
  const report: JunitXmlReport = {
    testsuites: {
      testsuite: [
        {
          testcase: [
            {
              classname: "tests.test_widget",
              name: "test_the_widget_needs_a_resource",
              properties: { property: [{ name: "scn", value: "SCN-FOO-008" }] },
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
    expect(parsePytestEvidenceObservations(report, "unit")).toEqual([
      {
        qualityCheck: "unit",
        scnId: "SCN-FOO-008",
        status: "failed",
        locator: "tests.test_widget::test_the_widget_needs_a_resource",
        broken: true,
        message: "E       RuntimeError: no resource",
      },
    ]);
  });
});
