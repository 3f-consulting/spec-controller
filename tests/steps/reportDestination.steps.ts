import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { StdioOptions } from "node:child_process";
import { closeSync, openSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { entryText, showsEntry } from "./support/catalogue.js";
import { BALANCED_ARGS, specController } from "./support/specControllerRun.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { CommandRun, SpecControllerWorld } from "./support/world.js";

const BALANCED = 0;

const STANDARD_ERROR = "/dev/stderr";

// The run's two reports: the Markdown one is "one", the JSON one "the other".
const ONE = "md";
const OTHER = "json";

const EARLIER_REPORT = "an earlier run's report\n";

function balance(formats: readonly string[], stdio?: StdioOptions): CommandRun {
  return specController(["balance", ...BALANCED_ARGS, ...formats.flatMap((format) => ["--format", format])], stdio);
}

Given("a run had two reports to write", function (this: SpecControllerWorld) {
  const markdown = balance([ONE]);
  const json = balance([OTHER]);
  assert.equal(markdown.status, BALANCED, `expected the target to reconcile balanced; got ${markdown.status}\n${markdown.stderr}`);
  assert.ok(markdown.stdout.includes(entryText("report-title")), `expected a Markdown report alone on stdout; got:\n${markdown.stdout}`);
  assert.doesNotThrow(() => JSON.parse(json.stdout), `expected a JSON report alone on stdout; got:\n${json.stdout}`);
  this.reportsAlone = { markdown: markdown.stdout, json: json.stdout };
  this.destinationScratch = temporaryDirectory(this, "spec-controller-destination-");
});

// Each destination row asks for the run's two reports, and keeps the files it named for the Then to read.
const BOTH_WRITTEN: Readonly<Record<string, (scratch: string) => { formats: readonly string[]; files: readonly string[] }>> = {
  "no destination for one, a file for the other": (scratch) => {
    const file = join(scratch, "other.json");
    return { formats: [ONE, `${OTHER}:${file}`], files: [file] };
  },
  "no destination for one, standard error for the other": () => ({ formats: [ONE, `${OTHER}:${STANDARD_ERROR}`], files: [] }),
  "two different files": (scratch) => {
    const files = [join(scratch, "one.md"), join(scratch, "other.json")];
    return { formats: [`${ONE}:${files[0]}`, `${OTHER}:${files[1]}`], files };
  },
  "standard error for both": () => ({ formats: [`${ONE}:${STANDARD_ERROR}`, `${OTHER}:${STANDARD_ERROR}`], files: [] }),
};

for (const [destination, arrange] of Object.entries(BOTH_WRITTEN)) {
  When(`you ask for them at ${destination}`, function (this: SpecControllerWorld) {
    const { formats, files } = arrange(this.destinationScratch);
    this.destinationFiles = files;
    this.run = balance(formats);
    assert.equal(this.run.status, BALANCED, `expected the run to write both reports and exit ${BALANCED}; got ${this.run.status}\n${this.run.stderr}`);
  });
}

function fileText(path: string | undefined): string {
  assert.ok(path, "the scenario named no file");
  return readFileSync(path, "utf8");
}

Then("one will be on standard output, and the other in the file", function (this: SpecControllerWorld) {
  assert.equal(this.run.stdout, this.reportsAlone.markdown, `expected the Markdown report alone on standard output; got:\n${this.run.stdout}`);
  assert.equal(fileText(this.destinationFiles[0]), this.reportsAlone.json, "expected the JSON report alone in the file");
});

Then("one will be on standard output, and the other on standard error", function (this: SpecControllerWorld) {
  assert.equal(this.run.stdout, this.reportsAlone.markdown, `expected the Markdown report alone on standard output; got:\n${this.run.stdout}`);
  assert.equal(this.run.stderr, this.reportsAlone.json, `expected the JSON report alone on standard error; got:\n${this.run.stderr}`);
});

Then("each file will contain its own report", function (this: SpecControllerWorld) {
  assert.equal(fileText(this.destinationFiles[0]), this.reportsAlone.markdown, "expected the Markdown report alone in its file");
  assert.equal(fileText(this.destinationFiles[1]), this.reportsAlone.json, "expected the JSON report alone in its file");
  assert.equal(this.run.stdout, "", `expected nothing on standard output; got:\n${this.run.stdout}`);
});

Then("both reports will be on standard error, one after the other", function (this: SpecControllerWorld) {
  const { markdown, json } = this.reportsAlone;
  assert.ok(
    this.run.stderr === markdown + json || this.run.stderr === json + markdown,
    `expected standard error to hold the two reports whole, one after the other; got:\n${this.run.stderr}`,
  );
  assert.equal(this.run.stdout, "", `expected nothing on standard output; got:\n${this.run.stdout}`);
});

// Each row names the file's second destination, and how the refusal shows it.
const SECOND_DESTINATION: Readonly<
  Record<string, (file: string, scratch: string) => { spec: string; shown: string; stdoutInto?: boolean }>
> = {
  "the same path": (file) => ({ spec: `${OTHER}:${file}`, shown: `${OTHER}:${file}` }),
  "a link to it": (file, scratch) => {
    const link = join(scratch, "link.out");
    symlinkSync(file, link);
    return { spec: `${OTHER}:${link}`, shown: `${OTHER}:${link}` };
  },
  "standard output, redirected to the file": () => ({
    spec: OTHER,
    shown: entryText("format-on-standard-output", { fmt: OTHER }),
    stdoutInto: true,
  }),
};

for (const [other, arrange] of Object.entries(SECOND_DESTINATION)) {
  When(`you ask for them at a file and at ${other}`, function (this: SpecControllerWorld) {
    this.sharedFile = join(this.destinationScratch, "shared.out");
    this.sharedBefore = EARLIER_REPORT;
    writeFileSync(this.sharedFile, this.sharedBefore);
    const second = arrange(this.sharedFile, this.destinationScratch);
    const first = `${ONE}:${this.sharedFile}`;
    this.namedOutputs = [first, second.shown];
    if (second.stdoutInto !== true) {
      this.run = balance([first, second.spec]);
      return;
    }
    const fd = openSync(this.sharedFile, "a");
    try {
      this.run = balance([first, second.spec], ["ignore", fd, "pipe"]);
    } finally {
      closeSync(fd);
    }
  });
}

Then("the run will stop, give no verdict and exit {int}", function (this: SpecControllerWorld, code: number) {
  assert.equal(this.run.status, code, `expected exit ${code}; got ${this.run.status}\n${this.run.stderr}`);
  assert.equal(this.run.stdout, "", `a report reached standard output:\n${this.run.stdout}`);
  assert.ok(!this.run.stderr.includes(entryText("report-title")), `a report reached standard error:\n${this.run.stderr}`);
});

Then("it will complain, naming the file and both reports", function (this: SpecControllerWorld) {
  const [first, second] = this.namedOutputs;
  assert.ok(first.includes(this.sharedFile), `the complaint is expected to name ${this.sharedFile}`);
  assert.ok(
    showsEntry(this.run.stderr, "outputs-share-file", { first, second }),
    `expected the complaint to name ${first} and ${second}; got:\n${this.run.stderr}`,
  );
});

Then("the file will be as it was", function (this: SpecControllerWorld) {
  assert.equal(readFileSync(this.sharedFile, "utf8"), this.sharedBefore, `${this.sharedFile} was changed by a run that stopped`);
});
