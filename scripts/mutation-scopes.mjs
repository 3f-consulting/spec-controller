// Names the mutation scopes a list of changed files reaches. Stryker resolves each pattern and each
// file to an absolute path and matches them with minimatch, dot files left unmatched.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { minimatch } from "minimatch";

const scopes = JSON.parse(readFileSync(process.argv[2], "utf8"));
const changed = readFileSync(0, "utf8").split("\n").filter(Boolean).map((name) => resolve(name));

const matches = (file, pattern) => minimatch(file, resolve(pattern), { dot: false });

const marks = (file, patterns) =>
  patterns.reduce(
    (marked, pattern) =>
      pattern.startsWith("!") ? marked && !matches(file, pattern.slice(1)) : marked || matches(file, pattern),
    false,
  );

const selected = scopes
  .filter(({ mutate }) => changed.some((file) => marks(file, mutate.split(","))))
  .map(({ scope }) => scope);

console.log(JSON.stringify(selected));
