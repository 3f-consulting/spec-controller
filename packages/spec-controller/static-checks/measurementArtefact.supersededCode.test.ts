/**
 * Unit arm for @SCN-MUT-019 — a measurement stamped with a SUPERSEDED `@SCN` answers the row that
 * supersedes it, and a row stating no superseded code keeps the one-code reading.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `[SCN-MUT-019]` ids in the describe / it
 * strings below match the scenario's tag, so a grep of either returns both.
 *
 * ITS OWN FILE BESIDE `measurementArtefact.test.ts`, which is @SCN-SLF-001's — the evidence root,
 * rung by rung. Two scenarios about one module, each answered where its own reasoning is, on the
 * `scenarioTextChanges.*.test.ts` precedent.
 *
 * THE SECOND DESCRIBE IS THE ONE THAT MATTERS MOST, AND IT IS ABOUT WHAT DID NOT CHANGE. Widening
 * which code answers a row is one edit away from widening which RECORD answers it, and the second
 * would be silent: a stale number reconciles `satisfied` and nothing reds. So the two halves of
 * that separation are asserted rather than argued — the matching rule reads no clock because a
 * measurement carries none, and the window that keeps a lapsed sweep's number out is applied where
 * the record is PLACED, before the payload is fetched at all.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

import { measurementAnswering, type Measurement } from "./measurementArtefact.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** The workflow every push runs, and the one that places the sweep record. */
const LADDER = ".github/workflows/ci.yml";

/** The code this repository's own mutation row carried before the mint, and its producer stamps. */
const SUPERSEDED = "SCN-MUT-011";

/** The code that row is minted to, which is what the reader asks for. */
const CURRENT = "SCN-FIT-002";

/** One row of a sweep record, stamped as a producer stamps it. */
function stamped(scnId: string, measured = 774): Measurement {
  return { scnId, checkTag: "mutation", measured };
}

describe("[SCN-MUT-019] a measurement stamped with a superseded code answers the row that supersedes it", () => {
  it("[SCN-MUT-019] answers a record stamped with the superseded code where the row states it", () => {
    // THE WHOLE SUB-ISSUE, IN ONE ASSERTION. The producer is a nightly on the gated branch, so the
    // newest record any build can reach between the rename and that nightly is keyed under the code
    // being replaced. Without this the row reads `missing` for a check that ran.
    expect(
      measurementAnswering([stamped(SUPERSEDED)], {
        scnId: CURRENT,
        checkTag: "mutation",
        supersededScnId: SUPERSEDED,
      })
    ).toEqual(stamped(SUPERSEDED));
  });

  it("[SCN-MUT-019] answers nothing to that same record where the row states no superseded code", () => {
    // TODAY'S READING, UNCHANGED, and the reason `null` is the safe answer: a row silent on the
    // point answers only to its own code, so nothing already written changes meaning by standing
    // still. Opt-in, per row, never inferred.
    expect(
      measurementAnswering([stamped(SUPERSEDED)], {
        scnId: CURRENT,
        checkTag: "mutation",
        supersededScnId: null,
      })
    ).toBeUndefined();
  });

  it("[SCN-MUT-019] answers a record stamped with the row's OWN code, which is what the next sweep leaves", () => {
    expect(
      measurementAnswering([stamped(CURRENT)], {
        scnId: CURRENT,
        checkTag: "mutation",
        supersededScnId: SUPERSEDED,
      })
    ).toEqual(stamped(CURRENT));
  });

  it("[SCN-MUT-019] answers nothing to a record stamped with an UNRELATED code, superseded code stated or not", () => {
    // The widening is two codes for one row, never a looser rule about rows: a third code answers
    // nothing, which is what stops "accepts more than one" becoming "accepts whatever is there".
    for (const supersededScnId of [SUPERSEDED, null]) {
      expect(
        measurementAnswering([stamped("SCN-LNT-001")], {
          scnId: CURRENT,
          checkTag: "mutation",
          supersededScnId,
        })
      ).toBeUndefined();
    }
  });

  it("[SCN-MUT-019] keeps BOTH terms on the superseded code too, so the same code on another check answers nothing", () => {
    // Neither term is an address on its own (@SCN-LNT-012). A widening that dropped the check tag
    // on the superseded arm would hand this row a timing measurement wearing the right @SCN.
    expect(
      measurementAnswering([{ scnId: SUPERSEDED, checkTag: "ci-run-time", measured: 42 }], {
        scnId: CURRENT,
        checkTag: "mutation",
        supersededScnId: SUPERSEDED,
      })
    ).toBeUndefined();
  });

  it("[SCN-MUT-019] prefers the row's OWN code where a record carries both", () => {
    // A record written across the boundary holds both, and the current one is the newer fact about
    // the newer tree. A first-match reader over the record's own order would answer whichever the
    // producer happened to write first.
    expect(
      measurementAnswering([stamped(SUPERSEDED, 700), stamped(CURRENT, 774)], {
        scnId: CURRENT,
        checkTag: "mutation",
        supersededScnId: SUPERSEDED,
      })
    ).toEqual(stamped(CURRENT, 774));
  });

  it("[SCN-MUT-019] reads the superseded code BARE, as it reads the row's own", () => {
    // The tagged spelling is what a corpus carries and a hand-written row is free to use; a
    // superseded code compared unbared would be filed under a key no lookup ever asks for, which is
    // the silent-miss class `bareTerm` exists to close.
    expect(
      measurementAnswering([stamped(SUPERSEDED)], {
        scnId: `@${CURRENT}`,
        checkTag: "@mutation",
        supersededScnId: `@${SUPERSEDED}`,
      })
    ).toEqual(stamped(SUPERSEDED));
  });
});

/** The borrow step's script, as the workflow every push runs actually spells it. */
function borrowScript(): string[] {
  return readFileSync(path.join(repoRoot, LADDER), "utf8").split("\n");
}

/** The one line of that workflow matching a shape, refused where there is not exactly one. */
function theOneLine(shape: RegExp, what: string): number {
  const lines = borrowScript();
  const found = lines.flatMap((line, at) => (shape.test(line) ? [at] : []));
  if (found.length !== 1) {
    throw new Error(`${LADDER} holds ${found.length} lines that ${what}; it must hold exactly one.`);
  }
  return found[0]!;
}

describe("[SCN-MUT-019] what keeps a lapsed sweep's number out is untouched by the widening", () => {
  it("[SCN-MUT-019] reads no clock, because a measurement carries none for it to read", () => {
    // A `Measurement` is two terms and a number. There is nothing in the payload a matching rule
    // COULD weigh an age against, which is what makes "this widens which code counts, not which
    // record counts" a property of the shape rather than a promise about the code.
    expect(Object.keys(stamped(SUPERSEDED)).sort()).toEqual(["checkTag", "measured", "scnId"]);
    // And a producer that stamped one anyway would not be heard: the SAME row answers, whatever a
    // stray dated key on it says. Asserted as identity against the planted row rather than as the
    // two answers matching each other — two answers of `undefined` match each other too, which is
    // what this assertion said in its red form, where it passed for that reason.
    const ask = { scnId: CURRENT, checkTag: "mutation", supersededScnId: SUPERSEDED };
    for (const measuredAt of ["1999-01-01T00:00:00Z", "2999-01-01T00:00:00Z"]) {
      const rows = [{ ...stamped(SUPERSEDED), measuredAt }];
      expect(measurementAnswering(rows, ask)).toBe(rows[0]);
    }
  });

  it("[SCN-MUT-019] weighs the PRODUCING RUN'S own clock, which is not the payload's and not this reader's", () => {
    // The retired persist stamped a `measuredAt` into the artefact for this arithmetic to read — a
    // fact GitHub already records, and one written by the very run being judged (3F-2841). So the
    // age is computed from the run listing's `createdAt`, upstream of anything the record says.
    const listedAt = theOneLine(/\bgh\s+run\s+list\b/, "list another workflow's runs");
    const readsTheRunsClock = theOneLine(/date -u -d "\$\{when\}"/, "read the run's own createdAt");
    const ages = theOneLine(/^\s*age=\$\(\(/, "compute the age");
    expect(listedAt).toBeLessThan(readsTheRunsClock);
    expect(readsTheRunsClock).toBeLessThan(ages);
  });

  it("[SCN-MUT-019] refuses a run past the window BEFORE the payload is fetched, so no code in it can reach that decision", () => {
    // THE SEPARATION, AS AN ORDER RATHER THAN AS AN ARGUMENT. A record past its window is never
    // downloaded and never placed, so the reader below meets no record at all — superseded code or
    // current. Move the window check after the download and this reds, which is exactly the edit
    // that would make "accepts a superseded code" quietly mean "accepts a stale one".
    const refusesPastTheWindow = theOneLine(/-gt "\$\{MAX_AGE\}"/, "refuse a run past the window");
    const fetches = theOneLine(/\bgh\s+run\s+download\b/, "fetch the payload");
    const places = theOneLine(/cp "\$\{found\}"/, "place the record where the reader reads it");
    expect(refusesPastTheWindow).toBeLessThan(fetches);
    expect(fetches).toBeLessThan(places);
  });
});
