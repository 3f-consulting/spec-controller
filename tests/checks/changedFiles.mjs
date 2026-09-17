/**
 * WHAT DID THIS CHANGE TOUCH — the complexity gate's one answer (@SCN-CPX-001, 3F-3462, under 3F-3408).
 *
 * `eslint.config.mjs` emits the three rules TWICE: at `warn` over `MEASURED_GLOBS` — the report, the
 * whole measured population, every run — and at `error` over the intersection of those globs with the
 * list this module returns, which is the gate. `tidy-kiwi` ("you make the mess, you tidy it") is what
 * the split mechanises, and this file is the single place the word "touches" is decided. It is also
 * the ONLY bespoke code the split adds: the report/gate distinction itself is eslint's own severity
 * vocabulary and the scoping is eslint's own `files` intersection, neither reimplemented here.
 *
 * WHY THIS IS `.mjs`, FOR THE SAME REASON ITS NEIGHBOURS ARE. eslint loads its flat config through
 * Node's own ESM loader, so anything the config imports must be importable with no `jiti` and no
 * `tsx`. The types live beside it in `changedFiles.d.mts`, so every TypeScript consumer stays typed.
 *
 * ═══ THE READ IS THE ONE `lintScnSubIssuesCli.ts` ALREADY MAKES ═══
 *
 * The base is `GITHUB_BASE_SHA` — `github.event.pull_request.base.sha` — falling back to
 * `origin/main`, which is `resolveBaseRef`'s derivation verbatim. Two answers to what the base is
 * would be two answers to what changed. `actions/checkout` already carries `fetch-depth: 0` for
 * exactly these reads and says so in its own comment, so no `ci.yml` change is owed by this module.
 *
 * MERGE-BASE ANCHORED, NEVER A TWO-DOT DIFF. `git diff --name-only origin/main` includes files
 * changed ON MAIN since the branch diverged, so the gate would red the build over somebody else's
 * code — a fitness function blaming the wrong author is worse than one that does not fire.
 *
 * THE NEAR SIDE IS THE WORKING TREE, NOT `HEAD`. Diffing the merge base against the working tree
 * catches uncommitted edits, which is precisely when a developer wants the gate. In CI the working
 * tree IS `HEAD`, so this collapses to the `<base>...HEAD` the `@SSM` gate uses: the two derivations
 * agree where it matters and differ only locally, in the direction that helps.
 *
 * UNTRACKED FILES COUNT AS TOUCHED. A brand-new over-long module is the case a developer most needs
 * to see red before they push, and excluding it would have the gate arrive at the least useful
 * moment. In CI every file is tracked, so it adds nothing there. `--exclude-standard` means anything
 * `.gitignore` already covers — `dist/`, `reports/`, `.stryker-tmp/` — never enters the set.
 *
 * DELETIONS DO NOT. A deleted file cannot violate a complexity rule, and its path would otherwise sit
 * in the gate block's `files` naming nothing on disk.
 *
 * ═══ IT THROWS RATHER THAN RETURNING NOTHING WHEN GIT CANNOT ANSWER ═══
 *
 * An empty list is a LEGITIMATE answer — it is the answer on every `push: main` run, where
 * `origin/main` IS `HEAD` — so a git failure that returned `[]` would be indistinguishable from the
 * ordinary case and would vacate the gate in silence, on a step whose recorded outcome stays
 * `success`. That is the watermelon shape this repository has spent a dozen tickets removing. A check
 * that cannot measure must red, never shrug.
 */

import { execFileSync } from "node:child_process";

/** One git read, or a throw NAMING the command — never a silent empty answer. */
const git = (root, args) => {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (cause) {
    throw new Error(
      `@SCN-CPX-001: \`git ${args.join(" ")}\` failed in ${root}, so the complexity gate cannot ` +
        `tell what this change touched. Returning nothing here would switch the gate off in ` +
        `silence, because an empty changed set is the ordinary answer on a trunk run.`,
      { cause },
    );
  }
};

/** The non-empty lines of one git listing. */
const lines = (out) =>
  out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

/**
 * The base to anchor the merge base at. `GITHUB_BASE_SHA` is the pull request's own base commit and
 * is authoritative where it is set; `origin/main` is what a developer's working copy has.
 */
const baseRef = () => {
  const sha = process.env["GITHUB_BASE_SHA"];
  return sha !== undefined && sha.trim() !== "" ? sha.trim() : "origin/main";
};

/** @type {typeof import("./changedFiles.d.mts").changedFiles} */
export const changedFiles = (root) => {
  const anchor = git(root, ["merge-base", baseRef(), "HEAD"]).trim();
  return [
    ...new Set([
      ...lines(git(root, ["diff", "--name-only", "--diff-filter=d", anchor])),
      ...lines(git(root, ["ls-files", "--others", "--exclude-standard"])),
    ]),
  ];
};
