import base from "./.dependency-cruiser.js";

// A config of its own, so that a third YAML importer reds its own CI step rather than Import boundaries.
export default {
  forbidden: [
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
  options: base.options,
};
