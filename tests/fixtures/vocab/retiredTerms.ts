/**
 * The retired terms this repository has ADOPTED, as fixture data (@SCN-VOC-016, 3F-2378).
 *
 * PURE DATA. Every string here is a MENTION — the word a test drives through the classifier
 * to prove the classifier catches it — never a *use*. That is what makes this file's
 * exemption honest, and it sits under `tests/fixtures/vocab/`, the prefix the audit has
 * always skipped for exactly this reason.
 *
 * WHY IT EXISTS. These words were hard-coded across four test files, which is what kept
 * those files on the audit's exempt list: a mixed file, code with data inlined, whose
 * whole-file exemption hides a *use* behind a *mention*. That is what let 3F-2300's renamed
 * handle survive unseen. Relocating the data here is what lets those tests be audited like
 * any other code.
 *
 * NAMED BY ROLE, not by spelling. A test reads `RETIRED.metric`, so the assertion says what
 * it is exercising and the word itself stays here. When a term is re-retired under a
 * different spelling, one row changes and every test follows.
 *
 * ONLY the adopted tier lives here. The code-side glossary aliases (3F-2369), the deferred
 * canon rows (3F-2329) and the bare shortenings are gate-inert today and stay where the
 * tests already hold them — un-exemption makes them visible for their own sweeps, which is
 * the point of 3F-2378 rather than an omission from it.
 */

/** The retired words, by the role each plays in the rule that retired it. */
export const RETIRED = {
  /** @SCN-VOC-007 — the retired metric word. */
  metric: "budget",
  /** Its plural, which the naive singulariser folds onto the same stem. */
  metricPlural: "budgets",

  /** @SCN-VOC-004 — the retired evidence-obligation noun. */
  obligationNoun: "demand",
  /** Its plural. */
  obligationNounPlural: "demands",
  /** Its past participle. */
  obligationPast: "demanded",
  /** Its present participle — a VERB, so its replacement is a verb too. */
  obligationVerb: "demanding",
  /** Its agent noun. */
  obligationAgent: "demander",
  /** The agent noun's plural. */
  obligationAgentPlural: "demanders",

  /** @SCN-VOC-004 / 3F-2300 — the retired credit-side outcome HANDLE. */
  outcomeHandle: "undemanded",

  /** @SCN-VOC-005 — the retired class-name PHRASE, first word then second. */
  classNamePhraseFirst: "static",
  classNamePhraseSecond: "guard",

  /** @SCN-VOC-006 — the retired tag PHRASE, first word then second. */
  tagPhraseFirst: "ci",
  tagPhraseSecond: "performance",
} as const;

/** What each retired term must become — the canon replacement the manifest reports. */
export const CANONICAL = {
  /** @SCN-VOC-007. */
  metric: "threshold",
  /** @SCN-VOC-004 — the noun forms. */
  obligation: "evidence obligation",
  /** @SCN-VOC-004 — the verb form takes a verb, never the retired `declare`. */
  obligationVerb: "naming",
  /** @SCN-VOC-004 — the agent noun. */
  obligationAgent: "naming scenario",
  /** @SCN-VOC-004 / 3F-2300 — the hyphenated handle, not the prose term. */
  outcomeHandle: "no-evidence-obligation",
  /** @SCN-VOC-005 — the canon class name. */
  className: "static check",
  /** @SCN-VOC-006 — the canon tag. */
  tag: "ci-run-time",
} as const;

/** The retired class-name phrase as it is written, for a prose corpus. */
export const RETIRED_CLASS_NAME_PHRASE = `${RETIRED.classNamePhraseFirst} ${RETIRED.classNamePhraseSecond}`;

/** The retired tag phrase as it is written. */
export const RETIRED_TAG_PHRASE = `${RETIRED.tagPhraseFirst}-${RETIRED.tagPhraseSecond}`;

/** Composite identifiers the retired terms really lived in, for NAME-mode corpora. */
export const RETIRED_COMPOSITE = {
  /** @SCN-VOC-007 — the metric word inside a camelCase identifier. */
  metricIdentifier: "complexityBudget",
  /** @SCN-VOC-007 — and its plural, the real filename the rename produced. */
  metricPluralFilename: "complexityBudgets.mjs",
  /** @SCN-VOC-004 — the past participle inside a camelCase identifier. */
  obligationPastIdentifier: "demandedStaticGuards",
  /** @SCN-VOC-005 — the class-name phrase's NAME-mode spellings: camel, plural, kebab, Pascal. */
  classNameIdentifiers: ["staticGuard", "staticGuards", "static-guards", "StaticGuardTotals"],
  /** @SCN-VOC-006 — the tag phrase inside a camelCase identifier. */
  tagIdentifier: "ciPerformance",
} as const;

/**
 * The PLAIN adopted terms — the words `bannedWordsOf` derives from the canon table's
 * `adopted` + `whole-word` rows. The two phrase rows are adopted too but take matcher
 * exceptions, so they are deliberately absent: that split is what "canon owns which words
 * are retired, this repository owns how each one matches" means as data.
 */
export const ADOPTED_PLAIN_TERMS: readonly string[] = [
  RETIRED.metric,
  RETIRED.obligationNoun,
  RETIRED.obligationPast,
  RETIRED.obligationAgent,
  RETIRED.obligationVerb,
  RETIRED.obligationNounPlural,
  RETIRED.outcomeHandle,
];

/**
 * Every word the tree-enforcement gate reds on — the plain adopted terms PLUS the first
 * token of each adopted phrase row, which is the word those arms actually flag.
 */
export const ADOPTED_TRIGGER_WORDS: readonly string[] = [
  ...ADOPTED_PLAIN_TERMS,
  RETIRED.classNamePhraseFirst,
  RETIRED.tagPhraseFirst,
];
