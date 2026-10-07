import { afterAll, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveDeferralTags } from "@3f-consulting/spec-controller-core/internal";
import { DEFAULT_DEFERRAL_TAGS } from "../deferralTags.js";
import { runReconcile } from "./ingestQualityChecks.js";

describe("[SCN-PND-021] resolveDeferralTags extends the starter set with specController.deferralTags", () => {
  it("unions a project-configured tag with the built-in starter set — the configured tag is recognised", () => {
    const resolved = resolveDeferralTags({ specController: { deferralTags: ["deferred"] } }, DEFAULT_DEFERRAL_TAGS);
    expect(resolved).toContain("deferred");
    for (const builtin of DEFAULT_DEFERRAL_TAGS) {
      expect(resolved).toContain(builtin);
    }
  });

  it("EXTENDS, never replaces — a project cannot un-recognise a built-in, even with a disjoint config", () => {
    const resolved = resolveDeferralTags({ specController: { deferralTags: ["deferred"] } }, DEFAULT_DEFERRAL_TAGS);
    expect(new Set(resolved)).toEqual(new Set([...DEFAULT_DEFERRAL_TAGS, "deferred"]));
    expect(new Set(resolveDeferralTags({ specController: { deferralTags: [] } }, DEFAULT_DEFERRAL_TAGS))).toEqual(
      new Set(DEFAULT_DEFERRAL_TAGS)
    );
  });

  it("returns exactly the starter set when no specController.deferralTags is configured", () => {
    expect(new Set(resolveDeferralTags({}, DEFAULT_DEFERRAL_TAGS))).toEqual(new Set(DEFAULT_DEFERRAL_TAGS));
    expect(new Set(resolveDeferralTags({ specController: {} }, DEFAULT_DEFERRAL_TAGS))).toEqual(new Set(DEFAULT_DEFERRAL_TAGS));
  });

  it("strips a leading `@` and ignores malformed (non-string / non-array) config entries", () => {
    expect(resolveDeferralTags({ specController: { deferralTags: ["@deferred"] } }, DEFAULT_DEFERRAL_TAGS)).toContain("deferred");
    const mixed = resolveDeferralTags({ specController: { deferralTags: ["@custom", 7, null] as unknown[] } }, DEFAULT_DEFERRAL_TAGS);
    expect(mixed).toContain("custom");
    expect(new Set(mixed)).toEqual(new Set([...DEFAULT_DEFERRAL_TAGS, "custom"]));
    expect(new Set(resolveDeferralTags({ specController: { deferralTags: "nope" as unknown } }, DEFAULT_DEFERRAL_TAGS))).toEqual(
      new Set(DEFAULT_DEFERRAL_TAGS)
    );
  });
});

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function unconfiguredTarget(tag: string): string {
  const root = mkdtempSync(join(tmpdir(), `scn-pnd-019-${process.pid}-`));
  made.push(root);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "unconfigured-target", scripts: {} }));
  mkdirSync(join(root, "features"));
  writeFileSync(
    join(root, "features", "deferral.feature"),
    "@DFR\nFeature: deferral\n\n" +
      `  @${tag} @unit @SCN-DFR-001\n  Scenario: the deferred scenario\n    Given a thing\n\n` +
      "  @unit @SCN-DFR-002\n  Scenario: its untagged twin\n    Given a thing\n"
  );
  return root;
}

describe("[SCN-PND-019] a community deferral tag raises the Pending Item, with no deferralTags configured", () => {
  it.each(["wip", "ignore", "skip", "todo", "pending"])(
    "@%s defers its scenario to a Pending Item, while its untagged twin is missing",
    (tag) => {
      const root = unconfiguredTarget(tag);
      const balance = runReconcile({
        features: join(root, "features"),
        packageJson: join(root, "package.json"),
        ci: root,
      });
      const scenario = (scnId: string) => balance.ledger.scenarioReconciliations.find((s) => s.scnId === scnId);

      expect(scenario("SCN-DFR-001")?.pendingItems).toEqual([{ qualityCheck: "unit" }]);
      expect(scenario("SCN-DFR-001")?.reconcilingItems).toEqual([]);
      expect(scenario("SCN-DFR-002")?.pendingItems).toEqual([]);
      expect(scenario("SCN-DFR-002")?.reconcilingItems).toEqual([
        { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
      ]);
    }
  );
});
