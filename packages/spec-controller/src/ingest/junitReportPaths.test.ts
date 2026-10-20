import { describe, it, expect } from "vitest";

import { junitReportPathsOf } from "./junitReportPaths.js";
import { readerOf } from "./ciPathReader.test-utils.js";

describe("[SCN-JAV-001] --junit names one JUnit XML report file or a directory of Surefire's reports", () => {
  it("resolves a directory to every report file Surefire wrote in it, in name order", () => {
    const reader = readerOf({ "target/surefire-reports": ["TEST-example.ZTest.xml", "TEST-example.ATest.xml"] }, []);

    expect(junitReportPathsOf("target/surefire-reports", reader)).toEqual([
      "target/surefire-reports/TEST-example.ATest.xml",
      "target/surefire-reports/TEST-example.ZTest.xml",
    ]);
  });

  it("ignores Surefire's text summaries and any other file in the directory rather than trying to parse them", () => {
    const reader = readerOf(
      { "reports": ["example.ATest.txt", "TEST-example.ATest.xml", "example.ATest-output.xml", "TEST-notes.txt"] },
      [],
    );

    expect(junitReportPathsOf("reports", reader)).toEqual(["reports/TEST-example.ATest.xml"]);
  });

  it("resolves a file to that file, whatever it is named", () => {
    expect(junitReportPathsOf("report.xml", readerOf({}, ["report.xml"]))).toEqual(["report.xml"]);
  });

  it("resolves an absent path to nothing", () => {
    expect(junitReportPathsOf("target/surefire-reports", readerOf({}, []))).toEqual([]);
  });
});
