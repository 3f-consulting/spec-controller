import { After, Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = join(process.cwd(), "tests/fixtures/usg-config-not-read");
const SECTION = "## Configuration not read";

const KINDS: Record<string, unknown> = {
  null: null,
  "a boolean": true,
  "a number": 5,
  "a string": "x",
  "a list": [1],
  "an object": { a: 1 },
};

interface Rendered {
  readonly status: number | null;
  readonly stderr: string;
  readonly md: string;
}

let dir = "";
let manifest: Record<string, unknown> = {};
let rendered: Rendered;

function baseManifest(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(FIXTURE, "package.json"), "utf8")) as Record<string, unknown>;
}

/** `specController.notChecks[1]` → `["specController", "notChecks", 1]`. */
function pathOf(entry: string): (string | number)[] {
  return entry.split(".").flatMap((part) => {
    const indexed = /^(.+)\[(\d+)\]$/.exec(part);
    return indexed ? [indexed[1] as string, Number(indexed[2])] : [part];
  });
}

function containerOf(root: Record<string, unknown>, path: (string | number)[]): Record<string | number, unknown> {
  return path.slice(0, -1).reduce<Record<string | number, unknown>>(
    (node, key) => node[key] as Record<string | number, unknown>,
    root as Record<string | number, unknown>,
  );
}

function withEntry(entry: string, value: unknown): Record<string, unknown> {
  const root = baseManifest();
  const path = pathOf(entry);
  containerOf(root, path)[path.at(-1) as string | number] = value;
  return root;
}

function withoutEntry(entry: string): Record<string, unknown> {
  const root = baseManifest();
  const path = pathOf(entry);
  const container = containerOf(root, path);
  const last = path.at(-1) as string | number;
  if (Array.isArray(container) && typeof last === "number") container.splice(last, 1);
  else delete container[last];
  return root;
}

/** The built CLI over the fixture's corpus and pipeline, reading `pkg` as the target's manifest. */
export function renderWith(pkg: Record<string, unknown>, into: string, extra: readonly string[] = []): Rendered {
  mkdirSync(into, { recursive: true });
  const manifestPath = join(into, "package.json");
  writeFileSync(manifestPath, JSON.stringify(pkg, null, 2));
  const reportPath = join(into, "report.md");
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", join(FIXTURE, "features"),
      "--ci", join(FIXTURE, "ci.yml"),
      "--package-json", manifestPath,
      "--format", `md:${reportPath}`,
      ...extra,
    ],
    { cwd: into, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  let md = "";
  try {
    md = readFileSync(reportPath, "utf8");
  } catch {
    assert.fail(`no report was written (exit ${result.status}); stderr:\n${result.stderr}`);
  }
  return { status: result.status, stderr: result.stderr, md };
}

/** The lines under `## Configuration not read`, up to the next section; empty when it is absent. */
export function configurationLines(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(SECTION);
  if (start === -1) return [];
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  return lines.slice(start + 1, end === -1 ? undefined : end).filter((line) => line.startsWith("- "));
}

/** The report with the section removed, and with the two lines that differ between any two runs. */
function comparable(md: string): string {
  const lines = md.split("\n");
  const start = lines.indexOf(SECTION);
  const end = start === -1 ? -1 : lines.findIndex((line, i) => i > start && line.startsWith("## "));
  const kept = start === -1 ? lines : [...lines.slice(0, start), ...lines.slice(end)];
  return kept
    .filter((line) => !line.startsWith("- Run timestamp") && !line.includes("--package-json"))
    .join("\n");
}

Given("a target whose specController configuration sets {word} to {}", function (entry: string, written: string) {
  assert.ok(written in KINDS, `no JSON value is known for the kind "${written}"`);
  dir = mkdtempSync(join(tmpdir(), "spec-controller-config-"));
  manifest = withEntry(entry, KINDS[written]);
});

When("the target's configuration is reconciled", function () {
  rendered = renderWith(manifest, join(dir, "with"));
});

Then("the report names {word} as {}, where {} is read", function (entry: string, written: string, read: string) {
  assert.deepEqual(
    configurationLines(rendered.md),
    [`- \`${entry}\` is ${written} where ${read} is read, so this run read it as absent.`],
    `expected the entry named, with the kind written and the kind read, and nothing else under ` +
      `${SECTION}. Got:\n${rendered.md}`,
  );
});

Given(
  "a target whose specController configuration gives {word} the value {}, a kind its reader takes",
  function (entry: string, written: string) {
    const value = written === "an empty list" ? [] : KINDS[written];
    assert.ok(written === "an empty list" || written in KINDS, `no JSON value is known for "${written}"`);
    dir = mkdtempSync(join(tmpdir(), "spec-controller-config-"));
    manifest = withEntry(entry, value);
  },
);

Then("the report names no specController entry as one it could not use", function () {
  assert.equal(rendered.stderr, "", `the run wrote to stderr:\n${rendered.stderr}`);
  assert.ok(rendered.md.includes("## Run provenance"), `no report was rendered:\n${rendered.md}`);
  assert.deepEqual(configurationLines(rendered.md), [], `a well-formed entry was named:\n${rendered.md}`);
  assert.ok(!rendered.md.includes(SECTION), `the section rendered with nothing in it:\n${rendered.md}`);
});

let rerendered = "";

Given(
  "a target whose specController configuration holds an entry of a kind its reader does not take and a key the block does not read",
  function () {
    dir = mkdtempSync(join(tmpdir(), "spec-controller-config-"));
    manifest = withEntry("specController.notChecks", "ci.yml:ci:Rule check");
    (manifest["specController"] as Record<string, unknown>)["fitnessChecks"] = [{ scn: "SCN-CNR-001" }];
  },
);

When("the target's configuration is reconciled and the saved run is re-rendered", function () {
  const saved = join(dir, "with", "report.json");
  rendered = renderWith(manifest, join(dir, "with"), ["--format", `json:${saved}`]);
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", "--render-from-json", saved], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.equal(result.stderr, "", `the re-render wrote to stderr:\n${result.stderr}`);
  rerendered = result.stdout;
});

Then("the re-rendered report names the same specController entries as the live report did", function () {
  const live = configurationLines(rendered.md);
  assert.equal(live.length, 2, `the live report should name the wrong kind and the unread key:\n${rendered.md}`);
  assert.deepEqual(configurationLines(rerendered), live, `the re-render named something else:\n${rerendered}`);
});

/** The words the report uses for any key the block does not read, with only the key's name in it. */
const unknownKeyLine = (key: string): string =>
  `- \`specController.${key}\` is not a key the specController block reads, so this run read nothing from it.`;

Given("a target whose specController configuration also carries the key {word}", function (key: string) {
  dir = mkdtempSync(join(tmpdir(), "spec-controller-config-"));
  manifest = baseManifest();
  (manifest["specController"] as Record<string, unknown>)[key] = ["x"];
});

Then(
  "the report names {word} as a key the specController block does not read, in the words it uses for any such key",
  function (key: string) {
    assert.deepEqual(
      configurationLines(rendered.md),
      [unknownKeyLine(key)],
      `expected the key named in the one sentence every unread key gets, and nothing else under ${SECTION}. ` +
        `Got:\n${rendered.md}`,
    );
  },
);

Then("the report is otherwise the one the same target gives without the key {word}", function (_key: string) {
  assertOtherwiseAs(baseManifest());
});

Then("the report is otherwise the one the same target gives without {word}", function (entry: string) {
  assertOtherwiseAs(withoutEntry(entry));
});

function assertOtherwiseAs(controlManifest: Record<string, unknown>): void {
  const control = renderWith(controlManifest, join(dir, "without"));
  assert.equal(rendered.status, control.status, `the entry moved the exit: ${rendered.status} against ${control.status}`);
  assert.equal(rendered.stderr, "", `the run wrote to stderr:\n${rendered.stderr}`);
  assert.deepEqual(configurationLines(control.md), [], `the control names configuration of its own:\n${control.md}`);
  assert.equal(
    comparable(rendered.md),
    comparable(control.md),
    "beyond the named entry, the report must be the one the same target gives without it",
  );
}

After({ tags: "@SCN-USG-025 or @SCN-USG-026 or @SCN-USG-027 or @SCN-USG-028" }, function () {
  if (dir !== "") rmSync(dir, { recursive: true, force: true });
  dir = "";
});
