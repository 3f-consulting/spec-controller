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
        "an app test reaches the engine only through its entry point or its internal seam, so a test cannot pin a core module's private shape",
      from: { path: "^packages/spec-controller/src/.*\\.(test|test-utils)\\.ts$" },
      to: {
        path: "^packages/core/(src|dist)/",
        pathNot: ["^packages/core/src/(index|internal)\\.ts$", "^packages/core/dist/(index|internal)\\.(js|d\\.ts)$"],
      },
    },

    {
      name: "adapter-imports-adapter",
      severity: "error",
      comment:
        "a core adapter meets another adapter only through the domain, never by importing it or the composition layer's internals",
      from: { path: "^packages/core/src/(parse|render|provenance)/", pathNot: "\\.(test|test-utils)\\.ts$" },
      to: {
        path: "^packages/core/src/(parse|render|provenance|assemble)/",
        pathNot: "^packages/core/src/$1/",
      },
    },

    {
      name: "driven-imports-driven",
      severity: "error",
      comment:
        "a driven app module is handed what it needs by the command that drives it, never reaching into another driven module",
      from: {
        path: "^packages/spec-controller/src/(ingest|run-management|cli-balance/emit)/",
        pathNot: "\\.(test|test-utils)\\.ts$",
      },
      to: {
        path: "^packages/spec-controller/src/(ingest|run-management|cli-balance/emit)/",
        pathNot: "^packages/spec-controller/src/$1/",
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
      comment: "only run-management and cli-allocate may import child_process",
      from: { path: "^packages/", pathNot: "^packages/spec-controller/src/(run-management|cli-allocate)/" },
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
        pathNot: ["^packages/core/src/parse/scenarios\\.ts$", "\\.(test|test-utils)\\.ts$"],
      },
      to: { path: "(^|/)@cucumber/gherkin(/|$)" },
    },

    {
      name: "yaml-parsed-by-its-two-homes",
      severity: "error",
      comment:
        "only core's workflow module, which reads another tool's workflows, and the run store, which reads and writes spec-controller's own run manifest, import the YAML parser",
      from: {
        path: "^packages/[^/]+/src/",
        pathNot: [
          "^packages/core/src/parse/checkScriptsRunInCI\\.ts$",
          "^packages/spec-controller/src/run-management/keptRun\\.ts$",
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

    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
