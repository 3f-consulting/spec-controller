# Adopting fitness checks — what one is, and how you declare it

*A fitness check is a whole-system property your codebase must hold, and **one `@fitness` scenario
is one check**: its title says what the check is about, and its `@SCN` is its identity. **What you
author to declare one depends on how far you have adopted** — there are three states and you can
stop at any of them. This page states the model; if you are converting existing checks, the
checklist is under* Converting an existing check.*

For the compatibility position — why a `0.x` version promises nothing, and what changes at `1.0` —
see [`compatibility.md`](./compatibility.md). For the flags and the CLI, see
[`how_to_use.md`](./how_to_use.md).

**`balance` executes nothing.** It runs no command and spawns no process. Your pipeline runs your
checks, as it already did; `balance` reads what your pipeline recorded and reconciles it against
what your corpus said was owed.

---

## What spec-controller assumes

**Not a task tracker. Not a documentation spec. Automated tests — unit, integration, e2e, performance — and fitness checks in CI.**

You need no feature files to begin. A tree with none, or with feature files not tagged to
spec-controller's model, is `new-client`; scenarios tagged to the model are what `conformant` adds,
not the precondition for starting. **Your tracker keeps the work**: a ticket is a change, a scenario
is behaviour the system has now, and they meet only where one piece of work creates, reads, updates
or deletes one scenario.

**Test validity is assumed, and deliberately so.** spec-controller reconciles a result — the
evidence observation — to the test that claimed it — the evidence obligation. Whether that test
reflects the behaviour the business wants is yours to ensure, as it is under CI, TDD and BDD; the
tool does not try to establish that a test is a good test.

**Dead documentation is a gap in this process**, and it is the first thing under
[*What this leaves open*](#what-this-leaves-open-stated-rather-than-left-to-be-found): wherever the
runner is not Cucumber — usually `@unit`, `@performance` and `@fitness` — a scenario's steps are
never executed. The ledger proves a scenario is linked to evidence and that the evidence passed.
**It does not prove the evidence tests what the steps say.**

---

## Three states, and you choose where to stop

Take one check — *every function measures inside the external complexity standard.* What
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
the runner your CI already calls is what produces the evidence. That is the dead-documentation gap
named above: nothing executes those steps, so nothing reds if they come to say something the check
does not. Getting here from `annotated` is either your own work or `migrate`'s.

**There are two artefacts and no third: the `@fitness` scenario, and its `@SCN` as the `id:` of the
CI step that runs the check.** The scenario raises the obligation — from its tag, exactly as a
`@unit` scenario's tag does — and the step's outcome answers it. Nothing else declares a check: no
manifest list, no bar (a check that produces a number applies its own and exits non-zero below it),
and no word for what the check is about, because the scenario's title says that and the `@SCN` is
the identity the ledger reads. The sections below assume you are heading for `conformant`; if you
are stopping at `annotated`, read them for the CI step and skip the scenario.

**`specController.fitnessChecks` is not read.** A `package.json` still carrying the key is read exactly as one carrying any other key
this tool does not read: it is passed over, and named under `## Configuration not read` in the same
words as a misspelling, with nothing said about what it once did. The two artefacts above are the
whole of what you author.

The scenario is **written beside the pipeline rather than derived from it**:

```gherkin
  @fitness @SCN-<FFF>-<NNN>
  Scenario: every function the push touches measures inside the external complexity standard, and no dead suppression survives
    Given this repository's source as this push leaves it, and the files the push touched
    When the external complexity standard is applied across that source
    Then every function the push touched measures inside the standard
    And every other function over the standard is reported without failing the run
    And no suppression directive that suppresses nothing survives the run
```

**That is the whole scenario — a tag line, a title, and steps.** A fitness scenario is a
**declared obligation, not a test**, and nothing runs it: the check is a step of your pipeline, the
pipeline records what that step did, and `balance` reads the record. What its steps must not do is
**grade the run** — "Then the check passes", or "Then the build is green", would make the scenario
both sides of the entry at once. A `Then` states the property asserted, exactly as a `@unit`
scenario's does; whether this push cleared it is the ledger's sentence.

**Two things to write, and that is the point.** A scenario emitted from the pipeline it is
reconciled against cannot disagree with it — that is one author wearing double-entry's clothes, and
deleting a step would take its obligation with it, silently. Authored, the two sides can disagree,
which is the only reason either of them is worth reading.

**So both halves of the pair are faults something says out loud.** A `@fitness` scenario whose
`@SCN` no CI step states reconciles **missing** and the run is out of balance — the same sentence a
`@unit` scenario with no test gets. A step stating an `@SCN` no scenario carries posts to a
**phantom** row, and a step stating none posts to **suspense**. Under generation none of the three
could happen and none could be reported, which is the same trade every derived artefact makes.

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
        id: SCN-<FFF>-<NNN>
        if: always()
        run: pnpm lint:boundaries
```

**The `id:` is the scenario's `@SCN`, never a handle of your own choosing.** A handle would need a
third artefact mapping it back to a scenario — a roster, which is the thing this model does without.
The obligation stays in the `@fitness` scenario, and the step both runs the check and produces the
observation; neither can answer for the other, which is the only reason reading them together says
anything. An `id:` that is not an `@SCN` cites nothing, so the ids your pipeline already carries for
its own reasons stay off the books.

**`if: always()` is not the fail-fast trade being abandoned.** The default is `if: success()`, so
`always()` WIDENS: there is no run in which an `always()` step is skipped and an unconditional one
is not. What it buys is that an early red does not decide the report — check steps are independent
of one another, and a step the run record says was skipped is broken evidence rather than a quiet
absence, so without it one failure would be reported as one failure and nine unknowns.

**Keep invoking the same handle the step already invoked.** Where you run a green-check derived from
the pipeline file, spelling the step as the CLI behind the handle runs the identical check and
silently drops it from that green-check the day the pass is deleted. spec-controller had exactly
such a derivation and deleted it — the rule is yours to apply if you keep one.

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

**No rule matches `package.json` script names against a set of ours.** A set such as `lint:`,
`guard:` is a sample of an unbounded set that belongs to you: a pipeline whose scripts are `lint`,
`typecheck` and `audit` is one such a rule could not see. The set that is closed is the
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
yet, not the tool failing to start — and it is the number that shrinks as you convert. To adopt by
observing rather than by redding the build, add `--exit-zero`: the same report, with the
out-of-balance verdict exiting `0`, until you delete the flag and turn the gate on.

**`annotated` was never manifest-shaped either, and that is the point of putting the citation on the
step.** An `id:` is a key of the step mapping, the command below it is any command in any language,
and nothing in the resolution reads a manifest. A pipeline that annotates its check steps is read the
same way whatever it builds.

---

## No step definitions at all, however many checks convert

A converted check is its scenario and its step, and there is no third place its `@SCN` or its
command is written down. Nothing that varies between two checks is in the corpus, and nothing that
is *common* to them is either — this product runs no check on your behalf and binds nothing to your
scenario's steps:

| what you author | how its credit arrives | what is asserted |
|---|---|---|
| a `@fitness` scenario, and its `@SCN` as a step's `id:` | that step's **outcome** in the run's own record | the command's **exit code** |

**Every converted check is that one kind.** A check that measures something — a mutation score, a
suite's wall-clock — states its bar where the tool already reads one (Stryker's `thresholds.break`,
`timeout <seconds>` around the suite) and fails its step below it. The ledger reads the step's
outcome, never a number, and nothing you author names a bar.

---

## What you have afterwards — the check is the command, and the pipeline is the enumerator

**A converted check is not trapped anywhere.** Every converted check's command is a command you can
run in a terminal, on its own, and its exit code is the check's verdict. The conversion took nothing
away: the command is still the step's own, the same string it was before you cited it.

Most converted checks are exactly that — a command you already run, or one off the shelf:

```sh
eslint
pnpm typecheck
```

Exit 0 is the check passing. No runner, no `balance`, no ceremony. That matters most when a check
reds: you debug it by running it, not by reading a report about it.

**A run-time bar is the step that runs the suite, and it needs no number at all.** Two scenarios
hold the unit suite and the behavioural suite to a limit. The limit is
`timeout <seconds>` on the step that runs the suite, the step carries the scenario's `@SCN` as its
`id:`, and nothing else names the limit:

```yaml
- name: Test
  id: SCN-<FFF>-<NNN>
  run: timeout 75 pnpm test   # plus the reporter flags that write the suite's report
```

Past the limit GNU `timeout` exits 124, the step's `outcome` is `failure`, and the row reads that
outcome as any other converted check's does. Nothing times the suite, nothing writes a timing down,
and nothing reads one back.

**A scheduled check is the step that reads its verdict, and it needs no number either.**
A scenario holds this repository's domain core to a mutation score, and a sweep costs 8-12
minutes against a 2-minute ladder, so it runs nightly. The bar is Stryker's own
`thresholds.break: 95`, so the nightly run concludes `failure` below it. The push step carries the
scenario's `@SCN` as its `id:` and asks stock `gh` whether the newest finished nightly on `main`,
created inside the last 26 hours, concluded `success`. Nothing on your side names the bar:

```yaml
      - name: Mutation score
        id: SCN-<FFF>-<NNN>
        if: always()
        run: gh run list --workflow mutation.yml ...
```

A lapsed schedule leaves no run inside the window, so the step fails, and so does a sweep that
crashed or scored below its bar. The window is a derivation, not a constant: the schedule's cadence
plus a margin, **24 h + 2 h = 26 h** for a nightly. Copy the derivation, never our number. The step
itself, and what this shape gives up, are in [`scheduled-checks.md`](./scheduled-checks.md).

**So what does the pipeline add, if the commands already work?** Enumeration, and only enumeration.
A check reports what it found and says nothing when it finds none, so its silence cannot be told
from its absence. Running the commands by hand gives you each one's verdict; running them as steps
of your pipeline makes **every check you have cited appear in that run's own record, whatever it
did** — so a check that quietly stopped running shows up as a row the record carries no step for
instead of as no output at all.

**The commands are the evidence. Your pipeline is what makes the set of them observable.** That
sentence is the whole of why the scenarios exist, and it is the one a product copying this
migration should take away.

## Two things that are easy to get wrong

**1. Where the tool has a bar of its own, carry its verdict across runs, not its number.** A check whose evidence is produced somewhere
else, such as a nightly sweep, is tempting to carry across as its number: a producer writing a
record, an upload, a placement on the push that checks the record's age, and a reader printing the
number against a bar of its own. That is four pieces of your own code, and the scheduled run's own
conclusion already says whether the number cleared the bar the tool was given. Read that
conclusion in one step, as above. This repository built the four pieces, and deleted them.

**A run-time check does not need that shape either.** It is tempting to measure a suite's
wall-clock where the suite runs — a timing wrapper around the step, writing a record — and read it
back in a step of its own. That is a producer, a record and a reader, all to put on the books a
fact the step already has. Run the suite under `timeout <seconds>`, give the step
the scenario's `@SCN` as its `id:`, and let nothing name a bar. This repository built the long way
first, and deleted it.

**2. `if: always()` goes on every check step, not only the dump.** Without it the first red aborts
the job, every later check step is skipped, and the ledger reports one `failing` and N `broken` — a
worse account from a correct mechanism. The checks are independent of one another: one's red says
nothing about another's.

---

## What this leaves open, stated rather than left to be found

**Dead documentation is a gap, and it is in this process.** A scenario whose steps no runner
executes is pure documentation: nothing reads the steps against the check that answers them, so the
two drift and nothing reds. This holds wherever the runner is somewhere other than Cucumber —
`@unit`, `@performance` and `@fitness`, as most trees run them. Where Cucumber runs the steps
(`@integration` and `@e2e`, and `@performance` wherever your Cucumber selects it), they are executed
and cannot drift from the run: that is living documentation. The ledger proves a scenario is linked
to evidence and that the evidence passed. **It does not prove the evidence tests what the steps
say.** The gap is stated, not solved: nothing in this release closes it, and a green reconciliation
of a scenario whose steps no runner executes is a claim about its evidence, never about its prose.

**It is a different thing from test validity, which is assumed rather than missing.** Whether a
test is a good test is yours, as under CI, TDD and BDD (see *What spec-controller assumes*). Dead
documentation is the part the process itself leaves open: a correct test, passing, under steps that
do not describe it.

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

| what the record says of the step citing your scenario | what the ledger does |
| -- | -- |
| `outcome: success` | credits the row — the check ran and found nothing |
| `outcome: failure` | a **failing** observation — the check ran and found something, out of balance whatever the job concluded |
| **any skip whatever its cause**, a `cancelled` step, a status nobody anticipated | **broken evidence** — the row's Evidence Obligation reconciles `missing`, the run is unsound, `balance` exits **4** |
| **no entry at all**, for a row a handed-over record never carried | **broken evidence**, citing that row |
| **no record handed over at all** | unchanged — each row reconciles as it did before there was a record: answered from your pipeline's text where discovery reads its step as a check, `missing` where the step runs a named runner; a `missing` row puts the run out of balance at exit **1**, never unsound |

The last two rows are one rule read twice. Your rows come from your corpus — one per `@fitness`
scenario, raised by the tag — and their enumeration comes from the run's own record, so emptying
either leaves the other standing, which is why an emptied corpus now reds instead of balancing over
nothing, and why a target that has converted nothing (no annotation, no dump) is untouched. Nothing
in the record can reach your corpus to forge the other half.

**And a LOCAL run is that last row, which is worth knowing before you meet it.** The dump is a step
of your pipeline; running `balance` on your own machine hands it no record, so it reads your
pipeline's text instead of a run. A row whose step discovery reads as a check is answered from that
text — credited where the step is there and its job does not survive its red, which is **not** a
claim that the check ran — and a row whose step runs one of your named runners gets no such credit
and reconciles `missing`, which puts the run out of balance rather than unsound. The checks still run locally — they are
commands — and their teeth are their own exit codes. What a local run does not have is the credit
journal, because the credit journal is the pipeline's.

**Every check you convert is credited this way, and the difference from the other shape is yours to
know about.** A credit that is a NUMBER something has to produce fails closed unaided: a step that
never runs produces none, and the row is short its credit whatever else happened. A credit that is a
step's OUTCOME needs **two facts from two places** — the step's status from the run record, and the
obligation's own existence from your corpus — because one fact alone is something a skip can supply
for free. That is why the two shapes are not made alike: the outcome-credited row is given its
second fact instead.

**There is no field by which a check declares its own not-examined ending, and there must not be.** A
step record carries a **status and no exit code**, so such a declaration could only be read for
*whether it was named*, never checked against anything — `if: false` beside a declared ending would
read satisfied for ever: a check switched off, green in the ledger, through the product's own
configuration, and single-entry in the double-entry product.

A command that examines nothing **still runs and still ends**, so its step reads `success` or
`failure` and is never `skipped`. A skip means a condition went false, the job was cancelled, or
somebody moved the step — never that. The field could not name what it claimed to.

**Say it in your own `run:` line**, where your CI records an honest success:

    - name: PR metadata
      id: SCN-<FFF>-<NNN>
      if: always()
      run: pnpm check:pr-metadata || [ $? -eq 3 ]

### One limit, stated so you do not discover it

**Discovery is not Node-shaped.** The zero-annotation state does not match `package.json` script
names against prefixes, so a pipeline with a bare `run: ruff` and no `package.json` script is
discovered like any other. A prefix list would sample an unbounded set — the names your team gives its checks — and the set of
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

**An authored corpus cannot be emptied silently, and that is what authoring it buys.** A corpus
emitted from the pipeline would empty the moment the pipeline lost its annotations, and no rule
above could see it. Authored, the corpus stands: every scenario in it raises its obligation from
its own tag, so a pipeline that stopped citing them leaves every one of those obligations
reconciling **missing** and the run out of balance.

## The gates your checks run under

*These gates bind 3F's own products, an adopter's repository among them. If you are not one of those, bring your own
gates: nothing below binds you, and this page's model works the same without them.*

*Your checks are one half of a wider arrangement, and the other half is the gates the portfolio
holds every product to. This section names them and links their canon. **It states no number** —
the numbers live in the canon pages below, and a copy here would drift from them.*

| gate | what it binds |
|---|---|
| **Complexity and function length** | every function and module you touch measures inside an external standard, never your own current maximum. Canon: `technical-design/fitness-functions.md` → *Code-metric thresholds come from an external standard, never the code's own max*, and *The suite — the mandatory gates*. |
| **CRAP** | no function in a file you touch is both tangled and under-tested: each is scored from its cyclomatic complexity and your unit suite's coverage of it, every function is reported on every run, and one scoring over the external standard in a file the change touches reds. Canon: `technical-design/fitness-functions.md` → *CRAP — complex code must be tested*. |
| **Mutation** | your unit tests have teeth, measured per mutated scope against a held percentage, on a schedule rather than per push. Canon: `fitness-functions.md` → *Mutation thresholds are per-scope, and the bar is a held percentage*, and *When the score drops below the bar* — which forbids deleting code to raise a score. |
| **Continuous delivery** | nothing publishes except a merge to `main`, and every package-changing merge publishes the next counter version with no stored credential. Canon: `technical-design/ci-and-release.md` and `technical-design/publishing-npm-packages.md` → *The model — every package-changing merge publishes, with no stored credential*. |
| **Expand / contract** | a repository whose CI reads its own tree with its own pinned release changes that model in steps: the reader accepts both shapes and publishes, the bot moves the pin, the tree drops the old shape, and the reader stops accepting it only when no adopter still writes it. Canon: `publishing-npm-packages.md` → *Such a repository changes its own model in expand/contract steps*. |
| **How a check's outcome reaches the Ledger** | the declaration, discovery and posting this page describes — the tag is the quality check, and the step's `id:` is the citation. Canon: `technical-design/fitness-evidence.md` → *The tag is the quality check; nothing else declares it*, and *The three adoption states*. |
| **Self-reconciliation** | your own `Ledger` balances, run as a gate in your pipeline: `balance` over your corpus and your run's evidence, red on out-of-balance. Canon: `fitness-functions.md` → *Self-reconciliation — the capstone*. |

**The canon pages are in 3F's `strategy` repository, which is private**, so they are named by page
and section heading rather than linked. Ask for the page if you do not have it; what matters here
is that every number lives in one of them and in no copy.

---

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

2. **Write the scenario** — in your fitness corpus, carrying `@fitness` and a freshly minted `@SCN`,
   with a title saying what the check is about and steps saying it in Given/When/Then. **That is
   the first of the two artefacts, and there is no row to write beside it**: the tag raises the
   obligation, so nothing has to name the scenario for it to be owed. A check that produces a number
   applies its own bar and exits non-zero below it, and nothing you author names one.
3. **Leave the command exactly where it is, and give its step the scenario's code as its `id:`.**
   A converted check is still a CI step; what changes is that the step now carries a citation, and
   that the job ends with one `toJSON(steps)` dump the reconciler reads. Neither artefact is derived
   from the other, which is what makes a scenario no step cites, and a step citing an `@SCN` no
   scenario carries, each something a run can report.
4. **Sweep the citations.** A minted `@SCN` changes every surface that names the old one — the
   corpus, step ids, unit-test pins, docblocks, workflow comments, the decision log. Grep for the
   retired code and expect zero hits.
5. **Watch out for a check whose evidence is stamped with its `@SCN` somewhere you do not
   rebuild.** Renaming the `@SCN` of a check answered by its step's outcome touches only your own
   tree: the code lives on the scenario and on the step's `id:`, and both move in one
   commit. That includes a scheduled check read as its run's verdict, because a run's conclusion
   carries no code. A check whose *number* is written down by a job on another cadence, stamped
   with the `@SCN`, is different: the newest record your build can read was written by the code
   you are replacing, and the rename desynchronises the two until that job runs again. **There is
   no atomic version of that change.** Either have whatever reads that record accept the superseded
   code for one cycle, and file the removal of that acceptance as you add it, or rename both sides
   and accept a red window between the merge and the job's next run, announced rather than
   discovered. The route that is not available is deferring the mint indefinitely. A code is
   stable forever and survives a feature-file rename, so a check may keep its code while its
   scenario moves, but a migration that leaves one check in the old numbering has not migrated,
   it has stopped.
6. **Compare the ledger shape, not the rows.** Every `@SCN` changed, so a row-for-row diff says
   nothing. Same checks claimed, same obligation count, same satisfied / missing verdicts,
   against a baseline captured **before the first edit**.
7. **Prove the comparison has teeth.** A matching ledger is also what *not migrating* produces.
   Break one step's `id:` so its credit cites nothing, confirm the comparison reds, and
   restore. A comparison whose teeth are unproven is a diff that is not looking.
