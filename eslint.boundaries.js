import checkFile from "eslint-plugin-check-file";
import tseslint from "typescript-eslint";

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
const SEAM_MESSAGE = "a step reaches the product through a seam: spawn the CLI, touch files, run git; never import its modules";
const SEAM_PATTERNS = [
  { regex: "^(\\.\\.?/)+packages(/|$)", message: SEAM_MESSAGE },
  { regex: "^@3f-consulting/spec-controller-core(/|$)", message: SEAM_MESSAGE },
];
const SOURCE_FILES = "{ts,mts,cts,js,mjs,cjs}";

export default [
  { linterOptions: { reportUnusedDisableDirectives: "error" } },

  { ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"] },

  {
    files: ["packages/core/src/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.testkit.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "process", message: "the engine stays testable with data alone" },
        { name: "Date", message: "the engine reads no clock — the instant arrives as an argument" },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "the engine reads no random number" },
      ],
    },
  },

  {
    files: ["packages/*/src/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.testkit.ts", "packages/core/src/**"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "process", property: "exit", message: "set process.exitCode and return, so what was written drains first" },
      ],
    },
  },

  {
    files: ["packages/*/src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-blocklist": [
        "error",
        {
          "**/src/domain/**/{operations,service,manager}{,.test}.ts": "*.ts",
          "**/src/domain/**/*-{operations,service,manager}{,.test}.ts": "*.ts",
          "**/src/domain/**/*{Operations,Service,Manager}{,.test}.ts": "*.ts",
        },
      ],
    },
  },

  {
    files: [`**/*.${SOURCE_FILES}`],
    ignores: ["eslint.boundaries.js", `packages/*/src/**/*.${SOURCE_FILES}`],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-syntax": ["error", ...SANDBOX_SELECTORS],
    },
  },

  {
    files: [`packages/*/src/**/*.${SOURCE_FILES}`],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-syntax": ["error", ...SANDBOX_SELECTORS, ...CLASS_SELECTORS],
    },
  },

  {
    files: [`tests/steps/**/*.${SOURCE_FILES}`],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-imports": ["error", { patterns: SEAM_PATTERNS }],
    },
  },
];
