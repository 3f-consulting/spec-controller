# Converting a fitness check — a worked example

*Written for a product about to migrate its own fitness checks. It is one example, in full, with
the before and the after side by side.*

For the compatibility position — what keeps working, for how long, and what would break it — see
[`compatibility.md`](./compatibility.md). This page is about the shape of the change, not its
timing.

---

## The pair, captured before half of it was deleted

At `49293a5` this repository's `features/complexity-threshold.feature` carried two scenarios five
lines apart under one `Rule:`. One was converted; one was not. The difference between them is the
whole design.

```gherkin
    @fitness @SCN-CPX-005
    Scenario: every function and module measures inside the external standard, or inside its recorded exception
      Then the check this scenario names finds no violations

    @complexity @SCN-CPX-006
    Scenario: every exception entry states the value the tree currently measures
```

The `Rule:` preamble above them said why, and it is captured here with them:

> SCN-CPX-005's single sentence is not an example either — it is what the fitness pass EXECUTES,
> the same sentence every converted check in every target carries, which is what holds the
> step-definition count at one however many checks convert. SCN-CPX-006 has nothing to execute, a
> CI script settles it, so it stays stepless and its bare tag is what keeps it out of the suspense
> row as an uncited static check.

**Both scenarios are about `complexity`. Both run eslint over the same tree. Neither one's subject
changed.** What differs is entirely in how the check's Evidence Obligation is raised and how its
Evidence Observation gets back to it.

That adjacency no longer exists in the tree: `SCN-CPX-005` left when the corpus became generated,
and `SCN-CPX-006` follows it. Which is why it is written down here — reconstructing it from a diff
afterwards reads as archaeology rather than as an example.

---

## Reading the two halves

### The UNCONVERTED half — `@complexity @SCN-CPX-006`

- It carries a **characteristic tag**, `@complexity`, and **no steps**. It is *stepless*: nothing
  in the suite executes it.
- The check that settles it is a **CI step**, `pnpm lint:complexity-exceptions`, discovered by the
  reconciler because its script name starts with an observed prefix (`lint:` / `guard:`) and a
  `run:` step in the workflow file invokes it.
- Getting from that script back to *this* scenario takes **two hops**: an entry in
  `specController.checkRegistry` says what characteristic the handle is about and which `@SCN` its
  run credits, and the corpus is then searched for the scenario carrying that code.
- The evidence that the check ran is **a workflow file mentioning it**.

Everything in that list is a joint, and every joint is somewhere the two halves can come apart.
When two scenarios shared one bare `@complexity` tag, a run of *either* check posted its credit to
whichever scenario the corpus reached first — so neither was attributable, and the runner-up
reconciled `missing` while its check ran green.

### The CONVERTED half — `@fitness @SCN-CPX-005`

- It carries the **axis tag** `@fitness` and nothing about its subject.
- It carries **one executable sentence**, and it is the same sentence in every target:
  `Then the check this scenario names finds no violations`.
- Its subject lives in **data** — one row of `specController.fitnessChecks`:

  ```json
  { "scn": "SCN-CPX-005", "characteristic": "complexity", "command": "eslint" }
  ```

- The fitness cucumber pass runs that command. **The scenario appearing in that pass's report IS
  the credit**, citing the `@SCN` off its own tag line.
- No script handle to discover, no registry entry, no corpus lookup behind either.

The proof that the check ran is now *a scenario in a report*, which is stronger than *a workflow
file mentions it* — and it is the enumeration the fitness checks were missing. A linter reports
findings only, so its silence is ambiguous between *nothing was wrong* and *nothing looked*.
Cucumber reports every scenario it ran, pass or fail.

---

## What the after looks like today

Since 3F-3164 the corpus half is **generated**. The scenario above is no longer written by hand at
all — it is emitted from its row, and it is now `@SCN-FIT-001`:

```gherkin
  @fitness @SCN-FIT-001
  Scenario: complexity — `eslint`
    Then the check this scenario names finds no violations
```

```json
{ "scn": "SCN-FIT-001", "characteristic": "complexity", "command": "eslint" }
```

**The `@SCN` is read off the row, never derived from the row's position.** A positional code would
renumber every citation the moment a row was inserted, which is the opposite of what a stable
identifier is for. So the generated file's numbering is not contiguous, and that is the rule
working rather than a gap.

**The corpus is checked in, and a row of the corpus guards it.** `SCN-FIT-014`'s command
regenerates the file and diffs the result, so a corpus that has drifted from the rows it came from
reds the pass it is part of. Generating at pipeline time instead would put the definition somewhere
nobody can read or review; checking it in unguarded would be a watermelon in a new costume.

---

## Two step definitions, and exactly two however many checks convert

A converted check's row carries its `@SCN`, its characteristic and its command. Nothing that varies
between two checks is in the corpus, so nothing that varies between two checks needs a step
definition:

| the row | the sentence its scenario carries | what is asserted |
|---|---|---|
| no bar | `Then the check this scenario names finds no violations` | the command's **exit code** |
| a bar (`atLeast` / `atMost`) | `Then the check this scenario names reports its measurement` | a **number** arrived, and is posted as the credit |

**The row's shape says which kind of check it is** — no type field, no second tag, no roster of
measured characteristics for somebody to keep in step with the rows.

**The bar is not in the step definition and must never be.** One bar per characteristic, and it
belongs to the ledger. A measured scenario passes when its command *yielded a number*; whether that
number clears the bar is the ledger's sentence. A scenario comparing its own number would be
grading its own homework, and the reconciliation would transcribe a verdict rather than reach one.

---

## Two things that are easy to get wrong

**1. The fitness pass runs LAST.** It is two cucumber calls, in this order:

```yaml
- run: pnpm cucumber        # the behavioural pass — @unit / @integration / @e2e / @performance
- run: pnpm cucumber:fitness  # the fitness pass — @fitness, and nothing else
```

Reader-shaped rows read what an earlier step produced: a mutation sweep's banked record, the
behavioural suite's own timing. A pipeline that runs the fitness pass first meets absent artefacts
and a wall of unsettled rows **while doing exactly what the documentation told it**. This is the
one part of the design that is easy to get wrong by accident.

**A run-time check is the archetype of that shape, not an exception to it.** The wall-clock a suite
took cannot be measured from inside the pass that reports it, so the measuring happens where the
suite runs — a timing wrapper around the step, writing a record — and the reading happens in the
fitness pass, from a row whose command is a cheap reader over that record. spec-controller's own
two are `@SCN-FIT-012` (its unit suite) and `@SCN-FIT-013` (its behavioural suite); the ordering
above is the reason the second cucumber call exists at all.

**2. The fitness pass's own run time is unmeasured, and must be.** The pass that observes cannot be
inside what it observes. The behavioural suite is what is worth timing.

---

## The migration, as a checklist

1. **Write the row** — `scn`, `characteristic`, `command`, plus `atLeast` / `atMost` where the check
   produces a number.
2. **Give the scenario the axis tag** and remove its characteristic tag. Under the generated corpus
   this happens for you: the row is the whole of what you write.
3. **Take the command out of the pipeline file.** A converted check stops being a CI step; there is
   no `run:` line left to find, and nothing needs to discover a script handle any more.
4. **Sweep the citations.** A minted `@SCN` changes every surface that names the old one — the
   corpus, step definitions, unit-test pins, docblocks, workflow comments, the decision log. Grep
   for the retired code and expect zero hits.
5. **Watch out for a measured check whose producer runs on another cadence.** Renaming the `@SCN`
   of a static check touches only your own tree. A measured check's number is stamped with that
   `@SCN` by whatever *produced* it — a nightly sweep, a scheduled job — and read back by both
   terms. If the producer runs on a different schedule, or on a different branch, the newest record
   available to your build was written by the code you are replacing, and the rename desynchronises
   the two for as long as it takes the producer to run again. **There is no atomic version of that
   change**, and the two honest routes are:

   - **Expand / contract, which is what this repository did.** The reader accepts the superseded
     code for one cycle. Say it on the row's own command line rather than in a manifest field —
     the only thing that has to understand it is the row's *own reader*, which is your program, not
     the reconciler, and the command line is the form a consumer can copy:

     ```json
     { "scn": "SCN-FIT-002", "characteristic": "mutation",
       "command": "pnpm --silent mutation:score --supersedes SCN-MUT-011",
       "atLeast": { "mutationGate": "domain" } }
     ```

     Move the **producer** to the new code in the same commit, or the transition never contracts.
     Then take the flag off once one producer run has stamped the new code — **a transition with no
     end is a resting state wearing a transition's name**, so file its removal as you add it.
   - **Take the transient deliberately.** Rename both sides and accept a red window between the
     merge and the producer's next run. Honest, and announced rather than discovered.

   The route this repository could *not* take is deferring the mint indefinitely. A code is stable
   forever and survives a feature-file rename, so a check may keep its code while its scenario
   moves — but a migration that leaves one check in the old numbering has not migrated, it has
   stopped.
6. **Compare the ledger shape, not the rows.** Every `@SCN` changed, so a row-for-row diff says
   nothing. Same characteristics claimed, same obligation count, same satisfied / missing verdicts,
   against a baseline captured **before the first edit**.
7. **Prove the comparison has teeth.** A matching ledger is also what *not migrating* produces.
   Break one generated row's `scn` so its credit cites nothing, confirm the comparison reds, and
   restore. A comparison whose teeth are unproven is a diff that is not looking.

---

## The migration this repository actually ran

*Fourteen rows, eleven of them conversions, one deletion and one new check. Written down because a
consumer running the same migration will ask for it, and because a mapping table is the only thing
that makes the closing ledger comparison auditable: every `@SCN` changed, so a row-for-row diff
says nothing.*

### The order, and why it is that order

**Delete before you migrate.** Two checks left rather than converting — one whose subject *is* the
report the run produces (it cannot be a row of the report it judges) and one whose whole mechanism
this direction retires. Converting something you are about to delete is work done to be undone.

**Fix the checks that answer wrongly outside CI before converting them, not after.** One check here
was correct in CI and unanswerable on a laptop — it reads a pull-request body that does not exist
locally. Converted first, it would have put a conditional red into every developer's green-check.
The cure is in the check: a third answer, *nothing was examined*, distinct from both *passed* and
*failed*, carried on an exit code **the row states** (`notExaminedExit`) rather than one the
runner assumes. *Do not fail on it* must not resolve to a pass — a scenario that goes green having
examined nothing is the fault this product is named for.

**Mint the codes last, and mint them all.** A code minted early is a code every later sub-issue has
to sweep again.

| # | what | shape |
|---|---|---|
| 1 | the CI-only check learns a third answer | new behaviour |
| 2 | the fitness runner learns to read that answer | changed behaviour |
| 3 | the third answer becomes opt-in per row (`notExaminedExit`) | changed behaviour |
| 4 | a row stating an exit of 0 or 1 for it is refused when the config is read | new behaviour |
| 5 | the generator, its drift guard, and the first two rows | refactor |
| 6 | the eight static checks convert; their CI steps leave the workflow | refactor |
| 7 | `typecheck` and the two run-time bars convert; the threshold key folds in and leaves | refactor |
| 8 | the check that cannot convert is deleted, with its scenarios | deletion |
| 9 | the reader learns to answer a row from a measurement stamped with a superseded code | changed behaviour |
| 10 | the citation sweep, the last mint, and this page | refactor |

Steps 1–4 and 9 were **not planned**. Every one was found by a sub-issue running a *plant* instead
of accepting a green.

### The old → new mapping

| old `@SCN` | characteristic | command on the row today | new `@SCN` |
|---|---|---|---|
| `SCN-CPX-005` | complexity | `eslint` | `SCN-FIT-001` |
| `SCN-MUT-011` | mutation | `pnpm --silent mutation:score --supersedes SCN-MUT-011` · `atLeast` | `SCN-FIT-002` |
| `SCN-CPX-006` | complexity | `pnpm lint:complexity-exceptions` | `SCN-FIT-003` |
| `SCN-VOC-019` | vocab | `pnpm lint:blocked-vocabulary` | `SCN-FIT-004` |
| `SCN-VOC-020` | vocab | `pnpm lint:adopted-vocabulary` | `SCN-FIT-005` |
| `SCN-VOC-021` | vocab | `pnpm lint:exempt-data-floor` | `SCN-FIT-006` |
| `SCN-LNT-011` | traceability | `pnpm lint:feature-codes` | `SCN-FIT-007` |
| `SCN-STG-006` | traceability | `pnpm lint:scn-tags` | `SCN-FIT-008` |
| `SCN-ANM-002` | tech-conformance | `pnpm lint:anemic-domain` | `SCN-FIT-009` |
| `SCN-SSM-009` | traceability | `pnpm lint:scn-subissues` · `notExaminedExit: 3` | `SCN-FIT-010` |
| `SCN-API-003` | typecheck | `pnpm typecheck` | `SCN-FIT-011` |
| `SCN-CIP-013` | ci-run-time | `pnpm --silent timing:score --scn SCN-FIT-012` · `atMost: 75` | `SCN-FIT-012` |
| `SCN-CIP-014` | ci-run-time | `pnpm --silent timing:score --scn SCN-FIT-013` · `atMost: 150` | `SCN-FIT-013` |
| — | traceability | `pnpm --silent fitness:corpus && git diff --exit-code -- features/fitness-checks.feature` | `SCN-FIT-014` |
| `SCN-CHR-005` | — | **deleted, not converted** | — |

**Three rows carry a bar, and the direction is per-row rather than per-characteristic.** A mutation
score is a floor (`atLeast`); a run time is a ceiling (`atMost`). Both live in the same repository
and a blanket word in a table was wrong about one of them — which is the reason a row states its
own direction rather than the engine holding a roster of which characteristics are floors.

**`SCN-FIT-002` is the thirteenth scenario in the generated file, not the second.** Its row was
authored last. The code is read off the row and never derived from the row's position, so seating
it did not renumber anything — which is the whole point of a stable identifier, visible in the
artefact rather than asserted about it.

### The sweep, and the trap inside it

A minted `@SCN` changes every surface that names the old one, and the grep that closes the sweep is
one grep over the whole tree rather than one per conversion — the citation this catches is the one
surviving in a surface no individual conversion looked at.

**Classify every hit; never substitute blindly.** This repository's own sweep was 224 occurrences
of `SCN-FIT-001/002/003` across 24 files, and only 19 of them were the real codes. The rest were
**fixture ids** — planted corpora built as strings inside step definitions, and quoted step
arguments inside a feature file — which had spelled `SCN-FIT-00n` since long before the migration
minted those codes for real. Nothing caught the collision, and nothing could: a fixture id lives in
a string, and the tag lints read tag lines.

**Move fixture ids out of any range a target can mint.** Ours now spell `SCN-AAA-nnn`, and `AAA` is
kept out of the feature-code registry so it can never become a real code. Do this *before* the
mint, not after: a sweep run while the two meanings share a spelling has to be re-run.

**And grep for reads of the artefact, not only for the names.** A citation is one shape; code that
depends on the *shape* of a file is another, and a name-grep cannot see it. Eleven test arms here
pinned *this repository runs a discovered static check* without naming any converted code, and a
docblock claimed a test reconciled against the real workflow file long after its inputs had become
planted. The durable way to size that half of the sweep is to **run the suite, not read for it**.

---

## What this migration leaves open, stated rather than left to be found

**Our own discovery axis now reports a vacuous zero, and it is time-boxed.** Once every fitness
command leaves the pipeline file there is no `lint:`/`guard:` script for a `run:` step to invoke,
so script discovery finds nothing and the *uncited static check* count is `0` — over a tree where
nothing is discoverable. A capability exercised by nothing and reporting green is the exact fault
this product is named for, so the report now says which zero it is rather than leaving a reader to
guess. The residual closes when the reader stops supporting script discovery altogether, which is a
breaking change sequenced after the consumer who still routes credits through it has migrated.

**A skipped scenario is still credited as having run.** The credit is about the wiring and the
verdict travels on the pass's exit code, which is right for the third-answer case and is why
`notExaminedExit` works at all. It also means any *other* route to `skipped` posts a credit for a
check nobody ran. A skip is honest exactly where a row stated the code that produced it; every
other route to one is incidental and worth suspecting.
