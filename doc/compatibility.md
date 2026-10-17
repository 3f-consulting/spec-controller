# Compatibility

**At `0.x`, nothing is promised between versions.**

This package is published at a `0.x` version. Under semantic versioning that carries no compatibility guarantee, and none is added on top of it. Any mechanism the tool reads may change in any release before `1.0`: a manifest key, a tag form, a flag, an exit code. If you build on it, pin an exact version and read the [release notes](https://github.com/3f-consulting/spec-controller/releases) before you move.

**What the reader reads.** Three `specController` keys in `package.json` (`runners`, `notChecks` and `deferralTags`) and the `--ci-steps` record. [`how_to_use.md`](./how_to_use.md) says what each one does. A fitness function becomes an Evidence Obligation through two things: a `@fitness` scenario, and its `@SCN` as the `id:` of the CI step that runs the check (*Wiring into CI*).

**The test reports it reads.** Vitest's and Jest's JSON, pytest's and other runners' JUnit XML, RSpec's JSON and Cucumber's JSON, each through its own flag. It reads no load runner's report, so a `@performance` obligation is answered only by a Cucumber report of a scenario carrying that tag.

**Any other key in the `specController` block is not read.** It is named under `## Configuration not read` in the report, in the same words whatever the key, and the run reconciles exactly as it would without it.

**No script prefix is read.** A `lint:` or `guard:` prefix means nothing to the reader. Every step is observed, and the declared behavioural runners are the only steps it names.

**What to read for the tool's behaviour:** [`how_to_use.md`](./how_to_use.md), for the flags, the manifest keys, the report and the exit codes.

At `1.0` this page becomes a promise, written from the mechanisms that reach it.
