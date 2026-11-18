import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { TestResult } from "../domain/postEvidenceObservation.js";
import { TOP } from "./shape.js";

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

// An outcome element says what went wrong, or why the test was skipped, in its message attribute, or else in its text.
function messageOf(testCase: Element, outcome: Outcome | undefined): { message?: string } {
  if (outcome === undefined) return {};
  const element = (testCase[outcome] as Element[])[0]!;
  const message = (element["@message"] ?? element["#text"]) as string | undefined;
  return message ? { message } : {};
}

type Outcome = (typeof OUTCOMES)[number];

// A test case with no outcome element is one that passed.
const outcomeOf = (testCase: Element): Outcome | undefined => OUTCOMES.find((name) => testCase[name] !== undefined);

const clmPropertiesOf = (testCase: Element): string[] =>
  elementsIn((testCase["properties"] as Element | undefined) ?? {}, "property")
    .filter((property) => property["@name"] === "clm")
    .map((property) => property["@value"] as string);

// pytest writes an error only for a test that never reached its assertions, and no class name for a file never collected.
function pytestResultOf(testCase: Element): TestResult[] {
  const outcome = outcomeOf(testCase);
  if (outcome === "skipped") return [];
  const className = testCase["@classname"] as string | undefined;
  const name = testCase["@name"] as string;
  const collected = Boolean(className);
  const result = outcome === "error" ? "never-ran" : outcome === "failure" ? "failed" : "passed";
  return [{ place: { file: collected ? className! : name }, ...(collected && { name }), result, ...messageOf(testCase, outcome), cites: { codes: collected ? clmPropertiesOf(testCase) : [] } }];
}

// A nested class's name holds its outer classes' display names first, each opening with its citation when it has one.
const classesIn = (className: string): string[] => className.split(/(?=\[CLM-)/);

// JUnit writes an error for a test that failed. A case with no class name is its suite's own failure, such as a package that
// did not build; one with no name is its class's, such as a failed setup. Neither ran a test, nor is written for a pass.
function junitResultOf(suiteName: string, testCase: Element): TestResult[] {
  const outcome = outcomeOf(testCase);
  if (outcome === "skipped") return [];
  const className = testCase["@classname"] as string | undefined;
  const name = testCase["@name"] as string;
  if (!className || name === "") return [{ place: { named: className || suiteName }, result: "never-ran", ...messageOf(testCase, outcome), cites: { codes: [] } }];
  const titles = [...classesIn(className), ...name.split("/")];
  return [{ place: { file: className }, name, result: outcome === undefined ? "passed" : "failed", ...messageOf(testCase, outcome), cites: { titles } }];
}

const suitesIn = (element: Element): Element[] => elementsIn(element, "testsuite").flatMap((suite) => [suite, ...suitesIn(suite)]);

export function whyXmlDoesNotParse(xml: string): string | undefined {
  const valid = XMLValidator.validate(xml);
  return valid === true ? undefined : valid.err.msg;
}

const suitesOf = (document: Element): Element[] => [...suitesIn(document), ...suitesIn((document["testsuites"] as Element | undefined) ?? {})];

// A JUnit report's top is a suite, or the suites element holding them, and each of its test cases has a name.
export const whereSuitesBreak = (xml: string): string | undefined => {
  const document = parser.parse(xml) as Element;
  if (document["testsuites"] === undefined && document["testsuite"] === undefined) return TOP;
  const unnamed = suitesOf(document).some((suite) => elementsIn(suite, "testcase").some((testCase) => testCase["@name"] === undefined));
  return unnamed ? "$..testcase" : undefined;
};

export function resultsBySuiteFrom(xml: string, from: "junit" | "pytest"): TestResult[] {
  return suitesOf(parser.parse(xml) as Element).flatMap((suite) =>
    elementsIn(suite, "testcase").flatMap((testCase) => (from === "pytest" ? pytestResultOf(testCase) : junitResultOf(suite["@name"] as string, testCase))),
  );
}
