/**
 * The engine-purity static guard (@SCN-EPG-001) — makes "the reconciliation engine is pure
 * and self-contained" executable, the same discipline as the @SCN-API-001 barrel
 * guard one level up.
 *
 * PURE: `checkEnginePurity` takes the engine's source files as data and returns the
 * violations; the impure file-read (walking the core package's `src/`) lives in the
 * `@unit` test that drives this over the real tree. The guard lives in `static-guards/`
 * (product-not-app) precisely because it reads the tree via `fs` — it cannot live inside
 * the pure engine it checks.
 *
 * Two properties, two violation arms:
 *   - **impure-import** — a core-package file must not import from the `spec-controller`
 *     app package (the CLI, ingest, run-management, and the product quality checks all
 *     live there). Keeps the pure core embeddable by any external consumer without
 *     dragging the app along. The forbidden layer is a PACKAGE boundary, not a sibling
 *     directory: `@3f-consulting/spec-controller-core` (the core itself) is fine; the
 *     bare `spec-controller` package — or any relative escape into it — is not.
 *   - **io-import / io-global** — a core file must not import `node:fs` /
 *     `node:child_process` / `node:process`, nor reference the `process` global. Keeps
 *     the engine testable with data alone.
 */

import type { CollectedFile } from "./sourceFiles.js";

/** A single engine-purity violation. */
export interface PurityViolation {
  /** The offending file, as given by the caller (repo-relative in the guard test). */
  path: string;
  kind: "impure-import" | "io-import" | "io-global";
  /** The specifier or token that tripped the static guard. */
  detail: string;
}

/**
 * The app package a core file must never import from — the `spec-controller` package
 * (bare specifier or a relative escape into it). `@3f-consulting/spec-controller-core`
 * does NOT match (that IS the core): the pattern only fires on `spec-controller` bounded
 * by a path separator or the specifier's end, so `spec-controller-core` is excluded.
 */
const IMPURE_LAYER = /(?:^|\/)spec-controller(?:\/|$)/;

/** The node IO builtins an engine file must never import (with `/promises` etc. variants). */
const IO_IMPORT = /^node:(?:fs|child_process|process)(?:\/.*)?$/;

/** `import … from "spec"` / `export … from "spec"` — captures the specifier. */
const FROM_SPECIFIER = /\bfrom\s*['"]([^'"]+)['"]/g;

/** A reference to the `process` global — `process.cwd()`, `process.env`, etc. */
const PROCESS_GLOBAL = /\bprocess\s*\./;

/**
 * Strip `//` line comments and block comments so a doc-comment that merely NAMES an IO
 * token (e.g. portablePath.ts's "the IO — `process.cwd()` — stays at the caller") is not
 * a false positive. Over-stripping the odd string literal is harmless here — the static guard
 * only cares about real imports and real `process.` references, never string contents.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Check every engine file for purity violations. Returns one `PurityViolation` per
 * offending import/reference, in file-then-source order; an empty array means the
 * engine seam holds.
 */
export function checkEnginePurity(files: readonly CollectedFile[]): PurityViolation[] {
  const violations: PurityViolation[] = [];
  for (const file of files) {
    const code = stripComments(file.source);

    for (const match of code.matchAll(FROM_SPECIFIER)) {
      const specifier = match[1]!;
      if (IMPURE_LAYER.test(specifier)) {
        violations.push({ path: file.path, kind: "impure-import", detail: specifier });
      } else if (IO_IMPORT.test(specifier)) {
        violations.push({ path: file.path, kind: "io-import", detail: specifier });
      }
    }

    if (PROCESS_GLOBAL.test(code)) {
      violations.push({ path: file.path, kind: "io-global", detail: "process" });
    }
  }
  return violations;
}
