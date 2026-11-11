import { coreText, type CoreTextCode } from "../messages/coreText.js";

export const heading = (level: number, code: CoreTextCode): string => `${"#".repeat(level)} ${coreText(code)}`;
