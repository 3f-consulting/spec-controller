/**
 * Types for `domainEntityRoots.mjs` (@SCN-CPX-004, 3F-2416) — the domain's concept modules.
 *
 * A SEPARATE module from both `complexityThresholds.mjs` and `complexityExceptions.mjs`, for the same
 * provenance reason those two are separate from each other: the thresholds are numbers stated from
 * outside this tree, the exceptions are numbers measured from it, and this is no number at all — a
 * statement of what kind of module each path is. Three opposite claims, three files.
 */

/** The domain concept modules the `max-lines` rule does not govern, repo-relative. */
export declare const DOMAIN_ENTITY_ROOTS: readonly string[];
