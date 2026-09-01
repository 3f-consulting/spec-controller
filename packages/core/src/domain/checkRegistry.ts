/**
 * THE CHECK REGISTRY — which bare check tag a runnable script handle IS.
 *
 * The first of the citation seam's two hops (3F-2511's technical design):
 *
 *     script handle  ──registry──▶  bare check tag  ──corpus──▶  the fitness scenario's @SCN
 *     lint:complexity              complexity                   SCN-CPX-0NN
 *
 * The seam exists because citation-routing INVERTS what name-match relied on. Under name-match the
 * DEBIT cited — a scenario carried the script handle, and the run was matched back to it by name —
 * so nothing ever had to know what a handle MEANT. Under the one posting rule the CREDIT cites, so
 * a check's run must arrive at an `@SCN`, and a bare tag (`@complexity`, `@typecheck`, `@vocab`) is
 * what stands between a script name and the scenario that raises its obligation.
 *
 * A REGISTRY, NEVER A PREFIX HEURISTIC. Stripping a `lint:` / `guard:` / `audit:` prefix would
 * resolve most of this repository's own handles and is exactly the reasoning 3F-2495 already
 * disproved on the discovery side: `typecheck` carries no prefix, and the check that no convention
 * reaches is invisible precisely when it is unattributed. A heuristic that is right eleven times
 * out of twelve hands the twelfth check a silent non-answer, which on this seam means no credit
 * posts at all. Membership is a property of the check, so it is recorded, not inferred.
 *
 * PURE AND INJECTED — the registry arrives as data. Where a target's registry is AUTHORED is
 * deliberately still open (the registry-home question, increment D); the core takes it as an
 * argument so that answer can land without moving this rule. `spec-controller-core` is the home
 * canon names for the machine-readable form (`the maintainers' private notes`),
 * which is why the mechanism lives here rather than at the app edge that happens to read it first.
 *
 * NOT increment D's tool→check classification. This maps THIS target's own script handles; the
 * broader `stryker` → `mutation` known-tools reading is a separate question, kept separate.
 */

import { bareTerm } from "../lib/bareTerm.js";

/**
 * The registry as the rule reads it — script handle → its bare check tag.
 *
 * A `Map` rather than an object so a handle carrying a `:` (`lint:complexity`) is an ordinary key
 * and no prototype member (`constructor`, `toString`) can ever answer a lookup.
 */
export type CheckRegistry = ReadonlyMap<string, string>;

/**
 * Build a registry from `handle → tag` entries, as a manifest or a config file holds them.
 *
 * The tag is stored BARE. A registry written by hand will sooner or later spell a tag the way a
 * feature file does (`@complexity`), and the corpus hop matches bare tags — so the `@` is stripped
 * here rather than at every lookup, where one reader would eventually forget.
 *
 * Non-string and empty entries are dropped rather than trusted, the same defensive stance
 * `resolveDeferralTags` takes at the app edge: config is data from outside, and a registry that
 * throws on a malformed entry turns a typo into a run that produces no verdict at all.
 */
export function checkRegistryOf(entries: Readonly<Record<string, unknown>>): CheckRegistry {
  const registry = new Map<string, string>();
  for (const [handle, tag] of Object.entries(entries)) {
    if (typeof tag !== "string") continue;
    const bare = bareTerm(tag);
    if (handle === "" || bare === "") continue;
    registry.set(handle, bare);
  }
  return registry;
}

/**
 * HOP 1 — the bare check tag this script handle runs, or `null` when nothing registers it.
 *
 * `null` is the honest answer for an unregistered handle, and it is the answer that keeps the
 * uncited-check detection alive: a running check the registry cannot name reaches no `@SCN`, so its
 * observation cites nothing and lands in suspense, where it is surfaced. Inventing a tag from the
 * handle's shape would post it to a row nobody wrote — a check that looks reconciled and is not.
 */
export function checkTagOfScript(registry: CheckRegistry, script: string): string | null {
  return registry.get(script) ?? null;
}

/**
 * The bare check tags the registry knows — unique and sorted.
 *
 * The corpus hop needs the tag SET to know which of a scenario's tags name a check at all; without
 * it, every unrecognised tag on a scenario would be a candidate check tag.
 */
export function registeredCheckTags(registry: CheckRegistry): string[] {
  return [...new Set(registry.values())].sort();
}
