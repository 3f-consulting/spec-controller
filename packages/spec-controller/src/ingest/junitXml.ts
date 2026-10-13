import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { JunitXmlReport } from "@3f-consulting/spec-controller-core";
import { APP_MESSAGES, AppMessage } from "../messages.js";

const JUNIT_REPEATED_ELEMENTS = new Set(["testsuite", "testcase", "property"]);

const JUNIT_XML = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (name) => JUNIT_REPEATED_ELEMENTS.has(name),
});

export function parseJunitXml(text: string): JunitXmlReport {
  const valid = XMLValidator.validate(text);
  if (valid !== true) throw new Error(APP_MESSAGES[AppMessage.XmlFaultAtLine](valid.err.msg.replace(/\.$/, ""), valid.err.line));
  return JUNIT_XML.parse(text) as JunitXmlReport;
}
