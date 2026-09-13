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

**What has NOT changed: what the reader accepts.** Every mechanism the tool read
before this page was cut, it still reads. `specController.checkRegistry`,
`specController.thresholds`, the observed script prefixes, `staticChecks`,
`runners`, `notChecks`, `fitnessChecks` and the `--measurements` document shape
are all still honoured exactly as they were. **Nothing was removed here; only a
promise about the future was.**

**Where to read what the tool does today:**

- [`how_to_use.md`](./how_to_use.md) — the flags, the manifest keys, the report,
  and the `balance` exit codes.
- [`converting-a-fitness-check.md`](./converting-a-fitness-check.md) — the
  fitness axis and what a consumer authors.
- The [README](../README.md) — the exit-code taxonomy and the shortest path in.

**This page returns at `1.0`**, written from the mechanisms that survive to it,
and it will then be a promise rather than a description — with a check that runs
its own examples, so it cannot go stale unnoticed the way this one did.

*Withdrawn 2026-09-13 (`3F-3376`), on the operator's ruling. The full text of
the commitment as it stood is in this file's git history from `1697dc7`
(2026-09-05) to `ef91282`; nothing is lost, and nothing that was true about the
reader has changed.*
