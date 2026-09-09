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

That adjacency no longer exists in the tree: `SCN-CPX-005` left when its scenario moved into the
fitness corpus, and `SCN-CPX-006` follows it. Which is why it is written down here —
reconstructing it from a diff afterwards reads as archaeology rather than as an example.

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
- It carries **no steps at all**. A fitness scenario is a characteristic and a threshold, and
  nothing in it is executable. *(It carried one sentence while a cucumber pass bound it; that pass
  is deleted — see the annotation route below.)*
- Its subject lives in **data** — one row of `specController.fitnessChecks`:

  ```json
  { "scn": "SCN-CPX-005", "characteristic": "complexity", "command": "eslint" }
  ```

- **Your pipeline runs that command**, as the step it already was, carrying `id: SCN-CPX-005`.
  **That step's entry in the run's own record IS the credit**, keyed by the code the step carried.
- No script handle to discover, no registry entry, no corpus lookup behind either.

The proof that the check ran is now *an entry in the run's own record*, which is stronger than *a
workflow file mentions it* — and it is the enumeration the fitness checks were missing. A linter
reports findings only, so its silence is ambiguous between *nothing was wrong* and *nothing looked*.
A CI run reports every step it ran and what each one did.

---

## What the after looks like today

The scenario above lives in the fitness corpus now, under `@SCN-FIT-001`, **written beside its row
rather than derived from it**:

```gherkin
  @fitness @SCN-FIT-001
  Scenario: every function and module measures inside the external complexity standard, or inside its recorded exception
    Then the check this scenario names finds no violations
```

```json
{ "scn": "SCN-FIT-001", "characteristic": "complexity", "command": "eslint" }
```

**Two things to write, and that is the point.** For one commit's length this repository EMITTED the
corpus from the rows (3F-3164) and guarded it with a regenerate-and-diff row; 3F-3243 deleted the
guard and 3F-3244 the generator. A scenario emitted from the row it is reconciled against cannot
disagree with it, so the axis had one author wearing double-entry's clothes: delete a row and its
scenario went with it, silently. Authored, the two sides can disagree — which is the only reason
either of them is worth reading.

**So both halves of the pair are now faults something says out loud.** A scenario whose code no row
names reds the pass, because there is no command for it to run, and the ledger's census names it. A
row whose scenario the corpus does not carry reconciles as an Evidence Obligation nothing observed.

**The `@SCN` is chosen when the check is added, never derived from the scenario's position.** A
positional code would renumber every citation the moment a scenario was inserted, which is the
opposite of what a stable identifier is for. So the corpus's numbering is not contiguous, and that
is the rule working rather than a gap.

**The corpus is checked in.** Generating at pipeline time would put the definition somewhere nobody
can read or review — and now there is nothing to generate: it is a feature file, written by hand,
like every other feature file in the tree.

---

## No step definitions at all, however many checks convert

A converted check's row carries its `@SCN`, its characteristic and its command. Nothing that varies
between two checks is in the corpus, and nothing that is *common* to them is either — a fitness
scenario is **stepless**, and this product runs no check on its behalf:

| the row | how its credit arrives | what is asserted |
|---|---|---|
| no bar | its step's **outcome** in the run's own record | the command's **exit code** |
| a bar (`atLeast` / `atMost`) | its command writes a **number** into the run's measurement record; its step's presence says it ran | the number, held against the bar by the ledger |

**The row's shape says which kind of check it is** — no type field, no second tag, no roster of
measured characteristics for somebody to keep in step with the rows.

**The bar is nowhere near the producer and must never be.** One bar per characteristic, and it
belongs to the ledger. A measured row is answered when its command *wrote a number down*; whether
that number clears the bar is the ledger's sentence. A producer comparing its own number would be
grading its own homework, and the reconciliation would transcribe a verdict rather than reach one.

---

## Two things that are easy to get wrong

**1. A reader-shaped check's step runs BEHIND the step it reads.** Some rows read what an earlier
step produced: a mutation sweep's banked record, the behavioural suite's own timing. Put such a
step ahead of its producer and it meets an absent artefact and its row reads `missing` **while you
do exactly what the documentation told you**. This is the one part of the design that is easy to
get wrong by accident.

**A run-time check is the archetype of that shape, not an exception to it.** The wall-clock a suite
took cannot be measured from inside the step that reports it, so the measuring happens where the
suite runs — a timing wrapper around the step, writing a record — and the reading happens in a step
of its own, from a row whose command is a cheap reader over that record. spec-controller's own two
are `@SCN-FIT-012` (its unit suite) and `@SCN-FIT-013` (its behavioural suite).

**2. `if: always()` goes on every check step, not only the dump.** Without it the first red aborts
the job, every later check step is skipped, and the ledger reports one `failing` and N `broken` — a
worse account from a correct mechanism. The checks are independent of one another: one's red says
nothing about another's.

---

## The migration, as a checklist

1. **Write the row** — `scn`, `characteristic`, `command`, plus `atLeast` / `atMost` where the check
   produces a number.
2. **Give the scenario the axis tag** and remove its characteristic tag. Write the scenario in your
   fitness corpus and the row beside it; neither half is derived from the other, which is what makes
   a scenario with no row, and a row with no scenario, something a run can report.
3. **Leave the command exactly where it is, and give its step the scenario's code as its `id:`.**
   A converted check is still a CI step; what changes is that the step now carries a citation, and
   that the job ends with one `toJSON(steps)` dump the reconciler reads.
4. **Sweep the citations.** A minted `@SCN` changes every surface that names the old one — the
   corpus, step ids, unit-test pins, docblocks, workflow comments, the decision log. Grep for the
   retired code and expect zero hits.
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
   Break one row's `scn` so its credit cites nothing, confirm the comparison reds, and
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
*failed*, carried on an exit code the check itself uses. *(That answer was briefly opt-in per row via a
`notExaminedExit` field; the field is gone — 3F-3252 — and a command whose subject is sometimes
absent now absorbs it in its own CI `run:` line.)* *Do not fail on it* must not resolve to a pass — a scenario that goes green having
examined nothing is the fault this product is named for.

**Mint the codes last, and mint them all.** A code minted early is a code every later sub-issue has
to sweep again.

| # | what | shape |
|---|---|---|
| 1 | the CI-only check learns a third answer | new behaviour |
| 2 | spec-controller learns to read that answer | changed behaviour |
| 3 | ~~the third answer becomes opt-in per row (`notExaminedExit`)~~ — **later removed, 3F-3252** | changed behaviour |
| 4 | ~~a row stating an exit of 0 or 1 for it is refused when the config is read~~ — **removed with the field** | new behaviour |
| 5 | the generator, its drift guard, and the first two rows | refactor |
| 6 | the eight static checks convert; their CI steps leave the workflow | refactor |
| 7 | `typecheck` and the two run-time bars convert; the threshold key folds in and leaves | refactor |
| 8 | the check that cannot convert is deleted, with its scenarios | deletion |
| 9 | the reader learns to answer a row from a measurement stamped with a superseded code | changed behaviour |
| 10 | the citation sweep, the last mint, and this page | refactor |
| 11 | the drift guard, then the generator: the corpus becomes authored | refactor |

Steps 1–4 and 9 were **not planned**. Every one was found by a sub-issue running a *plant* instead
of accepting a green.

### The old → new mapping

Three further rows — the `vocab` characteristic's, converted to `SCN-FIT-004` / `-005` / `-006` —
were retired outright when the vocabulary audit left the tree (3F-3211). The conversion they
document still happened; there is simply nothing left on either side of it to map.

| old `@SCN` | characteristic | command on the row today | new `@SCN` |
|---|---|---|---|
| `SCN-CPX-005` | complexity | `eslint` | `SCN-FIT-001` |
| `SCN-MUT-011` | mutation | `pnpm --silent mutation:score --supersedes SCN-MUT-011` · `atLeast` | `SCN-FIT-002` |
| `SCN-CPX-006` | complexity | `pnpm lint:complexity-exceptions` | `SCN-FIT-003` |
| `SCN-LNT-011` | traceability | `pnpm lint:feature-codes` | `SCN-FIT-007` |
| `SCN-STG-006` | traceability | `pnpm lint:scn-tags` | `SCN-FIT-008` |
| `SCN-ANM-002` | tech-conformance | `pnpm lint:anemic-domain` | `SCN-FIT-009` |
| `SCN-SSM-009` | traceability | `pnpm lint:scn-subissues` | `SCN-FIT-010` |
| `SCN-API-003` | typecheck | `pnpm typecheck` | `SCN-FIT-011` |
| `SCN-CIP-013` | ci-run-time | `pnpm --silent timing:score --scn SCN-FIT-012` · `atMost: 75` | `SCN-FIT-012` |
| `SCN-CIP-014` | ci-run-time | `pnpm --silent timing:score --scn SCN-FIT-013` · `atMost: 150` | `SCN-FIT-013` |
| `SCN-CHR-005` | — | **deleted, not converted** | — |

**Three rows carry a bar, and the direction is per-row rather than per-characteristic.** A mutation
score is a floor (`atLeast`); a run time is a ceiling (`atMost`). Both live in the same repository
and a blanket word in a table was wrong about one of them — which is the reason a row states its
own direction rather than the engine holding a roster of which characteristics are floors.

**`SCN-FIT-002` is the tenth scenario in the corpus, not the second.** Its row was authored last.
The code was chosen when the check was added and never derived from anything's position, so seating
it did not renumber anything — which is the whole point of a stable identifier, visible in the
artefact rather than asserted about it.

### What you have afterwards — the check is the command, and the pipeline is the enumerator

**A converted check is not trapped anywhere.** Every row's `command` is a command you can run in a
terminal, on its own, and its exit code is the check's verdict. The conversion took nothing away:
the row holds the same string the CI step holds.

Nine of this repository's twelve rows are exactly that.

```sh
eslint
pnpm lint:complexity-exceptions
pnpm lint:feature-codes
pnpm lint:scn-tags
pnpm lint:anemic-domain
pnpm lint:scn-subissues
pnpm typecheck
pnpm --silent doc:compatibility-examples
pnpm doc:paths
```

Exit 0 is the check passing. No runner, no `balance`, no ceremony. That matters most when a check
reds: you debug it by running it, not by reading a report about it.

**The other three are not self-contained, and each names its own reason** — which is the clearest
statement of `Freshness` a reader of this page will meet.

| row | why it cannot be run cold |
|---|---|
| `SCN-FIT-012` / `SCN-FIT-013` | `timing:score` reads a measurement the behavioural suite wrote **earlier in the same run** |
| `SCN-FIT-002` | `mutation:score` reads the record borrowed from the **nightly sweep**, and only while it is inside its window |

The first two are why their steps run behind their producers, and they are one shape at two
cadences: evidence
collected somewhere other than the moment the row is read. `Freshness` is what decides whether it
still counts — immediate for a push-path check, satisfied by construction because the suite that
wrote the report ran in the same build; an explicit window for a scheduled one, so a nightly that
stops running reds on its own once the window lapses.

**So what does the pipeline add, if the commands already work?** Enumeration, and only enumeration.
A check reports what it found and says nothing when it finds none, so its silence cannot be told
from its absence. Running the commands by hand gives you each one's verdict; running them as steps
of your pipeline makes **every configured row appear in that run's own record, whatever it did** —
so a check that quietly stopped running shows up as a row the record carries no step for instead of
as no output at all.

**The commands are the evidence. Your pipeline is what makes the set of them observable.** That
sentence is the whole of why the scenarios exist, and it is the one a product copying this
migration should take away.

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

## Annotating the pipeline instead of running a pass — what a consumer writes

*There was once a cucumber pass here, and it was a second record of what a pipeline already did.
This section is the route that reads the first one, and since `3F-3272` it is the only route: the
pass is deleted, not kept as a second supported path. Its whole cost is one line per check step plus
one step at the end.*

### One line per check step, and the line is the `@SCN`

A check that is already a pipeline step needs nothing done to the command:

```yaml
      - name: Feature codes
        id: SCN-FIT-007
        if: always()
        run: pnpm lint:feature-codes
```

**The `id:` is the row's `@SCN`, never a handle of your own choosing.** A handle would need a fourth
artefact mapping it back to a row — the roster this repository keeps deleting — and the three
authors would become four. The obligation stays in the `@fitness` scenario, the command stays in the
row of `specController.fitnessChecks`, and the step produces the observation; none of the three can
answer for another, which is the only reason reading them together says anything.

**`if: always()` is not the fail-fast trade being abandoned.** The default is `if: success()`, so
`always()` WIDENS: there is no run in which an `always()` step is skipped and an unconditional one
is not. What it buys is that an early red no longer decides the report — check steps are independent
of one another, and a row with no entry in the run record is broken evidence rather than a quiet
absence, so without it one failure would be reported as one failure and eleven unknowns.

**Keep invoking the same handle the step already invoked.** Where your green-check is derived from
the pipeline file — spec-controller's own `pnpm verify` is (`scripts/verify.sh`) — spelling the step
as the CLI behind the handle runs the identical check and silently drops it from that green-check
the day the pass is deleted.

### One dump step, at the end

```yaml
      - name: Dump this run's step record
        if: always()
        env:
          STEPS_JSON: ${{ toJSON(steps) }}
        run: |
          mkdir -p "$SPEC_CONTROLLER_EVIDENCE_DIR/runs/self-balance"
          printf '%s' "$STEPS_JSON" > "$SPEC_CONTROLLER_EVIDENCE_DIR/runs/self-balance/ci-steps.json"
```

**Only a step carrying an `id:` is in the `steps` context at all.** That is GitHub's rule rather
than a filter written here, so checkout, the toolchain setup and the install do not appear and the
dump needs no discriminator of its own.

**It carries `if: always()` because its whole value is the red run.** A record written only on green
builds describes the one case nobody needed a record of.

**The JSON crosses through `env:` and not into the command line.** A `${{ }}` expansion inside `run:`
is substituted into the script before the shell sees it, so a step name containing a quote would end
the string and the rest would be shell. As an `env:` value it is data.

### The reader takes `outcome`, and never `conclusion` — stated once, so nobody re-derives it

A step object carries both, and they differ on exactly one case: `conclusion` is `outcome` after
`continue-on-error` has been applied. A step marked `continue-on-error: true` that ran and failed
reports `outcome: failure` and `conclusion: success`. **A reader taking `conclusion` is therefore
green over a masked failure** — a one-line watermelon inside the product named for finding them.

That is also why this record cannot come from the workflow-runs API. Its step object carries
`completed_at`, `conclusion`, `name`, `number`, `started_at` and `status` — no `outcome`, and no
`id`. The dump is not one source among two; it is the only one.

The three endings a check step can reach map onto the ledger like this, and the middle row is the
one worth reading twice:

| the step | what the ledger posts |
| -- | -- |
| `outcome: success` | the row's credit, passing |
| `outcome: failure` | the row's credit, **failing** — the check ran and said no |
| no entry for the row at all | **broken** — the check never ran, the run is unsound, `balance` exits 4 |

A failed check is `failing`, never `broken`. `broken` is reserved for the case where nothing can be
said about whether the check ran, and it is the one that stamps the whole run unsound rather than
merely out of balance.

### What this route costs a consumer, and the named limit on the free end of it

Reconciling a pipeline you have not annotated at all is `new-client`: your credits cite nothing, post
to suspense, and answer no obligation. **That free state is Node-shaped today, and the reason is
worth stating rather than leaving to be found.** Script discovery ranges over
`Object.keys(packageJson.scripts)` (`packages/core/src/parse/runningStaticChecks.ts`) — a check is
discovered when a script name carries an observed prefix and a `run:` step invokes it — so a
pipeline with no `package.json` presents no scripts, and a Go or Rust repository gets a
zero-annotation reading of "nothing discoverable" rather than a wrong one.

**`minimal-adherence` has no such shape, and that is the point of putting the citation on the step.**
An `id:` is a key of the step mapping, the command below it is any command in any language, and
nothing in the resolution reads a manifest. A pipeline that annotates its check steps is read the
same way whatever it builds.

---

## What this migration leaves open, stated rather than left to be found

**Our own discovery axis used to report a vacuous zero, and annotating the pipeline is what ended
it.** While every fitness command was inside the pass there was no `lint:`/`guard:` script for a
`run:` step to invoke, so script discovery found nothing and the *uncited static check* count was
`0` over a tree where nothing was discoverable — a capability exercised by nothing and reporting
green, which is the exact fault this product is named for. The report said which zero it was rather
than leaving a reader to guess, and that was the whole of the answer. The five check steps of the
section above put five discoverable scripts back, each cited by its step's `id:`, so the count is
now `0` uncited out of five discovered — a zero the axis reached rather than one it inherited. The
residual that remains is the opposite shape and is stated where it belongs: script discovery is
Node-shaped, which is the named limit above.

**A check that did not run is no longer credited — this one is CLOSED, and it is the part of the
model worth reading twice before you convert.** This section used to say that a skipped scenario is
still credited as having run, that any route to `skipped` other than the third answer posts a credit
for a check nobody ran, and that such a route is worth suspecting. It is a mechanism now rather than
a suspicion.

A fitness credit says the check RAN, so the reader reads what the run's own record says about the
running:

| what the record says of your row's step | what the ledger does |
| -- | -- |
| `outcome: success` | credits the row — the check ran and found nothing |
| `outcome: failure` | a **failing** observation — the check ran and found something, out of balance whatever the job concluded |
| **any skip whatever its cause**, a `cancelled` step, a status nobody anticipated | **broken evidence** — the row's Evidence Obligation reconciles `missing`, the run is unsound, `balance` exits **4** |
| **no entry at all**, for a row a handed-over record never carried | **broken evidence**, citing that row |
| **no record handed over at all** | unchanged — the rows reconcile `missing` and the run is out of balance at exit **1** |

The last two rows are one rule read twice. Your rows come from your manifest and their enumeration
comes from the run's own record, so emptying either leaves the other standing — which is why an
emptied corpus now reds instead of balancing over nothing, and why a target that has converted
nothing (no annotation, no dump) is untouched. Nothing in the record can reach your manifest to
forge the other half.

**And a LOCAL run is that last row, which is worth knowing before you meet it.** The dump is a step
of your pipeline; running `balance` on your own machine hands it no record, so every configured row
reconciles `missing` and the run is out of balance rather than unsound. The checks still run
locally — they are commands — and their teeth are their own exit codes. What a local run does not
have is the credit journal, because the credit journal is the pipeline's.

**If every row you convert is static, that difference is yours to know about.** A MEASURED row's
credit is a number something has to produce, so a step that never runs produces none and the row
fails closed with no help from anything. A STATIC row's credit used to be the scenario's APPEARANCE
in a report — one fact, and a skip supplies it for free — so one hook over the whole axis used to
leave every static row satisfied while only the measured ones redded. The repair gives the static row its
second fact rather than making the two kinds alike. A repository whose rows are all static had
nothing redding on its behalf at all, and now does.

**That residual is CLOSED, and closing it is why `notExaminedExit` no longer exists (3F-3252).** A
row that named its ending could still be skipped by an `if:` condition and would still be credited,
because a step record carries a **status and no exit code** — so the declaration could only be read
for *whether it was named*, never checked against anything. `if: false` beside a declared ending
would have read satisfied for ever: a check switched off, green in the ledger, through the product's
own configuration, and single-entry in the double-entry product.

A command that examines nothing **still runs and still ends**, so its step reads `success` or
`failure` and is never `skipped`. A skip means a condition went false, the job was cancelled, or
somebody moved the step — never that. The field could not name what it claimed to.

**Say it in your own `run:` line**, where your CI records an honest success:

    - name: PR metadata
      id: SCN-CHK-021
      if: always()
      run: pnpm check:pr-metadata || [ $? -eq 3 ]

### Two limits, stated so you do not discover them

**`new-client` is Node-shaped today.** The zero-annotation state finds your checks by matching
`package.json` script names against observed prefixes, so a pipeline with a bare `run: ruff` and no
`package.json` script derives nothing and its report is empty rather than useful.
**`minimal-adherence` is not** — the `id:` carries the citation whatever the command is, in any
language. Widening the discovery is its own ticket and fires when a non-Node consumer appears.

**A check that legitimately applies to only some platforms is not served.** A matrix build uses
`if:` to skip such a step, and that skip now reds. *"The command examined nothing"* and *"this row
was not obliged on this run"* are different claims, and conflating them is exactly what built the
hatch above — so this one gets its own name and its own second book if it is needed, never a
self-certification.

**The second residual is closed, and closing it is what an authored corpus buys.** A manifest whose
`fitnessChecks` key is unreadable holds zero rows. While the corpus was emitted from those rows it
emptied with them, and no rule above could see it. Authored, the corpus stands: every scenario in it
is now one no row configures, so the ledger's census names each of them as a fitness scenario no
configured row names.
