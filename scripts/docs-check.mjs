import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Every documentation gate CI runs, for a push CI skips: each docs: script is the one definition its CI step also runs.
// The probes show each rule .vale.ini turns on fires: each line breaks one rule, and Vale must name that rule.
// Each line's tokens are joined at run time, so the tree holds none of them.
const { scripts } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const gates = Object.keys(scripts).filter((name) => name.startsWith("docs:") && name !== "docs:check");

const probes = [
  ["Identifiers.TicketId", ["3F", "1234"].join("-")],
  ["Identifiers.ScenarioCode", ["SCN", "ABC", "001"].join("-")],
  ["Identifiers.ScenarioCode", ["CLM", "ABC", "001"].join("-")],
  ["History.Narrated", ["used", "to"].join(" ")],
];
const failed = [];
for (const [rule, line] of probes) {
  const probe = spawnSync("vale", ["--ext=.md", "--config=.vale.ini", "--output=line"], { input: `${line}\n`, encoding: "utf8" });
  if (probe.status !== 1 || !probe.stdout.includes(`:${rule}:`)) failed.push(`the Vale firing probe: ${rule} did not fire on a line that breaks it`);
}

for (const gate of gates) {
  console.log(`\n> pnpm ${gate}`);
  if (spawnSync("pnpm", ["--silent", gate], { stdio: "inherit" }).status !== 0) failed.push(gate);
}

if (failed.length > 0) {
  console.error(`\ndocs:check failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`\ndocs:check passed: the Vale firing probes for ${new Set(probes.map(([rule]) => rule)).size} rules and ${gates.length} gates`);
