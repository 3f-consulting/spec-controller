import { parseJunitXml, parseJunitXmlLiftingBareSuite } from "./junitXml.js";
import { shapeFaultIn, type Shape } from "./inputShapes.js";
import { readingOf, readUtf8, reasonOf, type ReadFault } from "./inputReading.js";

export type ReportFormat = "json" | "junit-xml" | "junit-xml-or-one-suite";

const PARSER_OF: Readonly<Record<ReportFormat, (text: string) => unknown>> = {
  json: (text) => JSON.parse(text),
  "junit-xml": parseJunitXml,
  "junit-xml-or-one-suite": parseJunitXmlLiftingBareSuite,
};

interface Unparseable {
  readonly kind: "unparseable";
  readonly reason: string;
}

interface ParsedDocument {
  readonly kind: "parsed";
  readonly document: unknown;
}

type DocumentReading = ReadFault | Unparseable | ParsedDocument;

export type ReportReading = DocumentReading | { readonly kind: "misshapen"; readonly fault: string };

function documentOf(text: string, parse: (text: string) => unknown): Unparseable | ParsedDocument {
  try {
    return { kind: "parsed", document: parse(text) };
  } catch (err) {
    return { kind: "unparseable", reason: reasonOf(err) };
  }
}

function readDocument(path: string, format: ReportFormat, read: (path: string) => string = readUtf8): DocumentReading {
  return readingOf(path, () => read(path), (text) => documentOf(text, PARSER_OF[format]));
}

export function readReport(
  path: string,
  format: ReportFormat,
  shape: Shape,
  read: (path: string) => string = readUtf8,
): ReportReading {
  const reading = readDocument(path, format, read);
  if (reading.kind !== "parsed") return reading;
  const fault = shapeFaultIn(reading.document, shape);
  return fault === null ? reading : { kind: "misshapen", fault };
}
