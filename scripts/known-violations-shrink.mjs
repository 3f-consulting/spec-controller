// The known list of boundary breaks may only shrink. No maintained tool ratchets a dependency-cruiser
// baseline, so this compares the list with itself at a base commit and names every entry the base lacks.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const list = ".dependency-cruiser-known.js";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const keyOf = ({ from, to, rule }) => JSON.stringify([from, to, rule]);

const importList = async (file) => (await import(pathToFileURL(file).href)).default;

const atBase = async (base) => {
  if (spawnSync("git", ["cat-file", "-e", `${base}:${list}`]).status !== 0) return undefined;
  const scratch = mkdtempSync(join(tmpdir(), "known-violations-"));
  try {
    const file = join(scratch, "known.mjs");
    writeFileSync(file, git("show", `${base}:${list}`));
    return await importList(file);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

try {
  const base = git("rev-parse", "--verify", `${process.argv[2]}^{commit}`);
  const before = await atBase(base);
  if (before === undefined) {
    console.log(`no known list at ${base}: nothing to hold this one to`);
  } else {
    const held = new Set(before.map(keyOf));
    const head = existsSync(list) ? await importList(join(process.cwd(), list)) : [];
    const added = head.filter((entry) => !held.has(keyOf(entry)));
    console.log(`known list: ${before.length} entries at ${base}, ${head.length} at the head`);
    for (const { from, to, rule } of added) console.log(`added: ${from} -> ${to} (${rule})`);
    if (added.length > 0) {
      console.log(`${added.length} entries added; the known list may only shrink — fix the break instead`);
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(`cannot compare the known list: ${error.message}`);
  process.exitCode = 2;
}
