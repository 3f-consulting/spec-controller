import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { allocateCommand, balanceCommand, cliRegistry, renderCommandHelp, renderTopLevelHelp } from "../cliRegistry.js";
import { errorCodesShown } from "../shownText.test-utils.js";

function fixtureArgv(fixture: string): string[] {
  const dir = `tests/fixtures/${fixture}`;
  const argv = ["--features", `${dir}/features`, "--ci", dir];
  for (const [flag, file] of [["--vitest", "vitest.json"], ["--cucumber", "cucumber.json"], ["--package-json", "package.json"]] as const) {
    if (existsSync(`${dir}/${file}`)) argv.push(flag, `${dir}/${file}`);
  }
  return argv;
}

describe("[CLM-MSG-011] a balanced run shows no error code", () => {
  const NONE = { opening: [], after: [] };
  const VERDICTS = [
    { verdict: "balanced", fixture: "balanced", code: 0 },
    { verdict: "out-of-balance", fixture: "evidence-observation", code: 1 },
    { verdict: "unsound", fixture: "never-ran", code: 4 },
  ] as const;

  for (const { verdict, fixture, code } of VERDICTS) {
    it(`the live ${verdict} report, and what the run writes beside it, shows no error code`, () => {
      const live = runBalanceCaptured(fixtureArgv(fixture));
      expect(live.exitCode).toBe(code);
      expect(live.stdout).not.toBe("");
      expect(errorCodesShown(live.stdout)).toEqual(NONE);
      expect(errorCodesShown(live.stderr)).toEqual(NONE);
    });
  }

  it("the tool's help, and each command's, shows no error code", () => {
    for (const help of [renderTopLevelHelp(cliRegistry), renderCommandHelp(balanceCommand), renderCommandHelp(allocateCommand)]) {
      expect(errorCodesShown(help)).toEqual(NONE);
    }
  });
});
