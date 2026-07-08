// Cucumber-JS configuration for spec-controller.
// Auto-discovered by cucumber-js as cucumber.js in an ESM package.
// requireModule: tsx/cjs registers TypeScript support for step definitions
// (Cucumber's CJS-mode binary; step definitions are loaded via require()).
//
// The canonical evidence-layer tag filter: Cucumber runs the
// @integration / @e2e / @performance scenarios; @unit-only scenarios reconcile
// in Vitest, not here.

export default {
  paths: ["features/**/*.feature"],
  require: ["tests/steps/**/*.ts"],
  requireModule: ["tsx/cjs"],
  tags: "@integration or @e2e or @performance",
};
