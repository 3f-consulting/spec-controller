import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  ERRORS_BEFORE_ASSERTIONS,
  type FailureAsWritten,
  type ResultInSuiteAsWritten,
  type ResultsBySuiteAsWritten,
} from "../domain/postEvidenceObservation.js";

// A JUnit XML evidence report, as far as its reader reads it: suites, nested or not, each holding its test cases.
interface Element {
  readonly [name: string]: unknown;
}

const OUTCOMES = ["failure", "error", "skipped"] as const;

const parser = new XMLParser({
  ignoreAttributes: false,
  // Attributes keep a prefix so that none is read as a child element of the same name.
  attributeNamePrefix: "@",
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name) => ["testsuite", "testcase", "property", ...OUTCOMES].includes(name),
});

const elementsIn = (element: Element, name: string): Element[] => (element[name] as Element[] | undefined) ?? [];

const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

// An outcome element is text alone, attributes alone, or both.
function failureAsWritten(outcome: unknown): FailureAsWritten {
  if (typeof outcome === "string") return { text: outcome };
  const { "@message": message, "#text": body } = outcome as Element;
  return { ...(text(message) && { message: text(message) }), ...(text(body) && { text: text(body) }) };
}

function resultAsWritten(testCase: Element): ResultInSuiteAsWritten {
  const outcome = OUTCOMES.find((name) => testCase[name] !== undefined);
  const clmProperties = elementsIn((testCase["properties"] as Element | undefined) ?? {}, "property")
    .filter((property) => property["@name"] === "clm")
    .map((property) => text(property["@value"]) ?? "");
  return {
    ...(text(testCase["@classname"]) !== undefined && { className: text(testCase["@classname"]) }),
    name: text(testCase["@name"]) ?? "",
    clmProperties,
    // A test case with no outcome element is one that passed; its outcome is written as an empty string.
    outcome: outcome ?? "",
    ...(outcome && outcome !== "skipped" && { failure: failureAsWritten((testCase[outcome] as unknown[])[0]) }),
  };
}

// Every suite under the element, at any depth.
const suitesIn = (element: Element): Element[] => elementsIn(element, "testsuite").flatMap((suite) => [suite, ...suitesIn(suite)]);

// What the XML parser says is wrong with the report's text, if anything.
export function whyXmlDoesNotParse(xml: string): string | undefined {
  const valid = XMLValidator.validate(xml);
  return valid === true ? undefined : `${valid.err.msg} (${valid.err.line}:${valid.err.col})`;
}

// A JUnit report's top is a suite, or the suites element holding them.
export const whereSuitesBreak = (xml: string): string | undefined => {
  const document = parser.parse(xml) as Element;
  return document["testsuites"] === undefined && document["testsuite"] === undefined ? "$" : undefined;
};

export function resultsBySuiteFrom(xml: string, from: "junit" | "pytest"): ResultsBySuiteAsWritten[] {
  const document = parser.parse(xml) as Element;
  return [...suitesIn(document), ...suitesIn((document["testsuites"] as Element | undefined) ?? {})].map((suite) => ({
    // pytest writes an error only for a test that never reached its assertions; JUnit writes one for a test that failed.
    report: from === "pytest" ? ERRORS_BEFORE_ASSERTIONS : from,
    name: text(suite["@name"]) ?? "",
    results: elementsIn(suite, "testcase").map(resultAsWritten),
  }));
}
