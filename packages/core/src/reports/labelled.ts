import { coreText, type CoreTextCode } from "../messages/coreText.js";

export const labelled = (code: CoreTextCode, value: string): string => `- ${coreText(code)}: ${value}`;
