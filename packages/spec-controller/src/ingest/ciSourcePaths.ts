/**
 * Resolve a CI input to the workflow files it names (@SCN-USG-006, 3F-2497).
 *
 * A target's pipeline is routinely split across files — a nightly sweep, a security
 * scan — and reading one of them scores the rest against the target twice over: a
 * NAMED check enforced elsewhere is called a watermelon it is not, an UNNAMED one
 * never reaches the books at all (3F-2238).
 *
 * THIS IS THE ONLY PLACE THAT KNOWS A CI INPUT CAN BE A DIRECTORY. The core takes
 * anonymous source strings so a second ecosystem can supply its own; teaching it to
 * walk a folder would import a filesystem and one provider's layout into a pure
 * parser and close that seam for good. So the walk lives here, at the edge that
 * already resolved `.github/workflows/ci.yml`, and the edge knows exactly as much
 * about GitHub after this slice as it did before.
 *
 * Pure, with the filesystem injected — the resolution rules are the part worth
 * asserting directly, and a fixture tree can only show one of them going wrong at a
 * time.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** The filesystem reads the resolution needs, injected so the rules stay pure. */
export interface CiPathReader {
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
  readDir(path: string): string[];
}

/** The real filesystem, for the CLI edge. */
export const NODE_CI_PATH_READER: CiPathReader = {
  exists: existsSync,
  isDirectory: (path) => statSync(path).isDirectory(),
  readDir: readdirSync,
};

/** Both YAML spellings: a target picks one, and the tool does not get to mind which. */
const WORKFLOW_EXTENSIONS = [".yml", ".yaml"];

/**
 * The workflow files a CI input names: every workflow in a directory, or the single
 * file itself.
 *
 * Sorted, so two runs over one tree cannot differ and a diff of two reports never
 * turns on `readdir` ordering.
 *
 * A FILE RESOLVES TO ITSELF ALONE. Sweeping its parent directory would silently widen
 * a caller's deliberate scope, which is the promise @SCN-USG-008 pins at the report level.
 *
 * An absent path resolves to nothing — no sources, no commands, every static check
 * read as unenforced. That over-reports gaps and hides none, the same fail-safe
 * direction `ciRunCommands` takes on a document it cannot parse. The HARD error for a
 * path the caller SUPPLIED and that does not exist is @SCN-CLI-002's, raised upstream;
 * reaching here with nothing means the DEFAULT found no workflows, which is a fact
 * about the target rather than a mistake by its author.
 */
export function ciSourcePathsOf(
  ciPath: string,
  reader: CiPathReader = NODE_CI_PATH_READER,
): string[] {
  if (!reader.exists(ciPath)) return [];
  if (!reader.isDirectory(ciPath)) return [ciPath];
  return reader
    .readDir(ciPath)
    .filter((name) => WORKFLOW_EXTENSIONS.some((ext) => name.endsWith(ext)))
    .sort()
    .map((name) => join(ciPath, name));
}
