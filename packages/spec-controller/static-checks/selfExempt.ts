/**
 * The audit's exempt set, and WHY each entry is on it (@SCN-VOC-016 / @SCN-VOC-017, 3F-2378).
 *
 * An exemption makes a file wholly invisible to the vocabulary audit. That is honest for a
 * PURE-DATA file — the vendored canon table, the rename-target table, the fixture corpus,
 * the feature file and the step definitions binding it — where every banned word is a
 * MENTION, the definition of what is banned. It is dishonest for a MIXED file, code with
 * data inlined, because there the same exemption hides a USE behind a mention. That is what
 * hid 3F-2300: a renamed handle survived as an identifier in files nobody could see into,
 * and the rename read complete because the audit reported nothing.
 *
 * So the list is no longer a bare set of paths. Every entry states its KIND, and the two
 * kinds are judged differently:
 *
 *   `pure-data` — permanent and honest. Every banned word in the file is a mention.
 *   `residual`  — TEMPORARY, and must name the ticket that removes it. A code file that
 *                 cannot be freed yet, carried explicitly rather than blanket-exempt.
 *
 * A residual is the shape a DEFERRED canon row already has (`blockedVocabulary.md`: a
 * deferral without a ticket is an intention, not a decision) and the shape the complexity
 * exception list has. The point is that "we could not fix this yet" and "this is fine
 * forever" stop looking identical on the page — which, in a bare set of paths, they did.
 *
 * THE LIST HOLDS NO RESIDUAL TODAY (3F-2392). The four this file shipped with are gone:
 * their data moved to the fixture corpus, their comments name the ROLE rather than the
 * word, and `FlagReason`'s members are named after their rules rather than the coinages
 * they catch. So no CODE file is exempt — the end state 3F-2378 set.
 *
 * The `residual` kind stays anyway, and that is deliberate. It is the mechanism for the
 * next piece of declared debt, and @SCN-VOC-016/017 prove it over INJECTED lists precisely
 * so a healthy tree cannot make it unobservable. Deleting a proven mechanism because
 * today's list happens not to use it is how the next exemption gets granted with no shape
 * to grant it in.
 */

/** Why a path is exempt. */
export type ExemptionKind =
  | { readonly kind: "pure-data"; readonly note: string }
  | { readonly kind: "residual"; readonly pending: string; readonly note: string };

/**
 * The exempt set. Ordered pure-data first, residuals second, so the floor and the debt
 * read as two different things at a glance.
 */
export const SELF_EXEMPT: ReadonlyMap<string, ExemptionKind> = new Map<string, ExemptionKind>([
  // ─── PURE DATA — permanent, every banned word a mention ────────────────────────────
  [
    "packages/spec-controller/static-checks/blockedVocabulary.md",
    { kind: "pure-data", note: "the vendored canon table — it IS the list of retired words" },
  ],
  [
    "packages/spec-controller/static-checks/renameTargets.md",
    { kind: "pure-data", note: "the rename-target table (3F-2378); per-inflection, so canon cannot hold it" },
  ],
  [
    "features/vocabulary-audit.feature",
    {
      kind: "pure-data",
      note: "the detector's SPEC names its subject-vocabulary; the retired word IS the example, and a scenario should show what it tests (operator ruling, 2026-08-04)",
    },
  ],
  [
    "tests/steps/vocabularyAudit.steps.ts",
    { kind: "pure-data", note: "the feature file's data in executable form — fixture inputs, not vocabulary" },
  ],
  [
    "tests/steps/adoptedVocabulary.steps.ts",
    { kind: "pure-data", note: "as above, for the tree-enforcement gate's scenarios" },
  ],

  // ─── RESIDUAL — none. 3F-2392 removed the last four; see the docblock above. ─────────
]);

/**
 * The fixture corpus, exempt by PREFIX rather than path — it grows a file at a time and
 * every one of them is a detection fixture. Repo-relative on purpose: a narrower `--root`
 * over the corpus makes those files top-level, and @SCN-VOC-001/002 need them scanned then.
 */
export const SELF_EXEMPT_PREFIX = "tests/fixtures/vocab/";

/** Every exempt path, for the callers that only need membership. */
export const SELF_EXEMPT_PATHS: ReadonlySet<string> = new Set(SELF_EXEMPT.keys());
