import tseslint from "typescript-eslint";
import i18next from "eslint-plugin-i18next";

export default [
  {
    ignores: [
      "**/dist/**",
      ".stryker-tmp/**",
      "**/node_modules/**",
      "**/*.test.ts",
      "**/*.test-utils.ts",
      "packages/core/src/domain/messages.ts", // the catalogues are where message prose belongs
      "packages/spec-controller/src/messages.ts",
    ],
  },

  {
    files: ["packages/*/src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { i18next },
    rules: {
      // Over core no-restricted-syntax: it already walks literals and template parts and exempts imports, enum members,
      // type literals, comparisons and switch cases, which selectors would enumerate by hand. It tests each literal, and
      // each static part of a template on its own, trimmed. So it cannot see `${a} : ${b}` or `found ${n} files`, whose
      // every part is one word or punctuation, nor the initialiser of a variable named in capitals.
      "i18next/no-literal-string": [
        "error",
        {
          mode: "all", // every string, not only JSX text
          "should-validate-template": true, // off by default, when no template literal is checked
          words: {
            exclude: [
              "^\\S*$", // no whitespace: an identifier, discriminant, path or CLI argument
              /^[^\p{L}\p{N}]*$/u, // no letter or digit: layout, such as a table rule, a bullet or a separator
            ],
          },
          callees: { exclude: ["includes", "indexOf", "startsWith", "endsWith"] }, // they match text, never output it
          "object-properties": { exclude: [] }, // the default exempts the value of any key named in capitals
        },
      ],
      // The plugin exempts a variable named in capitals, and no option turns that off, so these selectors cover it.
      // Three words, not two: a two-word constant such as a CLI command is data, and prose runs longer.
      "no-restricted-syntax": [
        "error",
        ...["Literal[value=/\\S\\s+\\S+\\s+\\S/]", "TemplateElement[value.raw=/\\S\\s+\\S+\\s+\\S/]"].map((prose) => ({
          selector: `VariableDeclarator[id.name=/^[A-Z][A-Z0-9_]*$/] ${prose}`,
          message: "A constant named in capitals holds message prose. Move it into the package's catalogue.",
        })),
      ],
    },
  },
];
