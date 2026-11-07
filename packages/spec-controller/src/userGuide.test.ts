import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CoreError } from "@3f-consulting/spec-controller-core";
import { AppError } from "./messages.js";
import { UNEXPECTED_ERROR_EXIT_CODE, USAGE_EXIT_CODE } from "./exitCode.js";
import { EXIT_CODE } from "./cli-balance/exitStatus.js";

interface Finding {
  readonly section: string;
  readonly code: string;
  readonly fault: "not listed" | "listed twice" | "listed with no meaning" | "not one the tool can give" | "stands for two errors";
}

// The two catalogues of errors a reader can be shown: the app's refusals and the report's errors in the inputs.
interface ErrorCatalogues {
  readonly app: Readonly<Record<string, string>>;
  readonly core: Readonly<Record<string, string>>;
}

const ERROR_CATALOGUES: ErrorCatalogues = { app: AppError, core: CoreError };

// Each row of a section's table, as its code and its meaning, up to the next heading or rule.
function rows(guide: string, section: string): { code: string; meaning: string }[] {
  const body = guide.split(`\n### ${section}\n`)[1]?.split(/\n(?:#|---)/)[0] ?? "";
  return [...body.matchAll(/^\| `([^`]+)` \|(.*)\|\s*$/gm)].map(([, code, meaning]) => ({
    code: code ?? "",
    meaning: (meaning ?? "").trim(),
  }));
}

function check(guide: string, section: string, codes: readonly string[], headings: readonly string[] = [section]): Finding[] {
  const listed = headings.flatMap((heading) => rows(guide, heading));
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

function documentationFindings(guide: string, catalogues: ErrorCatalogues = ERROR_CATALOGUES): Finding[] {
  const exitCodes = [...new Set([...Object.values(EXIT_CODE), USAGE_EXIT_CODE, UNEXPECTED_ERROR_EXIT_CODE])].map(String);
  return [
    ...check(guide, "Exit codes", exitCodes),
    ...check(guide, "Error codes", Object.values(catalogues.app)),
    ...check(guide, "Errors in the inputs", Object.values(catalogues.core), ["Configuration the run cannot use is named, never dropped", "Claim code errors"]),
    ...Object.values(catalogues.app)
      .filter((code) => Object.values(catalogues.core).includes(code))
      .map((code) => ({ section: "Error codes, Errors in the inputs", code, fault: "stands for two errors" as const })),
  ];
}

function userGuide(): string {
  return readFileSync("docs/user-guide.md", "utf8");
}

describe("[CLM-MSG-012] every code the tool can give is documented", () => {
  it("[CLM-MSG-012] the user guide lists every exit code and every error code once, each with its meaning", () => {
    expect(documentationFindings(userGuide())).toEqual([]);
  });

  it("[CLM-MSG-012] a guide lacking an error code and an exit code, listing a code twice and one with no meaning is named for each", () => {
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

describe("[CLM-MSG-013] every documented code is one the tool can give", () => {
  it("[CLM-MSG-013] a guide listing an exit code and an error code the tool cannot give is named for each", () => {
    const planted = userGuide()
      .replace(/^(\| `6` \|.*\n)/m, "$1| `7` | a way no run ends |\n")
      .replace(/^(\| `unknown-flag` \|.*\n)/m, "$1| `no-such-error` | an error no refusal shows |\n");
    expect(documentationFindings(planted)).toEqual([
      { section: "Exit codes", code: "7", fault: "not one the tool can give" },
      { section: "Error codes", code: "no-such-error", fault: "not one the tool can give" },
    ]);
  });
});

describe("[CLM-MSG-014] no error code stands for two errors", () => {
  it("[CLM-MSG-014] a code the app's errors and the errors in the inputs both hold is named, though the guide lists it under each", () => {
    const planted = userGuide().replace(
      /^(\| `configuration-wrong-kind` \|.*\n)/m,
      "$1| `unknown-flag` | an entry the run cannot use, under a code a refusal already gives |\n",
    );
    const catalogues = { app: AppError, core: { ...CoreError, Planted: AppError.UnknownFlag } };
    expect(documentationFindings(planted, catalogues)).toEqual([
      { section: "Error codes, Errors in the inputs", code: "unknown-flag", fault: "stands for two errors" },
    ]);
  });
});
