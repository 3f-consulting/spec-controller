/**
 * WHERE CHECK CODE LIVES, SPELLED ONCE (3F-3188).
 *
 * Two readers need this repository's check tree by name and they need it in different shapes:
 * `sourceFiles.ts` joins it onto the repository root to WALK it, and `enginePurity.ts` matches it
 * inside an import specifier to REFUSE it. Written down twice they agree until one is edited — and
 * the edit that moved this tree out of `packages/spec-controller/` (3F-3187) is precisely the edit
 * that would have done it. Before that move both readers were free of the question: every check
 * module lived under the app package, so the purity rule's one match over the PACKAGE name covered
 * them without naming them.
 *
 * WHY IT IS ITS OWN MODULE RATHER THAN A CONSTANT IN `sourceFiles.ts`, which is otherwise the ONE
 * reading of which roots this repository's source lives under. `enginePurity.ts` must import this
 * as a VALUE, and `sourceFiles.ts` imports `node:fs`: a value import from there would hand a check
 * that is pure by construction a runtime edge to IO, which is the property `sourceFiles.ts`'s own
 * note records as deliberate and OBSERVED. A module with no imports at all can be read by both
 * without either of them acquiring anything.
 */

/**
 * The check tree's path segments, relative to the repository root.
 *
 * Segments rather than a joined path because the two readers join differently — one with the
 * platform separator through `node:path`, one with the `/` an import specifier always uses. A
 * single pre-joined string would force one of them to split it back apart.
 */
export const CHECK_TREE_SEGMENTS = ["tests", "checks"] as const;

/**
 * The same home as one POSIX path fragment — how an import specifier spells it, on every platform.
 * A specifier is not a filesystem path: it uses `/` even where `node:path` would use `\`.
 */
export const CHECK_TREE_SPECIFIER_PATH = CHECK_TREE_SEGMENTS.join("/");
