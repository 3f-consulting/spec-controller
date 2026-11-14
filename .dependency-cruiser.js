export default {
  forbidden: [
    {
      name: "core-imports-app",
      severity: "error",
      comment:
        "a core module must not import the spec-controller app package — by workspace path, by installed path, or by a bare specifier that resolves to nothing",
      from: { path: "^packages/core/src/", pathNot: "\\.(test|test-utils)\\.ts$" },
      to: {
        path: [
          "^packages/spec-controller/",
          "^node_modules/spec-controller/",
          "^spec-controller(/|$)",
        ],
      },
    },

    {
      name: "app-imports-core-internals",
      severity: "error",
      comment: "an app module must import the engine only through its published entry point",
      from: { path: "^packages/spec-controller/src/", pathNot: "\\.(test|test-utils)\\.ts$" },
      to: {
        path: [
          "^packages/core/(src|dist)/",
          "^node_modules/@3f-consulting/spec-controller-core/",
          "^@3f-consulting/spec-controller-core/",
        ],
        pathNot: ["^packages/core/src/index\\.ts$", "^packages/core/dist/index\\.(js|d\\.ts)$"],
      },
    },

    {
      name: "app-test-imports-core-internals",
      severity: "error",
      comment:
        "an app test reaches the engine only through its entry point, so a test cannot pin a core module's private shape",
      from: { path: "^packages/spec-controller/src/.*\\.(test|test-utils)\\.ts$" },
      to: {
        path: "^packages/core/(src|dist)/",
        pathNot: ["^packages/core/src/index\\.ts$", "^packages/core/dist/index\\.(js|d\\.ts)$"],
      },
    },

    {
      name: "core-folder-imports-beyond-the-domain",
      severity: "error",
      comment:
        "core's inputs/, reports/ and messages/ import their own folder, the domain and core's messages/, and meet one another only through the domain",
      from: { path: "^packages/core/src/(inputs|reports|messages)/", pathNot: "\\.(test|test-utils)\\.ts$" },
      to: {
        path: "^packages/core/src/",
        pathNot: ["^packages/core/src/$1/", "^packages/core/src/(domain|messages)/"],
      },
    },

    {
      name: "variants-list-read-by-another-module",
      severity: "error",
      comment:
        "a variants list is read by the module of its name, beside it, and by no other production module; any test may import a list to run every variant",
      from: { path: "^(packages/.+/)([^/]+)\\.ts$", pathNot: "\\.(test|test-utils)\\.ts$" },
      to: { path: "\\.variants\\.json$", pathNot: "^$1$2\\.variants\\.json$" },
    },

    {
      name: "app-adapter-imports-another-adapter",
      severity: "error",
      comment:
        "an app adapter imports its own folder, the catalogue in messages/ and the run's ending in runEnding/; it is handed everything else by commands/, the one folder that imports any other",
      from: {
        path: "^packages/spec-controller/src/(runRequest|inputs|runIdentity|repository|output)/",
        pathNot: "\\.(test|test-utils)\\.ts$",
      },
      to: {
        path: "^packages/spec-controller/src/",
        pathNot: ["^packages/spec-controller/src/$1/", "^packages/spec-controller/src/(messages|runEnding)/"],
      },
    },

    {
      name: "run-ending-imports-an-adapter",
      severity: "error",
      comment: "the run's ending, which every app adapter shares, imports only itself and the catalogue in messages/",
      from: { path: "^packages/spec-controller/src/runEnding/", pathNot: "\\.(test|test-utils)\\.ts$" },
      to: {
        path: "^packages/spec-controller/src/",
        pathNot: "^packages/spec-controller/src/(runEnding|messages)/",
      },
    },

    {
      name: "catalogue-imports-the-app",
      severity: "error",
      comment: "the app's catalogue, which every app folder speaks through, imports only itself",
      from: { path: "^packages/spec-controller/src/messages/", pathNot: "\\.(test|test-utils)\\.ts$" },
      to: {
        path: "^packages/spec-controller/src/",
        pathNot: "^packages/spec-controller/src/messages/",
      },
    },

    {
      name: "crash-guards-load-core",
      severity: "error",
      comment:
        "the crash guards load nothing from the engine or its message formatter, so they are in place before either is evaluated and a module that cannot load still ends the run on the guards' code",
      from: { path: "^packages/spec-controller/src/runEnding/crashGuards\\.ts$" },
      to: {
        reachable: true,
        path: [
          "^packages/core/",
          "^node_modules/@3f-consulting/spec-controller-core/",
          "^@3f-consulting/spec-controller-core(/|$)",
          "(^|/)intl-messageformat(/|$)",
        ],
      },
    },

    {
      name: "core-imports-io",
      severity: "error",
      comment: "a core module imports no node builtin but path — the engine stays testable with data alone",
      from: { path: "^packages/core/src/", pathNot: "\\.(test|test-utils)\\.ts$" },
      to: { dependencyTypes: ["core"], pathNot: "^(node:)?path$" },
    },

    {
      name: "child-process-outside-its-homes",
      severity: "error",
      comment: "only the run identity and repository adapters may import child_process",
      from: { path: "^packages/", pathNot: "^packages/spec-controller/src/(runIdentity|repository)/" },
      to: { dependencyTypes: ["core"], path: "^(node:)?child_process$" },
    },

    {
      name: "domain-imports-only-domain",
      severity: "error",
      comment: "a domain module must import only other domain modules — nothing outside its package's domain/",
      from: { path: "^packages/([^/]+)/src/domain/", pathNot: "\\.(test|test-utils)\\.ts$" },
      to: { pathNot: "^packages/$1/src/domain/" },
    },

    {
      name: "no-circular",
      severity: "error",
      comment: "a module must not reach itself through its own imports — move what both sides need to a leaf",
      from: {},
      to: { circular: true },
    },

    {
      name: "gherkin-parsed-by-one-module",
      severity: "error",
      comment:
        "only core's Gherkin module imports the Gherkin parser; every other module reads a feature file through what it returns",
      from: {
        path: "^packages/[^/]+/src/",
        pathNot: ["^packages/core/src/inputs/gherkin\\.ts$", "\\.(test|test-utils)\\.ts$"],
      },
      to: { path: "(^|/)@cucumber/gherkin(/|$)" },
    },

    {
      name: "yaml-parsed-by-its-one-home",
      severity: "error",
      comment:
        "only core's workflow module, which reads another tool's workflows, imports the YAML parser",
      from: {
        path: "^packages/[^/]+/src/",
        pathNot: [
          "^packages/core/src/inputs/workflows\\.ts$",
          "\\.(test|test-utils)\\.ts$",
        ],
      },
      to: { path: "(^|/)yaml(/|$)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },

    exclude: { path: "^packages/[^/]+/dist/" },

    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,

    // The content cache hashes only the extensions it scans, so without .json a tsconfig.json change is served the cached result.
    extraExtensionsToScan: [".json"],

    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
