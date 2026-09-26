/**
 * The RunContext — run provenance threaded CLI→renderers as a SIBLING to the pure
 * Ledger, never folded into it. The Ledger model carries obligation-vs-observation
 * reconciliation only; run metadata — the input paths/flags used, the target repo, the
 * UTC run timestamp, the source SHA — is a separate concern carried alongside.
 *
 * Built once in the CLI (reusing the existing runStart; the target is the verbatim
 * --target) and threaded renderMarkdown(balance, ctx) / writeOutputs(... ctx);
 * it is threaded to renderJson too. The shared provenance projection (consumed by
 * the markdown header here and the JSON object) lives here so the two surfaces
 * never drift. This is the PURE provenance projection — the impure `resolveSourceSha` /
 * `resolveTargetRoot` git reads live in `run-management/resolveRunInputs.ts`.
 */

import { relativizeToRoot } from "../lib/portablePath.js";

/**
 * The CLI input paths/flags actually used for a run — each optional; only the ones
 * the operator supplied are present. The same --features/--vitest/--cucumber/--ci/
 * --package-json/--ci-steps seams as the CLI's ReconcileOptions.
 *
 * The converted checks' credit stream joined the interface later. It was
 * ALREADY flowing through it: `reconcileInputsOf` builds one ReconcileOptions and that same
 * object is assigned to `ctx.inputs`, so structural typing let the stream ride along unseen and
 * the block simply never named it. It is optional by design — passed only where the file
 * exists — which is exactly why its silence was ambiguous between "the run never got it" and
 * "the run got it and the block does not say so".
 */
export interface RunInputs {
  features?: string;
  vitest?: string;
  cucumber?: string;
  ci?: string;
  packageJson?: string;
  ciSteps?: string;
}

/**
 * Run provenance — the sibling argument threaded CLI→renderers. `sourceSha` is the
 * target's resolved source revision, or null when unknown (a non-git target with no
 * --source-sha override).
 */
export interface RunContext {
  /** The target-repo name — the verbatim --target, or "unknown-target" on omit. */
  target: string;
  /** The CLI input paths/flags actually used. */
  inputs: RunInputs;
  /** The run-start instant — the same Date that names the run dir. */
  runStart: Date;
  /** The target's source SHA, or null when unknown (non-git target). */
  sourceSha: string | null;
  /**
   * The TOOL's own git SHA — which spec-controller produced this run,
   * distinct from the target's `sourceSha`. Null when the tool is not a git checkout
   * (an installed package). OPTIONAL on the ctx: fixtures that do not exercise
   * tool-provenance omit it and the projection defaults it to null; the CLI always
   * resolves it via `resolveToolIdentity`.
   */
  toolSha?: string | null;
  /**
   * The TOOL's package version — always resolvable (read from the tool's own
   * package.json), so it attributes a run even when no git SHA is available. OPTIONAL
   * on the ctx (defaults to "unknown" in the projection); the CLI always sets it.
   */
  toolVersion?: string;
  /**
   * The run root the recorded input paths are made relative to — the exact
   * parallel of `countRuntimeEvidenceObservationKinds`'s root. Opt-in: when omitted, input paths are
   * recorded verbatim (existing ctx fixtures unchanged). The CLI sets it to the target
   * root (reconcile runs with cwd = the target repo root), so an absolute input path
   * under that root is recorded relative — a banked artefact stays portable.
   */
  root?: string;
  /** Whether the run was asked to treat a Pending Item as a failure. */
  strict?: boolean;
}

/** The canonical input flags, in render order, mapped to their RunInputs key. */
const INPUT_FLAGS: readonly { key: keyof RunInputs; flag: string }[] = [
  { key: "features", flag: "--features" },
  { key: "vitest", flag: "--vitest" },
  { key: "cucumber", flag: "--cucumber" },
  { key: "ci", flag: "--ci" },
  { key: "packageJson", flag: "--package-json" },
  // APPENDED, so no flag that was already rendered moves. Widening this
  // list is the whole of the change: `presentInputs`, `provenanceObject`,
  // `projectProvenanceObject`, the markdown header and the JSON object all iterate it, so
  // the two surfaces gain the stream in step and neither can drift from the other.
  { key: "ciSteps", flag: "--ci-steps" },
];

/** One input flag actually used, as the flag handle + the value the operator gave. */
export interface ProvenanceInput {
  flag: string;
  value: string;
}

/**
 * The provenance FACTS — the single projection both report surfaces share so they
 * never drift (project design §1; slice design "Provenance projection"). The
 * markdown header formats it; the JSON `provenance` object will
 * serialise the same facts. `runStartUtc` is second-precision UTC; `sourceSha` is
 * carried raw (null preserved — markdown renders the null explicitly, JSON keeps it).
 */
export interface ProvenanceFacts {
  target: string;
  inputs: ProvenanceInput[];
  runStartUtc: string;
  sourceSha: string | null;
  /** The tool's own SHA — which spec-controller produced the run; null when not a git checkout. */
  toolSha: string | null;
  /** The tool's package version — always present. */
  toolVersion: string;
  /**
   * The canonical input flags the run did NOT receive — the complement of `inputs` over
   * INPUT_FLAGS, in the same canonical order. Naming every input made the
   * block name every stream a run was handed, which killed the "handed it and the block does
   * not say so" reading; it left the other one alive, because absence from a list only informs
   * a reader who already holds the list. Naming the flags with no value is what makes the page
   * self-describing about the streams it did not get.
   *
   * PRESENTATION ONLY, AND THAT IS A RULING. It lives here and NOT on `ProvenanceObject`,
   * because the JSON persists a fact iff it is not derivable (see that interface) and absence
   * is exactly derivable — `inputs` plus this file's canonical flag list determines it. A
   * second persisted copy would agree with the first only until one of them was edited.
   */
  absentInputs: string[];
}

/** Format an instant as second-precision UTC, e.g. `2026-06-27T08:17:53Z`. */
function formatUtc(instant: Date): string {
  return instant.toISOString().replace(/\.\d+Z$/, "Z");
}

/**
 * The inputs actually used — RunInputs filtered to the present, non-empty values, in
 * canonical flag order, each made PORTABLE relative to the run `root`. The
 * single input-presence + portability selection both surfaces share: the JSON
 * `provenance.inputs` object serialises it directly; the markdown header derives its
 * `{flag, value}` lines from it. A present value is relativized via `relativizeToRoot`
 * (absolute-under-root → relative; otherwise verbatim — see the helper); only its
 * presence is tested before recording.
 */
function presentInputs(inputs: RunInputs, root: string | undefined): RunInputs {
  const out: RunInputs = {};
  for (const { key } of INPUT_FLAGS) {
    const value = inputs[key];
    if (typeof value === "string" && value.trim() !== "") {
      out[key] = relativizeToRoot(value, root);
    }
  }
  return out;
}

/**
 * The provenance OBJECT — the canonical projection of a RunContext to the
 * non-derivable run facts, the single shape both report surfaces consume so they
 * never drift (project design §1, §3; slice design "Provenance projection"). The
 * JSON `provenance` object serialises this verbatim ({ provenance, scenarios, warnings });
 * `projectProvenance` below derives the markdown header's presentation form from the
 * SAME source. `runTimestamp` is second-precision UTC; `inputs` carries only the flags
 * actually used (keyed by their canonical name); `sourceSha` is raw (null preserved).
 */
export interface ProvenanceObject {
  target: string;
  sourceSha: string | null;
  /** The tool's own SHA — which spec-controller produced the run; null when not a git checkout. */
  toolSha: string | null;
  /** The tool's package version — always present. */
  toolVersion: string;
  runTimestamp: string;
  inputs: RunInputs;
  /** Absent on a report saved before strictness was recorded, which reads as not strict. */
  strict?: boolean;
}

/**
 * Project a RunContext to the canonical provenance object. The one helper the JSON
 * surface serialises and the markdown header (via `projectProvenance`) derives from —
 * the timestamp formatting, the source SHA, and the input-presence selection live here
 * once, so the two surfaces project the same ctx without duplicating field logic.
 */
export function provenanceObject(ctx: RunContext): ProvenanceObject {
  return {
    target: ctx.target,
    sourceSha: ctx.sourceSha,
    // The tool identity, defaulted for ctx fixtures that omit it; the CLI
    // always sets both via resolveToolIdentity.
    toolSha: ctx.toolSha ?? null,
    toolVersion: ctx.toolVersion ?? "unknown",
    runTimestamp: formatUtc(ctx.runStart),
    inputs: presentInputs(ctx.inputs, ctx.root),
    strict: ctx.strict === true,
  };
}

/**
 * Project a canonical provenance OBJECT to the markdown header's presentation FACTS —
 * inputs as ordered `{flag, value}` pairs, the UTC timestamp as `runStartUtc`. This is
 * the projection that needs no `RunContext`: the markdown renderer reads it off the shared
 * report model's `runProvenance` (already a `ProvenanceObject`), so the human header and
 * the JSON object project the SAME facts without re-touching the ctx (slice 3's
 * render-from-saved-JSON path calls this directly). `projectProvenance(ctx)` delegates here.
 */
export function projectProvenanceObject(obj: ProvenanceObject): ProvenanceFacts {
  const inputs: ProvenanceInput[] = [];
  // The flags with no value, derived in the SAME pass over the SAME canonical list that
  // produces the flags with one. One list, one traversal, two complementary
  // outputs — so a flag can never be named on both lines, nor missing from both, and adding
  // another input flag reaches the absence line without anyone remembering to.
  const absentInputs: string[] = [];
  for (const { key, flag } of INPUT_FLAGS) {
    const value = obj.inputs[key];
    if (typeof value === "string") {
      inputs.push({ flag, value });
    } else {
      absentInputs.push(flag);
    }
  }
  return {
    target: obj.target,
    inputs,
    absentInputs,
    runStartUtc: obj.runTimestamp,
    sourceSha: obj.sourceSha,
    toolSha: obj.toolSha,
    toolVersion: obj.toolVersion,
  };
}

/**
 * Project a RunContext to the markdown header's provenance facts — the presentation
 * form (inputs as ordered `{flag, value}` pairs, the UTC timestamp as `runStartUtc`).
 * Derived from the canonical `provenanceObject` (then `projectProvenanceObject`) so the
 * markdown header and the JSON object share the same timestamp, source SHA, and
 * input-presence selection (no re-derivation).
 */
export function projectProvenance(ctx: RunContext): ProvenanceFacts {
  return projectProvenanceObject(provenanceObject(ctx));
}
