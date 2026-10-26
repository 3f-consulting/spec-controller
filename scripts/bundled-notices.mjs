// Reads the command build's metafile and a notices file, and fails unless the notices carry an entry for every package the
// bundle carries and no line reads undefined. Usage: node scripts/bundled-notices.mjs <metafile.json> <THIRD-PARTY-NOTICES.txt>
// The metafile's inputs are relative to the directory the build ran in, the command package's own.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const [metafilePath, noticesPath] = process.argv.slice(2);
const command = resolve(dirname(fileURLToPath(import.meta.url)), "../packages/spec-controller");
const manifestOf = (dir) => JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
const named = (dir) => existsSync(join(dir, "package.json")) && manifestOf(dir).name !== undefined;
const packageOf = (file) => {
  for (let dir = dirname(file); dir !== dirname(dir); dir = dirname(dir)) if (named(dir)) return dir;
  return undefined;
};

const { inputs } = JSON.parse(readFileSync(metafilePath, "utf8"));
const carried = new Set(Object.keys(inputs).map((input) => packageOf(resolve(command, input))));
carried.delete(undefined);
carried.delete(command);

const lines = readFileSync(noticesPath, "utf8").split("\n");
const expected = [...carried].sort().map((dir) => {
  const { name, version } = manifestOf(dir);
  return dir.split(sep).includes("node_modules") ? `${name}@${version}` : name;
});
const missing = expected.filter((entry) => !lines.some((line) => line.startsWith(`${entry} (`) && line.endsWith(")")));
const undefinedAt = lines.flatMap((line, at) => (/\bundefined\b/.test(line) ? [`line ${at + 1}: ${line}`] : []));

const failures = [
  ...(expected.includes("@3f-consulting/spec-controller-core") ? [] : ["the metafile names no input from @3f-consulting/spec-controller-core"]),
  ...missing.map((entry) => `no notice for ${entry}`),
  ...undefinedAt.map((line) => `a notice reads undefined, at ${line}`),
];
console.log(`the bundle carries ${expected.length} packages: ${expected.join(", ")}`);
for (const failure of failures) console.log(failure);
process.exit(failures.length > 0 ? 1 : 0);
