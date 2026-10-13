// Every entry on the known list of boundary breaks names a break the tree still holds. dependency-cruiser
// passes over an entry that matches nothing in silence, and no maintained tool checks a known-violations
// list for stale entries, so this sets the list against every violation the cruise finds with it unapplied.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const list = ".dependency-cruiser-known.js";
const keyOf = ({ from, to, rule }) => JSON.stringify([from, to, rule]);

const liveViolations = () => {
  const cruise = spawnSync("pnpm", ["exec", "depcruise", "packages", "--no-ignore-known", "--output-type", "json"], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (cruise.error) throw cruise.error;
  let result;
  try {
    result = JSON.parse(cruise.stdout);
  } catch {
    throw new Error(`depcruise exited ${cruise.status} without a report: ${cruise.stderr.trim()}`);
  }
  if (!Array.isArray(result?.summary?.violations)) throw new Error("depcruise's report carries no violations");
  return result.summary.violations
    .filter(({ type }) => type === "dependency")
    .map(({ from, to, rule }) => ({ from, to, rule: rule.name }));
};

try {
  const entries = existsSync(list) ? (await import(pathToFileURL(join(process.cwd(), list)).href)).default : [];
  const live = new Set(liveViolations().map(keyOf));
  const stale = entries.filter((entry) => !live.has(keyOf(entry)));
  console.log(`known list: ${entries.length} entries, ${live.size} live breaks`);
  for (const { from, to, rule } of stale) console.log(`stale: ${from} -> ${to} (${rule})`);
  if (stale.length > 0) {
    console.log(`stale entries: ${stale.length}; each names a break the tree no longer holds, so remove it from the list`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`cannot check the known list: ${error.message}`);
  process.exitCode = 2;
}
