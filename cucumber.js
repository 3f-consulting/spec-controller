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

  // 3F-3422 — TWO WORKERS, AND THE NUMBER IS TWO BECAUSE FOUR WAS MEASURED AND WAS WORSE. 3F-3421
  // is what made the scenarios safe to interleave at all. Read off the jobs API on this branch,
  // never the local clock: serial measured 149s and 142s, parallel: 2 measured 132/139/138/139
  // (median 138.5s), and parallel: 4 measured 149/148/108 AND FAILED ALL THREE RUNS on a 5000ms
  // step deadline blown under contention.
  //
  // DO NOT READ THIS KEY AS HAVING RESTORED SCN-FIT-013'S HEADROOM. IT DID NOT. The gain is 7%,
  // the median still sits 18s under a 150s gate it used to sit 5s under, and every run still
  // prints the over-the-trigger warning. What the readings showed is why: aggregate step time
  // scales with the worker count (x1.88 at two workers, x3.64 at four) while the wall clock
  // barely moves, so the workers are real and their throughput is spent making each step slower.
  // The children are tsx/esbuild/tsc/pnpm, themselves threaded, so a serial run already has both
  // of a 2-core ubuntu-latest's cores busy. The local 61.2s -> 33.0s came off 18 cores and does
  // not transfer — which is the whole reason this was filed as a measurement and not an estimate.
  parallel: 2,
};
