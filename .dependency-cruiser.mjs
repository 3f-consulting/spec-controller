export default {
  forbidden: [
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

    {
      name: "core-imports-io",
      severity: "error",
      comment: "a core module must not import a node IO builtin — the engine stays testable with data alone",
      from: { path: "^packages/core/src/", pathNot: "\\.test\\.ts$" },
      to: { dependencyTypes: ["core"], path: "^(node:)?(fs|process)(/|$)" },
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
      from: { path: "^packages/([^/]+)/src/domain/", pathNot: "\\.test\\.ts$" },
      to: { pathNot: "^packages/$1/src/domain/" },
    },

    {
      name: "no-circular",
      severity: "error",
      comment: "a module must not reach itself through its own imports — move what both sides need to a leaf",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },

    exclude: { path: "(^|/)dist/" },

    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,

    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
