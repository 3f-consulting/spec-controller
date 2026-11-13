import { textFor } from "@3f-consulting/spec-controller-core";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import { USAGE_ERROR, type ExitCode } from "./codes.js";
import type { Refusal } from "./runEnding.js";

export const refusalText = ({ key, values }: Refusal): string => `[${key}] ${textFor(appCatalogue, key, values)}`;

export function refusedWith(refusals: readonly Refusal[], write: (text: string) => void): ExitCode {
  refusals.forEach((refusal) => write(`${refusalText(refusal)}\n`));
  return USAGE_ERROR;
}
