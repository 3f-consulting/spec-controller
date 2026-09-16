/**
 * The MUTATED-SURFACE static check (@SCN-MSG-002, 3F-2873) — what `stryker.config.mjs`'s `mutate`
 * glob is allowed to say, held to a list that states its reasons.
 *
 * WHY THIS GUARD EXISTS AT ALL. 3F-2873 takes the fault-message catalogue off the mutated surface
 * by config, and that is a defensible thing to do to a table of sentences and an indefensible thing
 * to do to anything that decides something. The trouble is that the two are ONE CHARACTER apart:
 * `!…/qualityCheckFaultMessages.ts` is a single edit away from `!…/**\/*Messages.ts`, or from
 * `!…/domain/**`, and neither edit reds anything. Worse, the mutation score would RISE — the reader
 * would meet a number that improved and no evidence that the surface it was measured over had
 * shrunk. An exclusion nobody checks is a larger hole than the mutants it removes.
 *
 * SO THE SURFACE IS NAMED, NOT INFERRED. `SANCTIONED_MUTATE_GLOB` below is the whole of what the
 * config may say, entry by entry, each with the argument for why it is there. Anything else in the
 * config — a widened negation, a missing one, a narrowed include — is a violation, and the arm
 * reports WHICH, so the red names its own cause rather than sending the reader hunting.
 *
 * PURE, LIKE ITS SIBLINGS. `checkMutateSurface` takes the parsed glob as data and returns the
 * violations; the config load lives in the `@unit` arm that drives this over the real config,
 * exactly as `termSpelling` splits its repository walk from its spelling rule (and as `domainPurity`
 * split its walk from its rule, until 3F-3438). `mutateGlobOf` reads the loaded config,
 * so a config that lost its `mutate` key throws here rather than reading as a surface with no
 * exclusions — the empty-vs-empty false green this guard would otherwise be wide open to.
 */

/** Why an entry is allowed in the `mutate` glob, and whether it names or excludes a surface. */
export interface SanctionedPattern {
  /** `include` — a surface Stryker mutates. `exclude` — a `!` negation carving one out. */
  readonly role: "include" | "exclude";
  /** The argument for this entry, in the terms the exclusion was granted in. */
  readonly reason: string;
}

/** A single disagreement between the real config's `mutate` glob and the sanctioned one. */
export interface MutateSurfaceViolation {
  readonly kind:
    | "unexpected-exclusion"
    | "missing-exclusion"
    | "unexpected-inclusion"
    | "missing-inclusion";
  /** The offending pattern, `!` stripped — the bare path or glob the entry names. */
  readonly pattern: string;
}

/**
 * The whole of what `stryker.config.mjs`'s `mutate` may say. Two excludes, one include, no more.
 *
 * The catalogue entry is the one this scenario exists for. It is granted to a file that holds a
 * table of sentences and NOTHING ELSE — no branching, no lookup, no render helper — which is why
 * 3F-2872 split the mechanism three ways rather than two. If a decision ever moves into that file
 * the grant no longer covers it, and the honest response is to move the decision back out, never to
 * widen this entry.
 */
export const SANCTIONED_MUTATE_GLOB: ReadonlyMap<string, SanctionedPattern> = new Map([
  [
    "packages/core/src/domain/**/*.ts",
    {
      role: "include",
      reason: "the domain core — the whole of what mutation testing is asked about here",
    } as const,
  ],
  [
    "packages/core/src/domain/**/*.test.ts",
    {
      role: "exclude",
      reason: "the arms, not the subject: mutating a test measures the test against itself",
    } as const,
  ],
  [
    "packages/core/src/domain/qualityCheckFaultMessages.ts",
    {
      role: "exclude",
      reason:
        "the fault-message catalogue (3F-2873) — pure prose data, so a mutant over it is a wording change no suite may pin",
    } as const,
  ],
]);

/** The sanctioned patterns for one role, as bare paths. */
function sanctioned(role: SanctionedPattern["role"]): string[] {
  return [...SANCTIONED_MUTATE_GLOB].filter(([, p]) => p.role === role).map(([pattern]) => pattern);
}

/** Split the config's glob into its includes and its `!` negations, each with the `!` stripped. */
function partition(glob: readonly string[]): { includes: string[]; excludes: string[] } {
  const includes: string[] = [];
  const excludes: string[] = [];
  for (const entry of glob) {
    if (entry.startsWith("!")) excludes.push(entry.slice(1));
    else includes.push(entry);
  }
  return { includes, excludes };
}

/**
 * Every way one role's actual set can disagree with its sanctioned set — an entry present that was
 * never granted, and an entry granted that has gone missing.
 *
 * BOTH DIRECTIONS, DELIBERATELY. A widened exclusion is the failure this guard was raised for, but
 * a DELETED one is just as silent: drop the catalogue's negation and the prose returns to the
 * mutated surface, the score falls, and the reason reads as a regression somewhere else entirely.
 */
function disagreements(
  actual: readonly string[],
  expected: readonly string[],
  unexpected: MutateSurfaceViolation["kind"],
  missing: MutateSurfaceViolation["kind"],
): MutateSurfaceViolation[] {
  const found = new Set(actual);
  const allowed = new Set(expected);
  return [
    ...actual.filter((p) => !allowed.has(p)).map((pattern) => ({ kind: unexpected, pattern })),
    ...expected.filter((p) => !found.has(p)).map((pattern) => ({ kind: missing, pattern })),
  ];
}

/**
 * Check a `mutate` glob against the sanctioned surface. An empty array means the config says exactly
 * what it is allowed to say; anything else is reported pattern by pattern, excludes first.
 */
export function checkMutateSurface(glob: readonly string[]): MutateSurfaceViolation[] {
  const { includes, excludes } = partition(glob);
  return [
    ...disagreements(
      excludes,
      sanctioned("exclude"),
      "unexpected-exclusion",
      "missing-exclusion",
    ),
    ...disagreements(
      includes,
      sanctioned("include"),
      "unexpected-inclusion",
      "missing-inclusion",
    ),
  ];
}

/**
 * The `mutate` glob out of a LOADED Stryker config — what the runner's own reader hands back.
 *
 * IT TAKES THE CONFIG AND NOT ITS TEXT SINCE 3F-3334. `stryker.config.json` became
 * `stryker.config.mjs` the moment the break threshold arrived with a line of prose beside it, which
 * strict `JSON.parse` refuses. The config is a module now, so the only way to read it is the way
 * Stryker reads it — load it and look at what it exported. A guard that went on parsing text would
 * have been parsing a file the runner no longer opens, and would have said so out loud exactly
 * never.
 *
 * Throws rather than defaulting when the key is absent or is not a list of strings. A guard that
 * read a missing key as `[]` would report a config with NO exclusions as a config whose exclusions
 * all match — the empty-vs-empty green that makes a check which never ran indistinguishable from
 * one that passed.
 */
export function mutateGlobOf(config: unknown): readonly string[] {
  const glob = (config as { mutate?: unknown } | null | undefined)?.mutate;
  if (!Array.isArray(glob) || !glob.every((entry) => typeof entry === "string")) {
    throw new Error("stryker config: `mutate` is absent or is not a list of glob patterns");
  }
  return glob;
}
