import tseslint from "typescript-eslint";
import { EXTERNAL } from "./eslint.domain.js";

const TRANSLATE =
  "names another tool, its format, a flag or a syntax, and core's domain speaks its own language. Let the adapter " +
  "that reads the format translate it into the term doc/ubiquitous-language.md gives.";

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
          selector: `Literal[value=${EXTERNAL}]`,
          message: `A string ${TRANSLATE}`,
        },
        {
          selector: `Literal[regex.pattern=${EXTERNAL}]`,
          message: `A regular expression ${TRANSLATE}`,
        },
        {
          selector: `TemplateElement[value.raw=${EXTERNAL}]`,
          message: `A template part ${TRANSLATE}`,
        },
      ],
    },
  },
];
