import { textFor } from "@3f-consulting/spec-controller-core";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import type { Refusal } from "./runEnding.js";

// A refusal is shown with its error code, which is its catalogue code.
export const refusalText = ({ key, values }: Refusal): string => `[${key}] ${textFor(appCatalogue, key, values)}`;
