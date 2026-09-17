# Fitness checks — what one is, and how you declare it

*A fitness check is a characteristic your codebase must hold. **What you author to declare one
depends on how far you have adopted** — there are three states and you can stop at any of them. This
page states the model; if you are converting existing checks, the checklist is under* Converting an
existing check.*

For the compatibility position — why a `0.x` version promises nothing, and what changes at `1.0` —
see [`compatibility.md`](./compatibility.md). For the flags and the CLI, see
[`how_to_use.md`](./how_to_use.md).

**`balance` executes nothing.** It runs no command and spawns no process. Your pipeline runs your
checks, as it already did; `balance` reads what your pipeline recorded and reconciles it against
what your corpus said was owed.

---

## Three states, and you choose where to stop

Take one check — *every function and module measures inside the external complexity standard.* What
you author for it, and what `balance` can say back, depends on which state you are in.

| state | what you author | what the report says |
| -- | -- | -- |
| **`new-client`** | nothing | every check your pipeline ran, and that not one of them is demanded — each credit posts to the **suspense** row, `cites-no-scenario` |
| **`annotated`** | an `@SCN` on the check's CI step, as the step's `id:` | the same list, now attributed: this credit came from that check. Each posts to a **phantom** row, `cites-unknown-scenario` — nothing yet demands it |
| **`conformant`** | the same id on the CI step, **plus a scenario** carrying that `@SCN`, tagged `@fitness` and written exactly as you write one tagged `@unit` | a reconciliation: what was owed, what ran, and every disagreement named |

**`new-client` costs you nothing and is not a crippled demo.** It genuinely cannot reconcile, because
nothing was declared, so nothing can be owed — and saying that out loud rather than reporting silence
is the whole point of the tool.

**`annotated` costs minutes.** The command does not change; you add an id.

**`conformant` is where reconciliation happens**, and it is the only state in which you write a
scenario. **Your pipeline does not change to get here.** The command is the same, in the same step,
carrying the same id; what changes is that the `@SCN` now names a scenario that exists, so something
demands the credit your check was already producing. The phantom becomes real.

**You write the scenario exactly as you write a `@unit` one** — steps, and a tag naming its axis.
Its steps do not run, in the same way a `@unit` scenario's steps do not: Cucumber is filtered on
`@integration`, `@e2e` and `@performance`, so it selects neither. The steps are the specification;
the runner your CI already calls is what produces the evidence. Getting here from `annotated` is
either your own work or `migrate`'s.

**The row of `specController.fitnessChecks`** — `scn`, `characteristic`, `command`, and
`atLeast` / `atMost` where the check produces a number — carries what is measured and against what
bar. The sections below assume you are heading for `conformant`; if you are stopping at `annotated`,
read them for the row and the CI step and skip the scenario.

The scenario is **written beside its row rather than derived from it**:

```gherkin
  @fitness @SCN-FIT-001
  Scenario: every function and module the push touches measures inside the external complexity standard
    Given this repository's source as this push leaves it, and the files the push touched
    When the external complexity standard is applied across that source
    Then every function and module the push touched measures inside the standard
    And every other site over the standard is reported without failing the run
```

```json
{ "scn": "SCN-FIT-001", "characteristic": "complexity", "command": "eslint" }
```

**That is the whole scenario — a tag line, a title, and steps.** A fitness scenario is a
**declared obligation, not a test**, and nothing runs it: the check is a step of your pipeline, the
pipeline records what that step did, and `balance` reads the record. What its steps must not do is
**grade the run** — "Then the check passes", or "Then the build is green", would make the scenario
both sides of the entry at once. A `Then` states the property asserted, exactly as a `@unit`
scenario's does; whether this push cleared it is the ledger's sentence.

**Two things to write, and that is the point.** A scenario emitted from the row it is reconciled
against cannot disagree with it — that is one author wearing double-entry's clothes, and deleting a
row would take its obligation with it, silently. Authored, the two sides can disagree, which is the
only reason either of them is worth reading.

**So both halves of the pair are faults something says out loud.** The ledger reports a scenario
whose code no row names as unconfigured, and a row whose scenario the corpus does not carry as an
Evidence Obligation nothing observed. Under generation neither could happen and neither could be
reported, which is the same trade every derived artefact makes.

**The `@SCN` is chosen when the check is added, never derived from the scenario's position.** A
positional code would renumber every citation the moment a scenario was inserted, which is the
opposite of what a stable identifier is for. So the corpus's numbering is not contiguous, and that
is the rule working rather than a gap.

**The corpus is checked in.** Generating at pipeline time would put the definition somewhere nobody
can read or review — and now there is nothing to generate: it is a feature file, written by hand,
like every other feature file in the tree.

---

## Annotating your pipeline — the whole of what you write

*This is the whole of what you write, and there is no second route: `balance` reads the record your
pipeline already produces. Its whole cost is one line per check step plus one step at the end.*

### One line per check step, and the line is the `@SCN`

A check that is already a pipeline step needs nothing done to the command:

```yaml
      - name: Import boundaries
        id: SCN-FIT-009
        if: always()
        run: pnpm lint:boundaries
```

**The `id:` is the row's `@SCN`, never a handle of your own choosing.** A handle would need a fourth
artefact mapping it back to a row — a roster, which is the thing this model does without — and the three
authors would become four. The obligation stays in the `@fitness` scenario, the command stays in the
row of `specController.fitnessChecks`, and the step produces the observation; none of the three can
answer for another, which is the only reason reading them together says anything.

**`if: always()` is not the fail-fast trade being abandoned.** The default is `if: success()`, so
`always()` WIDENS: there is no run in which an `always()` step is skipped and an unconditional one
is not. What it buys is that an early red no longer decides the report — check steps are independent
of one another, and a row with no entry in the run record is broken evidence rather than a quiet
absence, so without it one failure would be reported as one failure and nine unknowns.

**Keep invoking the same handle the step already invoked.** Where you run a green-check derived from
the pipeline file, spelling the step as the CLI behind the handle runs the identical check and
silently drops it from that green-check the day the pass is deleted. spec-controller had exactly
such a derivation and deleted it at 3F-3475 — the rule is yours to apply if you keep one.

### One dump step, at the end

```yaml
      - name: Dump this run's step record
        if: always()
        env:
          STEPS_JSON: ${{ toJSON(steps) }}
        run: |
          mkdir -p "$SPEC_CONTROLLER_EVIDENCE_DIR"
          printf '%s' "$STEPS_JSON" > "$SPEC_CONTROLLER_EVIDENCE_DIR/ci-steps.json"
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

### What this route costs a consumer, and what the free end of it reads

Reconciling a pipeline you have not annotated at all is `new-client`: your credits cite nothing, post
to suspense, and answer no obligation. **What that state discovers is every step of the workflows
`--ci` names, whatever the step invokes.** A step is a candidate fitness check unless it runs a
behavioural runner your manifest named, is the reconciler itself, or is a step you named a non-check
— said by subtraction, so there is no rule anywhere about what a check is *called*. A bare
`run: ruff`, a `cargo clippy`, a `uses: github/codeql-action/analyze`: each is read, and each posts.

**The prefix rule this section used to describe is gone**, retired on 2026-09-12 by
[3F-3343](3F-3343). It matched `package.json` script names
against a set of ours — `lint:`, `guard:` — which is a sample of an unbounded set that belongs to
you, so a pipeline whose scripts are `lint`, `typecheck` and `audit` was one the reader could not see
and said nothing about. **Nothing shaped like it replaced it.** The set that is closed is the
*behavioural runners* — one per tier, and the tiers are canon — so you name those and everything
else is a candidate.

**Which half is language-agnostic now, and which half is not.** Deciding whether a step is a
*candidate* reads no manifest and no vocabulary of ours: that half is agnostic, and a repository with
no `package.json` at all has every step of its pipeline on the books. Recognising a *runner* is the
half that is not — but it is smaller than it sounds. A runner is matched as a **whole shell token of
the step's own command** first, so `pytest -q` and `poetry run pytest tests/` are both recognised
with no manifest script involved. What needs your `package.json` is the second clause, the hop
through a script alias — `pnpm test` → `vitest` — and that clause exists precisely because Node
pipelines are the ones that hide the runner behind an alias. What genuinely stays Node-shaped is
narrower still: **the place you write the configuration.** `runners` and `notChecks` live under
`specController` in a `package.json`, so a repository that has none adds a stub file to say anything
at all.

**The residue is a false positive, in the one direction you can see.** Two shapes of runner step are
not recognised, and each leaves the step **on the books as a candidate** rather than quietly out of
them: a suite run through an **action** (`uses:`), because the rule is about a command and an action
states none; and a runner buried in a **quoted argument** to a wrapper — `./step-threshold unit
"pytest -q"` — because tokens are whole and never substrings. Each costs one line of `notChecks`, and
you can *see* that it cost you one. That is the entire argument for the inversion: under the retired
rule silence hid checks you **have**, and a false negative is invisible.

**Your first run reds, and it is meant to.** Every candidate cites nothing, so every credit posts to
suspense and `balance` exits 1. That is the ledger being right about a corpus that demands nothing
yet, not the tool failing to start — and it is the number that shrinks as you convert. Adopting by
observing rather than by redding the build is
[3F-3100](3F-3100), and it is not in the tool today.

**`annotated` was never manifest-shaped either, and that is the point of putting the citation on the
step.** An `id:` is a key of the step mapping, the command below it is any command in any language,
and nothing in the resolution reads a manifest. A pipeline that annotates its check steps is read the
same way whatever it builds.

---

## No step definitions at all, however many checks convert

A converted check's row carries its `@SCN`, its characteristic and its command. Nothing that varies
between two checks is in the corpus, and nothing that is *common* to them is either — this product
runs no check on your behalf and binds nothing to your scenario's steps:

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

## What you have afterwards — the check is the command, and the pipeline is the enumerator

**A converted check is not trapped anywhere.** Every row's `command` is a command you can run in a
terminal, on its own, and its exit code is the check's verdict. The conversion took nothing away:
the row holds the same string the CI step holds.

Most rows are exactly that — a command you already run, or one off the shelf:

```sh
eslint
pnpm typecheck
```

Exit 0 is the check passing. No runner, no `balance`, no ceremony. That matters most when a check
reds: you debug it by running it, not by reading a report about it.

**The other three read a number something else produced, and one rule governs all three.**

| row | what its command reads |
| -- | -- |
| `SCN-FIT-012` / `SCN-FIT-013` | a suite timing placed by the run that measured it |
| `SCN-FIT-002` | the record placed from the nightly mutation sweep |

**A measurement is read only if THIS RUN placed it, and the placement decides freshness before
placing.** The mechanism is **absence, not a timestamp**: past the window nothing is placed, the
command has nothing to print, its step reds, and the row reads `missing` — the true sentence, the
sweep has lapsed. No clock lives in the reader and none lives on the row.

**"Nothing is placed" is only half of the rule — a refusal also REMOVES.** Placing nothing has no
effect at all on an evidence root that OUTLIVES the run: the last run's copy is still sitting
there, the row's own command reads it, and the row is settled by a number this run has already
refused. So each placement's first act is to delete the one record it answers for, and the age test
then decides whether it comes back. That is what makes stale and absent the same observable, which
is the claim the paragraph above rests on. It removes that one record and never the root — the
other placements' records are not its to touch.

**The window is a derivation, not a constant: the producer's cadence plus a margin.** A nightly
sweep is **24 h + 2 h = 26 h**. A twice-daily sweep reads the same rule and gets 14. Copy the
derivation, never our number.

⚠️ **Ordering is not a freshness mechanism.** A step placed ahead of the producer it reads meets an
absent artefact and its row reads `missing` — which is the placement rule working, not a second
rule beside it. Do not reason about which step runs first as though that were what makes a
measurement valid.

| row | why it cannot be run cold |
|---|---|
| `SCN-FIT-012` / `SCN-FIT-013` | `timing:score` reads a measurement the behavioural suite wrote **earlier in the same run** |
| `SCN-FIT-002` | `mutation:score` reads the record placed from the **nightly sweep**, and only while it is inside its window |

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

## Two things that are easy to get wrong

**1. A reader-shaped check's step is answered by placement, not by position.** Some rows read what
another step produced: a mutation sweep's placed record, a suite's own timing. If nothing placed a
measurement for this run, the row reads `missing` and says so — whatever order the steps ran in.
Putting such a step ahead of its producer therefore fails loudly rather than silently, which is the
design and not a hazard to route around.

**A run-time check is the archetype of that shape, not an exception to it.** The wall-clock a suite
took cannot be measured from inside the step that reports it, so the measuring happens where the
suite runs — a timing wrapper around the step, writing a record — and the reading happens in a step
of its own, from a row whose command is a cheap reader over that record.

**2. `if: always()` goes on every check step, not only the dump.** Without it the first red aborts
the job, every later check step is skipped, and the ledger reports one `failing` and N `broken` — a
worse account from a correct mechanism. The checks are independent of one another: one's red says
nothing about another's.

---

## What this leaves open, stated rather than left to be found

**A discovery axis with nothing to discover reports a vacuous zero, and annotating the pipeline is
what ends it.** A capability exercised by nothing and reporting green is the exact fault this
product is named for, so the report says *which* zero it is rather than leaving a reader to guess:
`0` uncited out of N discovered is a zero the axis reached, and `0` out of `0` is one it inherited.
The residual that remains is the opposite shape and is stated where it belongs: discovery now reads
every step it is pointed at, so what it can get wrong is a step reported as a check that is not one
— the false positive named above, visible on the report and answered in one line of `notChecks`.

**A check that did not run is not credited, and it is the part of the model worth reading twice
before you convert.** A fitness credit says the check RAN, so the reader reads what the run's own
record says about the running:

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
fails closed unaided. A STATIC row needs **two facts from two places** — its step's status from the
run record, and its own existence from your manifest — because one fact alone is something a skip
can supply for free. That is why the two kinds are not made alike: the static row is given its
second fact instead.

**There is no field by which a row declares its own not-examined ending, and there must not be.** A
step record carries a **status and no exit code**, so such a declaration could only be read for
*whether it was named*, never checked against anything — `if: false` beside a declared ending would
read satisfied for ever: a check switched off, green in the ledger, through the product's own
configuration, and single-entry in the double-entry product.

A command that examines nothing **still runs and still ends**, so its step reads `success` or
`failure` and is never `skipped`. A skip means a condition went false, the job was cancelled, or
somebody moved the step — never that. The field could not name what it claimed to.

**Say it in your own `run:` line**, where your CI records an honest success:

    - name: PR metadata
      id: SCN-CHK-021
      if: always()
      run: pnpm check:pr-metadata || [ $? -eq 3 ]

### One limit, stated so you do not discover it

**This section carried two, and the first has been retired rather than restated.** `new-client` was
Node-shaped: the zero-annotation state found your checks by matching `package.json` script names
against observed prefixes, so a pipeline with a bare `run: ruff` and no `package.json` script derived
nothing and its report was empty rather than useful. **That is no longer how discovery works.** A
prefix list samples an unbounded set — the names your team gives its checks — and the set of
*behavioural runners* is closed, one per tier, so you name those and **everything else in your
pipeline is a candidate fitness check**. `ruff`, `mypy` and `cargo clippy` are discovered without one
line of ours knowing those words. What that leaves is a false positive you can read and correct, not
a silence; it is stated in full under *What this route costs a consumer* above, and the keys are in
the checklist below.

**A check that legitimately applies to only some platforms is not served.** A matrix build uses
`if:` to skip such a step, and that skip now reds. *"The command examined nothing"* and *"this row
was not obliged on this run"* are different claims, and conflating them is exactly what built the
hatch above — so this one gets its own name and its own second book if it is needed, never a
self-certification.

**An authored corpus cannot be emptied silently, and that is what authoring it buys.** A manifest
whose `fitnessChecks` key is unreadable holds zero rows. A corpus emitted from those rows would
empty with them, and no rule above could see it. Authored, the corpus stands: every scenario in it
is one no row configures, and the ledger's census names each of them.

## Converting an existing check — the checklist

1. **Name your behavioural runners, and the steps that are not checks.** This comes first because it
   is what you write before anything else, converted check or not: until the tool knows which steps
   run your suites, they are candidate fitness checks like everything else.

   ```jsonc
   "specController": {
     "runners": {
       "unit": "vitest",             // the command your CI runs for @unit
       "integration": "cucumber-js", // for @integration
       "e2e": "cucumber-js",         // two tiers, one runner, which is normal
       "performance": null           // we have no performance runner
     },
     "notChecks": [
       "ci.yml:build:actions/checkout@v5",
       "ci.yml:build:Install dependencies"
     ]
   }
   ```

   **`runners` is keyed by the four canon tiers and by nothing else** — `unit`, `integration`, `e2e`,
   `performance`. A value is a runner's name or `null`, and **`null` is a statement rather than a
   blank**: it says *we have no runner for this tier*, the report says so, and that is a different
   sentence from omitting the key, which the report reads back as *you have not told us*. **A key
   outside the four is reported as unrecognised and excludes nothing** — a typo is neither honoured
   silently nor a reason to abort your run. **No block at all is not an error**: every step becomes a
   candidate, which is exactly the report `new-client` is sold on.

   **A runner is matched as a whole shell token, never as a substring** — of the step's own command,
   or of the `package.json` script the step invokes, following script-to-script aliases three deep.
   The alias hop is there because a real pipeline runs `pnpm test`, not `vitest`. Whole tokens are
   load-bearing rather than fastidious: a substring rule excludes a step whose *path argument*
   happens to contain a runner's name, and a step wrongly excluded is invisible.

   **`notChecks` is your list of steps that are neither runners nor checks** — a checkout, an
   install, an artefact upload, a deploy. An entry is `<workflow file>:<job id>:<step name>` and is
   matched **exactly**: no prefix form, no glob, no bare name, because the same step name is a check
   in one workflow and plumbing in another and a bare name would take out both. **To take a whole
   workflow out, point `--ci` somewhere narrower** rather than listing its steps. An excluded step is
   **named on the report** rather than dropped, and **an entry that matches no step is itself
   reported as stale** — so a line you wrote once and outgrew tells you so instead of quietly
   protecting nothing.

   **You never write the reconciler in either list.** `spec-controller balance` and its
   `toJSON(steps)` dump are excluded **by construction**: the reconciler is not one of the reconciled
   rows, and that holds for a manifest that says nothing at all. Both keys are documented in
   [`how_to_use.md`](./how_to_use.md).

2. **Write the row** — `scn`, `characteristic`, `command`, plus `atLeast` / `atMost` where the check
   produces a number.
3. **Give the scenario the axis tag** and remove its characteristic tag. Write the scenario in your
   fitness corpus and the row beside it; neither half is derived from the other, which is what makes
   a scenario with no row, and a row with no scenario, something a run can report.
4. **Leave the command exactly where it is, and give its step the scenario's code as its `id:`.**
   A converted check is still a CI step; what changes is that the step now carries a citation, and
   that the job ends with one `toJSON(steps)` dump the reconciler reads.
5. **Sweep the citations.** A minted `@SCN` changes every surface that names the old one — the
   corpus, step ids, unit-test pins, docblocks, workflow comments, the decision log. Grep for the
   retired code and expect zero hits.
6. **Watch out for a measured check whose producer runs on another cadence.** Renaming the `@SCN`
   of a static check touches only your own tree. A measured check's number is stamped with that
   `@SCN` by whatever *produced* it — a nightly sweep, a scheduled job — and read back by both
   terms. If the producer runs on a different schedule, or on a different branch, the newest record
   available to your build was written by the code you are replacing, and the rename desynchronises
   the two for as long as it takes the producer to run again. **There is no atomic version of that
   change**, and the two honest routes are:

   - **Expand / contract.** The reader accepts the superseded
     code for one cycle. Say it on the row's own command line rather than in a manifest field —
     the only thing that has to understand it is the row's *own reader*, which is your program, not
     the reconciler, and the command line is the form a consumer can copy:

     ```json
     { "scn": "SCN-FIT-002", "characteristic": "mutation",
       "command": "pnpm --silent mutation:score --supersedes SCN-MUT-011",
       "atLeast": 80 }
     ```

     Move the **producer** to the new code in the same commit, or the transition never contracts.
     Then take the flag off once one producer run has stamped the new code — **a transition with no
     end is a resting state wearing a transition's name**, so file its removal as you add it.
   - **Take the transient deliberately.** Rename both sides and accept a red window between the
     merge and the producer's next run. Honest, and announced rather than discovered.

   The route that is not available is deferring the mint indefinitely. A code is stable
   forever and survives a feature-file rename, so a check may keep its code while its scenario
   moves — but a migration that leaves one check in the old numbering has not migrated, it has
   stopped.
7. **Compare the ledger shape, not the rows.** Every `@SCN` changed, so a row-for-row diff says
   nothing. Same characteristics claimed, same obligation count, same satisfied / missing verdicts,
   against a baseline captured **before the first edit**.
8. **Prove the comparison has teeth.** A matching ledger is also what *not migrating* produces.
   Break one row's `scn` so its credit cites nothing, confirm the comparison reds, and
   restore. A comparison whose teeth are unproven is a diff that is not looking.
