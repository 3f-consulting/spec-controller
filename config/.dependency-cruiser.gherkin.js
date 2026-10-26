import base from "./.dependency-cruiser.js";

// A config of its own, so that a second Gherkin importer reds its own CI step rather than Import boundaries.
export default {
  forbidden: [
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
  ],
  options: base.options,
};
