/**
 * Today's exceedances of the external standard — the DATED DEBT LIST (@SCN-CPX-001, 3F-2286).
 *
 * Every number in this file is MEASURED FROM THIS TREE. That is the exact opposite of
 * `complexityThresholds.mjs`, where nothing measured from this tree may ever appear, and it is why the
 * two are separate modules rather than two exports of one: a reader must never have to work out which
 * kind of number they are looking at. Threshold = stated from outside. Exception = measured from here.
 *
 * WHAT AN ENTRY MEANS (@SCN-CPX-002, 3F-2317). An entry FREEZES its file at exactly the recorded
 * `value` for that rule: at the value the file is green, one past it reds. An exception excuses the
 * debt already there and buys not one line of headroom. (`@SCN-CPX-001` switched the rule OFF instead,
 * so the value was written but not enforced and an exempt file could double in size — that stage is
 * over.) What is still MISSING is the other direction: a file that has IMPROVED and whose entry nobody
 * updated still passes. `@SCN-CPX-003` (3F-2318) adds the reconciliation that reds when this list
 * disagrees with the measured tree EITHER way, and that is what makes the list a ratchet rather than a
 * ceiling that quietly stops descending. Do not read the current state as the finished mechanism.
 *
 * HOW THESE WERE MEASURED, AND HOW TO RE-MEASURE. eslint's own `ESLint` API at the bare standard
 * (10 / 40 / 400) with `skipBlankLines: false, skipComments: false`, over the same scope globs the
 * config uses, and NEVER a hand-rolled line or complexity counter — a second counter would agree with
 * eslint by coincidence and drift the moment either changed.
 *
 * The parse is PER RULE, because the three rules do not report uniformly: `max-lines` and
 * `max-lines-per-function` emit "too many lines (575)", while `complexity` emits "has a complexity of
 * 21" with NO parenthesised number. A single `/\((\d+)\)/` silently yields `null` for every complexity
 * entry — a third of this list reconciled against nothing, and passing. Extraction is asserted non-null.
 *
 * ONE ENTRY PER FILE PER RULE, carrying that file's WORST offender for the rule. A file with four
 * over-40-line functions is one entry at the longest, not four: eslint applies a rule per FILE, so
 * per-function entries would leave "the value this file is frozen at" undefined — and `@SCN-CPX-002`
 * needs exactly one well-defined number per file per rule.
 *
 * THE COST OF THAT, STATED RATHER THAN LEFT TO BE DISCOVERED. Because the ceiling is per file, a file
 * frozen at 72 is frozen at 72 for EVERY function in it — a 41-line function in that same file can
 * grow to 72 without reding. So the guarantee `@SCN-CPX-002` delivers is exactly "an exempt file reds
 * when its WORST offender for that rule grows past the recorded value", and not the stronger-sounding
 * "any function in it reds when it grows". Per-function granularity needs a different mechanism (a
 * custom rule, or the reconciliation reading per-function values) and is deliberately left to its own
 * @SCN. Written here because a gate that certifies more than it checks is the failure 3F-2286 exists
 * to remove, and an unstated residual is how one gets built.
 *
 * Measured 2026-08-02: **43 entries across 25 files** (8 test) — max-lines 15,
 * max-lines-per-function 16, complexity 12. The production files here are the domain core
 * (markdown.ts 1024 lines, vocabAudit.ts complexity 25, evidenceReconciliation.ts's 230-line reconcile),
 * so the list doubles as a refactor backlog — which is what visible debt should look like.
 *
 * @type {readonly import("./complexityExceptions.d.mts").ComplexityException[]}
 */
export const COMPLEXITY_EXCEPTIONS = [
  { path: "packages/core/src/assemble/renderInput.test.ts",                rule: "max-lines",              value:  960, since: "2026-08-02" },
  { path: "packages/core/src/assemble/renderInput.ts",                     rule: "max-lines-per-function", value:   44, since: "2026-08-02" },
  { path: "packages/core/src/domain/evidenceReconciliation.test.ts",       rule: "max-lines",              value: 1587, since: "2026-08-02" },
  { path: "packages/core/src/domain/evidenceReconciliation.ts",            rule: "complexity",             value:   21, since: "2026-08-02" },
  { path: "packages/core/src/domain/evidenceReconciliation.ts",            rule: "max-lines",              value:  510, since: "2026-08-02" },
  { path: "packages/core/src/domain/evidenceReconciliation.ts",            rule: "max-lines-per-function", value:  230, since: "2026-08-02" },
  { path: "packages/core/src/domain/isBalanced.test.ts",                   rule: "max-lines",              value:  423, since: "2026-08-02" },
  { path: "packages/core/src/domain/ledger.ts",                            rule: "max-lines",              value:  575, since: "2026-08-02" },
  { path: "packages/core/src/domain/ledger.ts",                            rule: "max-lines-per-function", value:   98, since: "2026-08-02" },
  { path: "packages/core/src/domain/qualityCheckReconciliation.ts",        rule: "complexity",             value:   11, since: "2026-08-02" },
  { path: "packages/core/src/domain/qualityCheckReconciliation.ts",        rule: "max-lines",              value:  545, since: "2026-08-02" },
  { path: "packages/core/src/domain/qualityCheckReconciliation.ts",        rule: "max-lines-per-function", value:   80, since: "2026-08-02" },
  { path: "packages/core/src/parse/cucumber.ts",                           rule: "complexity",             value:   16, since: "2026-08-02" },
  { path: "packages/core/src/parse/cucumber.ts",                           rule: "max-lines-per-function", value:   87, since: "2026-08-02" },
  { path: "packages/core/src/parse/scenarios.test.ts",                     rule: "max-lines",              value:  821, since: "2026-08-02" },
  { path: "packages/core/src/parse/scenarios.ts",                          rule: "complexity",             value:   11, since: "2026-08-02" },
  { path: "packages/core/src/parse/scenarios.ts",                          rule: "max-lines-per-function", value:   62, since: "2026-08-02" },
  { path: "packages/core/src/parse/vitest.ts",                             rule: "complexity",             value:   15, since: "2026-08-02" },
  { path: "packages/core/src/parse/vitest.ts",                             rule: "max-lines-per-function", value:   65, since: "2026-08-02" },
  { path: "packages/core/src/render/json.test.ts",                         rule: "max-lines",              value:  441, since: "2026-08-02" },
  { path: "packages/core/src/render/markdown.test.ts",                     rule: "max-lines",              value: 2419, since: "2026-08-02" },
  { path: "packages/core/src/render/markdown.ts",                          rule: "complexity",             value:   13, since: "2026-08-02" },
  { path: "packages/core/src/render/markdown.ts",                          rule: "max-lines",              value: 1024, since: "2026-08-02" },
  { path: "packages/core/src/render/markdown.ts",                          rule: "max-lines-per-function", value:  101, since: "2026-08-02" },
  { path: "packages/spec-controller/src/cli-balance/cli.test.ts",          rule: "max-lines",              value:  570, since: "2026-08-02" },
  { path: "packages/spec-controller/src/cli-balance/cli.ts",               rule: "complexity",             value:   18, since: "2026-08-02" },
  { path: "packages/spec-controller/src/cli-balance/cli.ts",               rule: "max-lines",              value:  524, since: "2026-08-02" },
  { path: "packages/spec-controller/src/cli-balance/cli.ts",               rule: "max-lines-per-function", value:  261, since: "2026-08-02" },
  { path: "packages/spec-controller/src/cli-balance/emit/format.ts",       rule: "max-lines-per-function", value:   57, since: "2026-08-02" },
  { path: "packages/spec-controller/src/cli.ts",                           rule: "max-lines-per-function", value:   52, since: "2026-08-02" },
  { path: "packages/spec-controller/src/ingest/ingestQualityChecks.ts",    rule: "max-lines-per-function", value:   70, since: "2026-08-02" },
  { path: "packages/spec-controller/src/ingest/ingestScenarios.ts",        rule: "complexity",             value:   12, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/featureCodes.ts",        rule: "complexity",             value:   17, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/featureCodes.ts",        rule: "max-lines-per-function", value:   86, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/lintScnSubIssuesCli.ts", rule: "complexity",             value:   12, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/lintScnSubIssuesCli.ts", rule: "max-lines-per-function", value:   73, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/scnSubIssueGate.ts",     rule: "complexity",             value:   17, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/scnSubIssueGate.ts",     rule: "max-lines",              value:  728, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/scnSubIssueGate.ts",     rule: "max-lines-per-function", value:  110, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/vocabAudit.test.ts",     rule: "max-lines",              value:  801, since: "2026-08-03" },
  { path: "packages/spec-controller/static-checks/vocabAudit.ts",          rule: "complexity",             value:   25, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/vocabAudit.ts",          rule: "max-lines",              value:  790, since: "2026-08-02" },
  { path: "packages/spec-controller/static-checks/vocabAudit.ts",          rule: "max-lines-per-function", value:  115, since: "2026-08-02" },
];
