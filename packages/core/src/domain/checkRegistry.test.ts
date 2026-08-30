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
