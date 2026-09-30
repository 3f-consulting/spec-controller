/**
 * THE FILE-SHAPED HALF OF `pnpm lint:boundaries` — the boundary claims a module graph cannot see.
 *
 * WHY THERE ARE TWO TOOLS BEHIND ONE GATE, AND WHY IT IS A MEASUREMENT RATHER THAN A PREFERENCE.
 * `dependency-cruiser` evaluates a `forbidden` rule per dependency EDGE, so a module with no
 * imports cannot violate one. A planted, dependency-free `packages/core/src/domain/operations.ts`
 * PASSED a `{ from: <anemic pattern>, to: {} }` rule there and redded the same file the instant it
 * imported one thing — and inert data is the anemic split's own END STATE, so that rule would have
 * been blind exactly where it matters most. `process.cwd()` needs no import at all, so there is no
 * edge to judge; neither does reading the clock, or naming the mutation sandbox. ESLint visits
 * FILES, and every rule here lives here for that one reason.
 *
 * WHY THIS IS A SECOND CONFIG RATHER THAN A BLOCK IN `eslint.config.mjs`. The root config IS the
 * complexity check, and its `MEASURED_GLOBS` export is that check's own answer to which files it
 * judges. Boundary rules there would make one command
 * assert two unrelated claims under one citation, and would put rules into a config whose scope is
 * another check's measurement. One gate, one claim.
 *
 * NO PRESET, NO `recommended`, NO STYLE RULES — the same discipline the root config keeps. Every
 * rule is a claim this repository already makes of itself.
 */

import checkFile from "eslint-plugin-check-file";
import tseslint from "typescript-eslint";

/** Stryker's global, its active-mutant variable, and the functions its instrumenter prepends. */
const SANDBOX_NAMES = "/__stryker__|STRYKER_ACTIVE_MUTANT|stryNS_|stryCov_|stryMutAct_/";
const SANDBOX_MESSAGE = "no code detects the mutation sandbox — name the tree a check reads instead";

export default [
  /**
   * A SUPPRESSION CANNOT OUTLIVE ITS REASON, here as in `eslint.config.mjs`.
   *
   * The ruling (`fitness-functions.md` → *A suppression cannot outlive its reason*) is about the
   * linter, not about either check, so both configs set it and neither is the exception. An
   * `eslint-disable` that suppresses nothing is a claim that has stopped being true; ESLint 9
   * defaults it to `"warn"`, which exits 0 and so cannot be told from no directive at all at the
   * step's recorded outcome. An object with no `files` key matches every file this config lints.
   */
  { linterOptions: { reportUnusedDisableDirectives: "error" } },

  /**
   * `dist/` is the same modules compiled; `.stryker-tmp/` holds whole sandbox COPIES of the tree
   * left behind by a mutation run, including files that no longer exist. Linting either reports a
   * violation at a path no author can edit, and a gate that reds on an artefact nobody wrote is a
   * gate people learn to re-run rather than read.
   */
  { ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"] },

  /**
   * The engine reads no ambient input — not the `process` global, not the clock, not a random
   * number — so the same data in gives the same answer out, and the engine stays testable with
   * data alone. The instant a run started arrives as an argument; a `Date` used only as a TYPE is
   * not a read and passes.
   *
   * TESTS ARE EXEMPT. A test beside the engine may read `process.cwd()` or build a fixed
   * `new Date("…")` fixture; neither makes the engine it tests impure.
   *
   * ESLint reads the AST, so a comment naming `process.cwd()` is not an identifier, and neither is a
   * property named `process` or `Date` on someone else's object.
   */
  {
    files: ["packages/core/src/**/*.ts"],
    ignores: ["**/*.test.ts"],
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

  /**
   * `anemicDomain.ts`'s whole rule — a domain module must not be named for a procedural layer.
   *
   * A concept module co-locates its type with the pure functions over it and owns its own
   * behaviour. The failure mode is the anemic split: the behaviour is lifted out into a module
   * beside it named for a procedural layer, leaving the concept as inert data. Canon asks for
   * exactly this much mechanism — "a filename-signature static check is enough to fence the obvious
   * case" (`technical-design/functional-domain-modelling.md`; the `fitness-functions.md` ruling of
   * 2026-08-05).
   *
   * SCOPE IS THE DISCRIMINATOR, NOT THE WORD. A `renderService.ts` under `render/` is ordinary and
   * legitimate — the claim is about where behaviour lives relative to its concept. A check that
   * redded the word wherever it appeared would be a spell-checker, and the first legitimate
   * `*Service` at an edge would get it switched off. Hence the `src/domain` segment on every key
   * below — the word alone condemns nothing.
   *
   * THREE GLOB FAMILIES, BECAUSE THE OLD CHECK WAS THREE PREDICATES. It condemned a stem that
   * EQUALLED a procedural-layer word, or ended `-word`, or ended `Capitalised` — so
   * `operations.ts`, `ledger-operations.ts` and `ledgerOperations.ts` all red while
   * `ledgeroperations.ts`, `managers.ts`, `myServices.ts` and `operational.ts` all pass. A single
   * `*{operations,service,manager}.ts` glob would over-match `ledgeroperations.ts`, which the old
   * check passed: that is a boundary NARROWING, which this conversion is not allowed to do.
   *
   * `{,.test}` IS DELIBERATE AND IT MATCHES THE OLD `.test` STRIP. A `ledgerOperations.test.ts` is
   * the test of a module that must not exist, so it reds too. Without it the module reds and its
   * test does not, which leaves a reader wondering whether the test was somehow blessed. This block
   * therefore does NOT exclude test files — the block above does, and they are different claims.
   *
   * THE VALUE MUST BE A GLOB, NOT A SENTENCE. `filename-blocklist` takes `{ <blocked glob>: <the
   * naming pattern to use instead> }` and validates the VALUE as a glob. A prose string there makes
   * ESLint report `invalid pattern` on every file it lints — a malformed config that looks from the
   * exit code exactly like a tree full of violations. `"*.ts"` says "name it for the concept",
   * which is the whole of the advice this rule has to give.
   *
   * IT IS SCOPED TO EVERY PACKAGE'S `src` RATHER THAN CORE-ONLY on purpose: the old check read `git
   * ls-files` for the whole repository and keyed on the `/src/domain/` segment wherever it appeared,
   * so a domain that grows inside a second package is held to the same rule on the day it appears.
   */
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

  /**
   * No file in the repository detects the mutation sandbox. Stryker runs the suite inside a copy
   * of the tree, and code that asks whether it is standing in that copy — by Stryker's global, its
   * active-mutant variable, or the functions its instrumenter prepends — behaves differently under
   * mutation than in CI, so the mutation score stops measuring the code that ships. A check handed
   * the wrong tree is fixed by naming the tree it reads, never by detecting where it stands.
   *
   * THREE NODE KINDS, because detection can spell the name three ways: as an identifier
   * (`process.env.__STRYKER_ACTIVE_MUTANT__`, `globalThis.__stryker__`), as a string
   * (`process.env["…"]`), or inside a template literal. A comment is not a node, so prose that
   * names the sandbox passes.
   *
   * IT READS EVERY SOURCE FILE, not just `packages/`, because detection is likeliest in the test
   * tree and the tool configs. This file is the one exception: its own pattern would match itself.
   */
  {
    files: ["**/*.{ts,mts,cts,js,mjs,cjs}"],
    ignores: ["eslint.boundaries.mjs"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Identifier[name=${SANDBOX_NAMES}]`, message: SANDBOX_MESSAGE },
        { selector: `Literal[value=${SANDBOX_NAMES}]`, message: SANDBOX_MESSAGE },
        { selector: `TemplateElement[value.raw=${SANDBOX_NAMES}]`, message: SANDBOX_MESSAGE },
      ],
    },
  },
];
