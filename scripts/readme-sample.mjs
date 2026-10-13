import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readme = join(root, "README.md");
const fixture = join(root, "tests/fixtures/readme-sample");
// The workspace source, not `pnpm spec-controller`, which resolves to the published pin.
const cli = join(root, "packages/spec-controller/src/cli.ts");
const sections = [
  { heading: "### Run verdict", toEnd: false },
  { heading: "## Scenario Reconciliations", toEnd: true },
];
const start = "<!-- sample-report:start -->";
const end = "<!-- sample-report:end -->";
const rewrite = "node scripts/readme-sample.mjs --write";

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const report = () => {
  // From the fixture's directory, so balance reads the fixture's workflows and not this repository's.
  const run = spawnSync(
    "pnpm",
    ["exec", "tsx", cli, "balance", "--features", "features", "--vitest", "vitest.json", "--package-json", "package.json"],
    { cwd: fixture, encoding: "utf8" },
  );
  if (run.status !== 0 && run.status !== 1) {
    fail(`balance on the fixture exited ${run.status ?? run.signal}, not a verdict:\n${run.stderr}${run.stdout}`);
  }
  return run.stdout;
};

const trimBlank = (lines) => {
  let last = lines.length;
  while (last > 0 && lines[last - 1].trim() === "") last -= 1;
  return lines.slice(0, last);
};

const excerpt = (text) => {
  const lines = text.split("\n");
  return sections
    .map(({ heading, toEnd }) => {
      const from = lines.indexOf(heading);
      if (from === -1) fail(`the report has no "${heading}" section`);
      const next = lines.findIndex((line, i) => i > from && line.startsWith("#"));
      const to = toEnd || next === -1 ? lines.length : next;
      return trimBlank(lines.slice(from, to)).join("\n");
    })
    .join("\n\n");
};

const occurrences = (text, marker) => text.split(marker).length - 1;

// .vale.ini ignores the class: Vale lints fenced code here, and the sample's scenario codes are the report's, not prose.
const block = (sample) =>
  `${start}\n<div class="sample-report">\n\n\`\`\`markdown\n${sample}\n\`\`\`\n\n</div>\n${end}`;

const text = readFileSync(readme, "utf8");
for (const marker of [start, end]) {
  const count = occurrences(text, marker);
  if (count !== 1) fail(`README.md carries ${marker} ${count} times; it must carry it exactly once`);
}
const from = text.indexOf(start);
const to = text.indexOf(end) + end.length;
if (to < from) fail(`README.md carries ${end} before ${start}`);

const expected = block(excerpt(report()));
const actual = text.slice(from, to);

if (process.argv.includes("--write")) {
  writeFileSync(readme, text.slice(0, from) + expected + text.slice(to));
  console.log("README.md sample report rewritten");
} else if (actual === expected) {
  console.log("README.md sample report matches what balance prints on the fixture");
} else {
  const want = expected.split("\n");
  const have = actual.split("\n");
  console.log("README.md sample report differs from what balance prints on the fixture:");
  for (let i = 0; i < Math.max(want.length, have.length); i += 1) {
    if (want[i] === have[i]) continue;
    if (have[i] !== undefined) console.log(`line ${i + 1} - ${have[i]}`);
    if (want[i] !== undefined) console.log(`line ${i + 1} + ${want[i]}`);
  }
  console.log(`rewrite it with: ${rewrite}`);
  process.exitCode = 1;
}
