/**
 * relativizeToRoot — a PURE path-string transform, extracted and shared.
 * No IO: the caller provides the run root (the IO — `process.cwd()` — stays at
 * the CLI edge). A pure CORE utility both the evidenceObservations locators (`evidenceObservations.ts`) and the
 * provenance inputs (`run/runContext.ts`) depend on, so the portability rule lives once
 * — and, being side-effect-free, it sits cleanly in the public core through the Phase-B
 * split (no app-layer inversion).
 *
 * Semantics (unchanged): a non-absolute path (a sentinel like
 * `(unknown vitest file)`, an already-relative path) is returned unchanged; an absolute
 * path UNDER `root` collapses to the relative path; an absolute path NOT under `root`
 * (the relative path would escape via `..` or resolve absolute) falls back to the
 * ORIGINAL string — never a `../../` leak. With no `root`, the path is returned verbatim.
 */
import { isAbsolute, relative } from "node:path";

export function relativizeToRoot(path: string, root: string | undefined): string {
  if (root === undefined || !isAbsolute(path)) return path;
  const rel = relative(root, path);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return path;
  return rel;
}
