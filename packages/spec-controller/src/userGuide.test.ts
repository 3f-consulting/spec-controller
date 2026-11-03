import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AppError } from "./messages.js";
import { UNEXPECTED_ERROR_EXIT_CODE, USAGE_EXIT_CODE } from "./exitCode.js";
import { EXIT_CODE } from "./cli-balance/exitStatus.js";

interface Finding {
  readonly section: string;
  readonly code: string;
  readonly fault: "not listed" | "listed twice" | "listed with no meaning" | "not one the tool can give";
}

// Each row of a section's table, as its code and its meaning, up to the next heading or rule.
function rows(guide: string, section: string): { code: string; meaning: string }[] {
  const body = guide.split(`\n### ${section}\n`)[1]?.split(/\n(?:#|---)/)[0] ?? "";
  return [...body.matchAll(/^\| `([^`]+)` \|(.*)\|\s*$/gm)].map(([, code, meaning]) => ({
    code: code ?? "",
    meaning: (meaning ?? "").trim(),
  }));
}

function check(guide: string, section: string, codes: readonly string[]): Finding[] {
  const listed = rows(guide, section);
  const timesListed = (code: string): number => listed.filter((row) => row.code === code).length;
  return [
    ...codes.flatMap((code): Finding[] => [
      ...(timesListed(code) === 0 ? [{ section, code, fault: "not listed" as const }] : []),
      ...(timesListed(code) > 1 ? [{ section, code, fault: "listed twice" as const }] : []),
      ...(listed.some((row) => row.code === code && row.meaning === "") ? [{ section, code, fault: "listed with no meaning" as const }] : []),
    ]),
    ...listed.filter((row) => !codes.includes(row.code)).map(({ code }) => ({ section, code, fault: "not one the tool can give" as const })),
  ];
}

function documentationFindings(guide: string): Finding[] {
  const exitCodes = [...new Set([...Object.values(EXIT_CODE), USAGE_EXIT_CODE, UNEXPECTED_ERROR_EXIT_CODE])].map(String);
  return [...check(guide, "Exit codes", exitCodes), ...check(guide, "Error codes", Object.values(AppError))];
}

function userGuide(): string {
  return readFileSync("docs/user-guide.md", "utf8");
}

describe("[SCN-MSG-012] every code the tool can give is documented", () => {
  it("[SCN-MSG-012] the user guide lists every exit code and every error code once, each with its meaning", () => {
    expect(documentationFindings(userGuide())).toEqual([]);
  });

  it("[SCN-MSG-012] a guide lacking an error code and an exit code, listing a code twice and one with no meaning is named for each", () => {
    const planted = userGuide()
      .replace(/^\| `unknown-flag` \|.*\n/m, "")
      .replace(/^\| `6` \|.*\n/m, "")
      .replace(/^(\| `retired-flag` \|.*\n)/m, "$1$1")
      .replace(/^\| `2` \|.*$/m, "| `2` |  |");
    expect(documentationFindings(planted)).toEqual([
      { section: "Exit codes", code: "2", fault: "listed with no meaning" },
      { section: "Exit codes", code: "6", fault: "not listed" },
      { section: "Error codes", code: "unknown-flag", fault: "not listed" },
      { section: "Error codes", code: "retired-flag", fault: "listed twice" },
    ]);
  });
});

describe("[SCN-MSG-013] every documented code is one the tool can give", () => {
  it("[SCN-MSG-013] a guide listing an exit code and an error code the tool cannot give is named for each", () => {
    const planted = userGuide()
      .replace(/^(\| `6` \|.*\n)/m, "$1| `7` | a way no run ends |\n")
      .replace(/^(\| `unknown-flag` \|.*\n)/m, "$1| `no-such-error` | an error no refusal shows |\n");
    expect(documentationFindings(planted)).toEqual([
      { section: "Exit codes", code: "7", fault: "not one the tool can give" },
      { section: "Error codes", code: "no-such-error", fault: "not one the tool can give" },
    ]);
  });
});
