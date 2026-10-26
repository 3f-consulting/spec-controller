import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["**/*.test.ts", "**/*.test-utils.ts"],
  },

  {
    files: ["packages/core/src/domain/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-syntax": [
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
];
