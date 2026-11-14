import { Before, Given, Then, When } from "@cucumber/cucumber";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { closeSync, existsSync, openSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const CLI = resolve("packages/spec-controller/dist/cli.js");

const MARKDOWN_TITLE = "# Evidence Reconciliation";

const EARLIER_REPORT = "an earlier report";

interface ReportRun {
  folder: string;
  file: string;
  status: number | null;
  output: string;
  error: string;
}

// What each destination asks for: the --format flags, and whether standard output is redirected into the file.
const ASKED: Readonly<Record<string, (file: string) => { readonly formats: readonly string[]; readonly outputIntoFile?: boolean }>> = {
  "no destination for one, a file for the other": (file) => ({ formats: ["md", `json:${file}`] }),
  "no destination for one, standard error for the other": () => ({ formats: ["md", "json:/dev/stderr"] }),
  "two different files": (file) => ({ formats: [`md:${file}`, `json:${file}.json`] }),
  "standard error for both": () => ({ formats: ["md:/dev/stderr", "json:/dev/stderr"] }),
  "a file and at the same path": (file) => ({ formats: [`md:${file}`, `json:${file}`] }),
  "a file and at a link to it": (file) => {
    symlinkSync(file, `${file}.link`);
    return { formats: [`md:${file}`, `json:${file}.link`] };
  },
  "a file and at standard output, redirected to the file": (file) => ({ formats: [`md:${file}`, "json"], outputIntoFile: true }),
};

const isJsonReport = (text: string): boolean => {
  try {
    return "runVerdict" in JSON.parse(text);
  } catch {
    return false;
  }
};

Before(function (this: ReportRun) {
  this.folder = temporaryDirectory("report-destination-");
  this.file = join(this.folder, "report.md");
});

Given("a run had two reports to write", function (this: ReportRun) {
  writeFileSync(this.file, EARLIER_REPORT);
});

When(/^you ask for them at (.+)$/, function (this: ReportRun, destination: string) {
  const ask = ASKED[destination];
  assert.ok(ask, `no destination is written for "${destination}"`);
  const { formats, outputIntoFile } = ask(this.file);
  const output = outputIntoFile === true ? openSync(this.file, "a") : "pipe";
  const run = spawnSync(process.execPath, [CLI, "balance", ...formats.flatMap((format) => ["--format", format])], {
    cwd: this.folder,
    encoding: "utf8",
    stdio: ["ignore", output, "pipe"],
  });
  if (typeof output === "number") closeSync(output);
  this.status = run.status;
  this.output = run.stdout ?? "";
  this.error = run.stderr;
});

Then("one will be on standard output, and the other in the file", function (this: ReportRun) {
  assert.ok(this.output.startsWith(MARKDOWN_TITLE), this.output);
  assert.ok(isJsonReport(readFileSync(this.file, "utf8")));
});

Then("one will be on standard output, and the other on standard error", function (this: ReportRun) {
  assert.ok(this.output.startsWith(MARKDOWN_TITLE), this.output);
  assert.ok(isJsonReport(this.error), this.error);
});

Then("each file will contain its own report", function (this: ReportRun) {
  assert.ok(readFileSync(this.file, "utf8").startsWith(MARKDOWN_TITLE));
  assert.ok(isJsonReport(readFileSync(`${this.file}.json`, "utf8")));
});

Then("the run will stop, give no verdict and exit 2", function (this: ReportRun) {
  assert.equal(this.status, 2);
  assert.equal(this.output, "");
});

Then("it will complain, naming the file and both reports", function (this: ReportRun) {
  assert.ok(this.error.includes(this.file) && this.error.includes("md") && this.error.includes("json"), this.error);
});

Then("the file will be as it was", function (this: ReportRun) {
  assert.ok(existsSync(this.file));
  assert.equal(readFileSync(this.file, "utf8"), EARLIER_REPORT);
});
