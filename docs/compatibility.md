# Compatibility

**At `0.x`, nothing is promised between versions.**

This package is published at a `0.x` version. Under semantic versioning, a `0.x` version has no compatibility guarantee, and this package adds none. Any release before `1.0` may change any mechanism the tool reads: a setting, a tag form, a flag or an exit code. If you build on the tool, pin an exact version. Read the [release notes](https://github.com/3f-consulting/spec-controller/releases) before you move to another version.

At `1.0`, this page will become a promise, written from the mechanisms that reach `1.0`.

**What the tool reads.** `balance` takes three kinds of setting on its command line: the runners of each layer (`--unit`, `--integration`, `--e2e` and `--performance`), the non-checks (`--not-check`) and the deferral tags (`--deferral-tag`). The same settings can live in a settings file, `spec-controller.yml` at the top of the repository or the file `--config` names, whose keys are the flags' long names; a flag on the command line replaces the file's setting of the same name. A layer that no setting names takes the runner `balance` knows and finds in the workflows, at that runner's usual layer. It reads `package.json` only for its `scripts`; a `specController` block in it is not read. It also reads the `--ci-steps` record. [`user-guide.md`](./user-guide.md) says what each one does. Read it for the tool's behaviour: the flags, the report and the exit codes.

Two things make a fitness function an evidence obligation: a `@fitness` scenario, and that scenario's claim code as the `id:` of the CI step that runs the check. See *Wiring into CI* in the user guide.

**The test reports it reads.** The tool reads these test reports, each found from the CI step of the runner that writes it, read from where Maven or Gradle writes it by default, or named in that runner's long form: the JSON of Vitest and Jest, the JUnit XML of pytest and other runners, the JSON of RSpec and the JSON of Cucumber.

A pytest test cites its claim code with a `clm` property, which `@pytest.mark.clm` writes. A row of an Outline cites its claim code from the Outline's `clm` column.

A `@performance` evidence obligation is answered by any report in one of these formats that is a `--performance` runner's. So a load runner that writes JUnit XML can answer it. A Cucumber report answers it only when it is a `--performance` runner's.

**A flag `balance` does not take stops the run.** The tool refuses it as a usage error, at exit `2`, and prints the help for `balance`, which lists every flag it takes.

**No script prefix is read.** A `lint:` or `guard:` prefix means nothing to the tool. The tool observes every step. The steps it reads as runners are those running a runner the run names, or one it knows.
