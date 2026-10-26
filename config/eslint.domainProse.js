import tseslint from "typescript-eslint";
import i18next from "eslint-plugin-i18next";
import { proseRules } from "./eslint.messages.js";

// The domain says what happened as typed values; the words a reader sees are render/'s. No file in it is exempt.
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
    plugins: { i18next },
    rules: proseRules,
  },
];
