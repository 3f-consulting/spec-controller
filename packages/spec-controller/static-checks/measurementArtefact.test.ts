/**
 * @SCN-SLF-001 (3F-3158) — the EVIDENCE ROOT, asserted rung by rung.
 *
 * WHY THE RUNGS ARE ASSERTED DIRECTLY AND NOT READ OFF THE GATE'S VERDICT. A base that resolves
 * to the wrong place does not look broken: every obligation reconciles `missing`, and the report
 * words that as "the suite did not run" — a plausible, wrong story rather than an error. So the
 * order of the three rungs is pinned here, on the resolver itself, where a wrong answer is a
 * failed assertion instead of a verdict about something else.
 *
 * THE ENVIRONMENT IS INJECTED RATHER THAN MUTATED. `process.env` is one object shared by every
 * file of a Vitest run, and a rung asserted by setting a variable on it is a rung asserted at the
 * cost of every arm that runs afterwards.
 */

import path from "node:path";
import { tmpdir } from "node:os";

import { describe, it, expect } from "vitest";

import { resolveEvidenceRoot } from "./measurementArtefact.js";

describe("[SCN-SLF-001] this run's evidence root is resolved in one place, by three rungs in one order", () => {
  it("[SCN-SLF-001] takes SPEC_CONTROLLER_EVIDENCE_DIR for a run that named no target", () => {
    expect(
      resolveEvidenceRoot(undefined, {
        SPEC_CONTROLLER_EVIDENCE_DIR: "/runner/temp/evidence",
        RUNNER_TEMP: "/runner/temp",
        TMPDIR: "/var/tmp",
      })
    ).toBe("/runner/temp/evidence");
  });

  it("[SCN-SLF-001] lets a NAMED target root beat that variable, which is what keeps a planted tree reading its own evidence", () => {
    // MEASURED, NOT CHOSEN. `ci.yml` sets the variable for its whole job and `scripts/verify.sh`
    // exports it for the whole ladder, so every process the suite spawns inherits it — the
    // planted-tree arms included. With the variable winning, seven cucumber scenarios read the
    // OUTER run's evidence instead of the tree they planted. An argument the caller passed is more
    // specific than the environment it is standing in, which is the precedence a flag has over a
    // variable everywhere else.
    expect(
      resolveEvidenceRoot("/planted/target", {
        SPEC_CONTROLLER_EVIDENCE_DIR: "/runner/temp/evidence",
        RUNNER_TEMP: "/runner/temp",
        TMPDIR: "/var/tmp",
      })
    ).toBe("/planted/target");
  });

  it("[SCN-SLF-001] leaves a NAMED target root carrying its own evidence, which is what keeps every planted arm working", () => {
    // `--root` already means "you are pointing me at a self-contained target" — timeStepCli's own
    // docblock says the wrapped command runs there and the artefact lands there. Evidence under a
    // named root was never the defect, and every planted root in this suite is already a
    // `mkdtemp` outside any source tree.
    expect(resolveEvidenceRoot("/planted/target", { TMPDIR: "/var/tmp" })).toBe("/planted/target");
  });

  it("[SCN-SLF-001] sends an UNNAMED run's evidence to the runner temp, then TMPDIR, and never to the working tree", () => {
    // The defect, stated as an assertion: with no root named the base used to default under the
    // working directory, which is spec-controller writing its output into its own source.
    expect(resolveEvidenceRoot(undefined, { RUNNER_TEMP: "/runner/temp", TMPDIR: "/var/tmp" })).toBe(
      path.join("/runner/temp", "spec-controller-self-balance")
    );
    expect(resolveEvidenceRoot(undefined, { TMPDIR: "/var/tmp" })).toBe(
      path.join("/var/tmp", "spec-controller-self-balance")
    );
    // Neither variable is guaranteed to exist — a bare local shell has no RUNNER_TEMP and Linux
    // commonly has no TMPDIR — so the last rung is the platform's own answer rather than a
    // hard-coded `/tmp`, which is what stops the fallback landing somewhere unwritable.
    expect(resolveEvidenceRoot(undefined, {})).toBe(
      path.join(tmpdir(), "spec-controller-self-balance")
    );
  });

  it("[SCN-SLF-001] reads an EMPTY variable as absent, because that is how an unset one arrives in a workflow", () => {
    // A GitHub `env:` key whose expression resolved to nothing arrives as the empty string, not as
    // an absent name. Taken literally it would resolve every stream to a relative path — back
    // inside the working tree, silently, which is the exact defect this resolver closes.
    expect(resolveEvidenceRoot(undefined, { SPEC_CONTROLLER_EVIDENCE_DIR: "", TMPDIR: "/var/tmp" })).toBe(
      path.join("/var/tmp", "spec-controller-self-balance")
    );
    expect(resolveEvidenceRoot(undefined, { RUNNER_TEMP: "", TMPDIR: "/var/tmp" })).toBe(
      path.join("/var/tmp", "spec-controller-self-balance")
    );
  });
});
