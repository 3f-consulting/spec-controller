/**
 * THE CONSUMER'S OWN EXCLUSIONS (@SCN-USG-015, 3F-3343) — which steps of a target's pipeline its
 * manifest names non-checks, and which of the entries that named them named nothing at all.
 *
 * THE THIRD EXCLUSION, AND THE ONLY ONE THAT IS A LIST SOMEBODY WRITES. The reconciler is excluded
 * by construction and a behavioural runner by a rule over what the target named; this one is the
 * consumer saying, about their own pipeline, that a step is not a check. It is a list of THEIR
 * steps and never a list of check names of ours, which is the whole of what keeps it from being
 * the prefix rule arriving one layer along.
 *
 * AN ENTRY IS `<workflow file>:<job id>:<step name>` AND IS MATCHED EXACTLY. One form and no
 * grammar, and the form itself is stated once next door (`parse/stepNames`) because the report
 * names a step that way in every section that names one at all. Fully qualified because a bare name is ambiguous in a real tree — `Typecheck` is a
 * check in this repository's `ci.yml` and plumbing in its `release.yml`, and a bare-name entry
 * would take out both, the second of them a check deleted from the report with nothing said. The
 * job and the source are exactly what the walk was widened to carry (3F-3352), and this is what
 * that was for.
 *
 * NO PREFIX AND NO WILDCARD FORM, argued rather than omitted. A consumer wanting a whole workflow
 * out narrows `--ci`, a supported narrowing the corpus already pins (@SCN-USG-008), so a second
 * way to say the same thing buys a grammar to specify, to test and to explain. Exact-only can be
 * widened later and breaks nobody; starting wide cannot be narrowed once a manifest depends on it.
 *
 * THE PARTITION IS TOTAL, and that is this reader's shape rather than a convenience. Every entry
 * the target wrote is either one that named a step or one that named none, and both halves are
 * returned because both have to be SAID: the first is a step that leaves the report accounted for
 * rather than vanished, and the second is a stale line the consumer wrote that hides nothing —
 * a rename that has already happened, or one that is about to hide the wrong thing. An entry lost
 * between the two halves would be an exclusion nothing anywhere accounts for.
 *
 * THE SEAM IS A FUNCTION, for the reason the citation seam beside it is (`runningStaticChecks`):
 * what the discovery reader needs is one answer per step, not this module's two lists and the
 * rule for turning them into one. Handing it the lists would put the qualification rule inside an
 * observer that has no business restating it, and a second statement of that rule is a second
 * chance for the two to disagree about which step an entry names.
 *
 * NO FILESYSTEM, AND THE NAMES ARE INJECTED. `ciSources` is an array of anonymous source strings
 * — `ciSourcePaths.ts` is explicit that keeping the core that way is the point — so the mapping
 * from a step's source index back to a workflow file is made at the CLI edge, where the paths were
 * already resolved, and arrives here as data. A source this run was given no name for can be
 * named by nobody, so no entry excludes it: the safe direction, and the one that stops two
 * nameless sources answering for each other.
 */

import { ciWorkflowSteps, type CiWorkflowStep } from "./checkScriptsRunInCI.js";
import { qualifiedStepName } from "./stepNames.js";

/** What a target's `notChecks` list yielded — the entries that named a step, and those that did not. */
export interface StepExclusions {
  /** The entries that named a step this run read, in the order the manifest wrote them. */
  readonly excluded: readonly string[];
  /** The entries that named none, in the order the manifest wrote them. */
  readonly unmatchedEntries: readonly string[];
  /** Whether the consumer named this step a non-check. */
  readonly isExcluded: (step: CiWorkflowStep) => boolean;
}

export function stepExclusions(
  ciSources: readonly string[],
  ciSourceNames: readonly string[],
  notChecks: readonly string[]
): StepExclusions {
  // THE WALK, of which every other reader on this axis takes its own projection (3F-3352) — the
  // same parse, so an entry can never name a step the discovery reader did not see.
  const named = new Set(
    ciWorkflowSteps(ciSources).flatMap((step) => {
      const name = qualifiedStepName(step, ciSourceNames);
      return name === undefined ? [] : [name];
    })
  );
  const excluded = notChecks.filter((entry) => named.has(entry));
  return {
    excluded,
    unmatchedEntries: notChecks.filter((entry) => !named.has(entry)),
    isExcluded: (step) => {
      const name = qualifiedStepName(step, ciSourceNames);
      return name !== undefined && excluded.includes(name);
    },
  };
}
