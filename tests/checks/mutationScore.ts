/**
 * Where this repository's mutation sweep leaves its report (@SCN-MUT-007, @SCN-MUT-008 —
 * features/mutation-score.feature).
 *
 * THE READING OF A REPORT LEFT HERE, AND ONLY THE PATH STAYED (3F-2927). Which statuses are a
 * kill, which are in the population, and what a report nothing can read is worth are all
 * `src/mutation-ratchet/report.ts`'s, which is where the ratchet already asks them. The two status
 * sets stood in both files and agreed — until the day a status was added upstream and only one
 * copy learned it, at which point the number the ledger reconciles and the verdict the ratchet
 * reaches would have been two answers about one report, arrived at silently.
 *
 * THE PATH DID NOT GO WITH THEM, BECAUSE IT IS NOT THE LIBRARY'S TO KNOW. `readMutationReport`
 * takes a path already resolved by whoever owns the tree — deliberately, so it stays correct
 * somewhere other than here. Where THIS repository's sweep writes is this repository's own
 * convention, and it is stated once, below.
 */

/**
 * Where a mutation run leaves its report, relative to a repository root.
 *
 * STRYKER'S OWN DEFAULT FOR ITS `json` REPORTER, WHICH `stryker.config.json` THEREFORE DOES NOT
 * RESTATE. Two copies of a path is two things keyed by the same word that agree until the day one
 * is edited, and the failure a drifted pair produces here is not loud — a producer looking where
 * nothing was written posts no measurement, and a missing row reconciles as a sweep that never
 * ran. Held to the upstream default, a version that moved it reds this producer out loud instead,
 * naming the path it looked in.
 *
 * Beneath `reports/`, which `.gitignore` excludes: a mutation report enumerates which lines of
 * the domain core no test kills, so it lives for the length of the job and is never tracked.
 */
export const MUTATION_REPORT_PATH = "reports/mutation/mutation.json";
