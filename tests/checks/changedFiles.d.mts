/**
 * Types for `changedFiles.mjs` (@SCN-CPX-001, 3F-3462). The runtime module is plain ESM so eslint's
 * own loader can read it with no `jiti`; these types keep its TypeScript consumers — the @SCN-CPX-001
 * cucumber arm, through `eslint.config.d.mts` — typed against the same one source.
 */

/**
 * The repo-relative paths this change touched, as git answers it: the merge base of the pull
 * request's base (or `origin/main`) against the WORKING TREE, plus untracked files, minus deletions.
 *
 * Throws when git cannot answer. An empty list is a legitimate result — it is the result on a trunk
 * run, where the base IS `HEAD` — so a failure returning `[]` would be indistinguishable from it and
 * would switch the gate off in silence.
 *
 * @param root the directory to read git from; the paths returned are relative to it.
 */
export declare function changedFiles(root: string): readonly string[];
