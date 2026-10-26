import checkFile from "eslint-plugin-check-file";
import globals from "globals";
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
const SOURCE_FILES = "{ts,mts,cts,js,mjs,cjs}";
const HOST_GLOBAL_MESSAGE = "the engine reaches nothing of its host — what it needs arrives as an argument";
const HOST_GLOBALS = [
  "globalThis",
  ...Object.keys(globals.node).filter((name) => name !== "process" && !Object.hasOwn(globals.builtin, name)),
].map((name) => ({ name, message: HOST_GLOBAL_MESSAGE }));

export default [
  { linterOptions: { reportUnusedDisableDirectives: "error" } },

  { ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"] },

  {
    files: ["packages/core/src/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.test-utils.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
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
    files: ["packages/*/src/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.test-utils.ts", "packages/core/src/**"],
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
          "**/src/domain/**/{operations,service,manager}/**/*.ts": "*.ts",
          "**/src/domain/**/*-{operations,service,manager}/**/*.ts": "*.ts",
          "**/src/domain/**/*{Operations,Service,Manager}/**/*.ts": "*.ts",
        },
      ],
    },
  },

  {
    files: [`**/*.${SOURCE_FILES}`],
    ignores: ["config/eslint.boundaries.js", `packages/*/src/**/*.${SOURCE_FILES}`],
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
      "no-restricted-syntax": ["error", ...SANDBOX_SELECTORS, ...CLASS_SELECTORS, ...DECLINED_IDIOM_SELECTORS],
    },
  },

  {
    files: [`packages/core/src/**/*.${SOURCE_FILES}`],
    ignores: ["**/*.test.ts", "**/*.test-utils.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
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
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-imports": ["error", { patterns: SEAM_PATTERNS }],
    },
  },
];
