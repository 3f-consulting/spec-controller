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
 * ONE REGISTERED CHECK — the characteristic a handle asserts, and the row its run credits.
 *
 * THE SECOND TERM IS THE RELOCATED ARM, not a new mechanism (canon, *Where the check-to-scenario
 * join lives*). The join between a check and its fitness scenario is held by the runner or the
 * register, keyed by the scenario's `@SCN`; a MEASURED check stamps that `@SCN` onto its artefact
 * at the command line (`--scn SCN-CIP-013`), but a static check emits no artefact to stamp and its
 * only identifier is the script handle. While one tag named one check the handle determined a
 * scenario by way of the tag; once a characteristic names several checks it stops determining one,
 * and the registry — the runner-side mapping for a static check — is where the `@SCN` must live.
 *
 * NEVER A SECOND ROSTER OF THE OBLIGATION. The scenario still raises the debit and still carries
 * the threshold; this says only which row a credit posts to.
 */
export interface RegisteredCheck {
  /** The bare characteristic this handle asserts (`complexity`). */
  readonly check: string;
  /** The `@SCN` of the fitness scenario it credits, or `null` when the corpus is to decide. */
  readonly scn: string | null;
}

/**
 * The registry as the rule reads it — script handle → the check it runs.
 *
 * A `Map` rather than an object so a handle carrying a `:` (`lint:complexity`) is an ordinary key
 * and no prototype member (`constructor`, `toString`) can ever answer a lookup.
 */
export type CheckRegistry = ReadonlyMap<string, RegisteredCheck>;

/**
 * THE OBJECT SPELLING — both terms — or `null` where the entry names nothing a lookup can use.
 *
 * AN ENTRY THAT CANNOT NAME ITS ROW IS DROPPED WHOLE (@SCN-LNT-016), not downgraded to the string
 * form. The downgrade is the one wrong answer available here: it hands the entry back to the
 * corpus hop, which credits the FIRST carrier, so an author's typo becomes a silent credit on a
 * row nobody named while the row they meant reads `missing`. Dropping the entry leaves the handle
 * unregistered, and an unregistered handle already cites nothing and posts to suspense — the loud
 * answer, and the one the `check` term has always got.
 *
 * THE KEY'S PRESENCE IS WHAT IS JUDGED, not its value's truthiness. An object carrying no `scn` at
 * all is the object spelling of the string form and stays legal; one that carries the key and
 * cannot resolve it to a non-empty bare id went wrong on purpose-to-name, which is the fault.
 */
function registeredObjectCheckOf(value: object): RegisteredCheck | null {
  const named = value as { check?: unknown; scn?: unknown };
  if (typeof named.check !== "string") return null;
  const check = bareTerm(named.check);
  if (check === "") return null;
  if (!Object.hasOwn(value, "scn")) return { check, scn: null };
  const scn = typeof named.scn === "string" ? bareTerm(named.scn) : "";
  return scn === "" ? null : { check, scn };
}

/**
 * One entry as a manifest spells it, or `null` where it says nothing a lookup can use.
 *
 * BOTH SPELLINGS ARE LEGAL, and the string form is the compatibility this whole change is careful
 * about: a bare characteristic names no scenario, so the corpus decides exactly as it does today
 * and @SCN-LNT-008 stays true. An object naming no `scn` is the object spelling of the same thing.
 * They are read by two functions because they are two grammars: this one decides WHICH spelling
 * arrived, and only that.
 *
 * Both terms are stored BARE. A registry written by hand will sooner or later spell a tag — and an
 * `@SCN` — the way a feature file does, and the corpus carries both bare; stripping here rather
 * than at every lookup is the stance this reading already took for the tag.
 */
function registeredCheckOf(value: unknown): RegisteredCheck | null {
  if (typeof value === "string") {
    const check = bareTerm(value);
    return check === "" ? null : { check, scn: null };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return registeredObjectCheckOf(value);
}

/**
 * Build a registry from `handle → check` entries, as a manifest or a config file holds them.
 *
 * Non-string and empty entries are dropped rather than trusted, the same defensive stance
 * `resolveDeferralTags` takes at the app edge: config is data from outside, and a registry that
 * throws on a malformed entry turns a typo into a run that produces no verdict at all.
 */
export function checkRegistryOf(entries: Readonly<Record<string, unknown>>): CheckRegistry {
  const registry = new Map<string, RegisteredCheck>();
  for (const [handle, value] of Object.entries(entries)) {
    const entry = registeredCheckOf(value);
    if (handle === "" || entry === null) continue;
    registry.set(handle, entry);
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
  return registry.get(script)?.check ?? null;
}

/**
 * The bare check tags the registry knows — unique and sorted.
 *
 * The corpus hop needs the tag SET to know which of a scenario's tags name a check at all; without
 * it, every unrecognised tag on a scenario would be a candidate check tag.
 */
export function registeredCheckTags(registry: CheckRegistry): string[] {
  return [...new Set([...registry.values()].map((entry) => entry.check))].sort();
}
