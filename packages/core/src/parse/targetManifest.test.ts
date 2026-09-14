/**
 * `resolveRetiredKeys` (@SCN-USG-021) — the `specController.*` keys this reader has retired,
 * named rather than silently gone.
 *
 * ITS OWN FILE. `targetManifest.ts` holds seven resolvers and none of them owns a test file of
 * its own — each is proven beside its consumer (`resolveRunners` in `recognisedRunners.test.ts`,
 * for one). `resolveRetiredKeys` has no such consumer: it feeds a graft in
 * `evidenceReconciliationFromSources.ts` directly, the way the resolver itself reads the
 * manifest directly, so its own file is the least contrived home rather than a borrowed one.
 */
import { describe, it, expect } from "vitest";

import { resolveRetiredKeys } from "./targetManifest.js";

describe("[SCN-USG-021] resolveRetiredKeys — the specController.* keys this reader no longer reads", () => {
  it("names a retired key the manifest still carries", () => {
    // THE KEY IS NAMED WITH ITS FULL PATH, not the bare word — `specController.checkRegistry`
    // is what the consumer wrote, and the render account (@SCN-USG-021) reads this value
    // straight onto the report line, so the resolver states the fact the report needs.
    expect(
      resolveRetiredKeys({ specController: { checkRegistry: { "lint:foo": "foo" } } })
    ).toEqual(["checkRegistry"]);
  });

  it("names nothing for a manifest that never wrote the retired key", () => {
    expect(resolveRetiredKeys({ specController: { runners: { unit: "vitest" } } })).toEqual([]);
    expect(resolveRetiredKeys({ specController: {} })).toEqual([]);
  });

  it("resolves empty, never throws, for a manifest carrying no specController block at all", () => {
    // DEFENSIVE LIKE THE FAMILY IT JOINS: config is data from outside, and a target that has
    // never written the block is the ordinary case, not malformed input.
    expect(resolveRetiredKeys({})).toEqual([]);
  });

  it("resolves empty for a specController block that is not an object", () => {
    // A missing OR array-shaped OR scalar `specController` is the same defensive stance every
    // resolver in this family takes — dropped, never thrown.
    expect(resolveRetiredKeys({ specController: ["checkRegistry"] } as never)).toEqual([]);
    expect(resolveRetiredKeys({ specController: "checkRegistry" } as never)).toEqual([]);
  });

  it("names a retired key among ordinary ones, and only the retired one", () => {
    // THE PARTITION, over a manifest that also writes real config beside the retired key — a
    // reader that named every top-level key, or that stayed silent because SOMETHING else in
    // the block was valid, both fail this the same way the runner partition's own arm does.
    expect(
      resolveRetiredKeys({
        specController: { runners: { unit: "vitest" }, checkRegistry: { "lint:foo": "foo" } },
      })
    ).toEqual(["checkRegistry"]);
  });

  it("[SCN-USG-022] names the second retired key a manifest carries, staticChecks", () => {
    // THE APPEND, PROVEN ON ITS OWN. staticChecks is the second entry the set has ever carried
    // (checkRegistry first, 3F-3398) — this arm is what tells apart a resolver that only ever
    // recognised the first key it was given from one that reads the whole append-only set.
    expect(
      resolveRetiredKeys({ specController: { staticChecks: ["typecheck"] } })
    ).toEqual(["staticChecks"]);
  });

  it("[SCN-USG-022] names both retired keys together, in the order the manifest wrote them", () => {
    // ORDER IS THE MANIFEST'S, NOT THE APPEND-ONLY SET'S — the docblock's own claim. Writing
    // staticChecks before checkRegistry and getting it back first is what tells the two orders
    // apart; a resolver reading off its own set's order would pass this by coincidence only
    // where the two happen to agree.
    expect(
      resolveRetiredKeys({
        specController: { staticChecks: ["typecheck"], checkRegistry: { "lint:foo": "foo" } },
      })
    ).toEqual(["staticChecks", "checkRegistry"]);
    expect(
      resolveRetiredKeys({
        specController: { checkRegistry: { "lint:foo": "foo" }, staticChecks: ["typecheck"] },
      })
    ).toEqual(["checkRegistry", "staticChecks"]);
  });
});
