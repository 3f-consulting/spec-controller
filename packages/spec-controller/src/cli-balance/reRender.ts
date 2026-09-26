/**
 * Re-rendering a saved Evidence Reconciliation: the markdown the saved report renders to, and the
 * verdict it carries. Pure over the saved bytes; the CLI does the reading and the writing.
 */

import { renderReport, verdictCode } from "@3f-consulting/spec-controller-core";
import type { RenderInput, VerdictCode } from "@3f-consulting/spec-controller-core";

export interface ReRendered {
  readonly markdown: string;
  readonly code: VerdictCode;
}

/**
 * `strictGiven` is `--strict` on the re-render. The run is strict when the saved run was or the
 * re-render asks, and that one value is written onto the report before it renders, so the headline
 * names the same code the re-render exits.
 */
export function reRender(savedJson: string, strictGiven: boolean): ReRendered {
  const saved = JSON.parse(savedJson) as RenderInput;
  const strict = saved.runProvenance.strict === true || strictGiven;
  const report: RenderInput = { ...saved, runProvenance: { ...saved.runProvenance, strict } };
  return {
    markdown: renderReport(report),
    code: verdictCode({ ledger: report.ledger, scenarioCodeErrors: report.scenarioCodeErrors, strict }),
  };
}

/** The flags a re-render reads; `--help` answers before any of this runs. */
const READ_BY_A_RE_RENDER: ReadonlySet<string> = new Set(["render-from-json", "strict", "exit-zero"]);

/**
 * The first flag given beside `--render-from-json` that a re-render would silently ignore, as the
 * usage message that refuses it; null when there is none, or no re-render was asked for. Any flag
 * outside the three it reads is refused, so one added to balance later is refused by default.
 */
export function checkReRenderFlags(args: Record<string, string>): string | null {
  if (args["render-from-json"] === undefined) return null;
  const ignored = Object.keys(args).find((key) => !READ_BY_A_RE_RENDER.has(key));
  if (ignored === undefined) return null;
  const stored =
    ignored === "format" ? " A run under --store passes --format for its report files, so a re-render is not stored." : "";
  return (
    `--render-from-json re-renders a saved report and reads only --strict and --exit-zero beside it; ` +
    `--${ignored} would be ignored. Remove it, or run balance without --render-from-json.${stored}`
  );
}
