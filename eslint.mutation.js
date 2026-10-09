import tseslint from "typescript-eslint";

export default [
  { ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"] },

  {
    files: ["packages/*/src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      // An equivalent mutant is removed at its source, never suppressed; a disable comment in a test file hides mutants too.
      // This is the whole gate only while stryker.config.js and mutation.yml configure no excludedMutations and no ignorers.
      "no-warning-comments": ["error", { terms: ["stryker disable"], location: "anywhere" }],
    },
  },
];
