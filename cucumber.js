// Cucumber-JS configuration for spec-controller.
// Auto-discovered by cucumber-js as cucumber.js in an ESM package.
// requireModule: tsx/cjs registers TypeScript support for step definitions
// (Cucumber's CJS-mode binary; step definitions are loaded via require()).
//
// TWO PROFILES, TWO PASSES, AND THE SPLIT IS THE POINT (3F-3146, under 3F-3138). The
// default profile is the BEHAVIOURAL pass — the runtime evidence stream. The `fitness`
// profile is the CONVERTED-STATIC-CHECK pass: one cucumber call per axis, each writing its
// own report, so `balance:self` never has to guess which half of one document is which.
// Named exports are cucumber's own profile mechanism, and profiles do NOT inherit from
// `default` (configuration/from_file.js merges the requested profiles onto `{}`), so each
// block below states its whole configuration.

// The canonical evidence-layer tag filter: Cucumber runs the
// @integration / @e2e / @performance scenarios; @unit-only scenarios reconcile
// in Vitest, not here.
export default {
  paths: ["features/**/*.feature"],
  require: ["tests/steps/**/*.ts"],
  requireModule: ["tsx/cjs"],
  tags: "@integration or @e2e or @performance",
};

// THE FITNESS PASS — the converted static checks, and NOTHING ELSE.
//
// `require` NAMES ONE FILE RATHER THAN A GLOB, AND THAT IS THE WHOLE MECHANISM. The
// behavioural pass loads `tests/steps/**/*.ts`, which is every step definition plus
// `support/world.ts` and any hook that comes with them. A converted fitness check needs none
// of that — it runs a command its configured row names — and 3F-3114 warns a consumer about
// exactly this coupling: a fitness scenario dragged through a behavioural world fails for
// reasons that have nothing to do with the check. Naming one file removes the coupling BY
// CONSTRUCTION rather than by everyone remembering not to reach for the world.
//
// ITS TAG FILTER SELECTS EVERY SCENARIO OF `features/fitness-checks.feature`, each of which is
// authored beside a row of `specController.fitnessChecks` (3F-3244). It was wired one commit
// ahead of its first member and selected nothing, which a cucumber run treats as an exit 0 — and
// that is what let the first conversion land as ONE commit rather than as a conversion plus a
// pipeline change. It is also the shape worth suspecting now that the whole set arrives from one
// file: a pass selecting nothing still exits 0, so an empty corpus and a clean corpus are the same
// exit code (reported to 3F-3162).
//
// THE DEFAULT PROFILE IS UNCHANGED AND MUST STAY SO. `@fitness` carries no tier tag, so
// `@integration or @e2e or @performance` never selected these scenarios and still does not —
// the two passes partition the corpus rather than overlapping in it.
//
// AND THE TWO PASSES ARE PRODUCER THEN READER, IN THAT ORDER — LOAD-BEARING RATHER THAN
// CONVENTIONAL (3F-3166). Run the default profile first and the fitness profile LAST. Several rows
// are reader-shaped: they print a number an EARLIER step of the same run left behind. `pnpm test`
// and `pnpm cucumber` are both wrapped in `timeStepCli`, which writes a timings record; @SCN-FIT-012
// and @SCN-FIT-013 read it back. @SCN-FIT-002 reads a nightly sweep's record the same way. A
// pipeline that calls the fitness profile first meets absent records and a wall of `missing` rows
// while doing exactly what it was told, so the order is stated here, in `.github/workflows/ci.yml`,
// and in `doc/converting-a-fitness-check.md`.
//
// THE FITNESS PASS'S OWN RUN TIME IS UNMEASURED, AND MUST BE. It is not wrapped in `timeStepCli`:
// the pass that observes cannot be inside what it observes, and the behavioural suite is what is
// worth timing.
export const fitness = {
  paths: ["features/**/*.feature"],
  require: ["tests/steps/fitness.steps.ts"],
  requireModule: ["tsx/cjs"],
  tags: "@fitness",
};
