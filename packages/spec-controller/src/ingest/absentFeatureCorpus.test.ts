/**
 * @unit for `balance`'s side of the absent corpus (@SCN-CLI-017, 3F-3345) — the translation half.
 *
 * `discoverFeatures` REFUSES an absent corpus (typed, so a caller can decide — see the
 * `[SCN-CLI-017]` block in ingestScenarios.test.ts). This file is the other half of that split:
 * `balance` is the command that OPTS IN to reporting on a target that has no `features/`, and it
 * opts in ONCE — every corpus read it makes goes through the same translation, so no reader can
 * be tolerant while its sibling still throws.
 *
 * IT IS ITS OWN FILE because ingestQualityChecks.test.ts is the @SCN-LNT-005 cross-repo fitness
 * arm at 650 lines against a 400-line ceiling exception, and the section-file precedent beside it
 * is ingestQualityChecks.recordRead.test.ts.
 *
 * THE CONTROL IS THE POINT OF THE LAST BLOCK. Tolerating absence must not tolerate a corpus that
 * is PRESENT and unreadable: that one still refuses (@SCN-CLI-016 / @SCN-GPG-001, exit 2). One
 * knob — the directory's existence — and a control that must stay refusing.
 *
 * Bidirectional evidence: the describes carry the SCN-CLI-017 id matching
 * features/cli-balance.feature.
 */

import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  featureCorpusParseErrors,
  readEvidenceObligations,
  readFeatureNames,
  runReconcile,
} from "./ingestQualityChecks.js";

/** A `features/` directory that is NOT on disk — the modal `new-client`'s honest shape. */
function absentCorpus(): { features: string; packageJson: string; ci: string } {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-017-absent-${process.pid}-`));
  // A GUARDLESS manifest, and `--ci` pointed at the target's own root, which holds no workflow:
  // nothing is running, so nothing is uncited and the suspense row stays empty. What is under
  // test is the CORPUS side alone.
  //
  // NAMED RATHER THAN OMITTED, since @SCN-USG-004. The flag defaults to `.github/workflows`, so a
  // run omitting it reads THIS repository's pipeline, every step of which is now a candidate —
  // and this target would be handed a ledger of somebody else's checks. The omission used to be
  // isolated by accident, because a prefix rule found nothing there for a manifest with no
  // scripts, and an accident is not isolation.
  const packageJson = join(root, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "new-client-target", scripts: {} }));
  const features = join(root, "features");
  expect(existsSync(features)).toBe(false);
  return { features, packageJson, ci: root };
}

/** A `features/` directory that IS on disk and holds a file cucumber would refuse — the control. */
function unreadableCorpus(): { features: string; packageJson: string; file: string } {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-017-unreadable-${process.pid}-`));
  const packageJson = join(root, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "new-client-target", scripts: {} }));
  const features = join(root, "features");
  mkdirSync(features, { recursive: true });
  const file = join(features, "target.feature");
  writeFileSync(file, "not gherkin at all {{{\n");
  return { features, packageJson, file };
}

describe("[SCN-CLI-017] balance reads an absent corpus as no corpus, at every reader", () => {
  it("reports no parse errors — there is nothing to parse", () => {
    const { features } = absentCorpus();

    expect(featureCorpusParseErrors(features)).toEqual([]);
  });

  it("reads no feature-code map", () => {
    const { features } = absentCorpus();

    expect([...readFeatureNames(features)]).toEqual([]);
  });

  it("raises no evidence obligation, and finds no untagged scenario", () => {
    const { features } = absentCorpus();

    const obligations = readEvidenceObligations(features);

    expect(obligations.scenarioCount).toBe(0);
    expect(obligations.rawScnOccurrences).toBe(0);
    expect(obligations.untaggedScenarios).toEqual([]);
  });

  it("reconciles the target instead of throwing, and the ledger has no accounts", () => {
    // THE WHOLE CLAIM, at the reconcile: the run completes and produces a ledger. Zero rows is
    // what @SCN-CLI-019 then reads as NOTHING TO RECONCILE — this arm asserts the SHAPE, not that
    // verdict, which is its sibling's to make.
    const { features, packageJson, ci } = absentCorpus();

    const balance = runReconcile({ features, packageJson, ci });

    expect(balance.ledger.scenarioReconciliations).toEqual([]);
  });
});

describe("[SCN-CLI-017] a corpus that is PRESENT and unreadable is still refused", () => {
  it("keeps reporting the parse failure rather than reading absence into it", () => {
    // The control. Absence became tolerable; unreadability did not, and a translation written one
    // catch too wide would swallow both and hand `balance` an empty corpus over a corrupt one —
    // the exact false green @SCN-CLI-016 closed.
    const { features, file } = unreadableCorpus();

    const errors = featureCorpusParseErrors(features);

    expect(errors.map((e) => e.file)).toEqual([file]);
  });
});
