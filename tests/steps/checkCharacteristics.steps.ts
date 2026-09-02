/**
 * Step definitions for features/check-characteristics.feature (the @integration arms of
 * @SCN-CHR-001 and @SCN-CHR-002).
 *
 * Anti-watermelon: this drives the REAL check-characteristics CLI (via tsx) from INSIDE
 * PLANTED TARGET TREES under tests/fixtures/ — never a re-run of the @unit fixture logic, and
 * never this repository's own manifest. The cwd is the target, because the characteristics
 * being judged are the ones the manifest AT THE CLI'S CWD names; run from repoRoot every arm
 * below would judge spec-controller's own eight words, which are all roster words, and the
 * check is green over them by construction.
 *
 * THE TEETH ARE THE PLANT. There is no off-roster characteristic in this tree to red on, so a
 * green here would establish nothing on its own — which is why the redding arms run over
 * manifests planted to carry one, on the registry side and on the thresholds side alike.
 *
 * @SCN-CHR-001, @SCN-CHR-002 — bidirectional evidence markers for
 * features/check-characteristics.feature.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// @SCN-CHR-001
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI = path.join(
  repoRoot,
  "packages",
  "spec-controller",
  "static-checks",
  "lintCheckCharacteristicsCli.ts",
);
const TSX = path.join(repoRoot, "node_modules", ".bin", "tsx");

let exitCode: number;
let output: string;

// @SCN-CHR-001
function runGuardInTarget(targetRoot: string): void {
  const root = path.join(repoRoot, targetRoot);
  const result = spawnSync(TSX, [CLI], { cwd: root, encoding: "utf8" });
  assert.equal(result.error, undefined, `guard failed to spawn: ${result.error?.message}`);
  exitCode = typeof result.status === "number" ? result.status : 1;
  output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

// @SCN-CHR-001
Given("the check-characteristics guard", function () {
  // No fixture yet — each When drives the real CLI from inside a planted target.
});

// @SCN-CHR-001
When(
  "it runs over a target whose registry names a characteristic the portfolio roster does not carry",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-offroster");
  },
);

// @SCN-CHR-001
Then(
  "it reds, naming that characteristic and the manifest key that carried it",
  function () {
    assert.equal(
      exitCode,
      1,
      `expected the check-characteristics guard to red (exit 1) over a target whose registry ` +
        `mints \`anemic-domain\`, but it exited ${exitCode}. Output:\n${output}`,
    );
    assert.match(
      output,
      /anemic-domain/,
      `expected the minted characteristic to be NAMED; got:\n${output}`,
    );
    assert.match(
      output,
      /specController\.checkRegistry/,
      `expected the manifest KEY that carried it to be named — an author who has just added a ` +
        `check made two edits and needs to be told which one is at fault; got:\n${output}`,
    );
    assert.match(
      output,
      /lint:anemic-domain/,
      `expected the ENTRY within that key to be named; got:\n${output}`,
    );
    // The roster word beside it is left alone, so the verdict is about the mint rather than
    // about the file.
    assert.doesNotMatch(
      output,
      /lint:complexity/,
      `expected the roster-word entry (lint:complexity) to be left alone — the verdict is ` +
        `about the mint, not about the file; got:\n${output}`,
    );
  },
);

// @SCN-CHR-001
When(
  "it runs over a target whose registry names a characteristic that merely resembles a roster word",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-nearmatch");
  },
);

// @SCN-CHR-001
Then(
  "it reds too, naming the word as the manifest wrote it and never the roster word it resembles",
  function () {
    assert.equal(
      exitCode,
      1,
      `expected the check-characteristics guard to red (exit 1) over a target whose registry ` +
        `mints \`complexty\`, but it exited ${exitCode}. Output:\n${output}`,
    );
    assert.match(
      output,
      /complexty/,
      `expected the word as the manifest WROTE it to be named; got:\n${output}`,
    );
    // The whole of the near-match rule: resolving it to `complexity` would admit the mint, and
    // quietly reading a minted word as something else hides the act this exists to surface.
    assert.doesNotMatch(
      output,
      /\bcomplexity\b/,
      `expected the roster word it resembles NOT to appear — a near-match courtesy would hide ` +
        `the mint; got:\n${output}`,
    );
  },
);

// @SCN-CHR-001
When(
  "it runs over a target every one of whose registry entries names a roster characteristic",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-roster");
  },
);

// @SCN-CHR-001
Then(
  "it is admitted, and says it holds the words to the roster and does not judge whether a characteristic was earned",
  function () {
    assert.equal(
      exitCode,
      0,
      `expected the check-characteristics guard to admit (exit 0) a target every one of whose ` +
        `registry entries names a roster word, but it exited ${exitCode}. Output:\n${output}`,
    );
    assert.match(
      output,
      /3 characteristic\(s\) named/,
      `expected the count of characteristics held to be stated — a bare OK is a green nobody ` +
        `can read; got:\n${output}`,
    );
    // THE LIMIT IS STATED, NOT IMPLIED. Canon's admission test asks whether an existing
    // characteristic already names the property a check asserts, and no check can answer that.
    assert.match(
      output,
      /EARNED/,
      `expected the verdict to say what a green here does NOT establish; got:\n${output}`,
    );
  },
);

// @SCN-CHR-002
When(
  "it runs over a target whose thresholds name a characteristic the portfolio roster does not carry, and whose registry names roster words only",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-threshold-offroster");
  },
);

// @SCN-CHR-002
Then(
  "it reds, naming that characteristic and the thresholds key that carried it",
  function () {
    // THE WHOLE OF THIS SCENARIO IS THAT THE REGISTRY IS CLEAN. This target's only registry
    // entry names a roster word, so a rule reading `checkRegistry` alone admits this tree —
    // the red can only have come from the half of the config the fault survived in.
    assert.equal(
      exitCode,
      1,
      `expected the check-characteristics guard to red (exit 1) over a target whose THRESHOLDS ` +
        `mint \`flakiness\` while its registry names roster words only, but it exited ` +
        `${exitCode}. A measured check has no script handle, so the thresholds are the only ` +
        `place it is ever named. Output:\n${output}`,
    );
    assert.match(
      output,
      /flakiness/,
      `expected the minted measured characteristic to be NAMED; got:\n${output}`,
    );
    assert.match(
      output,
      /specController\.thresholds/,
      `expected the manifest KEY that carried it to be named — and named as the THRESHOLDS ` +
        `rather than the registry, which is the edit the author has to make; got:\n${output}`,
    );
    assert.match(
      output,
      /SCN-TGT-003/,
      `expected the entry within that key — the @SCN whose bar named it — to be named; ` +
        `got:\n${output}`,
    );
    // The roster-word threshold entry beside it, and the registry entry above it, are both left
    // alone: the verdict is about the mint rather than about the file or about the key.
    assert.doesNotMatch(
      output,
      /SCN-TGT-002/,
      `expected the roster-word threshold entry (SCN-TGT-002, ci-run-time) to be left alone — ` +
        `the verdict is about the mint, not about the key; got:\n${output}`,
    );
    assert.doesNotMatch(
      output,
      /lint:complexity/,
      `expected the registry entry to be left alone; got:\n${output}`,
    );
  },
);

// @SCN-CHR-002
When(
  "it runs over a target whose thresholds name only characteristics the roster carries",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-threshold-roster");
  },
);

// @SCN-CHR-002
Then(
  "it is admitted, and the characteristics its thresholds name are counted among the ones held",
  function () {
    assert.equal(
      exitCode,
      0,
      `expected the check-characteristics guard to admit (exit 0) a target every one of whose ` +
        `threshold entries names a roster word, but it exited ${exitCode}. Output:\n${output}`,
    );
    // THREE, NOT ONE. One registry entry and two threshold entries. A verdict that held only
    // the registry would still exit 0 here, so the COUNT is what makes the measured side's
    // admission visible rather than merely non-fatal — the same reason a green line states a
    // number at all.
    assert.match(
      output,
      /3 characteristic\(s\) named/,
      `expected all three named characteristics — one from the registry, two from the ` +
        `thresholds — to be counted; a count of 1 is a rule that never read the thresholds; ` +
        `got:\n${output}`,
    );
  },
);

// @SCN-CHR-003
When(
  "it runs over a target that mints a characteristic the portfolio roster does not carry, stating why it needs the word",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-mint-reasoned");
  },
);

// @SCN-CHR-003
Then("it is admitted, and the mint is named with the reason stated for it", function () {
  assert.equal(
    exitCode,
    0,
    `expected the check-characteristics guard to admit (exit 0) a target that mints ` +
      `\`flakiness\` in a key of its own and states why, but it exited ${exitCode}. A roster a ` +
      `product cannot mint against is not a shared vocabulary, it is a gate on delivery. ` +
      `Output:\n${output}`,
  );
  assert.match(
    output,
    /flakiness/,
    `expected the minted characteristic to be NAMED on the admitted run — a quiet exception is ` +
      `how fourteen tags grew over a month without one red; got:\n${output}`,
  );
  assert.match(
    output,
    /order-dependent tests/,
    `expected the REASON stated for the mint to be printed beside it, not merely the word: a ` +
      `mint nobody can read the reason for is a config line wearing a second key; got:\n${output}`,
  );
});

// @SCN-CHR-003
When(
  "it runs over a target whose mint of that same characteristic states no reason",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-mint-reasonless");
  },
);

// @SCN-CHR-003
Then(
  "it reds, naming the mint that states none and the manifest key that carried it",
  function () {
    // THIS FIXTURE IS THE REASONED ONE BUT FOR THE REASON. So the red can only have come from
    // the reason being empty — an entry with nothing written against it is not a mint, it is
    // the config line that mints a characteristic and certifies it in one act.
    assert.equal(
      exitCode,
      1,
      `expected the check-characteristics guard to red (exit 1) over a target whose mint of ` +
        `\`flakiness\` states no reason, but it exited ${exitCode}. Without this arm the route ` +
        `is a config line again, which is the fault. Output:\n${output}`,
    );
    assert.match(
      output,
      /specController\.mintedCharacteristics/,
      `expected the verdict to name the MINT key as the one at fault — the author believes ` +
        `they have already covered this word, so an off-roster complaint about the registry ` +
        `entry alone leaves them with no way to see why their route did not admit it; ` +
        `got:\n${output}`,
    );
    assert.match(
      output,
      /flakiness/,
      `expected the mint that states no reason to be named; got:\n${output}`,
    );
  },
);

// @SCN-CHR-003
When(
  "it runs over a target that mints one characteristic with a reason while naming a second the roster does not carry and no mint covers",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-mint-uncovered");
  },
);

// @SCN-CHR-003
Then(
  "it reds on the uncovered word alone, and names the mint with its reason all the same",
  function () {
    assert.equal(
      exitCode,
      1,
      `expected the check-characteristics guard to red (exit 1) over a target naming ` +
        `\`anemic-domain\` with no mint covering it, but it exited ${exitCode}. A mint admits ` +
        `the word it NAMES, never the file it sits in. Output:\n${output}`,
    );
    assert.match(
      output,
      /1 fault\(s\) in the characteristics this target names/,
      `expected exactly ONE fault — \`flakiness\` is minted with a reason and must be admitted ` +
        `on this run too, so a count of 2 is a mint that admits nothing; got:\n${output}`,
    );
    assert.match(
      output,
      /anemic-domain/,
      `expected the uncovered word to be the one named; got:\n${output}`,
    );
    // NAMED ON EVERY RUN, and this is the run that proves "every". The green half is the arm
    // above; a mint that went quiet the moment something else redded would be exactly the
    // silence this route exists to break.
    assert.match(
      output,
      /order-dependent tests/,
      `expected the admitted mint and its reason to be printed on a RED run as well — "named ` +
        `on every run, green included" is a claim about every run; got:\n${output}`,
    );
  },
);

// @SCN-CHR-004
When(
  "it runs over a target whose mint states a reason for a word no registry or threshold entry of its own names",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-mint-unused");
  },
);

// @SCN-CHR-004
Then(
  "it reds, and the mint is named as one nothing this target names is relying on",
  function () {
    // THE RATCHET. This fixture is the reasoned one but for the check that used the word: the
    // reason is stated in full, so the red cannot have come from @SCN-CHR-003's arm. What is
    // left is an entry that reds nothing by construction, sitting on as standing permission for
    // the next characteristic that happens to match it.
    assert.equal(
      exitCode,
      1,
      `expected the check-characteristics guard to red (exit 1) over a target whose mint of ` +
        `\`flakiness\` is named by nothing in its own manifest, but it exited ${exitCode}. ` +
        `Without this arm the mint key is the self-certifying roster with an extra step. ` +
        `Output:\n${output}`,
    );
    assert.match(
      output,
      /1 fault\(s\) in the characteristics this target names/,
      `expected exactly ONE fault — \`lint:complexity\` beside it names a roster word and must ` +
        `be left alone, so a count of 2 is a stale rule reading the file rather than the ` +
        `entry; got:\n${output}`,
    );
    assert.match(
      output,
      /specController\.mintedCharacteristics/,
      `expected the MINT key to be named as the one at fault — the remedy is a line to delete ` +
        `in that key, not an edit anywhere else; got:\n${output}`,
    );
    assert.match(
      output,
      /flakiness/,
      `expected the stale mint to be named; got:\n${output}`,
    );
    assert.match(
      output,
      /names it any more/,
      `expected the verdict to say WHICH of the two ways this mint went stale — one remedy, ` +
        `but the author still has to be able to see what happened; got:\n${output}`,
    );
    assert.doesNotMatch(
      output,
      /roster now carries the word itself/,
      `expected the SUPERSEDED wording to be absent — the roster does not carry \`flakiness\`, ` +
        `so saying it does would be the wrong diagnosis of a right red; got:\n${output}`,
    );
  },
);

// @SCN-CHR-004
When(
  "it runs over a target whose mint states a reason for a word the portfolio roster now carries",
  function () {
    runGuardInTarget("tests/fixtures/check-characteristics-mint-superseded");
  },
);

// @SCN-CHR-004
Then(
  "it reds too, and the mint is named as one the roster has overtaken, in words the other arm does not use",
  function () {
    // THE SECOND WAY, AND IT IS NOT THE FIRST WEARING A DIFFERENT COAT. `complexity` IS named
    // here, by the registry entry the mint sits beside, so the unused arm cannot fire — the red
    // can only have come from the roster having carried the word since.
    assert.equal(
      exitCode,
      1,
      `expected the check-characteristics guard to red (exit 1) over a mint of \`complexity\`, ` +
        `a word the portfolio roster carries, but it exited ${exitCode}. A mint the roster has ` +
        `overtaken licenses nothing it did not already have. Output:\n${output}`,
    );
    assert.match(
      output,
      /specController\.mintedCharacteristics/,
      `expected the MINT key to be named as the one at fault — never the registry entry, which ` +
        `names a roster word and is correct as it stands; got:\n${output}`,
    );
    assert.match(
      output,
      /roster now carries the word itself/,
      `expected the verdict to say the roster has overtaken this mint; got:\n${output}`,
    );
    // ONE REMEDY, TWO DIAGNOSES, and the distinction is what the message is for: told only
    // "delete it", an author cannot tell whether their check went away or their word arrived.
    assert.doesNotMatch(
      output,
      /names it any more/,
      `expected the UNUSED wording to be absent — \`complexity\` is named right there by ` +
        `\`lint:complexity\`, so the two arms must not be reported in the same words; ` +
        `got:\n${output}`,
    );
  },
);
