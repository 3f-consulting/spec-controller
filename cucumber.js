// Cucumber-JS configuration for spec-controller.
// Auto-discovered by cucumber-js as cucumber.js in an ESM package.
// requireModule: tsx/cjs registers TypeScript support for step definitions
// (Cucumber's CJS-mode binary; step definitions are loaded via require()).
//
// ONE PROFILE, ONE PASS — THE BEHAVIOURAL ONE, WHICH IS THE RUNTIME EVIDENCE STREAM (3F-3272).
//
// THERE WAS A SECOND, AND WHAT IT DID IS NOW SOMEBODY ELSE'S JOB. A `fitness` profile ran the
// converted static checks as cucumber scenarios and wrote a report the ledger read as their credit
// stream. Under 3F-3252 the credit journal is the consumer's own CI: each check is already a step
// of their pipeline, and a run of that pipeline is already a record of what each step did, written
// by the provider for its own purposes. So `balance` reads that record and executes nothing, and
// the pass that manufactured a second evidence stream is deleted rather than kept as a second
// supported route — nothing here runs a check any more.
//
// THE `@fitness` SCENARIOS ARE UNAFFECTED, AND WHAT KEEPS THEM OFF THIS PROFILE IS THEIR TAG. They
// never carried a tier tag, so the filter below never selected them and still does not — the same
// arrangement `@unit` already has with vitest. They are authored like every other scenario in this
// corpus, steps and all (3F-3368): the steps are the specification, and nothing here runs them.

// The canonical evidence-layer tag filter: Cucumber runs the
// @integration / @e2e / @performance scenarios; @unit-only scenarios reconcile
// in Vitest, not here.
export default {
  paths: ["features/**/*.feature"],
  require: ["tests/steps/**/*.ts"],
  requireModule: ["tsx/cjs"],
  tags: "@integration or @e2e or @performance",
};
