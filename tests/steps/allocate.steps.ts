import { After, Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

function git(repo: string, args: readonly string[]): string {
  const result = spawnSync(
    "git",
    ["-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", ...args],
    { cwd: repo, encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } },
  );
  assert.equal(result.status, 0, `git ${args.join(" ")} failed in the fixture: ${result.stderr}`);
  return result.stdout;
}

const temporaryDirectories: string[] = [];

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function newRepository(): string {
  const repo = temporaryDirectory("allocate-");
  git(repo, ["init", "-q", "-b", "main"]);
  return repo;
}

function writeInto(repo: string, path: string, text: string): void {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
}

function featureFile(part: string, codes: readonly string[]): string {
  const scenarios = codes.map((code, i) => `  @${code} @unit\n  Scenario: scenario ${i + 1}\n    Given a step\n`);
  return `@${part}\nFeature: part ${part}\n\n${scenarios.join("\n")}`;
}

function commitAll(repo: string, message: string): void {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", message]);
}

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

Given(
  "a repository whose only feature file headed {word} lies two subdirectories down in its features directory and carries the scenario code {word}",
  function (part: string, code: string) {
    repository = newRepository();
    writeInto(repository, `features/outer/inner/${part.toLowerCase()}.feature`, featureFile(part, [code]));
    commitAll(repository, "the corpus");
  },
);

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
    copy = temporaryDirectory("allocate-copy-");
    cpSync(repository, copy, { recursive: true, filter: (source) => basename(source) !== ".git" });
    writeInto(copy, "node_modules/some-package/README.md", `Cites ${code}.\n`);
    writeInto(copy, ".hidden/notes.md", `Cites ${code}.\n`);
    const probe = spawnSync("git", ["rev-parse", "--git-dir"], { cwd: copy, encoding: "utf8" });
    assert.notEqual(probe.status, 0, `the copy is inside a git repository: ${probe.stdout}`);
  },
);

Given("the author's copy of it is a clone one commit deep", function () {
  copy = join(temporaryDirectory("allocate-clone-"), "clone");
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

const HELP_REQUEST: Record<string, readonly string[]> = {
  alone: ["--help"],
  "by its short name, alone": ["-h"],
  "after a part": ["ONE", "--help"],
  "after a part not in the scenario-code form": ["fit", "--help"],
  "beside a flag the command does not take": ["--bogus", "--help"],
};

When("the author asks allocate for its help {}", function (request: string) {
  const args = HELP_REQUEST[request];
  assert.ok(args !== undefined, `no arguments for: ${request}`);
  answer = allocate(repository, args);
});

Then("it answers with allocate's help, naming the feature part it takes and the new-part option, and gives no code", function () {
  assert.equal(answer.status, 0, `expected success, got ${answer.status}\n${answer.stderr}`);
  assert.match(answer.stdout, /^spec-controller allocate — /);
  assert.match(answer.stdout, /<FFF>/);
  assert.match(answer.stdout, /--new/);
  assert.doesNotMatch(answer.stdout, /^SCN-/m);
});

let storeRoot = "";

const MODIFIER_FLAG: Record<string, string> = { "the store modifier": "--store", "the run-name modifier": "--run-id" };

function modifierFlags(modifiers: string): string[] {
  return modifiers.split(" and ").map((modifier) => {
    const flag = MODIFIER_FLAG[modifier];
    assert.ok(flag !== undefined, `no flag for: ${modifier}`);
    return flag;
  });
}

function modifierArgs(modifiers: string): string[] {
  storeRoot = join(temporaryDirectory("allocate-store-"), "store");
  const values: Record<string, string> = { "--store": storeRoot, "--run-id": "r1" };
  return modifierFlags(modifiers).flatMap((modifier) => [modifier, values[modifier] ?? ""]);
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
  for (const modifier of modifierFlags(modifiers)) assert.ok(answer.stderr.includes(modifier), answer.stderr);
});

Then("nothing is stored, in the run store or the repository", function () {
  assert.equal(existsSync(storeRoot), false, `the store root was made: ${storeRoot}`);
  assert.equal(git(repository, ["status", "--porcelain"]).trim(), "");
});

const HELP_AFTER_MODIFIERS: Record<string, readonly string[]> = {
  alone: ["--help"],
  "by its short name, alone": ["-h"],
  "after a part": ["ONE", "--help"],
  "by its short name, beside a flag the command does not take": ["--bogus", "-h"],
};

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

const WRONG_KIND: Record<string, (path: string) => void> = {
  "a regular file": (path) => {
    rmSync(path, { recursive: true, force: true });
    writeFileSync(path, "not a directory\n");
  },
  "a directory": (path) => mkdirSync(path, { recursive: true }),
  "a link to a file that is not there": (path) => symlinkSync(join(dirname(path), "nowhere.feature"), path),
};

Given("in that repository {word} is {}", function (path: string, kind: string) {
  const make = WRONG_KIND[kind];
  assert.ok(make !== undefined, `no fixture for: ${kind}`);
  make(join(repository, path));
});

function refusalOf(result: SpawnSyncReturns<string>): string {
  const line = /^spec-controller allocate: usage error — .+ could not be read.*$/m.exec(result.stderr);
  assert.ok(line !== null, `expected a refusal naming what could not be read; got:\n${result.stderr}`);
  return line[0];
}

Then("it is refused as a path allocate cannot read, and no code is given", function () {
  assert.equal(answer.status, 2, `expected the usage status, got ${answer.status}\n${answer.stderr}`);
  assert.equal(answer.stdout, "");
  assert.doesNotMatch(answer.stderr, /^\s+at /m, `a stack trace was printed:\n${answer.stderr}`);
  refusalOf(answer);
});

function namesPath(refusal: string, path: string): boolean {
  return refusal.includes(`/${path} (`);
}

Then("allocate's refusal names {word}", function (path: string) {
  const refusal = refusalOf(answer);
  assert.ok(namesPath(refusal, path), `expected the refusal to name ${path}; got:\n${refusal}`);
});

const permissionsTaken: Array<() => void> = [];

function withhold(path: string, mode: number): void {
  const before = statSync(path).mode & 0o7777;
  chmodSync(path, mode);
  permissionsTaken.push(() => chmodSync(path, before));
}

After(function () {
  while (permissionsTaken.length > 0) permissionsTaken.pop()?.();
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function copyWithoutGit(): string {
  const copy = temporaryDirectory("allocate-plain-");
  writeInto(copy, "features/one.feature", featureFile("ONE", ["SCN-ONE-003"]));
  writeInto(copy, "docs/notes.md", "Cites SCN-ONE-004.\n");
  const probe = spawnSync("git", ["rev-parse", "--git-dir"], { cwd: copy, encoding: "utf8" });
  assert.notEqual(probe.status, 0, `the copy is inside a git repository: ${probe.stdout}`);
  return copy;
}

function withholdingMode(path: string): number {
  return path === "working directory" ? 0o311 : 0o000;
}

Given(
  "a {} whose feature file headed ONE carries the scenario code {word}, and whose {} allocate is not permitted to read",
  function (copy: string, code: string, path: string) {
    if (copy === "repository") {
      repository = newRepository();
      writeInto(repository, "features/one.feature", featureFile("ONE", [code]));
      writeInto(repository, "features/nested/two.feature", featureFile("TWO", ["SCN-TWO-001"]));
      commitAll(repository, "the corpus");
    } else {
      assert.equal(copy, "copy without git", `no fixture for: ${copy}`);
      repository = copyWithoutGit();
    }
    withhold(path === "working directory" ? repository : join(repository, path), withholdingMode(path));
  },
);

Then("allocate's refusal names {} and says allocate was not permitted to read it", function (path: string) {
  const refusal = refusalOf(answer);
  const named = path === "working directory" || path === "the repository's top" ? basename(repository) : path;
  assert.ok(namesPath(refusal, named), `expected the refusal to name ${named}; got:\n${refusal}`);
  assert.match(refusal, /EACCES|EPERM/, `expected the operating system's reason; got:\n${refusal}`);
});

When(
  "the author asks for the next code for {word} from a working directory that has since been removed",
  function (part: string) {
    const removed = join(repository, "removed");
    mkdirSync(removed);
    const script = 'cd "$1" && rmdir "$1" && shift && exec "$@"';
    const result = spawnSync("/bin/sh", ["-c", script, "sh", removed, NODE, ...SPEC_CONTROLLER_ARGV, "allocate", part], {
      encoding: "utf8",
    });
    assert.equal(result.error, undefined, `the binary failed to spawn: ${result.error?.message}`);
    assert.equal(existsSync(removed), false, "the working directory should have been removed before the binary ran");
    answer = result;
  },
);

Then("allocate's refusal says the working directory could not be read", function () {
  assert.match(refusalOf(answer), /the working directory could not be read/);
});

const CARRIER: Record<string, { path: string; write: (code: string) => void }> = {
  "an untracked file, drafts/new.md": {
    path: "drafts/new.md",
    write: (code) => writeInto(repository, "drafts/new.md", `Cites ${code}.\n`),
  },
  "a tracked file with an edit not yet committed, docs/notes.md": {
    path: "docs/notes.md",
    write: (code) => {
      writeInto(repository, "docs/notes.md", "Cites SCN-ONE-003.\n");
      commitAll(repository, "the notes");
      writeInto(repository, "docs/notes.md", `Cites ${code}.\n`);
    },
  },
  "the feature file, with an edit not yet committed": {
    path: "features/one.feature",
    write: (code) => {
      const path = join(repository, "features", "one.feature");
      writeFileSync(path, `${readFileSync(path, "utf8")}\n  @${code} @unit\n  Scenario: a new scenario\n    Given a step\n`);
    },
  },
};

const WITHHELD: Record<string, (file: string) => void> = {
  "allocate is not permitted to read it": (file) => withhold(join(repository, file), 0o000),
  "allocate is not permitted to list its directory": (file) => withhold(dirname(join(repository, file)), 0o000),
  "allocate may list its directory but not enter it": (file) => withhold(dirname(join(repository, file)), 0o600),
  "allocate is not permitted to list the repository's top": () => withhold(repository, 0o100),
};

Given("in it, {} carries {word}, and {}", function (file: string, code: string, unreadable: string) {
  const carrier = CARRIER[file];
  const withholdFrom = WITHHELD[unreadable];
  assert.ok(carrier !== undefined && withholdFrom !== undefined, `no fixture for: ${file} / ${unreadable}`);
  carrier.write(code);
  mkdirSync(join(repository, "src"), { recursive: true });
  withholdFrom(carrier.path);
});

When("the author asks for the next code for {word}, standing in {}", function (part: string, where: string) {
  assert.ok(where === "its top" || where === "a subdirectory", `no directory for: ${where}`);
  answer = allocate(where === "its top" ? repository : join(repository, "src"), [part]);
});

Given("its loose objects are not permitted to be read", function () {
  const objects = join(repository, ".git", "objects");
  const loose = readdirSync(objects).filter((name) => /^[0-9a-f]{2}$/.test(name));
  assert.ok(loose.length > 0, "the fixture should hold loose objects");
  for (const name of loose) withhold(join(objects, name), 0o000);
});

Given("its objects are packed, and the pack is not permitted to be read", function () {
  git(repository, ["gc", "-q"]);
  const pack = join(repository, ".git", "objects", "pack");
  const files = readdirSync(pack);
  assert.ok(files.some((name) => name.endsWith(".pack")), "gc should have written a pack");
  for (const name of files) withhold(join(pack, name), 0o000);
});

Given("its branch refs are not permitted to be read", function () {
  withhold(join(repository, ".git", "refs", "heads"), 0o000);
});

Given("it is cloned one commit deep, and the clone's shallow record is not permitted to be read", function () {
  const clone = join(temporaryDirectory("allocate-clone-"), "clone");
  git(repository, ["clone", "-q", "--depth", "1", `file://${repository}`, clone]);
  assert.equal(git(clone, ["rev-parse", "--is-shallow-repository"]).trim(), "true");
  repository = clone;
  withhold(join(repository, ".git", "shallow"), 0o000);
});

Then("allocate's refusal says the repository's history could not be read", function () {
  assert.match(refusalOf(answer), /the repository's history could not be read/);
});

Given("its .git directory is not permitted to be read", function () {
  withhold(join(repository, ".git"), 0o000);
});

Given("its object store is not permitted to be read", function () {
  withhold(join(repository, ".git", "objects"), 0o000);
});

Given("its HEAD is not permitted to be read", function () {
  withhold(join(repository, ".git", "HEAD"), 0o000);
});

Given("its .git is a file pointing to a directory that is not there", function () {
  rmSync(join(repository, ".git"), { recursive: true });
  writeFileSync(join(repository, ".git"), `gitdir: ${join(repository, "nowhere")}\n`);
});

Then("allocate's refusal names the repository's .git and says git could not open it", function () {
  const refusal = refusalOf(answer);
  assert.ok(namesPath(refusal, `${basename(repository)}/.git`), `expected the refusal to name the repository's .git; got:\n${refusal}`);
  assert.match(refusal, /the repository could not be read: .* \(git rev-parse exited \d+: /, `expected git's reason; got:\n${refusal}`);
});
