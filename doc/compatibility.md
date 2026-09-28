# Compatibility — what you can build on

**At `0.x`, nothing here is promised, and the version number is the contract.**

This package is published at a `0.x` version. Under semantic versioning that
carries no compatibility guarantee, and we are not making one on top of it: any
mechanism this tool reads today — a manifest key, a tag form, a flag, an exit
code — may change in any release until `1.0`. If you build on it now, pin an
exact version and read the changelog before you move.

**This page previously made a stronger promise than the version number, and
that was a mistake worth naming rather than quietly reversing.** From
2026-09-05 it undertook that each of eight named mechanisms would be *removed
only in a major version, after a replacement had shipped*. It was written
before there was anyone to promise it to, and while the model underneath it was
still being shaped: it needed correcting the day after it shipped, and ten times
in the eight days that followed. A commitment maintained by hand against a
moving model is one that gets broken quietly — so it is withdrawn deliberately
instead, while withdrawing it still costs nobody anything.

**What the reader reads today.** Three `specController` keys — `runners`, `notChecks` and
`deferralTags` — and the `--ci-steps` record. [`how_to_use.md`](./how_to_use.md) says what each key
does. There is one way to declare a fitness check, and it is two artefacts: a `@fitness` scenario,
and its `@SCN` as the `id:` of the CI step that runs the check. See
[`adopting-fitness-checks.md`](./adopting-fitness-checks.md).

**A key this reader has no reading for is passed over — it is not read, and it is named as a key
the block does not read, in the same words whichever key it is.** `specController.checkRegistry` and `specController.staticChecks` stopped being read at
`3F-3161`; a `fitnessChecks` row's `characteristic` at `3F-3525`; `specController.thresholds` and a
row's `atLeast` / `atMost` at `3F-3506`; `specController.fitnessChecks` itself at `3F-3582`. For a
time the report carried a line per retired key a manifest still held, so that a consumer who had
written one in good faith would find out it no longer did anything. **That account was removed at
`3F-3606`** (operator ruling, 2026-09-20: no backward compatibility — no third party consumes this
package, and the one adopter adopts the current model whole). A manifest carrying any of those keys
now reconciles to the same ledger and the same exit code as the same manifest without them. Since
`3F-3777` each such key is named under `## Configuration not read` exactly as a misspelt key is, and
nothing on the report says what it once did: a consumer who wrote it is told it took no effect,
which is not backward compatibility.

**The `--measurements` flag is the one retirement still answered out loud**, because a flag is
given on a command line rather than sitting in a file: it is refused as retired, exit 2, and the
refusal names what replaced it rather than a pin that would bring it back.

**The observed script prefixes were already gone** before this page was rewritten
— `3F-3343` retired `lint:`/`guard:` discovery and replaced it with declared
behavioural runners. The sentence claiming they were still honoured was written
after that landed and was never true.

**At `0.x` none of this is a promise.** Any of it may change in any release until
`1.0`; pin an exact version and read the changelog.

**Where to read what the tool does today:**

- [`how_to_use.md`](./how_to_use.md) — the flags, the manifest keys, the report,
  and the `balance` exit codes.
- [`adopting-fitness-checks.md`](./adopting-fitness-checks.md) — the
  fitness axis and what a consumer authors.
- The [README](../README.md) — the exit-code taxonomy and the shortest path in.

**This page returns at `1.0`**, written from the mechanisms that survive to it,
and it will then be a promise rather than a description — with a check that runs
its own examples, so it cannot go stale unnoticed the way this one did.

*Withdrawn 2026-09-13 (`3F-3376`), on the operator's ruling. The full text of
the commitment as it stood is in this file's git history from `1697dc7`
(2026-09-05) to `ef91282`; nothing is lost, and nothing that was true about the
reader has changed.*
