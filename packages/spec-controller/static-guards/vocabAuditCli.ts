/**
 * CLI entry point for the one-time closed-vocabulary audit. Run via
 * `pnpm audit:vocab` (report-only — NOT a CI gate, NOT in any lint aggregate;
 * operator ruling 2026-07-02). It walks a root by default the cwd, scanning
 * EVERY file (the only exclusions — node_modules, .git, lockfiles, and the
 * audit's OWN detection machinery: the meta-mention exemption in
 * `SELF_EXEMPT_PATHS`, the files whose purpose is to name the rejected
 * vocabulary), runs the audit engine, and emits the two artefacts for review:
 *
 *   --manifest <path>   the per-name manifest CSV
 *   --matrix <path>     the coverage matrix (markdown)
 *   --root <dir>        the tree to scan (default ".")
 *
 * With no output paths it prints a summary to stdout. Exit is always 0 — the
 * audit reports, it never fails a build.
 *
 * @SCN-VOC-001 / @SCN-VOC-002 — features/vocabulary-audit.feature.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { auditFiles, renderManifestCsv, renderCoverageMatrixMarkdown } from "./vocabAudit.js";

/** Directory names never descended into. */
const EXCLUDED_DIRS = new Set([".git", "node_modules"]);
/** Lockfile names excluded from the scan. */
const EXCLUDED_FILES = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]);

/**
 * The audit's OWN detection machinery — the ONE meta-mention exemption (operator
 * ruling 2026-07-02). These files exist to ENUMERATE and EXERCISE the
 * rejected vocabulary: the word-set encoder literally lists the banned tokens, its
 * unit tests pass them to `classifyWords`, the feature documents them, the
 * integration step-defs drive them, and the `tests/fixtures/vocab/` corpus carries
 * them as detection fixtures. Auditing them for the very words they must name is a
 * guaranteed false positive, so the whole-repo scan skips them (matched by
 * repo-relative path — a narrower `--root` over the fixture corpus still scans them,
 * which is exactly what the integration arm needs). Everything else is swept to zero.
 */
const SELF_EXEMPT_PATHS = new Set([
  "packages/spec-controller/static-guards/vocabAudit.ts",
  "packages/spec-controller/static-guards/vocabAudit.test.ts",
  "packages/spec-controller/static-guards/vocabAuditCli.ts",
  "features/vocabulary-audit.feature",
  "tests/steps/vocabularyAudit.steps.ts",
]);
const SELF_EXEMPT_PREFIX = "tests/fixtures/vocab/";

/** Recursively list every scannable file under `root`, relative to `root`. */
export function walkFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      if (EXCLUDED_DIRS.has(name)) continue;
      const abs = join(dir, name);
      const st = statSync(abs);
      if (st.isDirectory()) {
        walk(abs);
      } else if (st.isFile() && !EXCLUDED_FILES.has(name)) {
        const rel = relative(root, abs).split(sep).join("/");
        if (SELF_EXEMPT_PATHS.has(rel) || rel.startsWith(SELF_EXEMPT_PREFIX)) continue;
        out.push(rel);
      }
    }
  };
  walk(root);
  return out;
}

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}

function main(): void {
  const argv = process.argv.slice(2);
  const root = argValue(argv, "--root") ?? ".";
  const manifestPath = argValue(argv, "--manifest");
  const matrixPath = argValue(argv, "--matrix");

  const relPaths = walkFiles(root);
  const files = relPaths.map((path) => ({ path, content: readFileSync(join(root, path), "utf8") }));
  const { manifest, matrix } = auditFiles(files);

  const csv = renderManifestCsv(manifest);
  const md = renderCoverageMatrixMarkdown(matrix);

  if (manifestPath) writeFileSync(manifestPath, csv);
  if (matrixPath) writeFileSync(matrixPath, md);

  const distinct = new Set(manifest.map((r) => r.current));
  console.log(
    `vocab audit: scanned ${files.length} file(s) under ${root}; ` +
      `${manifest.length} flagged name(s), ${distinct.size} distinct flagged word(s).`
  );
  if (manifestPath) console.log(`  manifest → ${manifestPath}`);
  if (matrixPath) console.log(`  coverage matrix → ${matrixPath}`);
  if (!manifestPath && !matrixPath) {
    console.log("\n" + md);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) main();
