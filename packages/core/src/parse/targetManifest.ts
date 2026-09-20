/**
 * The TARGET's `specController.*` configuration, read into the rows and mints the
 * reconciler takes — the `resolve*` family, moved here from the app's ingest edge (3F-3087).
 *
 * WHY THEY LIVE IN THE ENGINE. Every one of them is a pure function of a manifest object
 * somebody else already read off disk, and every one of them is the ONE reading of the key it
 * names — `bareTerm` is core's, so the reader and the thing it reads through belonged on the same
 * side of the package boundary. Sitting at the app
 * edge they were the reason a PUBLISHED module imported core's unpublished `/internal` subpath,
 * which is the fault 3F-3086 repairs; nothing about reading a parsed manifest ever needed the
 * edge that produced it.
 *
 * WHAT THE EDGE STILL OWES THEM, AND WHY IT IS A PARAMETER. One of these readings depends on
 * something the engine must not know: the deferral-tag STARTER SET is product policy the
 * application layer single-sources (`DEFAULT_DEFERRAL_TAGS`). It arrives as an argument, as data,
 * so the engine keeps knowing nothing about files (`lint:boundaries`' `core-imports-io` rule,
 * which was @SCN-EPG-001's `io-import` arm until 3F-3437; and 3F-2841's pattern: a project-owned
 * term arrives as an input).
 *
 * DEFENSIVE THROUGHOUT, AND THAT IS THE FAMILY'S STANCE RATHER THAN LOCAL CHOICES PER RESOLVER.
 * Config is data from outside: a missing, non-object or array-shaped value resolves EMPTY, and a
 * malformed entry is dropped by the reading function it is handed to rather than thrown. A check
 * that throws on a typo produces no verdict at all.
 */

import { bareTerm } from "../lib/bareTerm.js";
// THE FOUR CANON TIERS, read from the ledger's own enumeration rather than restated here
// (@SCN-USG-019). A second list of the same four would agree by coincidence, and this axis's
// whole argument is that a list of names is the drift.
import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";

/** Whether a value read out of a manifest is a block of named fields, rather than a list or scalar. */
function isBlock(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The steps the TARGET names NON-CHECKS (@SCN-USG-015, 3F-3343) — `specController.notChecks`, read
 * as the fully-qualified `<workflow file>:<job id>:<step name>` entries the target wrote.
 *
 * IT IS THE CONSUMER'S OWN LIST, and that is the whole reason it may exist at all. Not everything
 * that is not a behavioural runner is a fitness check — a checkout, a dependency install, a deploy
 * — and this axis's standing rule is that a list of check NAMES is the drift. A list of the
 * consumer's own STEPS is the opposite thing: it is about their pipeline, it is written once, and
 * nothing in this tree has an opinion about what is on it.
 *
 * The seventh of this family's `specController.*` resolvers, and defensive like the six above it:
 * a missing or non-array value resolves EMPTY and a non-string entry is dropped rather than
 * thrown. Deduplicated, as the configured-static-check list beside it is, so a target that wrote
 * one line twice is reported one line — the account below is per ENTRY, and the same entry twice
 * is one thing the consumer said.
 *
 * WHAT AN ENTRY MEANS IS NOT DECIDED HERE. This reader takes the list off the manifest; matching it
 * against a pipeline, and saying which entries matched nothing, is `parse/stepExclusions`.
 */
export function resolveNotChecks(packageJson: {
  specController?: { notChecks?: unknown };
}): readonly string[] {
  const configured = packageJson.specController?.notChecks;
  if (!Array.isArray(configured)) return [];
  return [...new Set(configured.filter((entry): entry is string => typeof entry === "string"))];
}

/**
 * Resolve the recognised deferral-tag set for the target (@SCN-PND-021) — the app's single-sourced
 * starter set EXTENDED by the target `package.json`'s `specController.deferralTags`. Config
 * EXTENDS, never replaces: a project cannot un-recognise a built-in (`@wip` always defers).
 * Configured tags are bare names, `@`-stripped, consistent with the starter set; non-string /
 * non-array config is ignored defensively. `parseScenarios` then takes the union as its injected
 * `deferralTags` param.
 *
 * THE STARTER SET ARRIVES AS AN ARGUMENT AND IS NOT THE ENGINE'S TO HOLD (3F-3087). Which
 * community tags defer is product policy — an evolvable list of strings the application layer
 * single-sources as `DEFAULT_DEFERRAL_TAGS` — and a core-held copy would be a second statement of
 * it. So the union is computed here, where the config read is, and the policy is handed in.
 */
export function resolveDeferralTags(
  packageJson: {
    specController?: { deferralTags?: unknown };
  },
  /** The application layer's starter set — the built-ins a target's config may only extend. */
  starterTags: readonly string[]
): readonly string[] {
  const configured = packageJson.specController?.deferralTags;
  const extras = Array.isArray(configured)
    ? configured
        .filter((tag): tag is string => typeof tag === "string")
        // Through the ONE reading of what a term bare is (@SCN-TRM-001). This port had no trim at
        // all, so `"@wip  "` failed as well as `"  @wip"`, and a term that is nothing but
        // whitespace and a sigil is dropped here as an empty one already is.
        .map(bareTerm)
        .filter((tag) => tag !== "")
    : [];
  // Union: the starter set FIRST (extends, never replaces — a project cannot un-recognise a
  // built-in), then the configured extras; de-duplicated to keep the set clean.
  return [...new Set([...starterTags, ...extras])];
}



/**
 * WHAT A TARGET'S RUNNER BLOCK YIELDED — the entries keyed by a canon tier, and the keys that are
 * not one (@SCN-USG-019).
 *
 * TWO HALVES RATHER THAN ONE RECORD, because the two are used for opposite things and neither may
 * be reached for the other. `tiers` is what a recognition can be run against; `unrecognisedKeys` is
 * what the report has to SAY, and it recognises nothing by construction — there is no tier for it
 * to be the runner of. Returning one record and filtering downstream would leave every caller free
 * to honour a key the block's closure rules out, which is the fault this partition forecloses.
 */
export interface ResolvedRunners {
  /** The runner named for each canon tier the block names one for — `null` where it says it has none. */
  readonly tiers: Readonly<Record<string, string | null>>;
  /** The block's keys that are not one of the four canon tiers, in the order the manifest wrote them. */
  readonly unrecognisedKeys: readonly string[];
}

/**
 * The TARGET's BEHAVIOURAL RUNNERS (@SCN-USG-011, 3F-3343) — `specController.runners`, read as
 * `tier → the name of the binary that tier's suite runs under`.
 *
 * THE SMALL CLOSED THING, NAMED, so the open one can be inferred. The set of names a quality check
 * might go by is unbounded and belongs to the consumer; the set of behavioural runners is one per
 * tier tag and the tiers are canon. Naming the closed set and deriving the rest is the move the
 * `@fitness` collapse already made one level in (3F-3139), and it cannot go stale by omission.
 *
 * IT IS THE TARGET'S, for the reason the check registry and the ceilings are (@SCN-LNT-005): which
 * command runs a repository's unit suite is a fact about that repository, and a runner resolved
 * from this tool's own manifest would answer for a pipeline this run never looked at.
 *
 * The sixth of this family's `specController.*` resolvers, and defensive like the five above it: a
 * missing, non-object or array-shaped config resolves EMPTY, and an entry whose value is neither a
 * runner's NAME nor `null` is dropped rather than thrown. A manifest naming no runners is not an
 * error — it is a `new-client`, which is the state this axis is sold on.
 *
 * A NULL IS KEPT, AND IT IS THE THIRD STATE (@SCN-USG-016, 3F-3343). `"performance": null` is
 * something the target SAID — we have no performance suite — and a tier the block omits is
 * something it never said. Dropping the null folds the first into the second and loses a fact we
 * were given, in the one direction nothing downstream can recover: after the fold, silence and a
 * stated absence are indistinguishable. Nothing else in this reader's contract moves — a null
 * recognises no step, exactly as a missing key recognises none — so the ONLY place the two can be
 * told apart is this return value and the report rendered off it.
 *
 * THE KEY SET IS CLOSED, AND THE PARTITION IS THIS READER'S (@SCN-USG-019, 3F-3343). The block is
 * keyed by TIER and the tiers are canon, which is exactly what makes the whole inversion possible:
 * the closed set is named because it is enumerable, and the open one is inferred from what is left.
 * A key outside the four is therefore not a runner for anything, and both obvious answers to it are
 * wrong. HONOURING it is the smuggling the closure forbids — `"lint": "eslint"` is a consumer taking
 * their own checks out of discovery one key at a time, and it reinstates the silence this axis
 * exists to remove. DROPPING it silently is the same class of fault one layer along: the consumer
 * wrote something, believes it took effect, and has no line anywhere to correct it from. So the key
 * is partitioned out of the runners AND handed back to be named, and the run is not aborted over it.
 *
 * THE FOUR TIERS ARE READ, NEVER RESTATED. `RUNTIME_QUALITY_CHECKS` is the ledger's own enumeration
 * of the runtime tiers; a second copy here would agree with it by coincidence, and a list of names
 * is the drift this ticket is about.
 *
 * THE PARTITION IS ON THE KEY AND THE DEFENSIVE DROP IS ON THE VALUE, and the two are different
 * questions kept apart. A canon tier whose value is neither a runner's NAME nor `null` is malformed
 * config and is dropped, which is this family's stance about data from outside. A key that is not a
 * tier at all is not malformed — there is no tier for any value of it to name a runner for — so its
 * value is beside the point and the key is the fact worth reporting, whatever it was set to.
 */
export function resolveRunners(packageJson: {
  specController?: { runners?: unknown };
}): ResolvedRunners {
  const configured = packageJson.specController?.runners;
  if (!isBlock(configured)) return { tiers: {}, unrecognisedKeys: [] };
  const isTier = (key: string): boolean =>
    (RUNTIME_QUALITY_CHECKS as readonly string[]).includes(key);
  return {
    tiers: Object.fromEntries(
      Object.entries(configured).filter(
        (entry): entry is [string, string | null] =>
          isTier(entry[0]) && (typeof entry[1] === "string" || entry[1] === null)
      )
    ),
    unrecognisedKeys: Object.keys(configured).filter((key) => !isTier(key)),
  };
}
