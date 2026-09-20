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

**What the reader accepts today.** `specController.runners` and `notChecks`, and the `--ci-steps`
record, are read exactly as they were. `specController.fitnessChecks` is still ACCEPTED — a
manifest carrying it reconciles exactly as the same tree without it does — but nothing of it is
read; the key is named on the report (see below).

**Manifest keys that are no longer read are named on the report, never read
quietly.** `specController.checkRegistry` and `specController.staticChecks` were
retired by `3F-3161`. Neither produces a credit, raises an obligation, or settles
which script a CI step is named by; a bare check tag on a scenario now means
nothing, and a run over such a tree reports the retired key by name rather than
reading it quietly. A `fitnessChecks` row's `characteristic` was retired by
`3F-3525`, when the characteristic left the model: one `@fitness` scenario is one
check, identified by its `@SCN` and described by its title. `specController.thresholds`, a
`fitnessChecks` row's `atLeast` / `atMost` (a `mutationGate` bar sits under `atLeast`) and the
`--measurements` flag were retired by `3F-3506`, with the measured route they
belonged to: no number reaches the ledger any more. Those are named on the report the same way;
`--measurements` is refused as retired, exit 2, and the refusal names what replaced it rather than
a pin that would bring it back.

**`specController.fitnessChecks` itself was retired by `3F-3582`,** and the whole key is now named
on the report as one line. A `@fitness` scenario raises its obligation from its TAG, whether or not
anything runs it, so nothing is left for a list to decide. There is one way to declare a fitness
check, and it is two artefacts: a `@fitness` scenario, and its `@SCN` as the `id:` of the CI step
that runs the check. See
[`adopting-fitness-checks.md`](./adopting-fitness-checks.md).

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
