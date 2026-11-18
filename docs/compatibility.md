# Compatibility

**At `0.x`, nothing is promised between versions.**

This package is published at a `0.x` version. Under semantic versioning, a `0.x` version carries no compatibility guarantee, and this package adds none. Any release before `1.0` may change any mechanism the tool reads: a manifest key, a tag form, a flag or an exit code. If you build on the tool, pin an exact version. Read the [release notes](https://github.com/3f-consulting/spec-controller/releases) before you move to another version.

At `1.0`, this page becomes a promise. It will be written from the mechanisms that reach `1.0`.

**What the tool reads.** The tool reads three `specController` keys in `package.json`: `runners`, `notChecks` and `deferralTags`. It also reads the `--ci-steps` record. [`user-guide.md`](./user-guide.md) says what each one does. Read that page for the tool's behaviour: the flags, the manifest keys, the report and the exit codes.

Two things make a fitness function an evidence obligation: a `@fitness` scenario, and that scenario's claim code as the `id:` of the CI step that runs the check. See *Wiring into CI* in the user guide.

**The test reports it reads.** The tool reads these test reports, each through its own flag: the JSON of Vitest and Jest, the JUnit XML of pytest and other runners, the JSON of RSpec and the JSON of Cucumber.

A pytest test cites its claim code with a `clm` property, which `@pytest.mark.clm` writes. A row of an Outline cites its claim code from the Outline's `clm` column.

A `@performance` evidence obligation is answered by any report, in one of these formats, that the `performance` runner's entry names, so a load runner that writes JUnit XML can answer it. A Cucumber report answers it only when that entry names it: a Cucumber report no entry names is integration evidence.

**Any other key in the `specController` block is not read.** The report names that key under `### Configuration errors`. It uses the same words whatever the key is. The run reconciles exactly as it would without the key.

**No script prefix is read.** A `lint:` or `guard:` prefix means nothing to the tool. The tool observes every step. The declared behavioural runners are the only steps it names.
