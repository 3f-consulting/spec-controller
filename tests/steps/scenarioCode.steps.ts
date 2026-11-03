import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, shownAmong, shownEntry, showsEntry } from "./support/catalogue.js";
import { allocate, git } from "./support/codeAllocation.js";
import { exitOn } from "./support/runExit.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { GrammarRow, GrammarRun, InheritedCodeRun, SpecControllerWorld } from "./support/world.js";

function newRepository(world: SpecControllerWorld): string {
  const repo = temporaryDirectory(world, "allocate-");
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

Given("a repository whose feature file headed {word} carries the scenario code {word}", function (this: SpecControllerWorld, part: string, code: string) {
  this.repository = newRepository(this);
  writeInto(this.repository, `features/${part.toLowerCase()}.feature`, featureFile(part, [code]));
  commitAll(this.repository, "the corpus");
});

Given(
  "a repository whose only feature file headed {word} lies two subdirectories down in its features directory and carries the scenario code {word}",
  function (this: SpecControllerWorld, part: string, code: string) {
    this.repository = newRepository(this);
    writeInto(this.repository, `features/outer/inner/${part.toLowerCase()}.feature`, featureFile(part, [code]));
    commitAll(this.repository, "the corpus");
  },
);

When("the author asks for the next code for {word}", function (this: SpecControllerWorld, part: string) {
  this.answer = allocate(this.repository, [part]);
});

Then("the answer is {word}, and nothing else", function (this: SpecControllerWorld, code: string) {
  assert.equal(this.answer.status, 0, `allocate did not answer: exit ${this.answer.status}\n${this.answer.stderr}`);
  assert.equal(this.answer.stdout, `${code}\n`);
});

Given("the repository's CI workflow has a step whose id is {word}", function (this: SpecControllerWorld, code: string) {
  const workflow = `name: CI\non: push\njobs:\n  ci:\n    runs-on: ubuntu-latest\n    steps:\n      - name: A check\n        id: ${code}\n        run: true\n`;
  writeInto(this.repository, ".github/workflows/ci.yml", workflow);
  commitAll(this.repository, "the workflow");
});

Given("the repository has a test whose title cites {word}", function (this: SpecControllerWorld, code: string) {
  const test = `import { it } from "vitest";\n\nit("[${code}] does the thing", () => {});\n`;
  writeInto(this.repository, "src/thing.test.ts", test);
  commitAll(this.repository, "the test");
});

Given(
  "a repository whose feature file headed {word} carries the scenario codes {word} and {word}",
  function (this: SpecControllerWorld, part: string, first: string, second: string) {
    this.repository = newRepository(this);
    writeInto(this.repository, `features/${part.toLowerCase()}.feature`, featureFile(part, [first, second]));
    commitAll(this.repository, "the corpus");
  },
);

Given("a later commit deletes the scenario coded {word}", function (this: SpecControllerWorld, code: string) {
  const path = join(this.repository, "features", "one.feature");
  const kept = readFileSync(path, "utf8").split("\n\n").filter((block) => !block.includes(`@${code} `));
  writeFileSync(path, kept.join("\n\n"));
  commitAll(this.repository, "retire a scenario");
  assert.ok(!readFileSync(path, "utf8").includes(code), `the fixture still carries ${code}`);
});

Given(
  "a later commit, whose message mentions {word}, retags the scenario coded {word}",
  function (this: SpecControllerWorld, mentioned: string, code: string) {
    const path = join(this.repository, "features", "one.feature");
    writeFileSync(path, readFileSync(path, "utf8").replace(`@${code} @unit`, `@${code} @unit @smoke`));
    git(this.repository, ["commit", "-q", "-a", "-m", `Retag the scenario\n\nSee ${mentioned} for why.`]);
    assert.equal(git(this.repository, ["log", "-1", "--format=%B"]).includes(mentioned), true);
  },
);

function repositoryCarrying(world: SpecControllerWorld, code: string): void {
  world.repository = newRepository(world);
  writeInto(world.repository, "features/one.feature", featureFile("ONE", ["SCN-ONE-001", code]));
  commitAll(world.repository, "the corpus");
}

Given("a repository whose highest ONE code, {word}, is still carried by its feature file", function (this: SpecControllerWorld, code: string) {
  repositoryCarrying(this, code);
});

Given("a repository whose highest ONE code, {word}, is deleted by a later commit", function (this: SpecControllerWorld, code: string) {
  repositoryCarrying(this, code);
  const path = join(this.repository, "features", "one.feature");
  writeFileSync(path, readFileSync(path, "utf8").split("\n\n").filter((block) => !block.includes(`@${code} `)).join("\n\n"));
  commitAll(this.repository, "retire a scenario");
});

Then("beside the answer it names where {word} was seen: the file and line that carry it", function (this: SpecControllerWorld, code: string) {
  assert.equal(this.answer.status, 0, this.answer.stderr);
  assert.match(this.answer.stderr, new RegExp(`^highest seen: ${code}, features/one\\.feature:8$`, "m"));
});

Then(
  "beside the answer it names where {word} was seen: the file and line that carried it, and the commit that did so",
  function (this: SpecControllerWorld, code: string) {
    const deleting = git(this.repository, ["log", "-1", "--format=%h"]).trim();
    assert.equal(this.answer.status, 0, this.answer.stderr);
    assert.match(this.answer.stderr, new RegExp(`^highest seen: ${code}, features/one\\.feature:8 in ${deleting}$`, "m"));
  },
);

Given(
  "a repository whose feature file headed ONE carries {word}, and whose history once carried {word}",
  function (this: SpecControllerWorld, live: string, retired: string) {
    this.repository = newRepository(this);
    writeInto(this.repository, "features/one.feature", featureFile("ONE", [live, retired]));
    commitAll(this.repository, "the corpus");
    const path = join(this.repository, "features", "one.feature");
    writeFileSync(path, readFileSync(path, "utf8").split("\n\n").filter((block) => !block.includes(`@${retired} `)).join("\n\n"));
    commitAll(this.repository, "retire a scenario");
  },
);

Given(
  "the author's copy of it is a copy without git, whose packages and hidden directories mention {word}",
  function (this: SpecControllerWorld, code: string) {
    this.copy = temporaryDirectory(this, "allocate-copy-");
    cpSync(this.repository, this.copy, { recursive: true, filter: (source) => basename(source) !== ".git" });
    writeInto(this.copy, "node_modules/some-package/README.md", `Cites ${code}.\n`);
    writeInto(this.copy, ".hidden/notes.md", `Cites ${code}.\n`);
    const probe = spawnSync("git", ["rev-parse", "--git-dir"], { cwd: this.copy, encoding: "utf8" });
    assert.notEqual(probe.status, 0, `the copy is inside a git repository: ${probe.stdout}`);
  },
);

Given("the author's copy of it is a clone one commit deep", function (this: SpecControllerWorld) {
  this.copy = join(temporaryDirectory(this, "allocate-clone-"), "clone");
  git(this.repository, ["clone", "-q", "--depth", "1", `file://${this.repository}`, this.copy]);
  assert.equal(git(this.copy, ["rev-parse", "--is-shallow-repository"]).trim(), "true");
  assert.equal(git(this.copy, ["rev-list", "--count", "HEAD"]).trim(), "1");
});

When("the author asks for the next code for {word} in that copy", function (this: SpecControllerWorld, part: string) {
  this.answer = allocate(this.copy, [part]);
});

Then("beside the answer it states that no history was read, because the copy is not a git repository", function (this: SpecControllerWorld) {
  assert.match(this.answer.stderr, /^history: not a git repository — none read;/m);
});

Then("beside the answer it states that history before the clone's first commit was not read", function (this: SpecControllerWorld) {
  const edge = git(this.copy, ["rev-parse", "--short", "HEAD"]).trim();
  assert.match(this.answer.stderr, new RegExp(`^history: shallow clone — history before ${edge} unread;`, "m"));
});

Given("the author has since tagged a new scenario {word} in that file, not yet committed", function (this: SpecControllerWorld, code: string) {
  const path = join(this.repository, "features", "one.feature");
  writeFileSync(path, `${readFileSync(path, "utf8")}\n  @${code} @unit\n  Scenario: a new scenario\n    Given a step\n`);
  assert.notEqual(git(this.repository, ["status", "--porcelain"]).trim(), "", "the edit should be uncommitted");
});

When("the author asks for the next code for {word} from a subdirectory holding no code", function (this: SpecControllerWorld, part: string) {
  const subdirectory = join(this.repository, "src", "deep");
  mkdirSync(subdirectory, { recursive: true });
  this.answer = allocate(subdirectory, [part]);
});

Given("the author has written {word} into a new file not yet added to git", function (this: SpecControllerWorld, code: string) {
  writeInto(this.repository, "features/two.feature", featureFile("TWO", [code]));
  assert.match(git(this.repository, ["status", "--porcelain"]), /^\?\? features\/two\.feature$/m);
});

Given("a file the repository ignores mentions {word}", function (this: SpecControllerWorld, code: string) {
  writeInto(this.repository, ".gitignore", "build/\n");
  writeInto(this.repository, "build/report.txt", `Cites ${code}.\n`);
  git(this.repository, ["add", ".gitignore"]);
  git(this.repository, ["commit", "-q", "-m", "ignore the build"]);
  assert.equal(git(this.repository, ["check-ignore", "build/report.txt"]).trim(), "build/report.txt");
  assert.doesNotMatch(git(this.repository, ["ls-files"]), /features\/two\.feature/, "the new file must stay untracked");
});

const UNHEADED_PART: Record<string, (world: SpecControllerWorld) => void> = {
  "no file mentions ZZZ": () => undefined,
  "a test fixture's feature file is headed ZZZ and carries SCN-ZZZ-004": (world) => {
    writeInto(world.repository, "tests/fixtures/sample/features/zzz.feature", featureFile("ZZZ", ["SCN-ZZZ-004"]));
    commitAll(world.repository, "a test fixture");
  },
  "a feature file headed ZZZ was deleted by a later commit": (world) => {
    writeInto(world.repository, "features/zzz.feature", featureFile("ZZZ", ["SCN-ZZZ-009"]));
    commitAll(world.repository, "a feature that did not last");
    git(world.repository, ["rm", "-q", "features/zzz.feature"]);
    git(world.repository, ["commit", "-q", "-m", "retire the feature"]);
  },
};

Given("a repository whose feature files are headed ONE and TWO, where {}", function (this: SpecControllerWorld, where: string) {
  const arrange = UNHEADED_PART[where];
  assert.ok(arrange !== undefined, `no fixture for: ${where}`);
  this.repository = newRepository(this);
  writeInto(this.repository, "features/one.feature", featureFile("ONE", ["SCN-ONE-001"]));
  writeInto(this.repository, "features/two.feature", featureFile("TWO", ["SCN-TWO-001"]));
  commitAll(this.repository, "the corpus");
  arrange(this);
});

Then("it is refused as an unknown part, and no code is given", function (this: SpecControllerWorld) {
  assert.equal(this.answer.status, 2, `expected the usage status, got ${this.answer.status}\n${this.answer.stderr}`);
  assert.equal(this.answer.stdout, "");
  assert.ok(showsEntry(this.answer.stderr, "unknown-part-refused"), `expected an unknown-part refusal; got:\n${this.answer.stderr}`);
});

Then("the refusal lists ONE and TWO as the parts the corpus carries, and no other part", function (this: SpecControllerWorld) {
  const carried = shownEntry(this.answer.stderr, "unknown-part-refused")?.["parts"];
  assert.equal(carried, "ONE, TWO", `expected the refusal to list ONE and TWO; got:\n${this.answer.stderr}`);
});

When("the author asks for the next code for {word}, as a new part", function (this: SpecControllerWorld, part: string) {
  this.answer = allocate(this.repository, [part, "--new"]);
});

Then("beside the answer it says nothing of the part being carried already", function (this: SpecControllerWorld) {
  assert.equal(this.answer.status, 0, this.answer.stderr);
  assert.doesNotMatch(this.answer.stderr, /already carries/);
});

Then("beside the answer it notes that a feature file's header already carries {word}", function (this: SpecControllerWorld, part: string) {
  assert.match(this.answer.stderr, new RegExp(`^note: a feature file's header already carries ${part}, so --new was not needed$`, "m"));
});

const WRONG_KIND: Record<string, (path: string) => void> = {
  "a regular file": (path) => {
    rmSync(path, { recursive: true, force: true });
    writeFileSync(path, "not a directory\n");
  },
  "a directory": (path) => mkdirSync(path, { recursive: true }),
  "a link to a file that is not there": (path) => symlinkSync(join(dirname(path), "nowhere.feature"), path),
  "a feature file the Gherkin parser rejects": (path) => writeFileSync(path, "not gherkin at all {{{\n"),
};

Given("in that repository {word} is {}", function (this: SpecControllerWorld, path: string, kind: string) {
  const make = WRONG_KIND[kind];
  assert.ok(make !== undefined, `no fixture for: ${kind}`);
  make(join(this.repository, path));
});

const UNREADABLE = ["could-not-be-read", "working-directory-unreadable"] as const;

function refusalOf(result: SpawnSyncReturns<string>, subject?: string): Readonly<Record<string, string>> {
  const refusal = shownAmong(result.stderr, UNREADABLE, subject === undefined ? {} : { subject });
  assert.ok(refusal !== undefined, `expected an unreadable-input refusal; got:\n${result.stderr}`);
  return refusal;
}

Then("it is refused as a path allocate cannot read, and no code is given", function (this: SpecControllerWorld) {
  assert.equal(this.answer.status, 2, `expected the usage status, got ${this.answer.status}\n${this.answer.stderr}`);
  assert.equal(this.answer.stdout, "");
  assert.doesNotMatch(this.answer.stderr, /^\s+at /m, `a stack trace was printed:\n${this.answer.stderr}`);
  refusalOf(this.answer);
});

function namesPath(refusal: Readonly<Record<string, string>>, path: string): boolean {
  return refusal["path"]?.endsWith(`/${path}`) === true;
}

Then("allocate's refusal names {word}", function (this: SpecControllerWorld, path: string) {
  const refusal = refusalOf(this.answer);
  assert.ok(namesPath(refusal, path), `expected the refusal to name ${path}; got:\n${this.answer.stderr}`);
});

Then("allocate's refusal names {word} and the parser's own words", function (this: SpecControllerWorld, path: string) {
  const file = shownEntry(this.answer.stderr, "corpus-file-unparseable")?.["file"] ?? "";
  assert.ok(file.endsWith(`/${path}`), `expected the refusal to name ${path}; got:\n${this.answer.stderr}`);
  assert.match(this.answer.stderr, /^\(1:1\): expected: .*got 'not gherkin at all \{\{\{'$/m, `expected the parser's own words; got:\n${this.answer.stderr}`);
});

function withhold(world: SpecControllerWorld, path: string, mode: number): void {
  const before = statSync(path).mode & 0o7777;
  chmodSync(path, mode);
  world.permissionsTaken.push(() => chmodSync(path, before));
}

After(function (this: SpecControllerWorld) {
  while (this.permissionsTaken.length > 0) this.permissionsTaken.pop()?.();
});

function copyWithoutGit(world: SpecControllerWorld): string {
  const copy = temporaryDirectory(world, "allocate-plain-");
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
  function (this: SpecControllerWorld, copy: string, code: string, path: string) {
    if (copy === "repository") {
      this.repository = newRepository(this);
      writeInto(this.repository, "features/one.feature", featureFile("ONE", [code]));
      writeInto(this.repository, "features/nested/two.feature", featureFile("TWO", ["SCN-TWO-001"]));
      commitAll(this.repository, "the corpus");
    } else {
      assert.equal(copy, "copy without git", `no fixture for: ${copy}`);
      this.repository = copyWithoutGit(this);
    }
    withhold(this, path === "working directory" ? this.repository : join(this.repository, path), withholdingMode(path));
  },
);

Then("allocate's refusal names {} and says allocate was not permitted to read it", function (this: SpecControllerWorld, path: string) {
  const refusal = refusalOf(this.answer);
  const named = path === "working directory" || path === "the repository's top" ? basename(this.repository) : path;
  assert.ok(namesPath(refusal, named), `expected the refusal to name ${named}; got:\n${this.answer.stderr}`);
  assert.match(refusal["reason"] ?? "", /EACCES|EPERM/, `expected the operating system's reason; got:\n${this.answer.stderr}`);
});

When(
  "the author asks for the next code for {word} from a working directory that has since been removed",
  function (this: SpecControllerWorld, part: string) {
    const removed = join(this.repository, "removed");
    mkdirSync(removed);
    const script = 'cd "$1" && rmdir "$1" && shift && exec "$@"';
    const result = spawnSync("/bin/sh", ["-c", script, "sh", removed, NODE, ...SPEC_CONTROLLER_ARGV, "allocate", part], {
      encoding: "utf8",
    });
    assert.equal(result.error, undefined, `the binary failed to spawn: ${result.error?.message}`);
    assert.equal(existsSync(removed), false, "the working directory should have been removed before the binary ran");
    this.answer = result;
  },
);

Then("allocate's refusal says the working directory could not be read", function (this: SpecControllerWorld) {
  refusalOf(this.answer, entryText("working-directory"));
});

const CARRIER: Record<string, { path: string; write: (world: SpecControllerWorld, code: string) => void }> = {
  "an untracked file, drafts/new.md": {
    path: "drafts/new.md",
    write: (world, code) => writeInto(world.repository, "drafts/new.md", `Cites ${code}.\n`),
  },
  "a tracked file with an edit not yet committed, docs/notes.md": {
    path: "docs/notes.md",
    write: (world, code) => {
      writeInto(world.repository, "docs/notes.md", "Cites SCN-ONE-003.\n");
      commitAll(world.repository, "the notes");
      writeInto(world.repository, "docs/notes.md", `Cites ${code}.\n`);
    },
  },
  "the feature file, with an edit not yet committed": {
    path: "features/one.feature",
    write: (world, code) => {
      const path = join(world.repository, "features", "one.feature");
      writeFileSync(path, `${readFileSync(path, "utf8")}\n  @${code} @unit\n  Scenario: a new scenario\n    Given a step\n`);
    },
  },
};

const WITHHELD: Record<string, (world: SpecControllerWorld, file: string) => void> = {
  "allocate is not permitted to read it": (world, file) => withhold(world, join(world.repository, file), 0o000),
  "allocate is not permitted to list its directory": (world, file) => withhold(world, dirname(join(world.repository, file)), 0o000),
  "allocate may list its directory but not enter it": (world, file) => withhold(world, dirname(join(world.repository, file)), 0o600),
  "allocate is not permitted to list the repository's top": (world) => withhold(world, world.repository, 0o100),
};

Given("in it, {} carries {word}, and {}", function (this: SpecControllerWorld, file: string, code: string, unreadable: string) {
  const carrier = CARRIER[file];
  const withholdFrom = WITHHELD[unreadable];
  assert.ok(carrier !== undefined && withholdFrom !== undefined, `no fixture for: ${file} / ${unreadable}`);
  carrier.write(this, code);
  mkdirSync(join(this.repository, "src"), { recursive: true });
  withholdFrom(this, carrier.path);
});

When("the author asks for the next code for {word}, standing in {}", function (this: SpecControllerWorld, part: string, where: string) {
  assert.ok(where === "its top" || where === "a subdirectory", `no directory for: ${where}`);
  this.answer = allocate(where === "its top" ? this.repository : join(this.repository, "src"), [part]);
});

Given("its loose objects are not permitted to be read", function (this: SpecControllerWorld) {
  const objects = join(this.repository, ".git", "objects");
  const loose = readdirSync(objects).filter((name) => /^[0-9a-f]{2}$/.test(name));
  assert.ok(loose.length > 0, "the fixture should hold loose objects");
  for (const name of loose) withhold(this, join(objects, name), 0o000);
});

Given("its objects are packed, and the pack is not permitted to be read", function (this: SpecControllerWorld) {
  git(this.repository, ["gc", "-q"]);
  const pack = join(this.repository, ".git", "objects", "pack");
  const files = readdirSync(pack);
  assert.ok(files.some((name) => name.endsWith(".pack")), "gc should have written a pack");
  for (const name of files) withhold(this, join(pack, name), 0o000);
});

Given("its branch refs are not permitted to be read", function (this: SpecControllerWorld) {
  withhold(this, join(this.repository, ".git", "refs", "heads"), 0o000);
});

Given("it is cloned one commit deep, and the clone's shallow record is not permitted to be read", function (this: SpecControllerWorld) {
  const clone = join(temporaryDirectory(this, "allocate-clone-"), "clone");
  git(this.repository, ["clone", "-q", "--depth", "1", `file://${this.repository}`, clone]);
  assert.equal(git(clone, ["rev-parse", "--is-shallow-repository"]).trim(), "true");
  this.repository = clone;
  withhold(this, join(this.repository, ".git", "shallow"), 0o000);
});

Then("allocate's refusal says the repository's history could not be read", function (this: SpecControllerWorld) {
  refusalOf(this.answer, entryText("history"));
});

Given("its .git directory is not permitted to be read", function (this: SpecControllerWorld) {
  withhold(this, join(this.repository, ".git"), 0o000);
});

Given("its object store is not permitted to be read", function (this: SpecControllerWorld) {
  withhold(this, join(this.repository, ".git", "objects"), 0o000);
});

Given("its HEAD is not permitted to be read", function (this: SpecControllerWorld) {
  withhold(this, join(this.repository, ".git", "HEAD"), 0o000);
});

Given("its .git is a file pointing to a directory that is not there", function (this: SpecControllerWorld) {
  rmSync(join(this.repository, ".git"), { recursive: true });
  writeFileSync(join(this.repository, ".git"), `gitdir: ${join(this.repository, "nowhere")}\n`);
});

Then("allocate's refusal names the repository's .git and says git could not open it", function (this: SpecControllerWorld) {
  const refusal = refusalOf(this.answer, entryText("repository"));
  assert.ok(namesPath(refusal, `${basename(this.repository)}/.git`), `expected the refusal to name the repository's .git; got:\n${this.answer.stderr}`);
  assert.ok(showsEntry(refusal["reason"] ?? "", "git-exited", { command: "rev-parse" }), `expected git's reason; got:\n${this.answer.stderr}`);
});

const OUTSIDE = ["SCN-A-001", "SCN-SIXCHR-001"] as const;

const INSIDE = ["SCN-AB-001", "SCN-FIVEC-001"] as const;

function scenarioFile(scnId: string): string {
  const code = scnId.split("-")[1]!;
  const header = /^[A-Z0-9]{2,5}$/.test(code) ? `@${code}\n` : "";
  return `${header}Feature: ${code.toLowerCase()}\n\n  @unit @${scnId}\n  Scenario: ${code.toLowerCase()} scenario\n    Given a thing\n`;
}

function balanceGrammarTarget(world: SpecControllerWorld): GrammarRun {
  const dir = temporaryDirectory(world, "scn-grammar-");
  mkdirSync(join(dir, "features"));
  for (const [name, source] of Object.entries(world.grammarTarget.features)) writeFileSync(join(dir, "features", name), source);
  writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
  writeFileSync(join(dir, "package.json"), "{}\n");
  const args = ["--features", join(dir, "features"), "--ci", join(dir, "ci.yml"), "--package-json", join(dir, "package.json")];
  const inputs = [
    ["vitest", world.grammarTarget.vitest],
    ["cucumber", world.grammarTarget.cucumber],
    ["ci-steps", world.grammarTarget.ciSteps],
  ] as const;
  for (const [flag, content] of inputs) {
    if (content === undefined) continue;
    writeFileSync(join(dir, `${flag}.json`), JSON.stringify(content));
    args.push(`--${flag}`, join(dir, `${flag}.json`));
  }
  const jsonPath = join(dir, "report.json");
  const result = spawnSync(
    NODE,
    [...SPEC_CONTROLLER_ARGV, "balance", ...args, "--format", `json:${jsonPath}`],
    { cwd: dir, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `spec-controller failed to spawn: ${result.error?.message}`);
  assert.ok(existsSync(jsonPath), `expected the report written; exit ${result.status}, stderr: ${result.stderr}`);
  return {
    status: result.status ?? -1,
    report: JSON.parse(readFileSync(jsonPath, "utf8")),
  };
}

function rowOf(world: SpecControllerWorld, scnId: string): GrammarRow | undefined {
  return world.grammarRun.report.ledger.claimReconciliations.find((row) => row.claim === scnId);
}

When("balance reconciles that grammar target", function (this: SpecControllerWorld) {
  this.grammarRun = balanceGrammarTarget(this);
});

Then("the grammar target lists no scenario code error", function (this: SpecControllerWorld) {
  assert.deepEqual(this.grammarRun.report.errors?.scenarioCodes ?? [], [], `expected no scenario code error; got ${JSON.stringify(this.grammarRun.report.errors?.scenarioCodes)}`);
});

const OWN = "SCN-OWN-001";

function rowsOfKind(world: SpecControllerWorld, kind: string): GrammarRow[] {
  return world.grammarRun.report.ledger.claimReconciliations.filter((row) => row.kind === kind);
}

function unnamedClaimObservations(world: SpecControllerWorld): number {
  return rowsOfKind(world, "unnamed-claim")
    .flatMap((row) => row.qualityCheckReconciliations)
    .flatMap((qcr) => qcr.evidenceObservations ?? [])
    .filter((observation) => observation.outcome === "cites-no-scenario").length;
}

Given(
  "a target with one scenario of its own, and a Vitest report whose passing titles cite feature parts of one, two, five and six characters that no scenario carries",
  function (this: SpecControllerWorld) {
    const titles = [OWN, ...OUTSIDE, ...INSIDE].map((id) => ({ fullName: `[${id}] a passing test`, status: "passed" }));
    this.grammarTarget = {
      features: { "own.feature": scenarioFile(OWN) },
      vitest: { testResults: [{ name: "t.test.ts", assertionResults: titles }] },
    };
  },
);

Then("the two- and five-character citations open phantom claims", function (this: SpecControllerWorld) {
  for (const id of INSIDE) {
    assert.equal(rowOf(this, id)?.kind, "phantom-claim", `expected a phantom claim for ${id}; got ${JSON.stringify(rowOf(this, id))}`);
  }
  assert.equal(rowOf(this, OWN)?.kind, "scenario", `expected the target's own scenario as an account`);
});

function bothOutsideCitationsPostToTheUnnamedClaim(this: SpecControllerWorld): void {
  for (const id of OUTSIDE) assert.equal(rowOf(this, id), undefined, `expected no row for ${id}; got ${JSON.stringify(rowOf(this, id))}`);
  assert.equal(unnamedClaimObservations(this), OUTSIDE.length, `expected ${OUTSIDE.length} uncited evidence observations; got ${JSON.stringify(rowsOfKind(this, "unnamed-claim"))}`);
}

Then(
  "the one- and six-character titles cite no scenario, so both evidence observations post to the unnamed claim",
  bothOutsideCitationsPostToTheUnnamedClaim,
);

Given(
  "a target with one scenario of its own, and a Cucumber report whose passing scenarios are tagged with feature parts of one, two, five and six characters that no scenario carries",
  function (this: SpecControllerWorld) {
    const elements = [OWN, ...OUTSIDE, ...INSIDE].map((id) => ({
      name: `${id} scenario`,
      tags: [{ name: "@integration" }, { name: `@${id}` }],
      steps: [{ result: { status: "passed" } }],
    }));
    this.grammarTarget = {
      features: { "own.feature": scenarioFile(OWN).replace("@unit", "@integration") },
      cucumber: [{ uri: "features/own.feature", elements }],
    };
  },
);

Then(
  "the one- and six-character Cucumber scenarios cite no scenario, so both evidence observations post to the unnamed claim",
  bothOutsideCitationsPostToTheUnnamedClaim,
);

Given(
  "a target with one scenario of its own, and a CI step record whose successful steps are keyed by feature parts of one, two, five and six characters that no scenario carries",
  function (this: SpecControllerWorld) {
    const step = { outputs: {}, outcome: "success", conclusion: "success" };
    this.grammarTarget = {
      features: { "own.feature": scenarioFile(OWN) },
      vitest: { testResults: [{ name: "t.test.ts", assertionResults: [{ fullName: `[${OWN}] proven`, status: "passed" }] }] },
      ciSteps: Object.fromEntries([...OUTSIDE, ...INSIDE].map((id) => [id, step])),
    };
  },
);

Then("the one- and six-character step ids post no evidence observation at all", function (this: SpecControllerWorld) {
  for (const id of OUTSIDE) assert.equal(rowOf(this, id), undefined, `expected no row for ${id}; got ${JSON.stringify(rowOf(this, id))}`);
  assert.equal(unnamedClaimObservations(this), 0, `expected no uncited evidence observation; got ${JSON.stringify(rowsOfKind(this, "unnamed-claim"))}`);
  const rows = this.grammarRun.report.ledger.claimReconciliations.map((row) => row.claim);
  assert.deepEqual(rows.sort(), [OWN, ...INSIDE].sort(), `expected only the target's own row and the two phantom claims; got ${JSON.stringify(rows)}`);
});

const INHERITED = "tests/fixtures/inherited-scenario-code";

const SCENARIO_CODE_INHERITED_FROM: Readonly<Record<string, string>> = {
  Feature: "SCN-INF-001",
  Rule: "SCN-INR-001",
};

const THE_ONE_SCENARIO = "the one scenario beneath it";

Given(
  "a target whose one scenario carries no scenario code of its own, inherits one from its {word}, and has passing evidence citing that code",
  function (this: SpecControllerWorld, from: string) {
    assert.ok(SCENARIO_CODE_INHERITED_FROM[from], `no fixture inherits a scenario code from its ${from}`);
    this.ancestor = from;
    this.inheritedCodeRun = null;
  },
);

When("balance reconciles that target", function (this: SpecControllerWorld) {
  const target = `${INHERITED}/${this.ancestor.toLowerCase()}`;
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", `${target}/features`,
      "--vitest", `${target}/vitest.json`,
      "--package-json", `${target}/package.json`,
      "--ci", target,
      "--format", "json",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  try {
    this.inheritedCodeRun = { status: result.status, report: JSON.parse(result.stdout) as InheritedCodeRun["report"] };
  } catch {
    assert.fail(`expected a JSON reconciliation on stdout; exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
});

function reconciled(world: SpecControllerWorld): InheritedCodeRun {
  assert.ok(world.inheritedCodeRun, "the target was not reconciled");
  return world.inheritedCodeRun;
}

Then("the scenario is reconciled once, balanced, on its scenario code's row", function (this: SpecControllerWorld) {
  const rows = reconciled(this).report.ledger.claimReconciliations.filter(({ kind }) => kind === "scenario");
  assert.deepEqual(
    rows.map(({ claim, verdict }) => ({ claim, verdict })),
    [{ claim: SCENARIO_CODE_INHERITED_FROM[this.ancestor], verdict: "balanced" }],
    "the scenario was not reconciled exactly once, balanced, on its inherited code's row",
  );
});

Then("no reconciliation names it as a scenario with no scenario code", function (this: SpecControllerWorld) {
  const { report } = reconciled(this);
  assert.deepEqual(report.scenarioCodes.untaggedScenarios, [], "the scenario was also listed as carrying no scenario code");
  const named = report.ledger.claimReconciliations.filter(({ claim }) => claim.endsWith(THE_ONE_SCENARIO));
  assert.deepEqual(named, [], "a reconciliation row names the scenario by its title, as one with no scenario code");
});

Then("the run balances", function (this: SpecControllerWorld) {
  assert.equal(reconciled(this).status, exitOn("the balanced verdict"), "the run did not reach the balanced verdict");
});
