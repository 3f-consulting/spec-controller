import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["**/*.test.ts", "**/*.test-utils.ts", "packages/spec-controller/src/exitCode.ts"],
  },

  {
    files: ["packages/*/src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-syntax": [
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
];
