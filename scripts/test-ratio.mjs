import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as config from "./test-ratio.config.js";

const scratch = mkdtempSync(join(tmpdir(), "test-ratio-"));

const filesOf = ({ include, exclude }) =>
  execFileSync(
    "git",
    ["ls-files", "-z", "--", ...include.map((g) => `:(glob)${g}`), ...exclude.map((g) => `:(exclude,glob)${g}`)],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);

const codeLines = (name, files) => {
  if (files.length === 0) throw new Error(`the ${name} set matches no tracked file`);
  const list = join(scratch, `${name}.txt`);
  writeFileSync(list, files.join("\n") + "\n");
  const report = JSON.parse(
    execFileSync("node_modules/.bin/cloc", ["--json", "--quiet", `--list-file=${list}`], { encoding: "utf8" }),
  );
  const code = report.SUM?.code;
  if (!(code > 0)) throw new Error(`cloc counted no code in the ${name} set's ${files.length} files`);
  return code;
};

try {
  const test = codeLines("test", filesOf(config.test));
  const production = codeLines("production", filesOf(config.production));
  const ratio = test / production;
  const ceiling = config.testRatioCeiling;
  console.log(`test code: ${test} lines`);
  console.log(`production code: ${production} lines`);
  console.log(`ratio: ${ratio.toFixed(2)}`);
  if (ceiling === undefined) {
    console.log("no ceiling declared, no gate");
  } else {
    console.log(`ceiling: ${ceiling}`);
    if (ratio > ceiling) {
      console.log(`test code is ${ratio.toFixed(2)} times production code, above the ceiling of ${ceiling}`);
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(`cannot measure the ratio: ${error.message}`);
  process.exitCode = 2;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
