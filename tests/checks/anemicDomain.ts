/**
 * The anemic-domain static check logic (the @unit-testable core).
 *
 * A concept module co-locates its type with the pure functions over it, and it owns its
 * own behaviour. The failure mode is the anemic split: the behaviour is lifted out into a
 * module beside it named for a procedural layer, leaving the concept as inert data. Canon
 * names it (`technical-design/functional-domain-modelling.md`; the `fitness-functions.md`
 * ruling of 2026-08-05) and asks for exactly this much mechanism — "a filename-signature
 * static check is enough to fence the obvious case".
 *
 * WHY NOW. 3F-2416 scoped the module-size ceiling off the concept modules, which removed
 * the one force actively PUSHING behaviour out of them: under the ceiling, hiving a rich
 * aggregate's operations into a second module was the cheapest route to green. This fences
 * the door that opened.
 *
 * THE FILE LIST IS INJECTED (not shelled from git here) so the rule is unit-tested in
 * isolation and both evidence arms can plant paths without writing files; the CLI
 * (`lintAnemicDomainCli.ts`) supplies the real list from `git ls-files`. `scnTags.ts` was split
 * the same way for the same reason, and left at 3F-3312.
 *
 * WHAT A GREEN HERE DOES NOT ESTABLISH. It reds a NAME. Behaviour can drain out of a
 * concept into a module called anything at all, so a green is not evidence the domain is
 * not anemic — that judgement stays with the reviewer. Said plainly because a check that
 * certifies more than it examines is the failure the whole gate family exists to remove.
 *
 * @SCN-ANM-001 — features/anemic-domain.feature.
 */

/**
 * The directory segment that makes a module a domain module.
 *
 * SCOPE IS THE DISCRIMINATOR, NOT THE WORD. A `renderService` under `render/` is ordinary
 * and legitimate — the claim is about where behaviour lives relative to its concept. A
 * check that redded the word wherever it appeared would be a spell-checker, and the first
 * legitimate `*Service` at an edge would get it switched off.
 */
export const DOMAIN_SEGMENT = "/src/domain/";

/**
 * The procedural-layer names canon names, in both spellings this codebase could use.
 *
 * BOTH CASINGS, OR THE CHECK TEACHES THE WORKAROUND. `ledger-operations.ts` and
 * `ledgerOperations.ts` are the same tell; catching one and not the other does not prevent
 * the anemic split — it tells whoever hits it which spelling to use, which is worse than no
 * check because it reads as enforcement.
 *
 * THREE WORDS, BECAUSE CANON NAMES THREE. `*-helper`, `*-util`, `*-handler` and plurals all
 * pass. Each additional word is a judgement someone should make deliberately rather than
 * inherit from an implementation that swept it in on the way past.
 */
export const PROCEDURAL_LAYER_WORDS = ["operations", "service", "manager"] as const;

/** One module whose name says its concept's behaviour was lifted out of the concept. */
export interface AnemicDomainViolation {
  /** Repo-relative path of the offending module. */
  path: string;
  /** The procedural-layer word its name ends in. */
  word: (typeof PROCEDURAL_LAYER_WORDS)[number];
}

/**
 * The module name a path carries, with `.ts` and any `.test` removed.
 *
 * The `.test` strip is deliberate: a `ledgerOperations.test.ts` is the test of a module
 * that must not exist, so it reds too. Without it the module reds and its test does not,
 * which leaves a reader wondering whether the test was somehow blessed.
 */
const stemOf = (path: string): string =>
  (path.split("/").pop() ?? "").replace(/\.ts$/, "").replace(/\.test$/, "");

/** The procedural-layer word a stem ends in — kebab, camel, or the bare word — or none. */
const proceduralLayerWordOf = (stem: string): AnemicDomainViolation["word"] | undefined =>
  PROCEDURAL_LAYER_WORDS.find((word) => {
    const capitalised = word.charAt(0).toUpperCase() + word.slice(1);
    return stem === word || stem.endsWith(`-${word}`) || stem.endsWith(capitalised);
  });

/**
 * Given the repo's tracked files, return the domain modules named for a procedural layer.
 * An empty result means the tree is clean and the static check passes; a non-empty result
 * names every offender and the word that condemned it.
 */
export function findProceduralLayerModules(
  trackedFiles: readonly string[],
): AnemicDomainViolation[] {
  const violations: AnemicDomainViolation[] = [];
  for (const path of trackedFiles) {
    if (!path.includes(DOMAIN_SEGMENT)) continue;
    const word = proceduralLayerWordOf(stemOf(path));
    if (word !== undefined) violations.push({ path, word });
  }
  return violations;
}
