import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import json from "@eslint/json";
import checkFile from "eslint-plugin-check-file";
import i18next from "eslint-plugin-i18next";
import sonarjs from "eslint-plugin-sonarjs";
import { builtinRules } from "eslint/use-at-your-own-risk";
import globals from "globals";
import tseslint from "typescript-eslint";

// Several concerns set no-restricted-syntax over files that overlap, and in flat config the last matching block's
// options replace the earlier ones. So each concern registers ESLint's own core rule under its own plugin name, and
// reports under that name. builtinRules comes from eslint/use-at-your-own-risk, ESLint's semi-public entry: if a later
// ESLint drops it, this configuration fails to load and the lint step reds.
const CONCERNS_RESTRICTING_SYNTAX = [
  "collection",
  "domain",
  "domainLiterals",
  "domainNumbers",
  "messages",
  "exitCode",
  "domainTests",
];
const restrictedSyntaxUnder = (concern) => [
  concern,
  { rules: { "no-restricted-syntax": builtinRules.get("no-restricted-syntax") } },
];

// The seam rule sets no-restricted-imports over the step files, so the temporary-directory rule takes its core rules under its own name too.
const temporaryDirectoryPlugin = {
  rules: {
    "no-restricted-imports": builtinRules.get("no-restricted-imports"),
    "no-restricted-properties": builtinRules.get("no-restricted-properties"),
  },
};

const PRODUCTION_THRESHOLD = {
  cognitiveComplexity: 15,
  maxLinesPerFunction: 40,
};

const TEST_THRESHOLD = {
  cognitiveComplexity: 15,
  maxLinesPerFunction: "off",
};

const ruleAtCeiling = (rule, ceiling) => {
  if (ceiling === "off") return "off";
  return rule === "sonarjs/cognitive-complexity"
    ? ["warn", ceiling]
    : ["warn", { max: ceiling, skipBlankLines: true, skipComments: true }];
};

const thresholdRules = (threshold) => ({
  "sonarjs/cognitive-complexity": ruleAtCeiling(
    "sonarjs/cognitive-complexity",
    threshold.cognitiveComplexity,
  ),
  "max-lines-per-function": ruleAtCeiling(
    "max-lines-per-function",
    threshold.maxLinesPerFunction,
  ),
});

const tsLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
};

export const MEASURED_GLOBS = ["packages/*/src/**/*.ts", "tests/steps/**/*.ts"];

const TEST_FILES = ["**/*.test.ts", "**/*.test-utils.ts"];
const SOURCE_FILES = "{ts,mts,cts,js,mjs,cjs}";
const PRODUCTION_FILES = "packages/*/src/**/*.ts";
const DOMAIN_FILES = "packages/core/src/domain/**/*.ts";

const SANDBOX_NAMES = "/__stryker__|STRYKER_ACTIVE_MUTANT|stryNS_|stryCov_|stryMutAct_/";
const SANDBOX_MESSAGE = "no code detects the mutation sandbox — name the tree a check reads instead";
const SANDBOX_SELECTORS = [
  { selector: `Identifier[name=${SANDBOX_NAMES}]`, message: SANDBOX_MESSAGE },
  { selector: `Literal[value=${SANDBOX_NAMES}]`, message: SANDBOX_MESSAGE },
  { selector: `TemplateElement[value.raw=${SANDBOX_NAMES}]`, message: SANDBOX_MESSAGE },
];
const CLASS_MESSAGE = "a package declares no class but an Error subclass — a concept is a type and the functions over it";
const CLASS_SELECTORS = [
  { selector: 'ClassDeclaration:not([superClass.type="Identifier"][superClass.name="Error"])', message: CLASS_MESSAGE },
  { selector: 'ClassExpression:not([superClass.type="Identifier"][superClass.name="Error"])', message: CLASS_MESSAGE },
];
const DECLINED_IDIOM_SELECTORS = [
  { selector: "Decorator", message: "a package declares no decorator — a dependency arrives as an explicit parameter" },
  {
    selector: ":matches(TSTypeAliasDeclaration, TSInterfaceDeclaration)[id.name=/Deps$/]",
    message: "no dependency bag — a function names each dependency it takes as its own parameter",
  },
];
const RECORD = ":matches(TSTypeAliasDeclaration, TSInterfaceDeclaration)";
const READONLY_RECORD_MESSAGE = "a core record is read-only — a value changes by transition, never in place";
const READONLY_RECORD_SELECTORS = [
  { selector: `${RECORD} :matches(TSPropertySignature, TSIndexSignature)[readonly!=true]`, message: READONLY_RECORD_MESSAGE },
  { selector: `${RECORD} :not(TSTypeOperator[operator="readonly"]) > TSArrayType`, message: READONLY_RECORD_MESSAGE },
  { selector: `${RECORD} TSTypeReference[typeName.name=/^(Array|Map|Set)$/]`, message: READONLY_RECORD_MESSAGE },
];
const SEAM_MESSAGE = "a step reaches the product through a seam: spawn the CLI, touch files, run git; never import its modules";
const SEAM_PATTERNS = [
  { regex: "^(\\.\\.?/)+packages(/|$)", message: SEAM_MESSAGE },
  { regex: "^@3f-consulting/spec-controller-core(/|$)", message: SEAM_MESSAGE },
];
const UNIT_TEMPORARY_DIRECTORY_HELPER = "packages/spec-controller/src/temporaryDirectory.test-utils.ts";
const STEP_TEMPORARY_DIRECTORY_HELPER = "tests/steps/support/temporaryDirectory.ts";
const temporaryDirectoryRules = (helper) => {
  const message = `make a temporary directory with temporaryDirectory from ${helper}, whose cleanup removes it whatever the test's outcome`;
  return {
    "temporaryDirectory/no-restricted-imports": [
      "error",
      {
        paths: [
          ...["node:fs", "fs"].map((name) => ({ name, importNames: ["mkdtemp", "mkdtempSync"], message })),
          ...["node:fs/promises", "fs/promises"].map((name) => ({ name, importNames: ["mkdtemp"], message })),
        ],
      },
    ],
    "temporaryDirectory/no-restricted-properties": [
      "error",
      { property: "mkdtemp", message },
      { property: "mkdtempSync", message },
    ],
  };
};
const HOST_GLOBAL_MESSAGE = "the engine reaches nothing of its host — what it needs arrives as an argument";
const HOST_GLOBALS = [
  "globalThis",
  ...Object.keys(globals.node).filter((name) => name !== "process" && !Object.hasOwn(globals.builtin, name)),
].map((name) => ({ name, message: HOST_GLOBAL_MESSAGE }));

const HARNESS = "/^(describe|it|test|beforeAll|beforeEach|afterEach|afterAll|expect|vi)$/";
// A Vitest call's callee reaches the runner's name through modifiers (it.skip.each) and calls (it.each(rows)). Four steps
// from the callee cover every chain Vitest documents: three modifiers and one call.
const CALLEE_STEPS = 4;
const calleePathsOfLength = (length) =>
  length === 0 ? ["callee"] : calleePathsOfLength(length - 1).flatMap((path) => [`${path}.object`, `${path}.callee`]);
const CALLEE_PATHS = Array.from({ length: CALLEE_STEPS + 1 }, (_, length) => calleePathsOfLength(length)).flat();
const vitestCall = (names) =>
  `CallExpression:matches(${CALLEE_PATHS.map((path) => `[${path}.name=/^(${names})$/]`).join(", ")})`;

const DESCRIBE = vitestCall("describe");
const DESCRIBE_BODY = `:is(${DESCRIBE}) > :function > BlockStatement`;
const TABLE = 'CallExpression[callee.object.name=/^(describe|it|test)$/][callee.property.name=/^(each|for)$/]';

// A call inside a function in the declaration runs only when that function is called, so only calls with no function between them and the declarator are flagged.
// A runner's extend registers fixtures, whose setup runs only when a test asks for them, so it is not flagged either.
const collectedCall = (declarator) =>
  `${declarator} CallExpression:not(${declarator} :function CallExpression):not([callee.property.name="extend"][callee.object.name=${HARNESS}])`;

const STATIC =
  "runs while Vitest collects the tests, outside any test, so mutation testing reads every mutant it reaches as static " +
  "and runs the whole related test set against it; move it into the test or a beforeEach";

// A pattern, not a vocabulary list: any name or literal that carries another tool, its format, a flag or a syntax.
const EXTERNAL =
  "/(specController|notChecks?|packageJson|manifest|json|yaml|vitest|cucumber|gherkin|junit|pytest|jest|rspec|github|actions|checkout|setup-|npm|pnpm|yarn|https?:|ssh:|:\\\\?\\/|@|^--)/i";

const NAME_TRANSLATE =
  "is named for another tool or its format, and core's domain speaks its own language. Name it with the term " +
  "docs/ubiquitous-language.md gives, and let the adapter that reads the format translate into it.";

const LITERAL_TRANSLATE =
  "names another tool, its format, a flag or a syntax, and core's domain speaks its own language. Let the adapter " +
  "that reads the format translate it into the term docs/ubiquitous-language.md gives.";

// A feature is a domain concept when core's domain has a module named for it; its scenarios carry the concept's code.
const FEATURES = new URL("features/", import.meta.url);
const DOMAIN = new URL("packages/core/src/domain/", import.meta.url);
const camelCase = (slug) => slug.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
const scenariosIn = (children) =>
  children.flatMap((child) => (child.rule ? scenariosIn(child.rule.children) : child.scenario ? [child.scenario] : []));
// A claim's code is carried by a scenario's tag or, whole, by a cell of an Outline's clm column.
const CLAIM_CODE = /^(?:CLM|SCN)-([A-Z0-9]{2,5})-\d+$/;
const clmCellsOf = (scenario) =>
  scenario.examples.flatMap((examples) => {
    const column = examples.tableHeader?.cells.findIndex((cell) => cell.value === "clm") ?? -1;
    return column === -1 ? [] : examples.tableBody.map((row) => row.cells[column]?.value ?? "");
  });
const claimCodesIn = (text) => {
  const { feature } = new Parser(new AstBuilder(() => ""), new GherkinClassicTokenMatcher()).parse(text);
  return scenariosIn(feature?.children ?? [])
    .flatMap((scenario) => [...scenario.tags.map((tag) => tag.name.slice(1)), ...clmCellsOf(scenario)])
    .map((code) => CLAIM_CODE.exec(code)?.[1])
    .filter((code) => code !== undefined);
};
const CONCEPT_CODES = [
  ...new Set(
    readdirSync(FEATURES)
      .filter((file) => file.endsWith(".feature"))
      .filter((file) => existsSync(new URL(`${camelCase(basename(file, ".feature"))}.ts`, DOMAIN)))
      .flatMap((file) => claimCodesIn(readFileSync(new URL(file, FEATURES), "utf8"))),
  ),
].sort();
if (CONCEPT_CODES.length === 0) {
  throw new Error(
    "No domain concept found: no feature in features/ names a module in packages/core/src/domain/, so the domain-tests rule has nothing to refuse.",
  );
}

const TEST_TITLE = vitestCall("describe|it|test");
const CONCEPT_CITATION = `/\\[(?:CLM|SCN)-(${CONCEPT_CODES.join("|")})-\\d+\\]/`;
const MISPLACED_TEST =
  "A test citing a domain concept's scenario tests a rule of core's domain. Move it to packages/core/src/domain/.";
const DOMAIN_TEST_SELECTORS = [
  { selector: `${TEST_TITLE} > Literal.arguments:first-child[value=${CONCEPT_CITATION}]`, message: MISPLACED_TEST },
  {
    selector: `${TEST_TITLE} > TemplateLiteral.arguments:first-child > TemplateElement[value.raw=${CONCEPT_CITATION}]`,
    message: MISPLACED_TEST,
  },
];

const PROSE = ["Literal[value=/\\S\\s+\\S+\\s+\\S/]", "TemplateElement[value.raw=/\\S\\s+\\S+\\s+\\S/]"];

// A files pattern that matches nothing lints nothing, and ESLint says nothing about it.
const COMMAND_MANIFEST = "packages/spec-controller/package.json";
if (!existsSync(new URL(COMMAND_MANIFEST, import.meta.url))) {
  throw new Error(
    `No command manifest found at ${COMMAND_MANIFEST}, so the no-runtime-dependency rule would check nothing.`,
  );
}

export default [
  { ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"] },

  {
    plugins: {
      sonarjs,
      i18next,
      "check-file": checkFile,
      temporaryDirectory: temporaryDirectoryPlugin,
      ...Object.fromEntries(CONCERNS_RESTRICTING_SYNTAX.map(restrictedSyntaxUnder)),
    },
  },

  { linterOptions: { reportUnusedDisableDirectives: "error" } },

  {
    files: MEASURED_GLOBS,
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(PRODUCTION_THRESHOLD),
  },

  {
    files: TEST_FILES,
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(TEST_THRESHOLD),
  },

  {
    files: ["packages/core/src/**/*.ts"],
    ignores: TEST_FILES,
    languageOptions: tsLanguageOptions,
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "process", message: "the engine stays testable with data alone" },
        { name: "Date", message: "the engine reads no clock — the instant arrives as an argument" },
        ...HOST_GLOBALS,
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "the engine reads no random number" },
      ],
    },
  },

  {
    files: [PRODUCTION_FILES],
    ignores: [...TEST_FILES, "packages/core/src/**"],
    languageOptions: tsLanguageOptions,
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "process", property: "exit", message: "set process.exitCode and return, so what was written drains first" },
      ],
    },
  },

  {
    files: [PRODUCTION_FILES],
    languageOptions: tsLanguageOptions,
    rules: {
      "check-file/filename-blocklist": [
        "error",
        {
          "**/src/domain/**/{operations,service,manager}{,.test}.ts": "*.ts",
          "**/src/domain/**/*-{operations,service,manager}{,.test}.ts": "*.ts",
          "**/src/domain/**/*{Operations,Service,Manager}{,.test}.ts": "*.ts",
          "**/src/domain/**/{operations,service,manager}/**/*.ts": "*.ts",
          "**/src/domain/**/*-{operations,service,manager}/**/*.ts": "*.ts",
          "**/src/domain/**/*{Operations,Service,Manager}/**/*.ts": "*.ts",
        },
      ],
    },
  },

  {
    files: [`**/*.${SOURCE_FILES}`],
    ignores: ["eslint.config.js", `packages/*/src/**/*.${SOURCE_FILES}`],
    languageOptions: tsLanguageOptions,
    rules: {
      "no-restricted-syntax": ["error", ...SANDBOX_SELECTORS],
    },
  },

  {
    files: [`packages/*/src/**/*.${SOURCE_FILES}`],
    languageOptions: tsLanguageOptions,
    rules: {
      "no-restricted-syntax": ["error", ...SANDBOX_SELECTORS, ...CLASS_SELECTORS, ...DECLINED_IDIOM_SELECTORS],
    },
  },

  {
    files: [`packages/core/src/**/*.${SOURCE_FILES}`],
    ignores: TEST_FILES,
    languageOptions: tsLanguageOptions,
    rules: {
      "no-restricted-syntax": [
        "error",
        ...SANDBOX_SELECTORS,
        ...CLASS_SELECTORS,
        ...DECLINED_IDIOM_SELECTORS,
        ...READONLY_RECORD_SELECTORS,
      ],
    },
  },

  {
    files: [`tests/steps/**/*.${SOURCE_FILES}`],
    languageOptions: tsLanguageOptions,
    rules: {
      "no-restricted-imports": ["error", { patterns: SEAM_PATTERNS }],
    },
  },

  {
    files: TEST_FILES,
    ignores: [UNIT_TEMPORARY_DIRECTORY_HELPER],
    languageOptions: tsLanguageOptions,
    rules: temporaryDirectoryRules(UNIT_TEMPORARY_DIRECTORY_HELPER),
  },

  {
    files: [`tests/**/*.${SOURCE_FILES}`],
    ignores: [STEP_TEMPORARY_DIRECTORY_HELPER],
    languageOptions: tsLanguageOptions,
    rules: temporaryDirectoryRules(STEP_TEMPORARY_DIRECTORY_HELPER),
  },

  {
    files: [PRODUCTION_FILES],
    languageOptions: tsLanguageOptions,
    rules: {
      // An equivalent mutant is removed at its source, never suppressed; a disable comment in a test file hides mutants too.
      // This is the whole gate only while stryker.config.js and mutation.yml configure no excludedMutations and no ignorers.
      "no-warning-comments": ["error", { terms: ["stryker disable"], location: "anywhere" }],
    },
  },

  {
    files: ["packages/**/*.test.ts", "packages/**/*.test-utils.ts"],
    ignores: [
      // A test title in each of these is built from a call over the CLI registry, so the call must run at collection.
      "packages/spec-controller/src/host.helpAtHostScope.test.ts",
      "packages/spec-controller/src/host.helpOfCommandTakingNoModifier.test.ts",
      "packages/spec-controller/src/host.noCommand.test.ts",
    ],
    languageOptions: tsLanguageOptions,
    rules: {
      "collection/no-restricted-syntax": [
        "error",
        {
          selector: collectedCall("Program > VariableDeclaration > VariableDeclarator"),
          message: `A call at module scope ${STATIC}.`,
        },
        {
          selector: collectedCall("Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator"),
          message: `A call at module scope ${STATIC}.`,
        },
        {
          selector: collectedCall(`${DESCRIBE_BODY} > VariableDeclaration > VariableDeclarator`),
          message: `A call in a describe body ${STATIC}.`,
        },
        {
          selector: `${DESCRIBE_BODY} > ExpressionStatement > CallExpression:not([callee.name=${HARNESS}]):not([callee.object.name=${HARNESS}]):not([callee.callee.object.name=${HARNESS}])`,
          message: `A call in a describe body ${STATIC}.`,
        },
        {
          // A call inside a function in the table runs in the test, so only calls with no function between them and the table are flagged.
          selector: `${TABLE} CallExpression:not(${TABLE} :function CallExpression)`,
          message: `A call in the rows of a test table ${STATIC}. Keep literal rows and build the rest in the test.`,
        },
        {
          selector: 'CallExpression[callee.name="beforeAll"]',
          message:
            "A beforeAll runs once for many tests, outside any of them, so mutation testing reads every mutant it reaches as static " +
            "and runs the whole related test set against it; use a beforeEach.",
        },
      ],
    },
  },

  {
    files: [PRODUCTION_FILES],
    ignores: TEST_FILES,
    languageOptions: tsLanguageOptions,
    rules: {
      // Over core no-restricted-syntax: it already walks literals and template parts and exempts imports, enum members,
      // type literals, comparisons and switch cases, which selectors would enumerate by hand. It tests each literal, and
      // each static part of a template on its own, trimmed. So it cannot see `${a} : ${b}` or `found ${n} files`, whose
      // every part is one word or punctuation, nor the initialiser of a variable named in capitals.
      "i18next/no-literal-string": [
        "error",
        {
          mode: "all",
          "should-validate-template": true,
          words: {
            // No whitespace: an identifier, discriminant, path or CLI argument. No letter or digit: layout, such as a table rule.
            exclude: ["^\\S*$", /^[^\p{L}\p{N}]*$/u],
          },
          // They match text, never output it.
          callees: { exclude: ["includes", "indexOf", "startsWith", "endsWith"] },
          // The default exempts the value of any key named in capitals.
          "object-properties": { exclude: [] },
        },
      ],
      // The plugin exempts a variable named in capitals, and no option turns that off, so these selectors cover it.
      // Three words, not two: a two-word constant such as a CLI command is data, and prose runs longer.
      "messages/no-restricted-syntax": [
        "error",
        ...PROSE.map((prose) => ({
          selector: `VariableDeclarator[id.name=/^[A-Z][A-Z0-9_]*$/] ${prose}`,
          message: "A constant named in capitals holds message prose. Move it into the package's catalogue.",
        })),
      ],
    },
  },

  {
    files: [DOMAIN_FILES],
    ignores: TEST_FILES,
    languageOptions: tsLanguageOptions,
    rules: {
      "domain/no-restricted-syntax": [
        "error",
        { selector: `TSInterfaceDeclaration > Identifier.id[name=${EXTERNAL}]`, message: `An interface ${NAME_TRANSLATE}` },
        { selector: `TSTypeAliasDeclaration > Identifier.id[name=${EXTERNAL}]`, message: `A type ${NAME_TRANSLATE}` },
        { selector: `TSEnumDeclaration > Identifier.id[name=${EXTERNAL}]`, message: `An enum ${NAME_TRANSLATE}` },
        { selector: `TSPropertySignature > Identifier.key[name=${EXTERNAL}]`, message: `A field ${NAME_TRANSLATE}` },
        { selector: `TSPropertySignature > Literal.key[value=${EXTERNAL}]`, message: `A field ${NAME_TRANSLATE}` },
        { selector: `FunctionDeclaration > Identifier.id[name=${EXTERNAL}]`, message: `A function ${NAME_TRANSLATE}` },
        { selector: `VariableDeclarator > Identifier.id[name=${EXTERNAL}]`, message: `A variable ${NAME_TRANSLATE}` },
        { selector: `:function > Identifier.params[name=${EXTERNAL}]`, message: `A parameter ${NAME_TRANSLATE}` },
      ],
      "domainLiterals/no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${EXTERNAL}]`, message: `A string ${LITERAL_TRANSLATE}` },
        { selector: `Literal[regex.pattern=${EXTERNAL}]`, message: `A regular expression ${LITERAL_TRANSLATE}` },
        { selector: `TemplateElement[value.raw=${EXTERNAL}]`, message: `A template part ${LITERAL_TRANSLATE}` },
      ],
      "domainNumbers/no-restricted-syntax": [
        "error",
        {
          // A negative number parses as a unary minus over its literal, so the selector names both shapes.
          selector: "TSLiteralType > Literal[raw=/^\\d/], TSLiteralType > UnaryExpression[operator='-'] > Literal[raw=/^\\d/]",
          message:
            "A number used as a type stands for something the domain decides. Name it, as a string literal or a named type, " +
            "and let the edge that needs a number map the name to it.",
        },
      ],
    },
  },

  {
    files: [PRODUCTION_FILES],
    ignores: [...TEST_FILES, "packages/spec-controller/src/exitCode.ts"],
    languageOptions: tsLanguageOptions,
    rules: {
      "exitCode/no-restricted-syntax": [
        "error",
        {
          // Any object: the process reaches most modules as a stand-in parameter, not as the global.
          selector:
            "AssignmentExpression > MemberExpression.left[property.name='exitCode'], " +
            "AssignmentExpression > MemberExpression.left[property.value='exitCode'], " +
            "UpdateExpression > MemberExpression[property.name='exitCode'], " +
            "ObjectPattern > Property > MemberExpression.value[property.name='exitCode'], " +
            "ArrayPattern > MemberExpression[property.name='exitCode']",
          message:
            "Only exitCode.ts sets the process's exit code. End the run through endRunOn, " +
            "so the crash guard reads what this run set.",
        },
      ],
    },
  },

  {
    files: ["packages/**/*.test.ts"],
    ignores: ["packages/core/src/domain/**"],
    languageOptions: tsLanguageOptions,
    rules: {
      "domainTests/no-restricted-syntax": ["error", ...DOMAIN_TEST_SELECTORS],
    },
  },

  {
    files: ["packages/*/src/**/messages.*.json"],
    plugins: { json },
    language: "json/json",
    rules: {
      "json/no-duplicate-keys": "error",
    },
  },

  {
    files: [COMMAND_MANIFEST],
    plugins: { json },
    language: "json/json",
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Document > Object > Member[name.value=/^(dependencies|peerDependencies|optionalDependencies|bundleDependencies|bundledDependencies)$/]",
          message:
            "The command declares no runtime dependency. Its bundle carries what it uses, " +
            "so a runtime dependency makes installing the command install another package.",
        },
      ],
    },
  },
];
