import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { FailureAsWritten, ResultInSuiteAsWritten, ResultsBySuiteAsWritten } from "../domain/postEvidenceObservation.js";

// A JUnit XML evidence report, as far as its reader reads it: suites, nested or not, each holding its test cases.
interface Element {
  readonly [name: string]: unknown;
}

const OUTCOMES = ["failure", "error", "skipped"] as const;

// Every value, an attribute's or a tag's text, is kept as the text it is written as. JUnit XML writes a suite's and a test
// case's name, and a property's value, always as text.
const VALUES_PARSED = false;

const parser = new XMLParser({
  ignoreAttributes: false,
  // Attributes keep a prefix so that none is read as a child element of the same name.
  attributeNamePrefix: "@",
  parseTagValue: VALUES_PARSED,
  parseAttributeValue: VALUES_PARSED,
  isArray: (name) => ["testsuite", "testcase", "property", ...OUTCOMES].includes(name),
});

const elementsIn = (element: Element, name: string): Element[] => (element[name] as Element[] | undefined) ?? [];

// An outcome element says what went wrong, or why the test was skipped, in its message attribute, if it has one.
function failureAsWritten(outcome: unknown): FailureAsWritten {
  const message = (outcome as Element)["@message"] as string | undefined;
  return message ? { message } : {};
}

function resultAsWritten(testCase: Element): ResultInSuiteAsWritten {
  const outcome = OUTCOMES.find((name) => testCase[name] !== undefined);
  const clmProperties = elementsIn((testCase["properties"] as Element | undefined) ?? {}, "property")
    .filter((property) => property["@name"] === "clm")
    .map((property) => property["@value"] as string);
  return {
    className: testCase["@classname"] as string | undefined,
    name: testCase["@name"] as string,
    clmProperties,
    // A test case with no outcome element is one that passed; its outcome is written as an empty string.
    outcome: outcome ?? "",
    ...(outcome && { failure: failureAsWritten((testCase[outcome] as unknown[])[0]) }),
  };
}

const suitesIn = (element: Element): Element[] => elementsIn(element, "testsuite").flatMap((suite) => [suite, ...suitesIn(suite)]);

export function whyXmlDoesNotParse(xml: string): string | undefined {
  const valid = XMLValidator.validate(xml);
  return valid === true ? undefined : `${valid.err.msg} (${valid.err.line}:${valid.err.col})`;
}

const suitesOf = (document: Element): Element[] => [...suitesIn(document), ...suitesIn((document["testsuites"] as Element | undefined) ?? {})];

// A JUnit report's top is a suite, or the suites element holding them, and each of its test cases has a name.
export const whereSuitesBreak = (xml: string): string | undefined => {
  const document = parser.parse(xml) as Element;
  if (document["testsuites"] === undefined && document["testsuite"] === undefined) return "$";
  const unnamed = suitesOf(document).some((suite) => elementsIn(suite, "testcase").some((testCase) => testCase["@name"] === undefined));
  return unnamed ? "$..testcase" : undefined;
};

export function resultsBySuiteFrom(xml: string, from: "junit" | "pytest"): ResultsBySuiteAsWritten[] {
  return suitesOf(parser.parse(xml) as Element).map((suite) => ({
    // pytest writes an error only for a test that never reached its assertions; JUnit writes one for a test that failed.
    errorMeansNeverRan: from === "pytest",
    name: suite["@name"] as string,
    results: elementsIn(suite, "testcase").map(resultAsWritten),
  }));
}
