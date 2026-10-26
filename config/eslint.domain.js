import tseslint from "typescript-eslint";

// A pattern, not a vocabulary list: any name or literal that carries another tool, its format, a flag or a syntax.
export const EXTERNAL =
  "/(specController|notChecks?|packageJson|manifest|json|yaml|vitest|cucumber|gherkin|junit|pytest|jest|rspec|github|actions|checkout|setup-|npm|pnpm|yarn|https?:|ssh:|:\\\\?\\/|@|^--)/i";

const TRANSLATE =
  "is named for another tool or its format, and core's domain speaks its own language. Name it with the term " +
  "doc/ubiquitous-language.md gives, and let the adapter that reads the format translate into it.";

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
          selector: `TSInterfaceDeclaration > Identifier.id[name=${EXTERNAL}]`,
          message: `An interface ${TRANSLATE}`,
        },
        {
          selector: `TSTypeAliasDeclaration > Identifier.id[name=${EXTERNAL}]`,
          message: `A type ${TRANSLATE}`,
        },
        {
          selector: `TSEnumDeclaration > Identifier.id[name=${EXTERNAL}]`,
          message: `An enum ${TRANSLATE}`,
        },
        {
          selector: `TSPropertySignature > Identifier.key[name=${EXTERNAL}]`,
          message: `A field ${TRANSLATE}`,
        },
        {
          selector: `TSPropertySignature > Literal.key[value=${EXTERNAL}]`,
          message: `A field ${TRANSLATE}`,
        },
        {
          selector: `FunctionDeclaration > Identifier.id[name=${EXTERNAL}]`,
          message: `A function ${TRANSLATE}`,
        },
        {
          selector: `VariableDeclarator > Identifier.id[name=${EXTERNAL}]`,
          message: `A variable ${TRANSLATE}`,
        },
        {
          selector: `:function > Identifier.params[name=${EXTERNAL}]`,
          message: `A parameter ${TRANSLATE}`,
        },
      ],
    },
  },
];
