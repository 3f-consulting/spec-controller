/**
 * THE IMPORT-BOUNDARY HALF OF `pnpm lint:boundaries` — the CI step for the import-boundary
 * fitness check. Configuration only: no rule logic is written here, so an adopter copies the file.
 *
 * A RULE JUDGES THE MODULE A SPECIFIER RESOLVES TO, NOT THE SPECIFIER. A relative escape
 * `../../spec-controller/src/host.js` is reported as `packages/spec-controller/src/host.ts`, and a
 * dynamic `await import("node:fs")` is an edge like any other. A comment produces no edge, so prose
 * naming a forbidden module is never a false positive.
 *
 * TESTS ARE EXEMPT unless a rule says otherwise: each `from` carries `pathNot: "\\.test\\.ts$"`,
 * so a unit test beside a module may reach what the module itself may not. The one exception,
 * `child-process-outside-its-homes`, says why beside it.
 *
 * WHAT IS NOT HERE, AND THE MEASUREMENT THAT PUT IT SOMEWHERE ELSE. A `forbidden` rule is evaluated
 * per dependency EDGE, so a module with no imports cannot violate one. A planted, dependency-free
 * `packages/core/src/domain/operations.ts` PASSED a `{ from: <anemic pattern>, to: {} }` rule and
 * redded the same file the instant it imported one thing. Inert data is the anemic split's own end
 * state, so that rule would have been blind exactly where it matters most. The procedural-layer
 * filename rule therefore lives in `eslint.boundaries.mjs`, which visits FILES, and so do the claims
 * that need no import at all: the `process` global, the clock, and naming the mutation sandbox. Two
 * tools, one gate — and the split is measured rather than stylistic.
 *
 * NO `domain → app` RULE. It needs none of its own: the domain is inside the core, so
 * `core-imports-app` already refuses it. That was measured, not assumed.
 */
export default {
  forbidden: [
    /**
     * `enginePurity`'s `impure-import`, app half — and `domainPurity`'s `app-import`, which the
     * domain being inside the core makes redundant.
     *
     * Keeps the pure core embeddable by an external consumer without dragging the CLI, the ingest
     * and the run-management along.
     *
     * THE `to.path` IS THREE PATTERNS AND ALL THREE ARE LOAD-BEARING. A bare `import
     * "spec-controller"` from `packages/core/src` comes back `couldNotResolve: true` with
     * `resolved: "spec-controller"` — the package IS installed, but it exports no root subpath — so
     * a rule written only against `^packages/spec-controller/` lets that plant through in silence
     * while the module count rises by one. A tool that cannot resolve a specifier does not say so in
     * a rule's verdict; it says so in a field the rule never reads. The third pattern therefore
     * matches the RAW specifier, and the workspace and installed forms are named beside it.
     *
     * THE `^` ANCHOR IS WHAT KEEPS THE CORE ITSELF OUT. `@3f-consulting/spec-controller-core` is the
     * core and is fine; anchoring at the start of the specifier excludes it, exactly as the old
     * check's `(?:^|\/)spec-controller(?:\/|$)` did.
     */
    {
      name: "core-imports-app",
      severity: "error",
      comment:
        "a core module must not import the spec-controller app package — by workspace path, by installed path, or by a bare specifier that resolves to nothing",
      from: { path: "^packages/core/src/", pathNot: "\\.test\\.ts$" },
      to: {
        path: [
          "^packages/spec-controller/",
          "^node_modules/spec-controller/",
          "^spec-controller(/|$)",
        ],
      },
    },

    /**
     * The app reaches the engine only through the engine's published entry point, so the engine
     * can change anything behind that entry without breaking the app.
     *
     * THE `to.path` MATCHES THE RESOLVED MODULE, NOT THE SPECIFIER. The workspace resolves
     * `@3f-consulting/spec-controller-core` to `packages/core/src/index.ts` and its `/internal`
     * subpath to `packages/core/src/internal.ts`, so the rule refuses every module under core's
     * `src/` or `dist/` except the entry itself. That catches the `/internal` subpath and a relative
     * escape into core's source by one pattern. The installed and unresolved forms are named beside
     * it, for the reason `core-imports-app` gives.
     *
     * A TEST IS EXEMPT, as for every rule here: a unit test may pin an internal it exercises.
     */
    {
      name: "app-imports-core-internals",
      severity: "error",
      comment: "an app module must import the engine only through its published entry point",
      from: { path: "^packages/spec-controller/src/", pathNot: "\\.test\\.ts$" },
      to: {
        path: [
          "^packages/core/(src|dist)/",
          "^node_modules/@3f-consulting/spec-controller-core/",
          "^@3f-consulting/spec-controller-core/",
        ],
        pathNot: ["^packages/core/src/index\\.ts$", "^packages/core/dist/index\\.(js|d\\.ts)$"],
      },
    },

    /**
     * A core module imports no node IO builtin — keeps the engine testable with data alone.
     *
     * `dependencyTypes: ["core"]` scopes the match to node builtins, so a local module whose path
     * happens to begin with one of these words cannot trip it.
     *
     * The optional `node:` prefix catches the bare form too, and `(/|$)` carries the sub-path forms
     * (`node:fs/promises` resolves to `fs/promises`) while refusing a longer word that merely starts
     * the same way. `child_process` is not named here: `child-process-outside-its-homes` refuses it
     * for the core and for everything else outside its two homes, so naming it twice would report
     * one import twice.
     */
    {
      name: "core-imports-io",
      severity: "error",
      comment: "a core module must not import a node IO builtin — the engine stays testable with data alone",
      from: { path: "^packages/core/src/", pathNot: "\\.test\\.ts$" },
      to: { dependencyTypes: ["core"], path: "^(node:)?(fs|process)(/|$)" },
    },

    /**
     * Spawning a process is the edge's business, and only two edges do it: run-management reads
     * git for a run's inputs, and the allocate command reads the tree and its history. Anywhere
     * else, a `child_process` import is a new edge nobody designed.
     *
     * THE `from` HAS NO TEST EXEMPTION, unlike the rules above. Every test that spawns a process
     * already sits in one of the two homes, so the exemption would guard nothing and would let a
     * test elsewhere start spawning unnoticed.
     */
    {
      name: "child-process-outside-its-homes",
      severity: "error",
      comment: "only run-management and cli-allocate may import child_process",
      from: { path: "^packages/", pathNot: "^packages/spec-controller/src/(run-management|cli-allocate)/" },
      to: { dependencyTypes: ["core"], path: "^(node:)?child_process$" },
    },

    /**
     * `domainPurity`'s `adapter-import` — the INNER boundary, one level down from the package edge.
     *
     * A reconciliation concept reconciles; it does not parse a runner's output, render a report,
     * assemble the document, or census the corpus. Those are the edges the domain sits inside,
     * hexagonal — never the other way.
     *
     * IT IS A DENYLIST OF THE FOUR ADAPTER LAYERS, NOT AN ALLOWLIST, which is the old check's shape
     * carried across unchanged: the sibling domain modules and the pure aggregation roots
     * (`../model.js`, `../provenance/…`, `../lib/…`) stay permitted, and a fifth adapter layer added
     * later is permitted until it is named here.
     */
    {
      name: "domain-imports-adapter",
      severity: "error",
      comment: "a domain module must not import one of the core's adapter layers (parse, render, assemble, census)",
      from: { path: "^packages/core/src/domain/", pathNot: "\\.test\\.ts$" },
      to: { path: "^packages/core/src/(parse|render|assemble|census)/" },
    },
  ],
  options: {
    /**
     * `doNotFollow` stops the cruise at the dependency's edge rather than hiding it: an import OF
     * something under `node_modules` is still reported as an edge — which is what
     * `^node_modules/spec-controller/` above matches — but its own graph is not walked.
     */
    doNotFollow: { path: "node_modules" },

    /**
     * The built output is the same modules compiled. Cruising it would double every count and report
     * every violation twice, under a path no author edits.
     */
    exclude: { path: "(^|/)dist/" },

    /**
     * `tsPreCompilationDeps` is what makes a TYPE-ONLY import an edge. Without it `import type { X }
     * from "…"` erases before the graph is built and the boundary would be crossable by anything
     * that only needed a type — which is how a seam stops being a seam. Measured on this tree at
     * `4c38255`: 509 dependencies with it, **349 without**. 160 edges, invisible.
     */
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,

    /**
     * The workspace packages publish through `exports`, so the resolver is told to read that field
     * and which conditions to honour.
     *
     * MEASURED, because the failure this prevents is silent rather than loud. Without it the cruise
     * still says `✔ no dependency violations found` and still counts 509 dependencies — but the
     * seven `@3f-consulting/spec-controller-core` imports come back `couldNotResolve: true` and the
     * graph gains three bare-specifier pseudo-modules (154 rather than 151) where the barrel should
     * be. The edges stop AT the barrel instead of passing through it to
     * `packages/core/src/index.ts`, and a rule can only refuse a module the resolver found. A green
     * from an unresolved graph reads exactly like a green from a clean one.
     */
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
