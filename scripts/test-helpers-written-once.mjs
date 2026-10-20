import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Our own code: jscpd over test code reports 186 clones in 119 of 241 files and finds 1 of the 4 closedPipe copies,
// and sonarjs/no-identical-functions compares within one file only.
// Two helpers match when their name, their comment-free printed text and the binding of every free identifier agree:
// the same text reading a file-local value that differs is a different helper.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isTestFile = (path) => path.endsWith(".test.ts") || path.endsWith(".test-utils.ts");
const printer = ts.createPrinter({ removeComments: true });

const changed = readFileSync(0, "utf8")
  .split("\n")
  .filter((path) => isTestFile(path) && existsSync(join(root, path)));
const population = execFileSync("git", ["ls-files", "-z", "*.test.ts", "*.test-utils.ts"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const helperFunction = (init) => init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));

function topLevelDeclarations(source) {
  const declarations = new Map();
  const helpers = [];
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement)) {
      const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
      for (const declaration of statement.declarationList.declarations) {
        for (const name of boundNames(declaration.name)) declarations.set(name, declaration);
        if (isConst && ts.isIdentifier(declaration.name) && helperFunction(declaration.initializer)) {
          helpers.push({ name: declaration.name.text, node: declaration });
        }
      }
    } else if (statement.name && ts.isIdentifier(statement.name) && !ts.isModuleDeclaration(statement)) {
      declarations.set(statement.name.text, statement);
      if (ts.isFunctionDeclaration(statement) && statement.body) helpers.push({ name: statement.name.text, node: statement });
    }
  }
  return { declarations, helpers };
}

function boundNames(name) {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) => (ts.isOmittedExpression(element) ? [] : boundNames(element.name)));
}

function importBindings(source, file) {
  const bindings = new Map();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const specifier = statement.moduleSpecifier.text;
    const module = specifier.startsWith(".") ? normalize(join(dirname(file), specifier)).replace(/\.[cm]?[jt]s$/, "") : specifier;
    const { name, namedBindings } = statement.importClause;
    if (name) bindings.set(name.text, `${module}#default`);
    if (namedBindings && ts.isNamespaceImport(namedBindings)) bindings.set(namedBindings.name.text, `${module}#*`);
    for (const element of namedBindings && ts.isNamedImports(namedBindings) ? namedBindings.elements : []) {
      bindings.set(element.name.text, `${module}#${(element.propertyName ?? element.name).text}`);
    }
  }
  return bindings;
}

const NOT_A_REFERENCE = [
  (parent, node) => ts.isPropertyAccessExpression(parent) && parent.name === node,
  (parent, node) => ts.isQualifiedName(parent) && parent.right === node,
  (parent, node) => ts.isBindingElement(parent) && parent.propertyName === node,
  (parent, node) => ts.isPropertyAssignment(parent) && parent.name === node,
  (parent, node) => (ts.isMethodDeclaration(parent) || ts.isPropertySignature(parent) || ts.isMethodSignature(parent)) && parent.name === node,
  (parent, node) => (ts.isPropertyDeclaration(parent) || ts.isGetAccessor(parent) || ts.isSetAccessor(parent)) && parent.name === node,
  (parent) => ts.isLabeledStatement(parent) || ts.isBreakOrContinueStatement(parent),
];

function freeIdentifiers(node) {
  const declared = new Set();
  const referenced = new Set();
  const visit = (child) => {
    if (ts.isIdentifier(child)) {
      const parent = child.parent;
      if (parent.name === child && (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent) || ts.isFunctionLike(parent) || ts.isTypeParameterDeclaration(parent) || ts.isClassLike(parent))) {
        declared.add(child.text);
      } else if (!NOT_A_REFERENCE.some((test) => test(parent, child))) {
        referenced.add(child.text);
      }
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  return [...referenced].filter((name) => !declared.has(name)).sort();
}

function keyer(source, file) {
  const { declarations } = topLevelDeclarations(source);
  const imports = importBindings(source, file);
  const keys = new Map();
  const printed = (node) => printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/^export (default )?/, "");
  const keyOf = (name, node, resolving = new Set()) => {
    if (keys.has(node)) return keys.get(node);
    resolving.add(node);
    const bindingOf = (free) => {
      if (free === name) return "self";
      if (imports.has(free)) return `import:${imports.get(free)}`;
      const local = declarations.get(free);
      if (!local) return `global:${free}`;
      return resolving.has(local) ? `cycle:${free}` : `local:${keyOf(free, local, resolving)}`;
    };
    const key = JSON.stringify([name, printed(node), freeIdentifiers(node).map((free) => [free, bindingOf(free)])]);
    resolving.delete(node);
    keys.set(node, key);
    return key;
  };
  return keyOf;
}

const byKey = new Map();
const changedHelpers = [];
for (const file of population) {
  const source = ts.createSourceFile(file, readFileSync(join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const keyOf = keyer(source, file);
  for (const { name, node } of topLevelDeclarations(source).helpers) {
    const helper = { file, name, key: keyOf(name, node), line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1 };
    byKey.set(helper.key, [...(byKey.get(helper.key) ?? []), helper]);
    if (changed.includes(file)) changedHelpers.push(helper);
  }
}

const copies = changedHelpers.flatMap((helper) =>
  byKey
    .get(helper.key)
    .filter((other) => other.file !== helper.file)
    .map((other) => `${helper.file}:${helper.line} ${helper.name} is also declared at ${other.file}:${other.line}; move it into a *.test-utils.ts`),
);
if (copies.length > 0) {
  console.log(copies.join("\n"));
  process.exit(1);
}
console.log(`${changed.length} changed test file(s), ${changedHelpers.length} helper(s): no copy of a helper declared in another test file`);
