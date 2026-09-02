/**
 * @unit for @SCN-LNT-001 — the citation seam's FIRST hop, script handle → bare check tag.
 *
 * Bidirectional evidence: the describes carry the SCN-LNT-001 id, back-linking to
 * features/fitness-reconciliation.feature's @SCN-LNT-001 scenario — the seam-bearing satisfied path
 * a fitness check's run has to reach an `@SCN` to reconcile at all.
 */

import { describe, it, expect } from "vitest";
import { checkRegistryOf, checkTagOfScript, registeredCheckTags } from "./checkRegistry.js";

describe("[SCN-LNT-001] checkTagOfScript resolves a script handle to its bare check tag", () => {
  it("resolves a prefixed and an UNPREFIXED handle alike — the case a prefix rule cannot reach", () => {
    // 3F-2495's lesson, on this seam. `lint:complexity` would survive a prefix strip; `typecheck`
    // is the handle that killed the heuristic on the discovery side, and it is registered here by
    // exactly the same mechanism as its prefixed neighbour — no arm, no special case.
    const registry = checkRegistryOf({
      "lint:complexity": "complexity",
      typecheck: "typecheck",
    });

    expect(checkTagOfScript(registry, "lint:complexity")).toBe("complexity");
    expect(checkTagOfScript(registry, "typecheck")).toBe("typecheck");
  });

  it("answers null for an unregistered handle rather than inventing a tag from its shape", () => {
    // A tag guessed off the handle would post the run to a row nobody wrote. Null keeps the check
    // uncited, which is the state the suspense row exists to surface.
    const registry = checkRegistryOf({ "lint:complexity": "complexity" });

    expect(checkTagOfScript(registry, "lint:unregistered")).toBeNull();
    expect(checkTagOfScript(registry, "complexity")).toBeNull();
  });

  it("answers null for an inherited object member — a handle is data, never a prototype key", () => {
    const registry = checkRegistryOf({ "lint:complexity": "complexity" });

    expect(checkTagOfScript(registry, "constructor")).toBeNull();
    expect(checkTagOfScript(registry, "toString")).toBeNull();
  });
});

describe("[SCN-LNT-001] checkRegistryOf takes the registry as data and normalises it", () => {
  it("stores the tag BARE, however the entry spelled it", () => {
    // A registry written beside a feature file will spell a tag the way the file does.
    const registry = checkRegistryOf({ "lint:complexity": "@complexity", typecheck: " typecheck " });

    expect(checkTagOfScript(registry, "lint:complexity")).toBe("complexity");
    expect(checkTagOfScript(registry, "typecheck")).toBe("typecheck");
  });

  it("drops a malformed entry rather than throwing — a typo must not cost the whole verdict", () => {
    const registry = checkRegistryOf({
      "lint:complexity": "complexity",
      "lint:nothing": "",
      "lint:wrong-type": 7,
      "lint:absent": null,
    });

    expect(registeredCheckTags(registry)).toEqual(["complexity"]);
    expect(checkTagOfScript(registry, "lint:wrong-type")).toBeNull();
  });

  it("strips only a LEADING @, so an interior one stays part of the tag", () => {
    // ANCHORED, not first-match. The `@` is stripped because a hand-written registry will spell a
    // tag the way a feature file does; that reason reaches the first character and no other. An
    // unanchored strip would silently rewrite `a@b` to `ab` — a tag the corpus hop then matches
    // against nothing, so the check reaches no `@SCN` and its credit lands in suspense.
    const registry = checkRegistryOf({ "lint:interior": "a@b", "lint:leading": "@a@b" });

    expect(checkTagOfScript(registry, "lint:interior")).toBe("a@b");
    expect(checkTagOfScript(registry, "lint:leading")).toBe("a@b");
  });

  it("drops an entry whose HANDLE is empty, on the same ground as one whose tag is", () => {
    // The lookup is keyed BY handle, so a nameless entry is one nothing can ever reach — while
    // its tag would still join `registeredCheckTags` and stand there as a check the corpus hop
    // believes is registered. Dropped, not stored: a registry that answers for a handle no run
    // can spell is worse than one that admits it does not know.
    const registry = checkRegistryOf({ "": "complexity", "lint:vocab": "vocab" });

    expect(registeredCheckTags(registry)).toEqual(["vocab"]);
    expect(checkTagOfScript(registry, "")).toBeNull();
  });
});

describe("[SCN-LNT-001] registeredCheckTags names the tag set the corpus hop matches against", () => {
  it("is unique and sorted, so two handles sharing a check yield one tag", () => {
    const registry = checkRegistryOf({
      typecheck: "typecheck",
      "lint:complexity": "complexity",
      "lint:complexity-strict": "complexity",
    });

    expect(registeredCheckTags(registry)).toEqual(["complexity", "typecheck"]);
  });
});

/**
 * @unit for @SCN-LNT-015 — the relocated arm, read at hop 1. A registry entry may name the
 * fitness scenario its check credits, and the string form keeps naming none.
 *
 * Bidirectional evidence: the describe carries the SCN-LNT-015 id, back-linking to
 * features/fitness-reconciliation.feature's @SCN-LNT-015 scenario.
 */
describe("[SCN-LNT-015] checkRegistryOf reads the @SCN an entry names, beside its characteristic", () => {
  it("keeps both terms — the characteristic the handle asserts and the row its run credits", () => {
    // THE COLLAPSE'S OWN SHAPE. Two handles, ONE characteristic, and the @SCN is the only thing
    // that tells their rows apart once the tag has stopped naming the check.
    const registry = checkRegistryOf({
      "lint:complexity": { check: "complexity", scn: "SCN-CPX-005" },
      "lint:complexity-exceptions": { check: "complexity", scn: "SCN-CPX-006" },
    });

    expect(registry.get("lint:complexity")).toEqual({ check: "complexity", scn: "SCN-CPX-005" });
    expect(registry.get("lint:complexity-exceptions")).toEqual({
      check: "complexity",
      scn: "SCN-CPX-006",
    });
    // The characteristic set is UNCHANGED by the second term: two handles of one characteristic
    // are one tag, which is the whole point of the collapse.
    expect(registeredCheckTags(registry)).toEqual(["complexity"]);
    expect(checkTagOfScript(registry, "lint:complexity-exceptions")).toBe("complexity");
  });

  it("leaves the string form naming no scenario, so the corpus still decides", () => {
    // The compatibility this rule is careful about: an entry naming only a characteristic resolves
    // exactly as it does today (@SCN-LNT-008).
    expect(checkRegistryOf({ "lint:complexity": "complexity" }).get("lint:complexity")).toEqual({
      check: "complexity",
      scn: null,
    });
  });

  it("reads an object naming no scenario as the object spelling of the string form", () => {
    expect(
      checkRegistryOf({ "lint:complexity": { check: "complexity" } }).get("lint:complexity")
    ).toEqual({ check: "complexity", scn: null });
  });

  it("stores the @SCN BARE, on the same ground the tag already is", () => {
    // A registry written beside a feature file will spell BOTH terms the way the file does, and
    // the corpus carries the id bare. Stripping here rather than at the lookup is the stance
    // `checkRegistryOf` already takes for the tag.
    expect(
      checkRegistryOf({ "lint:complexity": { check: "@complexity", scn: " @SCN-CPX-005 " } }).get(
        "lint:complexity"
      )
    ).toEqual({ check: "complexity", scn: "SCN-CPX-005" });
  });
});

/**
 * @unit for @SCN-LNT-016 — the same property one layer down. An object entry carrying an `scn`
 * key it cannot resolve to a non-empty bare id is dropped WHOLE, not downgraded to the string
 * form: a dropped entry leaves the handle unregistered, so its run cites nothing and lands in
 * suspense, out loud. Degrading it would turn an author's typo into a silent credit on whichever
 * row the corpus reached first — the outcome @SCN-LNT-016 exists to refuse.
 *
 * Bidirectional evidence: the describe carries the SCN-LNT-016 id, back-linking to
 * features/fitness-reconciliation.feature's @SCN-LNT-016 scenario.
 */
describe("[SCN-LNT-016] an unusable `scn` drops the entry whole rather than degrading it", () => {
  it("drops an entry whose `scn` is not a string", () => {
    // Config is data from outside, and this is the stance `checkRegistryOf` already takes for a
    // non-string CHECK. Extending it to the new field is the point: the two terms are read under
    // one policy, so a reader cannot learn that one of them is trusted more than the other.
    expect(checkRegistryOf({ "lint:complexity": { check: "complexity", scn: 6 } }).size).toBe(0);
    expect(checkRegistryOf({ "lint:complexity": { check: "complexity", scn: null } }).size).toBe(0);
    expect(checkRegistryOf({ "lint:complexity": { check: "complexity", scn: [] } }).size).toBe(0);
  });

  it("drops an entry whose `scn` bares down to nothing", () => {
    // `bareTerm` strips the leading `@` and the surrounding space, so `"@"` and `"  "` are the
    // empty id spelled two other ways. All three say the same thing: the author meant to name a
    // row and did not.
    for (const scn of ["", "   ", "@", " @ "]) {
      expect(checkRegistryOf({ "lint:complexity": { check: "complexity", scn } }).size).toBe(0);
    }
  });

  it("takes the handle with it, so the run cites nothing instead of the wrong row", () => {
    // WHY WHOLE. The alternative — keep the entry at `scn: null` — is the corpus hop again, and
    // the corpus hop credits the first carrier. That is the silent wrong answer; an unregistered
    // handle is the loud one (@SCN-LNT-001's `null`, surfaced in suspense).
    const registry = checkRegistryOf({
      "lint:complexity": "complexity",
      "lint:complexity-exceptions": { check: "complexity", scn: 6 },
    });

    expect(registry.has("lint:complexity-exceptions")).toBe(false);
    expect(checkTagOfScript(registry, "lint:complexity-exceptions")).toBeNull();
    // The entries around it are untouched — one malformed entry is one entry's fault.
    expect(registry.get("lint:complexity")).toEqual({ check: "complexity", scn: null });
  });

  it("keeps an entry that carries NO `scn` key — the object spelling of the string form", () => {
    // The boundary, stated from the legal side so the drop cannot quietly widen: it is the KEY's
    // presence that is being judged, not the truthiness of its value.
    expect(checkRegistryOf({ "lint:complexity": { check: "complexity" } }).size).toBe(1);
  });
});
