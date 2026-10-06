# Compatibility — what you can build on

**At `0.x`, nothing here is promised, and the version number is the contract.**

This package is published at a `0.x` version. Under semantic versioning that
carries no compatibility guarantee, and we are not making one on top of it: any
mechanism this tool reads today — a manifest key, a tag form, a flag, an exit
code — may change in any release until `1.0`. If you build on it now, pin an
exact version and read the changelog before you move.

**What the reader reads today.** Three `specController` keys — `runners`, `notChecks` and
`deferralTags` — and the `--ci-steps` record. [`how_to_use.md`](./how_to_use.md) says what each key
does. There is one way to declare a fitness check, and it is two artefacts: a `@fitness` scenario,
and its `@SCN` as the `id:` of the CI step that runs the check. See
[`adopting-quality-checks.md`](./adopting-quality-checks.md).

**A key this reader has no reading for is passed over — it is not read, and it is named as a key
the block does not read, in the same words whichever key it is.** `specController.checkRegistry`, `specController.staticChecks`, a `fitnessChecks` row's
`characteristic`, `specController.thresholds`, a row's `atLeast` / `atMost`, and
`specController.fitnessChecks` itself are not read. A manifest carrying any of those keys
reconciles to the same ledger and the same exit code as the same manifest without them. Each
such key is named under `## Configuration not read` exactly as a misspelt key is, and
nothing on the report says what it once did: a consumer who wrote it is told it took no effect,
which is not backward compatibility.

**The `--measurements` flag is the one retirement still answered out loud**, because a flag is
given on a command line rather than sitting in a file: it is refused as retired, exit 2, and the
refusal names what replaced it rather than a pin that would bring it back.

**No script prefix is read.** A `lint:` or `guard:` prefix means nothing to the reader: every
step is observed, and the declared behavioural runners are the only steps it names.

**At `0.x` none of this is a promise.** Any of it may change in any release until
`1.0`; pin an exact version and read the changelog.

**Where to read what the tool does today:**

- [`how_to_use.md`](./how_to_use.md) — the flags, the manifest keys, the report,
  and the `balance` exit codes.
- [`adopting-quality-checks.md`](./adopting-quality-checks.md) — the
  fitness axis and what a consumer authors.
- The [README](../README.md) — the exit-code taxonomy and the shortest path in.

**This page returns at `1.0`**, written from the mechanisms that survive to it,
and it will then be a promise rather than a description — with a check that runs
its own examples, so it cannot go stale unnoticed the way this one did.

*Withdrawn 2026-09-13, on the operator's ruling. The full text of
the commitment as it stood is in this file's git history from `1697dc7`
(2026-09-05) to `ef91282`; nothing is lost, and nothing that was true about the
reader has changed.*
