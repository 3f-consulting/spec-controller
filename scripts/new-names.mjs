// Lists the names a change introduces, for review to read against canon's words. It never fails.
// Not @aburi/cli: Aburi models no fields, properties or parameters, and reports a renamed symbol
// as moved rather than as a new name, so listing new fields needed this AST read regardless.
import { execFileSync } from "node:child_process";
import ts from "typescript";

const base = process.env.NEW_NAMES_BASE ?? "origin/main";
const source = /^packages\/[^/]+\/src\/.*\.ts$/;
const excluded = /\.(test|d)\.ts$/;

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });

const filesAt = (ref) =>
  git("ls-tree", "-r", "--name-only", ref, "--", "packages")
    .split("\n")
    .filter((file) => source.test(file) && !excluded.test(file));

const DECLARATIONS = [
  ts.isTypeAliasDeclaration,
  ts.isInterfaceDeclaration,
  ts.isClassDeclaration,
  ts.isFunctionDeclaration,
  ts.isVariableDeclaration,
  ts.isParameter,
  ts.isPropertySignature,
  ts.isPropertyDeclaration,
  ts.isPropertyAssignment,
  ts.isMethodDeclaration,
  ts.isMethodSignature,
  ts.isEnumDeclaration,
  ts.isEnumMember,
  ts.isBindingElement,
  ts.isShorthandPropertyAssignment,
];

const declaredNames = (text, file) => {
  const names = new Set();
  const visit = (node) => {
    const name = node.name;
    if (name && ts.isIdentifier(name) && DECLARATIONS.some((is) => is(node)))
      names.add(name.text);
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true));
  return names;
};

const namesAt = (ref) => {
  const names = new Set();
  for (const file of filesAt(ref))
    for (const name of declaredNames(git("show", `${ref}:${file}`), file))
      names.add(name);
  return names;
};

const TITLE = /^\s*(Feature|Rule|Scenario Outline|Scenario|Example):\s*(.*)$/;
const words = (line) =>
  (line.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).map((w) => w.toLowerCase());

const titleWordsAt = (ref) => {
  const known = new Set();
  for (const line of git(
    "grep",
    "-h",
    "-E",
    TITLE.source,
    ref,
    "--",
    "features/*.feature",
  ).split("\n"))
    for (const word of words(line.replace(TITLE, "$2"))) known.add(word);
  return known;
};

const addedTitleWords = () => {
  const known = titleWordsAt(base);
  const fresh = new Set();
  for (const line of git(
    "diff",
    "--unified=0",
    `${base}...HEAD`,
    "--",
    "features/*.feature",
  ).split("\n")) {
    if (!line.startsWith("+") || !TITLE.test(line.slice(1))) continue;
    for (const word of words(line.slice(1).replace(TITLE, "$2")))
      if (!known.has(word)) fresh.add(word);
  }
  return [...fresh].sort();
};

const report = () => {
  const before = namesAt(base);
  const added = [...namesAt("HEAD")].filter((name) => !before.has(name)).sort();
  const files = git("diff", "--name-only", "--diff-filter=A", `${base}...HEAD`)
    .split("\n")
    .filter(Boolean)
    .sort();
  const titleWords = addedTitleWords();

  const section = (heading, items) => [
    `### ${heading} (${items.length})`,
    "",
    ...(items.length ? items.map((i) => `- \`${i}\``) : ["None."]),
    "",
  ];
  process.stdout.write(
    [
      "## New names this change introduces",
      "",
      `Compared with \`${base}\`. Read each against canon's Glossary, both never-write tables and this product's vocabulary.`,
      "",
      ...section("Types, functions, fields and other declared names", added),
      ...section("New files", files),
      ...section("New words in Feature, Rule and Scenario titles", titleWords),
    ].join("\n"),
  );
};

try {
  report();
} catch (error) {
  process.stdout.write(
    `## New names this change introduces\n\nThe list could not be made: ${error.message.split("\n")[0]}\n`,
  );
}
