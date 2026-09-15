/**
 * Step definitions for features/scn-tags.feature — the @integration arms of every Rule in it.
 *
 * Anti-watermelon: every arm SPAWNS a real binary over a PLANTED fixture tree under
 * tests/fixtures/ — never a re-run of the rule function, and never a real features/ scenario.
 * ONE binary now: the SHIPPED `spec-controller tags` command, which is what a target runs.
 *
 * THE TIER FLOOR'S TWO ARMS ARE GONE (3F-3308, 3F-3309). The floor's own arm ran the private
 * `lint:scn-tags` CLI over a tier-less tree and a fully tiered one; its parking arm ran the same
 * CLI over three more trees, to show that a parked tier-less scenario was out of the floor's
 * scope and that the parking set was the TARGET's own. The ledger says both without help: a
 * tier-less unparked scenario out of balance by id, a parked one balanced and tallied as a
 * Pending Item on the target's own word. Five fixture trees went with the two arms —
 * scn-tags-tierless, scn-tags-compliant, scn-tags-parked, scn-tags-parked-unparked and
 * scn-tags-parked-default — each grepped first and read by nothing else.
 *
 * AND THE CLI ITSELF FOLLOWED THEM (3F-3312), which is why every `lint:scn-tags` named below is
 * history rather than a second thing to run. Those two arms were the last that drove it; with
 * them gone it was 620 unreachable lines asserting what the shipped command already asserts, so
 * the script, its CI step and both modules left together. Nothing in this file spawns anything
 * but `spec-controller tags` now.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let exitCode: number;
let output: string;

/** The target the Given names, so the When that runs the command does not also choose it. */
let corpusTarget: string;

/**
 * THE SHARED GREEN, and it names no tree of its own. Every Rule in this file has a
 * `Then it passes`, and the arms differ only in the `Given`/`When` that chose the tree. It was
 * written for the tier floor's own arm and carried that arm's wording until 3F-3308 deleted it;
 * leaving "the scn-tags guard ... over the fully tiered tree" behind would have described one
 * departed scenario's fixture to the surviving arms that never touch it.
 */
Then("it passes", function () {
  assert.equal(
    exitCode,
    0,
    `expected the check under test to pass (exit 0) over this target, but it exited ` +
      `${exitCode}. Output:\n${output}`
  );
});

/**
 * @SCN-STG-010 — the SHIPPED command, driven as its own process from inside a planted
 * target tree.
 *
 * THE SUBJECT IS THE BINARY, NOT THE RULE FUNCTION. `corpusFaults` is a pure function in
 * core and a re-run of it here would prove that the arm and the rule agree with each
 * other. What a consumer gets is `spec-controller tags` — the dispatcher, the flag scope,
 * the corpus discovery and the exit status — so that is what is spawned.
 *
 * FROM INSIDE THE TARGET, because the command resolves the target's manifest from its
 * cwd: a run from repoRoot would read THIS repository's config while claiming to have
 * read the fixture's. A threshold is named nowhere but the target's own manifest, so the
 * measured arms would be reading ceilings their fixture never wrote.
 *
 * AND IT IS THE BUILT BINARY, NOT THE SOURCE (3F-3424) — `dist/cli.js` is the file `bin` points at,
 * so "what a consumer gets" is now literally what this spawns rather than its TypeScript original.
 */
// @SCN-STG-010
function runTagsInTarget(targetRoot: string): void {
  const root = path.join(repoRoot, targetRoot);
  const result = spawnSync(
    NODE,
    [...SPEC_CONTROLLER_ARGV, "tags", "--features", path.join(root, "features")],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(result.error, undefined, `spec-controller failed to spawn: ${result.error?.message}`);
  exitCode = typeof result.status === "number" ? result.status : 1;
  output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

// @SCN-STG-010
Given("a target whose two feature files carry the same header code", function () {
  corpusTarget = "tests/fixtures/scn-tags-duplicate-code";
});

// @SCN-STG-010
When("the target runs the shipped corpus check", function () {
  runTagsInTarget(corpusTarget);
});

// @SCN-STG-010
Then("it fails, naming the code and both files that carry it", function () {
  assert.equal(
    exitCode,
    1,
    `expected the shipped corpus check to fail (exit 1) over a target whose two feature ` +
      `files both carry @TGT, but it exited ${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /\bTGT\b/,
    `expected the offending CODE to be named — the fault is a property of the code, and a ` +
      `message naming only the files leaves the reader to work out what they share; ` +
      `got:\n${output}`
  );
  // BOTH files, because neither of them is the offender: the fault is the PAIR, and a
  // message naming one has already decided which of the two should change.
  assert.match(
    output,
    /one\.feature/,
    `expected the first file carrying the code to be named; got:\n${output}`
  );
  assert.match(
    output,
    /two\.feature/,
    `expected the second file carrying the code to be named; got:\n${output}`
  );
});

// @SCN-STG-010
When("it runs over that same target with one of the two codes changed", function () {
  // THE REMEDY, as its own tree — byte-for-byte the sibling above with one header tag
  // changed. The pair is what makes the arm load-bearing: red then green over one tag's
  // difference, rather than a single assertion that could pass for any reason.
  runTagsInTarget("tests/fixtures/scn-tags-duplicate-code-split");
});

/**
 * @SCN-STG-011 — the same shipped binary, over the other half of the code/file pair.
 *
 * ITS `When` IS @SCN-STG-010's, DELIBERATELY. Both arms run the same command over a target
 * the `Given` chose, so the step that runs it is shared and only the fixture differs. A
 * second copy of it would be a second place for the two arms to come to disagree about
 * what "the shipped corpus check" means.
 */
// @SCN-STG-011
Given("a target whose feature file holds a scenario coded for another feature", function () {
  corpusTarget = "tests/fixtures/scn-tags-foreign-code";
});

// @SCN-STG-011
Then(
  "it fails, naming the file, the offending id, and the code that file carries",
  function () {
    assert.equal(
      exitCode,
      1,
      `expected the shipped corpus check to fail (exit 1) over a target whose @TGT-headed ` +
        `file holds @SCN-ZZZ-001, but it exited ${exitCode}. Output:\n${output}`
    );
    // THE FILE, because the id alone does not say where to go and looking for it is the
    // whole of the work the message can save.
    assert.match(
      output,
      /one\.feature/,
      `expected the file holding the foreign id to be named; got:\n${output}`
    );
    // THE OFFENDING ID, because a file may hold many scenarios and only one of them is wrong.
    assert.match(
      output,
      /SCN-ZZZ-001/,
      `expected the offending scenario id to be named; got:\n${output}`
    );
    // THE CODE THE FILE CARRIES, because that is the half of the disagreement the author
    // cannot read off the id — and it is the one that decides which of the two remedies
    // (re-code the scenario, or move it) they want.
    assert.match(
      output,
      /\bTGT\b/,
      `expected the code the file actually carries to be named, so the author can read the ` +
        `disagreement rather than reconstruct it; got:\n${output}`
    );
    // AND NOT THE NATIVE SCENARIO BESIDE IT. `SCN-TGT-001` in the same file agrees with the
    // header, so a finding naming it has convicted the file rather than the id — which is
    // exactly what a rule comparing the wrong two things would do while still exiting 1.
    assert.doesNotMatch(
      output,
      /SCN-TGT-001/,
      `expected the scenario whose code DOES name its file to go unmentioned — naming it ` +
        `convicts the file rather than the offending id; got:\n${output}`
    );
  }
);

// @SCN-STG-011
When("it runs over that same target with the id re-coded to its own file", function () {
  // THE REMEDY, as its own tree — byte-for-byte the sibling above with `@SCN-ZZZ-001`
  // re-coded to `@SCN-TGT-002`. One tag's difference between red and green is what makes
  // the rule about the DISAGREEMENT rather than about anything else in the file.
  runTagsInTarget("tests/fixtures/scn-tags-foreign-code-recoded");
});

/**
 * @SCN-STG-002 — the tag-grammar arm, now over the same shipped binary as the two above.
 *
 * ITS `When` IS @SCN-STG-010's, for that arm's reason: one step runs the command a `Given`
 * chose the target for, so the three arms cannot come to disagree about what "the shipped
 * corpus check" means. What moved is only which tree the `Given` names.
 *
 * FROM INSIDE THE FIXTURE'S OWN TREE, which is the change of substance in this arm's setup.
 * It used to be driven from `repoRoot` with `--features` alone, so the manifest the command
 * read was THIS repository's — harmless while nothing read it, and wrong the moment the
 * grammar starts resolving a target's deferral set and check registry off it (3F-3303 and
 * 3F-3305). The fixture now carries a `package.json` of its own and is spawned with its root
 * as cwd, so the sets the rule resolves are the ones this scenario means: empty, configured
 * by nobody, which is exactly what makes `@untit` a tag that means nothing HERE.
 */
// @SCN-STG-002
Given("a target whose @SCN scenario carries a mistyped tier tag", function () {
  corpusTarget = "tests/fixtures/scn-tags-unrecognised";
});

/**
 * @SCN-STG-003 — the grammar arm's negative half, on the same shipped binary as the four above.
 *
 * ITS `When` IS @SCN-STG-010'S, for that arm's reason. What moved is the `Given`, and with it
 * HOW THE FIXTURE IS DRIVEN: this tree used to be run through the private `lint:scn-tags` CLI
 * from `repoRoot`, so the manifest whose deferral set the check resolved was THIS repository's.
 * That was harmless while the answer happened to agree and wrong in principle — the arm is about
 * whose set it is. The fixture now carries a `package.json` of its own and is spawned with its
 * root as cwd, so the set the rule resolves is this target's: the community starter half from the
 * application layer, extended by a `specController.deferralTags` block the fixture does not
 * write. That is exactly the target this scenario means — a codebase that configures nothing and
 * still has `@skip` recognised, because the starter set is the PRODUCT's policy and not the
 * corpus's.
 *
 * WHAT THIS ARM CANNOT DISCRIMINATE, said out loud rather than left to be assumed: a rule that
 * RESTATED the five starter tags instead of resolving them would pass this arm. What forecloses
 * that is construction, not this assertion — the rule calls `resolveDeferralTags`, the one reader
 * of `specController.deferralTags` (@SCN-PND-021), and holds no list of its own. The extension
 * half of the resolved set is proved there, over the resolver, at the tier this Given does not
 * reach.
 */
// @SCN-STG-003
Given(
  "a target whose tiered @SCN scenario also carries a recognised community deferral tag",
  function () {
    corpusTarget = "tests/fixtures/scn-tags-community";
  }
);

/**
 * @SCN-STG-004 — the grammar arm's OTHER shape, on the same shipped binary as the five above.
 *
 * ITS `When` IS @SCN-STG-010'S, for that arm's reason. What moved is the `Given`, and with it
 * the tree the command is pointed at: the fixture now carries a `package.json` of its own and is
 * spawned with its root as cwd, so the sets the rule resolves are this target's — empty,
 * configured by nobody — rather than this repository's. Driven from `repoRoot` the arm would have
 * been reading our registry while claiming to have read the fixture's, which is harmless only
 * until the check-tag union starts being resolved off it (3F-3305).
 *
 * TWO SCENARIOS IN ONE TREE, WHICH IS THIS ARM'S WHOLE SUBJECT. `@fitness=complexity` is the
 * shape canon names; `@lint=typecheck` is the retired form this tree itself used to write, and it
 * is the one a reader would most expect to be carved out — the private check DID carve it out
 * while the form was live. One rule serves both, so the fixture makes the command answer for both
 * in one run rather than leaving the second shape to an argument.
 */
// @SCN-STG-004
Given("a target whose scenario carries a group-prefixed check tag", function () {
  corpusTarget = "tests/fixtures/scn-tags-group-prefixed";
});

// @SCN-STG-004
Then("it fails, naming the bare tag the group-prefixed one should have been", function () {
  assert.equal(
    exitCode,
    1,
    `expected the shipped corpus check to fail (exit 1) over a target whose @SCN scenarios ` +
      `carry @fitness=complexity and @lint=typecheck, but it exited ${exitCode}. ` +
      `Output:\n${output}`
  );
  // THE OFFENDING TAG, for @SCN-STG-002's reason: "something is wrong in this file" is not a
  // usable message.
  assert.match(
    output,
    /@fitness=complexity/,
    `expected the offending tag to be NAMED; got:\n${output}`
  );
  // THE BARE TAG THE AUTHOR WANTED, spelled as the remedy rather than merely appearing
  // somewhere in the line. `@complexity` on its own would also be satisfied by a message that
  // happened to quote the tag twice; what this arm is about is that the command READ the
  // intent — the group is the part that has to go, and what is left is the tag they meant.
  assert.match(
    output,
    /should have been @complexity\b/,
    `expected the message to name the bare tag the group-prefixed one should have been ` +
      `(@complexity); got:\n${output}`
  );
  // THE RETIRED FORM, SERVED BY THE SAME RULE. It raises no Evidence Obligation
  // (@SCN-LNT-007), so admitting it as a tier would let a scenario look tiered while owing
  // nothing. Dropped of its group it names what is left, exactly like any other.
  assert.match(
    output,
    /@lint=typecheck/,
    `expected the retired lint=<handle> form to be named as an offending tag rather than ` +
      `admitted as a tier; got:\n${output}`
  );
  assert.match(
    output,
    /should have been @typecheck\b/,
    `expected the retired form to be served by the SAME rule — dropped of its group, the ` +
      `message names what is left; got:\n${output}`
  );
  // AND NO NEAR-MISS GUESS ON EITHER. Edit distance has nothing to offer a tag that spells its
  // group into itself, so the two diagnoses must stay distinct: a "did you mean" here would be
  // the courtesy answering a question it cannot see, printed at an author whose intent is
  // already legible.
  assert.doesNotMatch(
    output,
    /did you mean/,
    `expected the legible-intent message INSTEAD of the near-miss courtesy — two shapes, one ` +
      `verdict, two messages; got:\n${output}`
  );
  // EXACTLY TWO FINDINGS, which is what makes the assertions above statements about these two
  // tags rather than about a command that reds this tree for some other reason as well. Both
  // scenarios name @unit and their ids agree with the file's own @TGT header, so the grammar
  // question is the whole of the fault here.
  assert.match(
    output,
    /2 finding\(s\)/,
    `expected exactly the two group-prefixed tags to be found — a third finding means the ` +
      `command reds this tree for a reason this arm is not about; got:\n${output}`
  );
});

// @SCN-STG-002
Then("it fails, naming the unrecognised tag and the tier it resembles", function () {
  assert.equal(
    exitCode,
    1,
    `expected the shipped corpus check to fail (exit 1) over a target whose @SCN scenario ` +
      `carries @untit, but it exited ${exitCode}. Output:\n${output}`
  );
  // THE OFFENDING TAG, because "something is wrong in this file" is not a usable message.
  assert.match(
    output,
    /@untit/,
    `expected the offending tag to be NAMED; got:\n${output}`
  );
  // THE NEAR-MISS TIER, which is the courtesy this Rule's preamble defends: a guess that
  // steers the fix, never the verdict.
  assert.match(
    output,
    /@unit\b/,
    `expected the near-miss tier (@unit) to be named alongside @untit; got:\n${output}`
  );
  // AND NOT THE FEATURE HEADER CODE. `@TGT` sits on the fixture's `Feature:` line and
  // `parseTaggedScenarios` inherits it onto every scenario beneath, exactly as cucumber
  // does — so a grammar that does not recognise a file's own code convicts every coded
  // scenario in the corpus while still exiting 1 for the tag this arm is about.
  assert.doesNotMatch(
    output,
    /@TGT\b/,
    `expected the file's own header code to be grammar rather than a finding — a rule that ` +
      `reds it reds every scenario in every coded feature file; got:\n${output}`
  );
});

/**
 * @SCN-STG-005 — the words that NAME A CHECK, on the same shipped binary as the five above.
 *
 * ITS `When` IS @SCN-STG-010'S, for that arm's reason: one step runs the command a `Given`
 * chose the target for, so the arms cannot come to disagree about what "the shipped corpus
 * check" means. What moved is the whole subject. These arms used to drive the private
 * `lint:scn-tags` check and ask whether a fitness scenario satisfied its tier FLOOR; the floor's
 * own scenario left at 3F-3308 and the other half of that sentence is what stays — those words
 * are GRAMMAR, and without them the shipped command reds every converted scenario in this
 * repository's own corpus.
 *
 * FROM INSIDE THE FIXTURE'S OWN TREE, which is load-bearing here rather than hygiene: the
 * check-tag union is resolved off the manifest at the command's cwd, so a run from `repoRoot`
 * would read THIS repository's registry while claiming to have read the fixture's.
 *
 * NO LONGER A PAIR (3F-3161). This arm used to isolate `specController.checkRegistry` by
 * running a byte-identical twin tree whose manifest didn't register the tag; that isolation is
 * gone because there is nothing left to isolate — a bare check tag reds unconditionally now,
 * registered or not. `scn-tags-fitness`'s own manifest still carries a `checkRegistry` block, so
 * the arm proves the stronger claim in one run: the command reds the tag even though the
 * target's (retired-style) config tried to declare it.
 *
 * TWO SHAPES, ONE TREE (3F-3126). `scn-tags-fitness` carries its bare check tag on a STEPLESS
 * scenario and on a STEPPED one, and both must red: steps say only how a row was written, never
 * whether the tag it carries means anything, so a rule that reds one shape and greens the other
 * is reading steps rather than tags.
 */
// @SCN-STG-005
Given("a target whose scenario carries a bare check tag", function () {
  corpusTarget = "tests/fixtures/scn-tags-fitness";
});

// @SCN-STG-005
Then("it fails, naming the tag that means nothing there", function () {
  assert.equal(
    exitCode,
    1,
    `expected the shipped corpus check to fail (exit 1) over a target whose scenarios carry ` +
      `@complexity and @typecheck, neither of which any grammar recognises now, but it exited ` +
      `${exitCode}. Output:\n${output}`
  );
  // BOTH SHAPES, WHICH IS THE WHOLE OF THE STEPS-SAY-NOTHING RULING. SCN-TGT-002 is stepless
  // and SCN-TGT-003 has steps; a rule that read shape would name one of them and green the
  // other while still exiting 1.
  assert.match(
    output,
    /SCN-TGT-002/,
    `expected the STEPLESS scenario carrying the bare check tag to be named; got:\n${output}`
  );
  assert.match(
    output,
    /SCN-TGT-003/,
    `expected the STEPPED scenario carrying the bare check tag to be named too — steps say only ` +
      `how a row was written (3F-3126); got:\n${output}`
  );
  assert.match(output, /@complexity\b/, `expected @complexity to be named; got:\n${output}`);
  assert.match(output, /@typecheck\b/, `expected @typecheck to be named; got:\n${output}`);
  // AND NOT THE TIERED CONTROL BESIDE THEM. SCN-TGT-001 carries @unit, which is the scheme's
  // own word and nothing to do with a check tag — so a command redding it has stopped
  // recognising the grammar rather than read the manifest, and would exit 1 anyway.
  assert.doesNotMatch(
    output,
    /SCN-TGT-001/,
    `expected the tiered control scenario to be left alone; got:\n${output}`
  );
  // EXACTLY TWO FINDINGS, so the assertions above are statements about these two tags rather
  // than about a command that reds this tree for some other reason as well.
  assert.match(
    output,
    /2 finding\(s\)/,
    `expected exactly the two bare check tags to be found — a third finding means the command ` +
      `reds this tree for a reason this arm is not about; got:\n${output}`
  );
});

/**
 * @SCN-STG-005's CONVERTED route (3F-3138, 3F-3149). A converted check carries one word for the
 * whole axis and its CHARACTERISTIC is on a configured row, so `checkRegistry` names it nowhere
 * and never will — which is why the pair below turns on `specController.fitnessChecks` instead,
 * the one route left by which a target can make a check-tag scenario pass.
 */
// @SCN-STG-005
When(
  "it runs over a target whose converted scenarios carry the fitness axis tag, one named by a configured row and one named by none",
  function () {
    // BOTH scenarios in this tree must pass, and the second is the ruling: a converted scenario
    // no row names is admitted HERE, because the missing row is @SCN-LNT-020's to report by id
    // and the run reds on it regardless. A fixture carrying only the configured one would green
    // whichever way that call had gone.
    runTagsInTarget("tests/fixtures/scn-tags-converted");
  }
);

// @SCN-STG-005
When("it runs over that same target with no fitness rows configured at all", function () {
  // Byte-for-byte the corpus above; only the manifest differs, so the pair isolates the ROWS.
  // It passes, and that is the second ruling rather than an omission: which words name a CHECK
  // is the target's answer, which axis a scenario is ON is the model's. A grammar gating the
  // axis word on the manifest would red here while the obligation rule — which reads the word
  // with no such gate — was naming SCN-TGT-001 and SCN-TGT-002 as scenarios on that very axis.
  runTagsInTarget("tests/fixtures/scn-tags-converted-unconfigured");
});

/**
 * @SCN-STG-009 — the MEASURED half of the check-tag union, on the same shipped binary as the
 * six above.
 *
 * ITS `When` IS @SCN-STG-010'S, for that arm's reason: one step runs the command a `Given`
 * chose the target for, so the arms cannot come to disagree about what "the shipped corpus
 * check" means. What moved is the whole subject. These arms used to drive the private
 * `lint:scn-tags` check and ask whether a stepless measured row satisfied the tier FLOOR; the
 * floor's own scenario left at 3F-3308 and the grammar half is what stays.
 *
 * FROM INSIDE THE FIXTURE'S OWN TREE, which is sharper here than for any sibling: a measured
 * check has no runnable script handle, so the ONLY place its tag is named is that target's
 * `specController.thresholds`. A run from `repoRoot` would resolve THIS repository's ceilings
 * while claiming to have read the fixture's, and this repository's happen to name
 * `@ci-run-time` — so the arm would have greened on the wrong manifest.
 *
 * ONE MEASURED TAG, NOT TWO SOURCES (3F-3386, following 3F-3384). `scn-tags-measured` used to
 * carry a MEASURED tag on one scenario and a REGISTERED one on a second, staging the union as an
 * admit-both proof; `specController.checkRegistry` is no longer read by `checkTagsOf` at all, so
 * that second scenario proved nothing a registry route could still get wrong — it would simply be
 * unrecognised, redding for a reason this arm is not about. The fixture keeps only the measured
 * scenario; the pair below isolates the ONE remaining source, thresholds present against
 * thresholds absent.
 */
// @SCN-STG-009
Given("a target whose scenarios carry a measured check tag", function () {
  corpusTarget = "tests/fixtures/scn-tags-measured";
});

// @SCN-STG-009
When("it runs over that same target with no thresholds configured", function () {
  // Byte-for-byte the corpus above; only the manifest differs, so the pair isolates the
  // THRESHOLDS rather than the tag. Without it every Then in this scenario reads `it passes`
  // and a correct ruling is indistinguishable from a command that stopped looking at tags.
  runTagsInTarget("tests/fixtures/scn-tags-measured-unconfigured");
});

// @SCN-STG-009
Then("it fails, naming the measured tag that means nothing there", function () {
  assert.equal(
    exitCode,
    1,
    `expected the shipped corpus check to fail (exit 1) over a target whose scenario carries ` +
      `@ci-run-time with no threshold naming it, but it exited ${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /@ci-run-time\b/,
    `expected the MEASURED tag itself to be named — the fault is the word, and a message naming ` +
      `only the scenario leaves the author to work out which of its tags was refused; ` +
      `got:\n${output}`
  );
  assert.match(
    output,
    /SCN-TGT-001/,
    `expected the scenario carrying the unmeasured word to be named; got:\n${output}`
  );
  // EXACTLY ONE FINDING, so the assertions above are statements about this tag rather than
  // about a command that reds this tree for some other reason as well.
  assert.match(
    output,
    /1 finding\(s\)/,
    `expected exactly the one unmeasured check tag to be found — a second finding means the ` +
      `command reds this tree for a reason this arm is not about; got:\n${output}`
  );
});

/**
 * @SCN-STG-007 — the ONE-CHECK rule, on the same shipped binary as the seven above.
 *
 * ITS `When` IS @SCN-STG-010'S, for that arm's reason: one step runs the command a `Given` chose
 * the target for, so the arms cannot come to disagree about what "the shipped corpus check"
 * means. What moved is the whole subject. These arms used to drive the private `lint:scn-tags`
 * check, whose walk asked this question and the tier floor's in one pass; the floor's own
 * scenario left at 3F-3308 and this rule is what stays.
 *
 * FROM INSIDE THE FIXTURE'S OWN TREE, which is load-bearing rather than hygiene: the set this
 * rule counts is `checkTagsOf`'s, resolved off the manifest at the command's cwd. A run from
 * `repoRoot` would read THIS repository's thresholds instead of the fixture's own, so both of
 * the fixture's tags would name a different check (or none) and every arm below would read
 * something other than what it claims to.
 *
 * TWO MEASURED TAGS, NOT TWO REGISTERED ONES (3F-3385, following 3F-3384). `specController.
 * checkRegistry` is no longer read by `checkTagsOf` at all, so the collision this Rule refuses
 * can no longer be staged with two registered bare tags — it is measured, constructed rather
 * than assumed, over the kinds `checkTagsOf` still admits beside the axis word: two distinct
 * words this target's own `specController.thresholds` measures.
 *
 * FIVE PAIRS, AND NONE OF THEM IS SPARE. Red over two tags; green with one removed; green while
 * parked; red again when unparked; red over the same two tags with STEPS. The third and fourth
 * are one claim in two halves — the skip is a skip and not an erasure — and the fifth is
 * 3F-3126's ruling that the tag names the axis and the steps say nothing about it.
 */
// @SCN-STG-007
Given("a target whose stepless scenario carries two measured check tags", function () {
  corpusTarget = "tests/fixtures/scn-tags-two-checks";
});

// @SCN-STG-007
When("it runs over that same target with one of the two check tags removed", function () {
  // THE REMEDY, as its own tree — byte-for-byte the sibling above with one tag gone. The pair is
  // what makes the arm load-bearing: red then green over one tag's difference, rather than a
  // single assertion that could pass for any reason.
  runTagsInTarget("tests/fixtures/scn-tags-two-checks-split");
});

// @SCN-STG-007
When("it runs over that same target with both check tags kept and the scenario parked", function () {
  // Byte-for-byte `scn-tags-two-checks` plus a parking tag. Both checks are still on the one
  // stepless scenario — what changed is that the author has said "not yet", and the rule is out
  // of scope until they say otherwise (operator ruling, 3F-2655). The tree configures no deferral
  // tags of its own, so the green here is also the starter set the application layer supplies
  // reaching this rule rather than only the grammar arm above it.
  runTagsInTarget("tests/fixtures/scn-tags-two-checks-parked");
});

// @SCN-STG-007
When("it runs over that same target with the parking tag taken off again", function () {
  // THE UNPARK, and it is the arm that makes the skip a skip rather than an erasure: this is the
  // SAME tree the first pair reds, reached by removing the parking tag. A rule that could be
  // switched off permanently by one tag would not be worth having.
  runTagsInTarget("tests/fixtures/scn-tags-two-checks");
});

// @SCN-STG-007
When("it runs over a target whose STEPPED scenario carries two measured check tags", function () {
  // THE RULING (3F-3126): byte-for-byte `scn-tags-two-checks` with steps on the offending row.
  // Same thresholds, same two tags, same verdict — the fitness axis is named by the check TAG,
  // not by whether the author wrote a step.
  runTagsInTarget("tests/fixtures/scn-tags-two-checks-stepped");
});

// @SCN-STG-007
Then("it fails, naming the scenario and BOTH check tags", function () {
  assert.equal(
    exitCode,
    1,
    `expected the shipped corpus check to fail (exit 1) over a target whose scenario carries ` +
      `two measured check tags, but it exited ${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /SCN-TGT-002/,
    `expected the offending scenario to be NAMED; got:\n${output}`
  );
  // BOTH tags, because the author has to choose which scenario keeps which check, and a message
  // naming one of them has already chosen for them.
  assert.match(output, /@ci-run-time\b/, `expected @ci-run-time to be named; got:\n${output}`);
  assert.match(output, /@coverage\b/, `expected @coverage to be named; got:\n${output}`);
  // IN DOCUMENT ORDER, so the message reads like the line the author is looking at. Matched on
  // the two tags' positions rather than on whatever joins them, so the assertion is about the
  // ORDER and not about the punctuation.
  assert.match(
    output,
    /@ci-run-time\b[^\n]*@coverage\b/,
    `expected both tags named in the order the scenario writes them; got:\n${output}`
  );
  // THE REMEDY NAMES NO SHAPE (3F-3133). It read "one stepless scenario per check" while the
  // tier floor redded a stepped check-tagged row as tier-less; the floor read the tag too before
  // it left entirely, so both halves of the split are admissible however they are written, and an
  // instruction to strip the steps would be this rule prescribing the very shape 3F-3097 exists
  // to stop assuming.
  assert.match(
    output,
    /one scenario per check/,
    `expected the remedy to name one scenario per check; got:\n${output}`
  );
  assert.doesNotMatch(
    output,
    /stepless scenario per check/,
    `expected the remedy to prescribe no SHAPE — 3F-3133 took "stepless" out and it stays out; ` +
      `got:\n${output}`
  );
  // NOT THE BEHAVIOURAL SCENARIO BESIDE IT, which carries two TIER tags. Two tiers on one
  // scenario is legal and stays legal; a rule that counted tags rather than reading the target's
  // check set reds this one too, and would exit 1 here anyway.
  assert.doesNotMatch(
    output,
    /SCN-TGT-001/,
    `expected the scenario carrying two TIER tags to be left alone — two tiers is legal, and ` +
      `neither of them names a check; got:\n${output}`
  );
  // EXACTLY ONE FINDING, so the assertions above are statements about this scenario's two check
  // tags rather than about a command that reds this tree for some other reason as well. The
  // shipped command has no tier floor, so this rule is the whole of what these trees can red on.
  assert.match(
    output,
    /1 finding\(s\)/,
    `expected exactly the one two-check scenario to be found — a second finding means the ` +
      `command reds this tree for a reason this arm is not about; got:\n${output}`
  );
});
