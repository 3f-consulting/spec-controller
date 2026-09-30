import { renderReport, verdictCode } from "@3f-consulting/spec-controller-core";
import type { RenderInput, VerdictCode } from "@3f-consulting/spec-controller-core";

export interface ReRendered {
  readonly markdown: string;
  readonly code: VerdictCode;
}

export function reRender(savedJson: string, strictGiven: boolean): ReRendered {
  const saved = JSON.parse(savedJson) as RenderInput;
  const strict = saved.runProvenance.strict === true || strictGiven;
  const report: RenderInput = { ...saved, runProvenance: { ...saved.runProvenance, strict } };
  return {
    markdown: renderReport(report),
    code: verdictCode({ ledger: report.ledger, scenarioCodeErrors: report.scenarioCodeErrors, strict }),
  };
}

const READ_BY_A_RE_RENDER: ReadonlySet<string> = new Set(["render-from-json", "strict", "exit-zero"]);

export function checkReRenderFlags(args: Record<string, string>): string | null {
  if (args["render-from-json"] === undefined) return null;
  const ignored = Object.keys(args).find((key) => !READ_BY_A_RE_RENDER.has(key));
  if (ignored === undefined) return null;
  return (
    `--render-from-json re-renders a saved report and reads only --strict and --exit-zero beside it; ` +
    `--${ignored} would be ignored. Remove it, or run balance without --render-from-json.`
  );
}
