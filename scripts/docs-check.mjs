import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Every documentation gate CI runs, for a push CI skips: each docs: script is the one definition its CI step also runs.
// The probe first shows the Vale on this machine fires on a ticket ID; a Vale that reads no rule would pass every gate.
const { scripts } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const gates = Object.keys(scripts).filter((name) => name.startsWith("docs:") && name !== "docs:check");

const probe = spawnSync("vale", ["--ext=.md", "--config=.vale.ini"], { input: "previously 3F-1234\n", encoding: "utf8" });
const failed = probe.status === 1 ? [] : ["the Vale firing probe: Vale found no ticket ID in a line that carries one"];

for (const gate of gates) {
  console.log(`\n> pnpm ${gate}`);
  if (spawnSync("pnpm", ["--silent", gate], { stdio: "inherit" }).status !== 0) failed.push(gate);
}

if (failed.length > 0) {
  console.error(`\ndocs:check failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`\ndocs:check passed: the Vale firing probe and ${gates.length} gates`);
