/**
 * The domain-purity static check (@SCN-DPG-001) — makes "the reconciliation domain is pure and
 * self-contained" executable: the INNER analogue of the engine-purity guard (@SCN-EPG-001, the
 * package edge) one level down. Engine-purity keeps the whole core free of the app and IO; this
 * keeps the domain (`packages/core/src/domain`) free of the core's own ADAPTERS.
 *
 * PURE: `checkDomainPurity` takes the domain's source files as data and returns the violations;
 * the impure file-read (walking `packages/core/src/domain`) lives in the `@unit` test that drives
 * this over the real tree. The guard lives in `tests/checks/` (product-not-app) precisely because
 * it reads the tree via `fs` — it cannot live inside the pure domain it checks.
 *
 * Two properties, two violation arms:
 *   - **adapter-import** — a domain file must not import from the core's adapter layers
 *     (`parse/`, `render/`, `assemble/`, `census/`). A reconciliation concept reconciles; it
 *     does not parse a runner's output, render a report, assemble the document, or census the
 *     corpus. Those are the edges the domain sits inside, hexagonal — never the other way.
 *   - **app-import** — a domain file must not import from the `spec-controller` app package (bare
 *     specifier or a relative escape into it), the same PACKAGE boundary engine-purity enforces
 *     one level up. `@3f-consulting/spec-controller-core` (the core itself) is fine; the bare
 *     `spec-controller` package is not.
 *
 * Everything else — the sibling domain modules, and the pure aggregation roots (`../model.js`,
 * `../provenance/…`, `../lib/…`) — is allowed: the denylist is the adapter layers and the app,
 * mirroring engine-purity's forbidden-layer shape exactly.
 */

import type { CollectedFile } from "./sourceFiles.js";

/** A single domain-purity violation. */
export interface DomainPurityViolation {
  /** The offending file, as given by the caller (repo-relative in the guard test). */
  path: string;
  kind: "adapter-import" | "app-import";
  /** The specifier that tripped the static check. */
  detail: string;
}

/**
 * The app package a domain file must never import from — the `spec-controller` package (bare
 * specifier or a relative escape into it). `@3f-consulting/spec-controller-core` does NOT match
 * (that IS the core): the pattern only fires on `spec-controller` bounded by a path separator or
 * the specifier's end, so `spec-controller-core` is excluded. (Same pattern as engine-purity.)
 */
const APP_LAYER = /(?:^|\/)spec-controller(?:\/|$)/;

/**
 * The core's ADAPTER layers a domain file must never import from — `parse/`, `render/`,
 * `assemble/`, `census/`. Matched as a path SEGMENT (bounded by slashes), so `../render/…`,
 * `../census/…` etc. fire while an unrelated word (a `reassemble`-style identifier) does not.
 * The pure aggregation roots (`../model.js`, `../provenance/…`, `../lib/…`) are NOT here — the
 * guard is a denylist of the adapter layers, not an allowlist.
 */
const ADAPTER_LAYER = /(?:^|\/)(?:parse|render|assemble|census)\//;

/** `import … from "spec"` / `export … from "spec"` — captures the specifier. */
const FROM_SPECIFIER = /\bfrom\s*['"]([^'"]+)['"]/g;

/**
 * Strip `//` line comments and block comments so a doc-comment that merely NAMES a forbidden
 * layer (this file's own header does) is not a false positive. Over-stripping the odd string
 * literal is harmless here — the static check only cares about real `from` specifiers.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Check every domain file for purity violations. Returns one `DomainPurityViolation` per
 * offending import, in file-then-source order; an empty array means the domain seam holds.
 * The app-layer check is applied FIRST, so an import that escapes into the app package is
 * reported as `app-import` even if its path happens to contain an adapter-named segment.
 */
export function checkDomainPurity(files: readonly CollectedFile[]): DomainPurityViolation[] {
  const violations: DomainPurityViolation[] = [];
  for (const file of files) {
    const code = stripComments(file.source);

    for (const match of code.matchAll(FROM_SPECIFIER)) {
      const specifier = match[1]!;
      if (APP_LAYER.test(specifier)) {
        violations.push({ path: file.path, kind: "app-import", detail: specifier });
      } else if (ADAPTER_LAYER.test(specifier)) {
        violations.push({ path: file.path, kind: "adapter-import", detail: specifier });
      }
    }
  }
  return violations;
}
