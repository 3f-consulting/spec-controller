/**
 * The @e2e arms of features/allocate.feature. Each scenario builds a real repository in a temp
 * directory, with real git commits, and spawns the BUILT binary inside it, because what an author
 * gets is the installed command run in their own checkout.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

/** Git run over a fixture, blind to the machine's own configuration so the fixture is the same everywhere. */
function git(repo: string, args: readonly string[]): string {
  const result = spawnSync(
    "git",
    ["-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", ...args],
    { cwd: repo, encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } },
  );
  assert.equal(result.status, 0, `git ${args.join(" ")} failed in the fixture: ${result.stderr}`);
  return result.stdout;
}

/** A fresh, empty repository in a temp directory. */
function newRepository(): string {
  const repo = mkdtempSync(join(tmpdir(), "allocate-"));
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
}

/** Write a file into the fixture, making its directories. */
function writeInto(repo: string, path: string, text: string): void {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
}

/** A feature file headed `part`, one scenario per code. */
function featureFile(part: string, codes: readonly string[]): string {
  const scenarios = codes.map((code, i) => `  @${code} @unit\n  Scenario: scenario ${i + 1}\n    Given a step\n`);
  return `@${part}\nFeature: part ${part}\n\n${scenarios.join("\n")}`;
}

/** Commit everything in the fixture. */
function commitAll(repo: string, message: string): void {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", message]);
}

/** Run `spec-controller allocate …` inside the fixture. */
function allocate(cwd: string, args: readonly string[]): SpawnSyncReturns<string> {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "allocate", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.error, undefined, `the binary failed to spawn: ${result.error?.message}`);
  return result;
}

let repository = "";
let answer: SpawnSyncReturns<string>;

Given("a repository whose feature file headed {word} carries the scenario code {word}", function (part: string, code: string) {
  repository = newRepository();
  writeInto(repository, `features/${part.toLowerCase()}.feature`, featureFile(part, [code]));
  commitAll(repository, "the corpus");
});

When("the author asks for the next code for {word}", function (part: string) {
  answer = allocate(repository, [part]);
});

Then("the answer is {word}, and nothing else", function (code: string) {
  assert.equal(answer.status, 0, `allocate did not answer: exit ${answer.status}\n${answer.stderr}`);
  assert.equal(answer.stdout, `${code}\n`);
});

Given("the repository's CI workflow has a step whose id is {word}", function (code: string) {
  const workflow = `name: CI\non: push\njobs:\n  ci:\n    runs-on: ubuntu-latest\n    steps:\n      - name: A check\n        id: ${code}\n        run: true\n`;
  writeInto(repository, ".github/workflows/ci.yml", workflow);
  commitAll(repository, "the workflow");
});

Given("the repository has a test whose title cites {word}", function (code: string) {
  const test = `import { it } from "vitest";\n\nit("[${code}] does the thing", () => {});\n`;
  writeInto(repository, "src/thing.test.ts", test);
  commitAll(repository, "the test");
});

Given(
  "a repository whose feature file headed {word} carries the scenario codes {word} and {word}",
  function (part: string, first: string, second: string) {
    repository = newRepository();
    writeInto(repository, `features/${part.toLowerCase()}.feature`, featureFile(part, [first, second]));
    commitAll(repository, "the corpus");
  },
);

Given("a later commit deletes the scenario coded {word}", function (code: string) {
  const path = join(repository, "features", "one.feature");
  const kept = readFileSync(path, "utf8").split("\n\n").filter((block) => !block.includes(`@${code} `));
  writeFileSync(path, kept.join("\n\n"));
  commitAll(repository, "retire a scenario");
  assert.ok(!readFileSync(path, "utf8").includes(code), `the fixture still carries ${code}`);
});

Given(
  "a later commit, whose message mentions {word}, retags the scenario coded {word}",
  function (mentioned: string, code: string) {
    const path = join(repository, "features", "one.feature");
    writeFileSync(path, readFileSync(path, "utf8").replace(`@${code} @unit`, `@${code} @unit @smoke`));
    git(repository, ["commit", "-q", "-a", "-m", `Retag the scenario\n\nSee ${mentioned} for why.`]);
    assert.equal(git(repository, ["log", "-1", "--format=%B"]).includes(mentioned), true);
  },
);

/** A repository headed ONE carrying the part's first code and `code`, the second scenario standing at line 8. */
function repositoryCarrying(code: string): void {
  repository = newRepository();
  writeInto(repository, "features/one.feature", featureFile("ONE", ["SCN-ONE-001", code]));
  commitAll(repository, "the corpus");
}

Given("a repository whose highest ONE code, {word}, is still carried by its feature file", function (code: string) {
  repositoryCarrying(code);
});

Given("a repository whose highest ONE code, {word}, is deleted by a later commit", function (code: string) {
  repositoryCarrying(code);
  const path = join(repository, "features", "one.feature");
  writeFileSync(path, readFileSync(path, "utf8").split("\n\n").filter((block) => !block.includes(`@${code} `)).join("\n\n"));
  commitAll(repository, "retire a scenario");
});

Then("beside the answer it names where {word} was seen: the file and line that carry it", function (code: string) {
  assert.equal(answer.status, 0, answer.stderr);
  assert.match(answer.stderr, new RegExp(`^highest seen: ${code}, features/one\\.feature:8$`, "m"));
});

Then(
  "beside the answer it names where {word} was seen: the file and line that carried it, and the commit that did so",
  function (code: string) {
    const deleting = git(repository, ["log", "-1", "--format=%h"]).trim();
    assert.equal(answer.status, 0, answer.stderr);
    assert.match(answer.stderr, new RegExp(`^highest seen: ${code}, features/one\\.feature:8 in ${deleting}$`, "m"));
  },
);

/** The copy of the repository the author asks in, when it is not the repository itself. */
let copy = "";

Given(
  "a repository whose feature file headed ONE carries {word}, and whose history once carried {word}",
  function (live: string, retired: string) {
    repository = newRepository();
    writeInto(repository, "features/one.feature", featureFile("ONE", [live, retired]));
    commitAll(repository, "the corpus");
    const path = join(repository, "features", "one.feature");
    writeFileSync(path, readFileSync(path, "utf8").split("\n\n").filter((block) => !block.includes(`@${retired} `)).join("\n\n"));
    commitAll(repository, "retire a scenario");
  },
);

Given(
  "the author's copy of it is a copy without git, whose packages and hidden directories mention {word}",
  function (code: string) {
    copy = mkdtempSync(join(tmpdir(), "allocate-copy-"));
    cpSync(repository, copy, { recursive: true, filter: (source) => basename(source) !== ".git" });
    writeInto(copy, "node_modules/some-package/README.md", `Cites ${code}.\n`);
    writeInto(copy, ".hidden/notes.md", `Cites ${code}.\n`);
    const probe = spawnSync("git", ["rev-parse", "--git-dir"], { cwd: copy, encoding: "utf8" });
    assert.notEqual(probe.status, 0, `the copy is inside a git repository: ${probe.stdout}`);
  },
);

Given("the author's copy of it is a clone one commit deep", function () {
  copy = join(mkdtempSync(join(tmpdir(), "allocate-clone-")), "clone");
  git(repository, ["clone", "-q", "--depth", "1", `file://${repository}`, copy]);
  assert.equal(git(copy, ["rev-parse", "--is-shallow-repository"]).trim(), "true");
  assert.equal(git(copy, ["rev-list", "--count", "HEAD"]).trim(), "1");
});

When("the author asks for the next code for {word} in that copy", function (part: string) {
  answer = allocate(copy, [part]);
});

Then("beside the answer it states that no history was read, because the copy is not a git repository", function () {
  assert.match(answer.stderr, /^history: not a git repository — none read;/m);
});

Then("beside the answer it states that history before the clone's first commit was not read", function () {
  const edge = git(copy, ["rev-parse", "--short", "HEAD"]).trim();
  assert.match(answer.stderr, new RegExp(`^history: shallow clone — history before ${edge} unread;`, "m"));
});

Given("the author has since tagged a new scenario {word} in that file, not yet committed", function (code: string) {
  const path = join(repository, "features", "one.feature");
  writeFileSync(path, `${readFileSync(path, "utf8")}\n  @${code} @unit\n  Scenario: a new scenario\n    Given a step\n`);
  assert.notEqual(git(repository, ["status", "--porcelain"]).trim(), "", "the edit should be uncommitted");
});

When("the author asks for the next code for {word} from a subdirectory holding no code", function (part: string) {
  const subdirectory = join(repository, "src", "deep");
  mkdirSync(subdirectory, { recursive: true });
  answer = allocate(subdirectory, [part]);
});

Given("the author has written {word} into a new file not yet added to git", function (code: string) {
  writeInto(repository, "features/two.feature", featureFile("TWO", [code]));
  assert.match(git(repository, ["status", "--porcelain"]), /^\?\? features\/two\.feature$/m);
});

Given("a file the repository ignores mentions {word}", function (code: string) {
  writeInto(repository, ".gitignore", "build/\n");
  writeInto(repository, "build/report.txt", `Cites ${code}.\n`);
  git(repository, ["add", ".gitignore"]);
  git(repository, ["commit", "-q", "-m", "ignore the build"]);
  assert.equal(git(repository, ["check-ignore", "build/report.txt"]).trim(), "build/report.txt");
  assert.doesNotMatch(git(repository, ["ls-files"]), /features\/two\.feature/, "the new file must stay untracked");
});

/** The ways a part can be carried somewhere without any feature file's header carrying it. */
const UNHEADED_PART: Record<string, () => void> = {
  "no file mentions ZZZ": () => undefined,
  "a test fixture's feature file is headed ZZZ and carries SCN-ZZZ-004": () => {
    writeInto(repository, "tests/fixtures/sample/features/zzz.feature", featureFile("ZZZ", ["SCN-ZZZ-004"]));
    commitAll(repository, "a test fixture");
  },
  "a feature file headed ZZZ was deleted by a later commit": () => {
    writeInto(repository, "features/zzz.feature", featureFile("ZZZ", ["SCN-ZZZ-009"]));
    commitAll(repository, "a feature that did not last");
    git(repository, ["rm", "-q", "features/zzz.feature"]);
    git(repository, ["commit", "-q", "-m", "retire the feature"]);
  },
};

Given("a repository whose feature files are headed ONE and TWO, where {}", function (where: string) {
  const arrange = UNHEADED_PART[where];
  assert.ok(arrange !== undefined, `no fixture for: ${where}`);
  repository = newRepository();
  writeInto(repository, "features/one.feature", featureFile("ONE", ["SCN-ONE-001"]));
  writeInto(repository, "features/two.feature", featureFile("TWO", ["SCN-TWO-001"]));
  commitAll(repository, "the corpus");
  arrange();
});

Then("it is refused as an unknown part, and no code is given", function () {
  assert.equal(answer.status, 2, `expected the usage status, got ${answer.status}\n${answer.stderr}`);
  assert.equal(answer.stdout, "");
  assert.match(answer.stderr, /unknown part/);
});

Then("the refusal lists ONE and TWO as the parts the corpus carries, and no other part", function () {
  assert.match(answer.stderr, /^The parts this corpus's feature files carry: ONE, TWO\.$/m);
});

When("the author asks for the next code for {word}, as a new part", function (part: string) {
  answer = allocate(repository, [part, "--new"]);
});

Then("beside the answer it says nothing of the part being carried already", function () {
  assert.equal(answer.status, 0, answer.stderr);
  assert.doesNotMatch(answer.stderr, /already carries/);
});

Then("beside the answer it notes that a feature file's header already carries {word}", function (part: string) {
  assert.match(answer.stderr, new RegExp(`^note: a feature file's header already carries ${part}, so --new was not needed$`, "m"));
});

/** The arguments each malformed request gives `allocate`. */
const MALFORMED_REQUEST: Record<string, readonly string[]> = {
  "no part": [],
  "the part fit, in lower case": ["fit"],
  "the part F, one character long": ["F"],
  "the part TOOLONG, seven characters long": ["TOOLONG"],
  "two parts, ONE and TWO": ["ONE", "TWO"],
  "the part ONE and a flag it does not take": ["ONE", "--bogus"],
};

When("the author asks for the next code giving {}", function (request: string) {
  const args = MALFORMED_REQUEST[request];
  assert.ok(args !== undefined, `no arguments for: ${request}`);
  answer = allocate(repository, args);
});

Then("it is refused as a usage error, never as an unknown part, and no code is given", function () {
  assert.equal(answer.status, 2, `expected the usage status, got ${answer.status}\n${answer.stderr}`);
  assert.equal(answer.stdout, "");
  assert.match(answer.stderr, /^spec-controller allocate: usage error — /m);
  assert.doesNotMatch(answer.stderr, /unknown part/);
});

/** The arguments each help request gives `allocate`. */
const HELP_REQUEST: Record<string, readonly string[]> = {
  alone: ["--help"],
  "by its short name, alone": ["-h"],
  "after a part": ["ONE", "--help"],
  "after a part not in canon's form": ["fit", "--help"],
  "beside a flag the command does not take": ["--bogus", "--help"],
};

When("the author asks allocate for its help {}", function (request: string) {
  const args = HELP_REQUEST[request];
  assert.ok(args !== undefined, `no arguments for: ${request}`);
  answer = allocate(repository, args);
});

Then("it answers with allocate's help, naming the feature part it takes and --new, and gives no code", function () {
  assert.equal(answer.status, 0, `expected success, got ${answer.status}\n${answer.stderr}`);
  assert.match(answer.stdout, /^spec-controller allocate — /);
  assert.match(answer.stdout, /<FFF>/);
  assert.match(answer.stdout, /--new/);
  assert.doesNotMatch(answer.stdout, /^SCN-/m);
});

/** Where a stored run would land, were one ever stored. */
let storeRoot = "";

/** The host modifiers each row gives before `allocate`, and their values. */
function modifierArgs(modifiers: string): string[] {
  storeRoot = join(mkdtempSync(join(tmpdir(), "allocate-store-")), "store");
  const values: Record<string, string> = { "--store": storeRoot, "--run-id": "r1" };
  return modifiers.split(" and ").flatMap((modifier) => [modifier, values[modifier] ?? ""]);
}

When("the author asks for the next code for {word} with {} before the command", function (part: string, modifiers: string) {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...modifierArgs(modifiers), "allocate", part], {
    cwd: repository,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `the binary failed to spawn: ${result.error?.message}`);
  answer = result;
});

Then("it is refused as a usage error naming {}, and no code is given", function (modifiers: string) {
  assert.equal(answer.status, 2, `expected the usage status, got ${answer.status}\n${answer.stderr}`);
  assert.equal(answer.stdout, "");
  for (const modifier of modifiers.split(" and ")) assert.ok(answer.stderr.includes(modifier), answer.stderr);
});

Then("nothing is stored, in the store root or the repository", function () {
  assert.equal(existsSync(storeRoot), false, `the store root was made: ${storeRoot}`);
  assert.equal(git(repository, ["status", "--porcelain"]).trim(), "");
});

/** The arguments each help request gives `allocate` after the host modifiers. */
const HELP_AFTER_MODIFIERS: Record<string, readonly string[]> = {
  alone: ["--help"],
  "by its short name, alone": ["-h"],
  "after a part": ["ONE", "--help"],
  "by its short name, beside a flag the command does not take": ["--bogus", "-h"],
};

/** What `allocate` answers to the same request with nothing before it. */
let answerAlone: SpawnSyncReturns<string>;

When("the author gives {} before allocate and asks it for its help {}", function (modifiers: string, request: string) {
  const args = HELP_AFTER_MODIFIERS[request];
  assert.ok(args !== undefined, `no arguments for: ${request}`);
  answerAlone = allocate(repository, args);
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...modifierArgs(modifiers), "allocate", ...args], {
    cwd: repository,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `the binary failed to spawn: ${result.error?.message}`);
  answer = result;
});

Then("it answers with allocate's help, exactly as it does with nothing before it, and gives no code", function () {
  assert.equal(answerAlone.status, 0, `allocate alone did not answer its help\n${answerAlone.stderr}`);
  assert.match(answerAlone.stdout, /^spec-controller allocate — /);
  assert.equal(answer.status, 0, `expected success, got ${answer.status}\n${answer.stderr}`);
  assert.equal(answer.stderr, "");
  assert.equal(answer.stdout, answerAlone.stdout);
  assert.doesNotMatch(answer.stdout, /^SCN-/m);
});
