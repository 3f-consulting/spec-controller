import { coreText, type CoreTextCode } from "./coreText.js";

export const labelled = (code: CoreTextCode, value: string): string => `- ${coreText(code)}: ${value}`;
