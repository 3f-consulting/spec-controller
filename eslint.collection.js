import tseslint from "typescript-eslint";

const HARNESS = "/^(describe|it|test|beforeAll|beforeEach|afterEach|afterAll|expect|vi)$/";
const DESCRIBE =
  'CallExpression[callee.name="describe"], CallExpression[callee.object.name="describe"], CallExpression[callee.callee.object.name="describe"]';
const DESCRIBE_BODY = `:is(${DESCRIBE}) > :function > BlockStatement`;
const NOT_A_FUNCTION = "[init.type!=/^(ArrowFunctionExpression|FunctionExpression)$/]";
const TABLE = 'CallExpression[callee.object.name=/^(describe|it|test)$/][callee.property.name=/^(each|for)$/]';

const STATIC =
  "runs while Vitest collects the tests, outside any test, so mutation testing reads every mutant it reaches as static " +
  "and runs the whole related test set against it; move it into the test or a beforeEach";

export default [
  {
    ignores: [
      "**/dist/**",
      ".stryker-tmp/**",
      "**/node_modules/**",
      // A test title in each of these is built from a call over the CLI registry, so the call must run at collection.
      "packages/spec-controller/src/host.helpAtHostScope.test.ts",
      "packages/spec-controller/src/host.helpOfCommandTakingNoModifier.test.ts",
      "packages/spec-controller/src/host.noCommand.test.ts",
    ],
  },

  {
    files: ["packages/**/*.test.ts", "packages/**/*.testkit.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Program > VariableDeclaration > VariableDeclarator${NOT_A_FUNCTION} CallExpression`,
          message: `A call at module scope ${STATIC}.`,
        },
        {
          selector: `Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator${NOT_A_FUNCTION} CallExpression`,
          message: `A call at module scope ${STATIC}.`,
        },
        {
          selector: `${DESCRIBE_BODY} > VariableDeclaration > VariableDeclarator${NOT_A_FUNCTION} CallExpression`,
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
];
