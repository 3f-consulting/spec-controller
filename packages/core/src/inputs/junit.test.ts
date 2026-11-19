import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resultsBySuiteFrom, whereSuitesBreak, whyXmlDoesNotParse } from "./junit.js";

// Each JUnit evidence report a JUnit writer wrote, copied from that writer's own repository.
const COPIES = [
  ["maven-surefire", "TEST-org.acme.FlakyTest.xml"],
  ["maven-surefire", "TEST-org.apache.maven.surefire.test.FailingTest.xml"],
  ["maven-surefire", "TEST-surefire.MyTest-enclosed-trimStackTrace.xml"],
  ["maven-surefire", "TEST-surefire.MyTest-enclosed.xml"],
  ["maven-surefire", "TEST-surefire.MyTest-nestedClass-trimStackTrace.xml"],
  ["maven-surefire", "TEST-surefire.MyTest-nestedClass.xml"],
  ["maven-surefire", "TEST-surefire.MyTest.xml"],
  ["gradle", "can-generate-with-output-per-test.xml"],
  ["gradle", "class-display-name-com-foo-footest.xml"],
  ["gradle", "class-display-name-custom-display-name.xml"],
  ["gradle", "omit-system-err-and-system-out-sections.xml"],
  ["gradle", "omit-system-err-section.xml"],
  ["gradle", "omit-system-out-section.xml"],
  ["gradle", "show-system-err-and-system-out-sections.xml"],
  ["gradle", "writes-file-attachments-into-xml-when-sysout-is-disabled.xml"],
  ["gradle", "writes-file-attachments-into-xml.xml"],
  ["gradle", "writes-properties-into-xml.xml"],
  ["gradle", "writes-results-with-empty-outputs.xml"],
  ["gradle", "writes-results-with-no-tests.xml"],
  ["gradle", "writes-xml-junit-result.xml"],
  ["gotestsum", "junitxml-report-hide-skipped-tests.xml"],
  ["gotestsum", "junitxml-report-skip-empty.xml"],
  ["gotestsum", "junitxml-report-tc-with-attributes.xml"],
  ["gotestsum", "junitxml-report.xml"],
  ["go-junit-report", "001-report.xml"],
  ["go-junit-report", "005-report.xml"],
  ["go-junit-report", "007-report.xml"],
  ["go-junit-report", "008-report.xml"],
  ["go-junit-report", "009-report.xml"],
  ["go-junit-report", "010-report.xml"],
  ["go-junit-report", "011-report.xml"],
  ["go-junit-report", "012-report.xml"],
  ["go-junit-report", "013-report.xml"],
  ["go-junit-report", "014-report.xml"],
  ["go-junit-report", "015-report.xml"],
  ["go-junit-report", "016-report.xml"],
  ["go-junit-report", "017-report.xml"],
  ["go-junit-report", "018-report.xml"],
  ["go-junit-report", "019-report.xml"],
  ["go-junit-report", "021-report.xml"],
  ["go-junit-report", "022-report.xml"],
  ["go-junit-report", "023-report.xml"],
  ["go-junit-report", "024-report.xml"],
  ["go-junit-report", "025-report.xml"],
  ["go-junit-report", "026-report.xml"],
  ["go-junit-report", "027-report.xml"],
  ["go-junit-report", "028-report.xml"],
  ["go-junit-report", "029-report.xml"],
  ["go-junit-report", "030-report.xml"],
  ["go-junit-report", "031-report.xml"],
  ["go-junit-report", "032-report.xml"],
  ["go-junit-report", "033-report.xml"],
  ["go-junit-report", "034-report.xml"],
  ["go-junit-report", "035-report.xml"],
  ["go-junit-report", "036-report.xml"],
  ["go-junit-report", "037-report.xml"],
  ["go-junit-report", "038-report.xml"],
  ["go-junit-report", "039-report.xml"],
  ["go-junit-report", "100-report.xml"],
  ["go-junit-report", "101-report.xml"],
  ["go-junit-report", "102-report.xml"],
  ["go-junit-report", "103-report.xml"],
  ["go-junit-report", "104-report.xml"],
  ["go-junit-report", "105-report.xml"],
  ["go-junit-report", "106-report.xml"],
  ["go-junit-report", "107-report.xml"],
  ["go-junit-report", "108-report.xml"],
  ["go-junit-report", "109-report.xml"],
  ["go-junit-report", "110-report.xml"],
  ["go-junit-report", "111-report.xml"],
  ["go-junit-report", "112-report.xml"],
  ["go-junit-report", "113-report.xml"],
] as const;

const copyAt = (writer: string, name: string): URL => new URL(`./real-reports/${writer}/${name}`, import.meta.url);

// A test case is written as an empty element or as one holding its outcome; one holding a skipped element did not run.
const testCasesNotSkippedIn = (xml: string): number =>
  [...xml.matchAll(/<testcase\b[^>]*?(?:\/>|>([\s\S]*?)<\/testcase>)/g)].filter(([, body]) => !body?.includes("<skipped")).length;

describe("a well-formed JUnit evidence report will be read, not refused", () => {
  it.each(COPIES)("[CLM-CLI-194] a JUnit evidence report %s wrote, %s, parses, is not broken, and posts a result for each test case it did not skip", (writer, name) => {
    const xml = readFileSync(copyAt(writer, name), "utf8");

    expect(whyXmlDoesNotParse(xml)).toBeUndefined();
    expect(whereSuitesBreak(xml)).toBeUndefined();
    expect(resultsBySuiteFrom(xml, "junit")).toHaveLength(testCasesNotSkippedIn(xml));
  });

  it.each(["maven-surefire", "gradle", "gotestsum", "go-junit-report"])("[CLM-CLI-194] every JUnit evidence report copied from %s is read", (writer) => {
    const copied = readdirSync(copyAt(writer, "")).filter((name) => name.endsWith(".xml")).sort();

    expect(COPIES.filter(([from]) => from === writer).map(([, name]) => name).sort()).toEqual(copied);
  });
});
