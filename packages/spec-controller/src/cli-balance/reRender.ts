import { renderReport, verdictCode } from "@3f-consulting/spec-controller-core";
import type { RenderInput, VerdictCode } from "@3f-consulting/spec-controller-core";
import { APP_MESSAGES, AppMessage } from "../messages.js";
import { INPUT_NAMES } from "./evidenceInputs.js";

export interface ReRendered {
  readonly markdown: string;
  readonly code: VerdictCode;
}

export function reRender(document: unknown, strictGiven: boolean): ReRendered {
  const saved = document as RenderInput;
  const strict = saved.runProvenance.strict === true || strictGiven;
  const report: RenderInput = { ...saved, runProvenance: { ...saved.runProvenance, strict } };
  return {
    markdown: renderReport(report, INPUT_NAMES),
    code: verdictCode({ ledger: report.ledger, scenarioCodeErrors: report.scenarioCodeErrors, strict }),
  };
}

const READ_BY_A_RE_RENDER: ReadonlySet<string> = new Set(["render-from-json", "strict", "exit-zero"]);

export function checkReRenderFlags(args: Record<string, string>): string | null {
  if (args["render-from-json"] === undefined) return null;
  const ignored = Object.keys(args).find((key) => !READ_BY_A_RE_RENDER.has(key));
  if (ignored === undefined) return null;
  return APP_MESSAGES[AppMessage.ReRenderReadsOnly](`--${ignored}`);
}
