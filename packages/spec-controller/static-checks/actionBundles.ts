/**
 * WHICH FILES ARE ACTION BUNDLES — one manifest, and every consumer reads it (@SCN-ACT-001).
 *
 * A composite action under `.github/actions/` is checked out into the CALLER's workspace, and the
 * caller's workspace is precisely what a library must not have opinions about. `${{ github.action_path }}`
 * is the one directory such an action can rely on, so the file its step runs is committed beside the
 * `action.yml` that names it — the arrangement every JS action in the world already ships, with the
 * one failure mode every JS action in the world already has: the source moves and the committed
 * bundle does not.
 *
 * TWO THINGS THEN HAVE TO AGREE ABOUT WHERE THOSE FILES ARE. The builder writes them; the check
 * rebuilds them and compares. Written twice, the two lists agree until the day one of them is
 * edited — and the day one of them is edited is the day a bundle stops being rebuilt and starts
 * being trusted, silently, which is the whole defect this arrangement exists to fence. So the list
 * is written once, here, and both read it. `featureCodes.ts` carries the identical argument for the
 * feature-code allocation, and the mutation ratchet is built on it.
 *
 * EVERY PATH IS REPOSITORY-RELATIVE AND POSIX-SPELLED. What joins them to a tree is the caller's:
 * the builder joins them to the checkout it is writing into, and the check joins them to the
 * checkout it is reading. A path anchored here to wherever this module happens to sit agrees with
 * its caller for exactly as long as it sits beside that caller's code.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { build } from "esbuild";

/** One committed action bundle — the action it travels with, what it is built from, and where it sits. */
export interface ActionBundle {
  /** The action's own directory name under `.github/actions/`. */
  readonly action: string;
  /** The CLI this bundle is built from, repository-relative. */
  readonly source: string;
  /**
   * The committed bundle, repository-relative — beside the `action.yml`, under the action's own
   * `dist/`.
   *
   * SPELLED OUT RATHER THAN DERIVED FROM THE NAME ABOVE. A rule turning an action's name into its
   * bundle's path is a rule the reader has to run in their head to answer "which files are these?",
   * and the answer is the whole point of the file. `.mjs` because the bundle is ESM and `.github/`
   * holds no manifest naming a module type, so the extension is what tells node how to read it.
   */
  readonly bundle: string;
}

/**
 * Every action bundle this repository commits.
 *
 * An entry appears here when an action's step runs a file of its own. An action whose step shells
 * out to something the runner provides has no bundle and belongs nowhere in this list.
 *
 * AND THAT SENTENCE IS AN HONOUR RULE, IN A FEATURE WHOSE WHOLE THESIS IS MECHANISM OVER HONOUR.
 * Nothing today reds an action added under `.github/actions/` and never added here. Its step is
 * still held to reaching its own directory — `readActionSources` walks the tree rather than this
 * list — so it cannot reach for a bin; but the file it does reach for is compared against no
 * source, and could rot from the day it lands. The residual is narrow (it needs a NEW action, not
 * an edit to one of these three) and it is real, and 3F-2826 closes it by making the two lists
 * reconcile. Until then the check prints both counts so the gap is visible in the log rather than
 * silently absorbed.
 */
export const ACTION_BUNDLES: readonly ActionBundle[] = [
  {
    action: "persist-measurements",
    source: "packages/spec-controller/src/measurements/persistCli.ts",
    bundle: ".github/actions/persist-measurements/dist/persist-measurements.mjs",
  },
  {
    action: "restore-measurements",
    source: "packages/spec-controller/src/measurements/restoreCli.ts",
    bundle: ".github/actions/restore-measurements/dist/restore-measurements.mjs",
  },
  {
    action: "mutation-ratchet",
    source: "packages/spec-controller/src/mutation-ratchet/ratchetCli.ts",
    bundle: ".github/actions/mutation-ratchet/dist/mutation-ratchet.mjs",
  },
];

/**
 * A REAL `require`, PUT BACK AT THE TOP OF AN ESM BUNDLE — without which one of these three does not
 * run at all, and the arrangement that hid it is the point.
 *
 * An inlined CommonJS dependency keeps its own `require` calls, and esbuild's ESM output answers
 * them with a shim that throws `Dynamic require of "x" is not supported` — unless a real `require`
 * is in scope, which in an ES module there is not. `yaml` is a CommonJS package (it publishes no
 * ESM build for node: its `exports` map sends the `node` condition to `dist/index.js` and only the
 * BROWSER build is ESM), it reaches for `process` that way, and it is what the ratchet reads a
 * record with. So the bundle built, weighed exactly what a bundle inlining `yaml` should weigh, and
 * died on its first real record.
 *
 * WHICH IS WHY @SCN-ACT-001 RUNS THE FILE. Every other rule in this feature reads bytes — the
 * step's command, the bundle against a rebuild of its source — and all of them were green over this
 * bundle. Only running it in a tree with nothing installed said otherwise.
 *
 * IT CAN ONLY EVER RESOLVE A BUILTIN. `platform: "node"` leaves node's own modules external and
 * bundles everything else, so an unresolvable package would have stopped the build rather than
 * reached this; what is left for `require` to find is `node:process` and its siblings, which are
 * there on any runner. It is not a door back to the caller's `node_modules`.
 */
const ESM_REQUIRE = [
  'import { createRequire as __actionBundleCreateRequire } from "node:module";',
  "const require = __actionBundleCreateRequire(import.meta.url);",
].join("\n");

/**
 * Build one entry's bundle, in memory, and answer with its bytes.
 *
 * IN MEMORY BECAUSE BOTH CONSUMERS WANT IT THAT WAY. The builder writes what comes back; the drift
 * check compares it against what is committed and writes nothing at all. A check that had to write
 * a temporary file to answer "is this stale?" would be a check with a cleanup path to get wrong,
 * and a cleanup path that fails leaves a working tree the next reader cannot trust.
 *
 * THE FLAGS ARE HERE AND NOWHERE ELSE, and that is what makes the drift check mean anything. Its
 * whole claim is that the committed bytes are what building this source produces; stated twice, the
 * two flag sets agree until the day one is edited, and the day one is edited the check starts
 * reporting drift in a bundle nobody touched.
 *
 * DETERMINISM IS THE LOAD-BEARING ASSUMPTION, and it is written down rather than assumed: the same
 * lockfile-pinned esbuild, over the same flags, over the same input, produces the same bytes. If
 * that ever stops holding, the drift check reds — the safe direction, and the reason `esbuild` is an
 * explicit devDependency of this workspace rather than something reached through tsx's or vitest's.
 *
 * @param entry the bundle to build, as {@link ACTION_BUNDLES} names it
 * @param root the checkout its paths are joined onto — the caller's, never this module's own
 */
export async function bundledSourceOf(entry: ActionBundle, root: string): Promise<string> {
  const built = await build({
    entryPoints: [path.join(root, entry.source)],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    // Named so the output reads as the file it will be committed as, and because esbuild wants an
    // output path even when it is handing the bytes back rather than writing them.
    outfile: path.join(root, entry.bundle),
    banner: { js: ESM_REQUIRE },
    write: false,
  });
  const output = built.outputFiles?.[0];
  if (output === undefined) {
    throw new Error(`esbuild produced no output bundling ${entry.source} for ${entry.action}`);
  }
  return output.text;
}

/**
 * What to type to put a drifted bundle back.
 *
 * IN THE RED, BECAUSE A BYTE DIFF OF A 280 KB FILE IS NOT A MESSAGE. The reader of that fault has
 * never read the bundle and never will; what they need is the one command that makes the tree
 * honest again, written into the fault rather than left for them to find in a script list.
 */
export const REBUILD_WITH = "pnpm build:action-bundles";
/** One committed bundle that is not what building its source produces. */
export interface BundleDriftFault {
  /** The action the bundle travels with. */
  readonly action: string;
  /** The bundle's own repository-relative path. */
  readonly bundle: string;
  /** What is wrong with it, in the sentence its reader gets. */
  readonly why: string;
}

/** What is committed at a bundle's path, or nothing where there is nothing there. */
function committedBytesAt(at: string): string | undefined {
  try {
    return readFileSync(at, "utf8");
  } catch {
    return undefined;
  }
}

/**
 * Every committed bundle that has fallen behind the source it mirrors.
 *
 * THE EXCEPTION MECHANISED RATHER THAN HONOURED. A committed build output is the one thing this
 * repository's `dist/` discipline is carved open for, and every JS action in the world that ships
 * one can rot the same way: the source is edited, the bundle is not rebuilt, and the step goes on
 * running last month's code while the tree reads as though it were fixed. Nothing about intending
 * to rebuild stops that. This does.
 *
 * ABSENT AND DIFFERENT ARE BOTH FAULTS, AND THEY READ DIFFERENTLY. A bundle nobody built is a step
 * that dies on its first run; a bundle behind its source is a step that runs the wrong code
 * quietly. The second is worse and the first is easier to cause, so each says which it is.
 *
 * THE REBUILD IS IN MEMORY. A check that had to write a temporary file to answer "is this stale?"
 * would be a check with a cleanup path to get wrong, and one that failed halfway would leave a
 * working tree its next reader cannot trust.
 *
 * DETERMINISM IS THE LOAD-BEARING ASSUMPTION and it is stated rather than assumed: the same
 * lockfile-pinned esbuild, over the same flags (which live in `bundledSourceOf` and nowhere else),
 * over the same input, produces the same bytes. Should that ever stop holding, this reds — the
 * safe direction, and the reason `esbuild` is an explicit devDependency rather than something
 * reached through tsx's or vitest's.
 *
 * @param entries the bundles to reconcile, as a manifest names them
 * @param root the checkout their paths are joined onto — the caller's, never this module's own
 */
export async function bundleDriftFaultsIn(
  entries: readonly ActionBundle[],
  root: string,
): Promise<BundleDriftFault[]> {
  const faults: BundleDriftFault[] = [];
  for (const entry of entries) {
    const committed = committedBytesAt(path.join(root, entry.bundle));
    if (committed === undefined) {
      faults.push({
        action: entry.action,
        bundle: entry.bundle,
        why:
          `nothing is committed at ${entry.bundle}, so the action ships no file for its step to ` +
          `run. Build it with \`${REBUILD_WITH}\` and commit what it writes.`,
      });
      continue;
    }
    if ((await bundledSourceOf(entry, root)) !== committed) {
      faults.push({
        action: entry.action,
        bundle: entry.bundle,
        why:
          `${entry.bundle} is not what building ${entry.source} produces, so the step runs code ` +
          `the source no longer says. Put it back with \`${REBUILD_WITH}\`.`,
      });
    }
  }
  return faults;
}
