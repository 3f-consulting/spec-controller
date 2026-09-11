/**
 * The single-sourced STARTER set of recognised community deferral tags — bare names
 * (the `@` is tag-line syntax). A scenario whose tag block carries one of these DEFERS
 * every obligation it raises to a Pending Item (scenario-scope). These are the
 * established Cucumber deferral conventions.
 *
 * This is **product policy, not a core-domain invariant** — an evolvable list of tag
 * strings, so it lives in the application layer, NOT on the frozen v1 core barrel
 * (@SCN-API-001). The core `parseScenarios` recognises only the deferral set it is
 * handed (its default is `[]`, a policy-free pure core); the app is the single source
 * of the starter policy and always passes the resolved set (starter ∪ configured) into
 * the parser at the ingest edge. Both `resolveDeferralTags` (the `@SCN-PND-021` config
 * union) and `renderCommandHelp`'s `--help` listing source this constant.
 */
export const DEFAULT_DEFERRAL_TAGS: readonly string[] = [
  "wip",
  "ignore",
  "skip",
  "todo",
  "pending",
];
