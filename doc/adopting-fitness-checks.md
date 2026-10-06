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

**A title can drift from its check, and that is a gap in this process**, the first thing under
[*What this leaves open*](#what-this-leaves-open-stated-rather-than-left-to-be-found). Wherever the
runner is not Cucumber — usually `@unit`, `@performance` and `@fitness` — the scenario carries no
Given/When/Then, so no unexecuted step can read as a test. The ledger proves a scenario is linked
to evidence and that the evidence passed. **It does not prove the evidence tests what the title
says.**

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

**You write the scenario exactly as you write a `@unit`-only one** — a tag naming its axis and a
title, with no Given/When/Then. Cucumber is filtered on `@integration`, `@e2e` and `@performance`,
so it selects neither, and a scenario Cucumber does not select carries no steps. The title is the
specification; the runner your CI already calls is what produces the evidence. That is the gap
named above: nothing reds if the title comes to say something the check does not. Getting here
from `annotated` is either your own work or `migrate`'s.

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
```

**That is the whole scenario — a tag line and a title, with no Given/When/Then.** A fitness
scenario is a **declared obligation, not a test**, and nothing runs it: the check is a step of your
pipeline, the pipeline records what that step did, and `balance` reads the record. Cucumber does not
select it, so it carries no steps and no step definition. What its title must not do is **grade the
run** — "the check passes", or "the build is green", would make the scenario both sides of the entry
at once. The title states the property asserted, exactly as a `@unit` scenario's does; whether this
push cleared it is the ledger's sentence.

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
with no manifest script involved, so long as no later command in the pipeline reads its
output. What needs your `package.json` is the second clause, the hop
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
A scenario holds each of this repository's gated source scopes to a mutation score, one job per
scope, and the slowest job (the domain core) costs 12-16 minutes against a 2-minute ladder, so it
runs nightly. The bar is Stryker's own
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

**A title can drift from its check, and that gap is in this process.** A scenario Cucumber does
not select carries no Given/When/Then, so it cannot hold unexecuted steps posing as a test. That
holds wherever the runner is somewhere other than Cucumber — `@unit`, `@performance` and
`@fitness`, as most trees run them. Its title is still prose: nothing reads it against the check
that answers it, so the two can drift and nothing reds. Where Cucumber runs the steps
(`@integration` and `@e2e`, and `@performance` wherever your Cucumber selects it), they are executed
and cannot drift from the run: that is living documentation. The ledger proves a scenario is linked
to evidence and that the evidence passed. **It does not prove the evidence tests what the title
says.** The gap is stated, not solved: nothing in this release closes it, and a green reconciliation
of a scenario Cucumber does not run is a claim about its evidence, never about its title.

**It is a different thing from test validity, which is assumed rather than missing.** Whether a
test is a good test is yours, as under CI, TDD and BDD (see *What spec-controller assumes*). A
drifted title is the part the process itself leaves open: a correct test, passing, under a title
that does not describe it.

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
| **Comments** | a comment carries only what the code cannot say. No file is more than the ceiling's share comment lines, and no comment, Feature, Rule or Scenario description line or current-state document carries a ticket ID, a scenario code, or a phrase that narrates how the product came to be. Each rule reads the whole tree on every run, through a maintained tool, configured. Canon: `technical-design/code-comments.md` → *The gates*. |
| **Evidence layers cross a seam** | a scenario's second evidence layer is never a copy of its first. A step definition reaches the product only through a seam: it spawns the CLI, writes and reads real files, runs git, or drives a packed package as its consumer does. It never imports the product's own modules, by a relative path into its packages or by its core package's name, and that includes a type-only import. The rule is ESLint's `no-restricted-imports`, configured over the step files. It reads static `import` and `export … from` declarations only, so a dynamic `import()` is outside what it sees. Canon: `technical-design/fitness-functions.md` → *Evidence layers cross a seam*, and `principles.md` → `layered-evidence`. |
| **A scenario Cucumber does not run has no steps** | a step no runner executes reads as a test and is not one, so a scenario your Cucumber profile's tag filter does not select carries no Given, When or Then: Feature, Rule, title and tags only. The filter is written once in the Cucumber config, and a second profile selects its negation, so what the gate reads follows the filter and is never a list of tags. Cucumber's dry run of that profile lists those scenarios with their steps, `jq` prints each one that has a step, and the step fails if it printed any. A `Background` gives its steps to every scenario in its file, so one in a file holding such a scenario fails the gate too. Canon: `technical-design/fitness-evidence.md` → *One scenario shape, three tags, three runners*. |
| **Every step definition is one Cucumber runs** | step code no scenario uses is code that never executes and still reads as part of a test, so every step definition your Cucumber config loads matches at least one step in a scenario its tag filter selects. A definition whose only matches sit in scenarios outside the filter counts as unused, because those steps never run. Cucumber's dry run of the default profile reports each definition with the steps it matched, `jq` prints each one that matched none, and the step fails if it printed any. Canon: `technical-design/fitness-evidence.md` → *One scenario shape, three tags, three runners*. |
| **Mutation** | your unit tests have teeth, measured per mutated scope against a held percentage, on a schedule rather than per push. Canon: `fitness-functions.md` → *Mutation thresholds are per-scope, and the bar is a held percentage*, and *When the score drops below the bar* — which forbids deleting code to raise a score. |
| **Continuous delivery** | nothing publishes except a merge to `main`, and every package-changing merge publishes the next counter version with no stored credential. Canon: `technical-design/ci-and-release.md` and `technical-design/publishing-npm-packages.md` → *The model — every package-changing merge publishes, with no stored credential*. |
| **Expand / contract** | a repository whose CI reads its own tree with its own pinned release changes that model in steps: the reader accepts both shapes and publishes, the bot moves the pin, the tree drops the old shape, and the reader stops accepting it only when no adopter still writes it. Canon: `publishing-npm-packages.md` → *Such a repository changes its own model in expand/contract steps*. |
| **How a check's outcome reaches the Ledger** | the declaration, discovery and posting this page describes — the tag is the quality check, and the step's `id:` is the citation. Canon: `technical-design/fitness-evidence.md` → *The tag is the quality check; nothing else declares it*, and *The three adoption states*. |
| **Self-reconciliation** | your own `Ledger` balances, run as a gate in your pipeline: `balance` over your corpus and your run's evidence, red on out-of-balance. Canon: `fitness-functions.md` → *Self-reconciliation — the capstone*. |

**The canon pages are in 3F's `strategy` repository, which is private**, so they are named by page
and section heading rather than linked. Ask for the page if you do not have it; what matters here
is that every number lives in one of them and in no copy.

---

## How spec-controller runs each gate — the specifics a copy needs

*The table above names each gate and its canon. This section records how spec-controller's own
tree runs a gate, in the detail that settles questions you would otherwise meet one at a time. It
describes the tree as it is. The reason behind each point is in spec-controller's decision log; ask
for an entry by its title.*

### Mutation

**What it runs.** `.github/workflows/mutation.yml` runs Stryker with the Vitest runner, nightly and
on `workflow_dispatch`, never per push. The shared `stryker.config.js` holds the bar,
`thresholds.break`, and nothing scope-specific.

**One scope, one job, one bar.**
- A scope is one directory under a package's `src`, or a package's top-level files taken together.
  It is never a single file, which has no stable score.
- Each scope is one entry in the workflow's `strategy.matrix.include`. The entry carries the scope's
  name, its `mutate` globs and its own `timeout`. The globs reach Stryker through `env:`, never
  interpolated into the command. The job runs `pnpm mutation --mutate "$MUTATE"`.
- `fail-fast: false`, so one red scope still reports every other.
- Each job uploads its report as an artifact named after its scope.
- A scope's timeout is about twice its measured duration on the CI runner, never above 60 minutes.
  Measure it on CI. A local run at a different concurrency does not predict it.
- A change that adds work to a scope's job re-measures that job on CI and resets its timeout in the
  same change. Added work means a new matrix entry running beside it, tests that newly reach its
  scope, or a heavier step. A job that slows with no single change adding work is caught by its own
  timeout, and that red is the signal. No check compares a job's duration with its timeout.

**A scope joins green or not at all.**
- A scope is added by one `include` entry in the change that brings it to the bar, never before.
- The installing evidence is a `workflow_dispatch` of the workflow on `main` after the merge,
  concluding `success`.
- The bar is never lowered, and a scope is never added below it.
- When two changes together alter what the nightly measures, their pull requests stack and merge
  back to back, away from the cron, so no nightly runs half of the pair.

**Kills count from the code's real consumers.**
- `vitest.config.ts` aliases the core package's name, and its `/internal` subpath, to the package
  source. Without the alias, Stryker's sandbox resolves the package name to unmutated source, so a
  test in another package that reaches core through its name kills nothing.
- Survivors are killed through tests of the behaviour that uses the code, citing the scenario they
  exercise. A test that restates data by hand is never the fix.
- Stryker's Vitest runner sets `pool: 'threads'` whatever your Vitest config says, and
  `process.chdir()` throws in a worker thread. A test that needs a working directory therefore stubs
  the code's read of it (`vi.spyOn(process, "cwd")`) or passes the directory as an argument. It never
  moves the process. A test passing under `pnpm test` is not proof it runs in the mutation run, so
  prove a new test under a Stryker run of its scope.

**An equivalent mutant is removed, not suppressed.**
- Stryker's `// Stryker disable next-line <Mutator>` silences every mutant of that mutator on the
  line, including mutants your tests already kill. So the code that makes a mutant equivalent is
  removed instead: a redundant clause, an anchor that changes no match, an early return the code
  below already covers. Each removal is behaviour-preserving, and the reconciliation report stays
  byte-identical across it.
- Where the construct is load-bearing, it stays, and its equivalent stands as an unsuppressed
  survivor recorded against the scope.
- The check: every mutant the report marks `Ignored` is one no test kills. Read it from the job's
  artifact.

**What the bar claims, and what it does not.**
- A scope at or over the bar is green with survivors still standing. A survivor a test could kill is
  recorded, and is not chased above the bar.
- Below the bar, the canon's remedy applies (`fitness-functions.md` → *When the score drops below the
  bar*). Prose in a string literal moves into the package's message catalogue.

**One message catalogue per package, one guard for them all.**
- A catalogue is an object keyed by an enum of message codes and typed exhaustive
  (`{ readonly [C in Code]: … }`), so the compiler refuses a code with no entry. Its values are
  static prose, or templates whose parameters stay on the tested surface.
- Each package has one catalogue, and every scope in the package adds its codes to it rather than
  starting its own. Core's lives in its domain directory, because the domain imports nothing
  outward and the other core directories may import the domain. The app's lives in its own package.
- One catalogue cannot serve both packages. Core may not import the app, and the app reaches core
  only through its published entry, which carries no app prose.
- Each catalogue file is excluded from its scope's `mutate` by name.
- Only message prose leaves the mutated surface this way. Other data, including a report's layout
  (separators, table rules, cell glyphs, section order), stays in code, and tests assert the rendered
  output to kill its mutants. Data that is not prose leaves only if it meets all four of the
  catalogue's guards: keyed by a type, completeness typed, a no-empty guard, and no logic. Another
  test covering it is not a reason to exclude it.
- One test reads every catalogue in the tree and fails on an empty entry, and one scenario states
  that rule. Test files sit outside both import rules, so one file can read both packages.
- A test that kills a mutant no other test kills is never a deletion candidate, whatever else
  it duplicates.

**How it reaches the Ledger.** A push step reads the newest finished nightly on `main` inside the
freshness window, by its workflow conclusion, as *What you have afterwards* above shows. The run is
green only if every scope's job is green, so adding a scope changes nothing on the push side.

**The plant.** Point one matrix entry's globs at a weaker directory, dispatch the workflow, and only
that job reds while the others stay green. Restore it before merge.

### Complexity and function length

**What it runs.** The CI step *Complexity — eslint's cognitive-complexity and max-lines-per-function*
runs `if: always()` under `shell: bash`, in two lines:
- `pnpm exec eslint` reads the whole population and reports. Both rules are at `warn`, so this line
  reds only on an error, and the one error the config raises is an unused disable directive
  (`reportUnusedDisableDirectives: "error"`).
- The gate line:
  `git diff -z --name-only --diff-filter=d "$(git merge-base origin/main HEAD)" | xargs -0 -r pnpm exec eslint --max-warnings 0 --no-warn-ignored`.

**Configuration.**
- `eslint.config.js` holds `sonarjs/cognitive-complexity` and `max-lines-per-function` at `warn`.
  Their ceilings are canon's, set as two named constants. The length count skips blank and comment
  lines.
- A `*.test.ts` file takes the same complexity ceiling, with function length off.
- The population is `MEASURED_GLOBS`: `packages/*/src/**/*.ts` and `tests/steps/**/*.ts`. `dist`,
  `.stryker-tmp` and `node_modules` are ignored.

**The changed set.**
- It is every file the branch touches against its merge base with `origin/main`, deleted files left
  out. The checkout sets `fetch-depth: 0` so the merge base resolves.
- A touched file is linted whole, so a standing warning anywhere in it reds the step.
- `--no-warn-ignored` lets a touched file outside the population pass.
- `shell: bash` brings `pipefail`, so a failing `git diff` reds the step. `xargs -r` makes an empty
  set, such as a push to `main`, run nothing and pass.

**Limits.** Untracked files are outside the set, so locally a new file is gated once it is staged. On
a push to `main` only the report line checks anything.

**The plant.** An over-ceiling function in a touched population file reds the gate line. A dead
`eslint-disable` reds the report line. An unresolvable merge base reds the gate line. Restore each
before merge.

### CRAP

**What it runs.** The CI step *CRAP — complex code must be tested* runs under `shell: bash` unless
the run is cancelled or the Test step was skipped. The tool is `@barney-media/crap-typescript`,
pinned exactly, reading coverage from `@vitest/coverage-v8`.
- **Coverage** comes from the Test step, which passes `--coverage.enabled`. `vitest.config.ts` keeps
  coverage off by default, with `provider: "v8"`, `include: ["packages/*/src/**"]`,
  `reporter: ["json"]` and `reportOnFailure: true`, so a local `pnpm test` and Stryker's runner take
  none.
- **The report line**, `crap-typescript --format text --threshold <t> packages || [ $? -eq 2 ]`,
  scores every function on every run. It tolerates exit 2, a function over the threshold, and reds
  on any other failure.
- **The gate line** feeds the Complexity gate's changed set, narrowed by the pathspec
  `-- 'packages/*/src/*'`, through `xargs -0 -r` to the tool at the same threshold.

**The threshold.** `<t>` in `ci.yml` is the largest double below canon's ceiling. The tool reds only
strictly above its threshold, so that value makes a function scoring exactly the ceiling red.

**The score.** Complexity is ESLint-classic cyclomatic complexity. Coverage per function is the lower
of statement and branch coverage, which the tool fixes and nothing configures.

**The changed set.** It is the Complexity gate's git line, with the pathspec's trailing `/*` needed
because a bare `packages/*/src` matches no file. The tool's own `--changed` is not used: it reads
the working tree, so on CI's clean checkout it analyses nothing.

**Limits.**
- Coverage is the Vitest unit suite's alone, so code that only Cucumber's spawned CLI runs reads as
  uncovered.
- A function whose coverage the tool cannot attribute scores N/A and never reds.

**The plant.** The smallest untested function that reaches canon's ceiling, placed in a touched source
file, reds the step.

### Comments

Canon: `technical-design/code-comments.md` → *The gates*. Four CI steps run `if: always()` over the
whole tree on every run.

**When it runs.** CI runs on every pull request, and on every push to `main` except one that changes
only `doc/**`, `README.md`, `CONTRIBUTING.md` or `LICENSE` (`paths-ignore` on the `push` trigger).
Of the four, only the three Vale gates read Markdown, so a doc-only push to `main` is checked only
by whoever runs Vale locally before pushing. The next run on any branch reads the whole tree, and
reds there on anything that push let through. `packages/*/README.md` is not in the set: it ships
in the packed tarball, and a change to it triggers a release.

**Comment share.**
- The step *Comment share* runs under `shell: bash`, using the devDependency `cloc`, pinned exactly.
  Check what the pin ships with `cloc --version`, never from the package version.
- Its command is
  `cloc --vcs=git --fullpath --not-match-d='(^|/)tests/fixtures(/|$)' --not-match-f='(^|/)pnpm-lock\.yaml$' --exclude-lang=Markdown --skip-uniqueness --strip-str-comments --by-file --csv --quiet`.
- It measures code and configuration, never prose: `--exclude-lang=Markdown` keeps every `.md`
  out, and the Vale gates hold documents.
- One `awk` line names each file whose comment lines exceed canon's share of its comment plus code
  lines, then exits non-zero. A file exactly at the share passes.
- Limits: a `/*` … `*/` pair across backtick template literals reads as comment, a shebang counts as
  code, and cloc does not count `.gitignore`.

**The three Vale gates.**
- The steps check for a ticket ID, a scenario code, and narrated history in a comment, description
  or document.
- Each runs `errata-ai/vale-action`, pinned by SHA, with the Vale `version:` pinned,
  `filter_mode: nofilter`, `fail_on_error: true` and `reporter: github-annotations`.
- A negated glob keeps untracked output (`node_modules`, `dist`, `.stryker-tmp`, `coverage`,
  `reports`, `build`) out. Each step selects one rule with a `filter:` on the rule's name.
- The rules are existence rules at level `error`, in `.vale/styles/Identifiers/` and
  `.vale/styles/History/`. Read the files for the patterns and the phrase list.
- `.vale.ini` sets `MinAlertLevel = error`, `IgnoredScopes = tt` and `SkippedScopes = script, style`,
  so Markdown fenced blocks are read. Inline code is read too: measured, a ticket ID in backticks
  reds.
- It lints Markdown, TypeScript and JavaScript, YAML through a `Comments` view, and `.feature`
  through a `Gherkin` view that keeps description and `#` lines only.
- An empty `BasedOnStyles` exempts `tests/fixtures/**`, `pnpm-lock.yaml`, changelogs, decision logs
  and `work-item/**`.

**Limits.** A `#` line inside a YAML `run: |` scalar is not read, and nor are Feature, Rule or
Scenario titles. `.gitignore`, `.vale.ini` and `LICENSE` are outside the gates, and `.cjs` is
unmeasured. The one safe scenario-code placeholder is `SCN-<FFF>-<NNN>`.

**The plant.** For the share gate, a file over the share is named and reds. A file exactly at it, and
a heavily commented file under `tests/fixtures`, stay unnamed. For the Vale gates, a trailing
comment planted in a code file reds each rule, and a string on the same line does not. A plant that
needs a scenario code uses the feature part `XMPL`, never one the corpus uses.

### Evidence layers cross a seam

**What it runs.** The CI step *Evidence layers cross a seam* runs `pnpm lint:seam` with
`if: always()`. The script is
`eslint --config eslint.boundaries.js --rule 'no-restricted-syntax: off' tests/steps`.

**Configuration.** The last block of `eslint.boundaries.js` covers
`tests/steps/**/*.{ts,mts,cts,js,mjs,cjs}` with `no-restricted-imports` at `error`. It uses two
`regex` patterns: `^(\.\.?/)+packages(/|$)` and `^@3f-consulting/spec-controller-core(/|$)`. The
rule reads `import`, `import type` and `export … from` declarations.

**One violation, one red step.** The Import boundaries step's script runs the same config with
`no-restricted-imports` off, and `lint:seam` runs it with `no-restricted-syntax` off.

**The seam a step uses.** Steps spawn the built CLI at `packages/spec-controller/dist/cli.js`, through
a `--import` loader hook (`tests/steps/support/coreFromDist.*.js`) that resolves the core package's
name to its `dist`. The hook names the package in strings, never in an import declaration, so the
rule does not read it.

**Limits.** A dynamic `import()` is outside what the rule sees.

**The plant.** One step file imports the product four ways: a relative path into a package's source,
`import type` by the core package's name, the `/internal` subpath, and `export … from` by a relative
path. It also imports `node:path` as a control. `lint:seam` reds once per product import and never on
`node:path`, while Import boundaries stays green.

### A scenario Cucumber does not run has no steps

**What it runs.** The CI step *No step on a scenario Cucumber does not run* runs `if: always()` under
`shell: bash`:
`pnpm exec cucumber-js --profile outside --dry-run --format message | jq -rn '…' | awk '{ print } END { exit NR > 0 }'`.
The `jq` program collects every `testCase.pickleId`. It then prints each `pickle` whose id is among
them and whose `steps` are not empty.

**Configuration.** `cucumber.js` states the filter once, as `const tags`. Paths, `require` and
`requireModule` sit in a `common` object. The default export spreads `common` with `tags` and
`parallel: 2`. The named profile `outside` spreads `common` with `tags: not (<tags>)`. A named
profile replaces the default profile and does not load it, which is why `outside` carries `common`
itself.

**The population.** It is every scenario the default filter does not select. The message stream emits
a `pickle` for every scenario whatever the filter, and only the join to `testCase` gives the
selected set.

**Who decides.** A dry run exits 0 even on an undefined step, so `awk` sets the exit. Because the step
pipes the runner's output onward, `balance` reads it as a check, never as the Cucumber runner.

**Limits.** A `Background` gives its steps to every scenario in its file, so a `Background` in a file
holding a stepless scenario reds the gate. A stepless scenario's title is unchecked prose.

**The plant.** One `Given` added under a `@unit`-only scenario reds the step, which names the scenario
and its step count. The Cucumber step stays green.

### Every step definition is one Cucumber runs

**What it runs.** The CI step *No unused step definition* runs `if: always()` under `shell: bash`:
`pnpm exec cucumber-js --dry-run --format usage-json | jq -r '.[] | select((.matches | length) == 0) | …' | awk '{ print } END { exit NR > 0 }'`.
It prints each offender's `uri:line` and pattern.

**The population.** It is every definition the default profile loads. With no `--profile`, the
default tag filter applies, and `usage-json` counts only the steps of scenarios it selects. So a
definition matched only by steps outside the filter counts as unused.

**Who decides.** Cucumber exits 0 on an unused definition, so `awk` sets the exit.

**Limits.** It reads step definitions only. Support code under `tests/steps/support` that no
definition calls is outside it.

**The plant.** Append `Given("a step no scenario Cucumber runs uses", () => undefined)` to a step
file. The step reds and prints that definition, and every other check stays green.

### How a step states its rule

Canon: `delivery-approach.md` → *Declarative scenarios — assert the rule, not the interface*.

**The convention.** A Given, When or Then line states the rule by intent. No exit code, `--flag`,
stdout, stderr, file name or JSON shape appears in a prose line, and the step definition holds the
mechanic. A business parameter, such as a format name, is the rule's own data and stays in prose.
Rule and Scenario titles are outside the convention as the tree holds it.

**Intent tables hold the interface contract.**
- `tests/steps/support/runExit.ts`: `OUTCOME_EXIT` maps each outcome phrase (*the balanced verdict*,
  *a usage error*, *the unsound verdict* and others) to an exit code, and `HEADLINE_EXIT` does the
  same for each headline word. `RUN_OUTCOME` joins the phrases into an alternation, which definitions
  interpolate into their patterns. `exitOn` and `exitNamedBy` fail on a phrase the table does not
  name.
- `tests/steps/support/balanceOption.ts`: `OPTION_FLAG` maps each option name (*strict option*,
  *report-only option*, *store modifier* and others) to its flag. `optionFlag` drops a leading `the `
  and fails on a name the table does not hold.
- So a feature says *Then the run ends on the balanced verdict*. A change to an exit code or a flag
  touches one table entry and no `.feature` line. Distinct failure modes take distinct phrases, even
  where two map to one code.

**How a rewording is checked.** A rewording is a green-to-green refactor:
- a dry run shows no undefined step;
- *Every step definition is one Cucumber runs* stays green;
- Cucumber's scenario and status multiset is unchanged;
- `balance`'s report is byte-identical apart from its provenance.

The plant: put one definition's pattern back to the old text. The dry run shows the step undefined,
and the unused-definition gate names the definition.

**The gate.** The step *No Given, When or Then names an interface mechanic* reds when a step line in
`features/` names one. It runs the pinned `vale-action` with `config: .vale/steps.ini`, a config of
its own, so the comment gates and `.vale.ini` are untouched.
- The view `GherkinSteps` reads the text after `Given`, `When`, `Then`, `And`, `But` or `*`, and
  nothing else. It skips docstrings, under `"""` or three backticks, because they hold fixture
  text.
- The rule `Steps.InterfaceMechanic` is an existence rule, case-insensitive. Its tokens are output
  channels (`stdout`, `stderr`, standard output or error); exit codes (`exit 1`, `exits 2`, exit
  code or status, success status, exits non-zero); a `--flag`; a `.json` file name or `run.yaml`;
  the store root; and the binary (CLI binary, top-level binary, the CLI, `cwd`, the balance
  command).
- The rule's own data stays legal: format names as words (`json`, `md`, `xml`), a target's workflow
  names (`ci.yml`, `nightly.yml`) and the verdict words.

The plant: add the line `And the run exits 1` to a scenario. The step reds and names the line.

**Limits.** Feature, Rule and Scenario titles are not read; some still name the interface. Examples
rows are not read either. One table in `output-format.feature` keeps the paths it tests
(`/dev/stdout`, standard output) as its own data, and a cell that reaches a step line is held by
review alone. A pattern holds each line to a definition, and this gate holds its altitude.

### Duplication

Canon: `fitness-functions.md` → *The suite — the mandatory gates*, the Duplication row, and *The
gate holds the changed set, and nothing keeps a list*.

**What it runs.** The step *Duplication — no clone touches a changed production file* runs
`if: always()` under `shell: bash`. It runs `jscpd`, pinned exactly in the root `package.json`, a
native binary that npm installs per platform. The flags carry the configuration, each with its
reason in a YAML comment beside the step, because jscpd's config file accepts neither comments nor
unknown keys.
- The population is production code: `packages/core/src` and `packages/spec-controller/src`,
  `--format typescript`, with `**/*.test.ts` and `**/fixtures/**` ignored.
- A clone is jscpd's own default, stated in full: `--min-tokens 50 --min-lines 5`. That is the
  tool's definition, not a number fitted to this code. There is no community standard; SonarQube
  defaults to 100 tokens across 10 lines.
- `--absolute` names each file by its full path, so the report can be matched against the changed
  set.

**Two commands, one report and one gate.** The first reports every production clone and exits 0.
The second takes the complexity gate's changed-set line, `git diff -z --name-only --diff-filter=d
"$(git merge-base origin/main HEAD)"`, and one `jq` filter over jscpd's JSON report. It prints each
clone with a fragment in a changed file, and fails if there is one. The changed set needs no
pathspec: jscpd's paths and ignores already hold the population, so a changed test can never appear
in a clone.

**Why not jscpd's own baseline.** jscpd 5 can compare against a ref with `--baseline-from-ref` and
fail only on new clones. Canon's gate is clean as you code: an old clone in a file the change
touches reds too, so it is tidied when its file is next edited. The baseline mode would pass it.

**The plants.** A file that copies another production file reds the step and names both. A
whitespace-only change to a file that already holds a clone reds it too, naming the old clone.

**Limits.** A clone below 50 tokens or 5 lines is not one. A clone with no fragment in the changed
set is reported and does not fail, so existing duplication waits until its file is next touched.
Test code is outside the population.

### Unused code

Canon: `fitness-functions.md` → *The suite — the mandatory gates*, the Unused code row, and *The
gate holds the changed set, and nothing keeps a list*.

**What it runs.** The step *Unused code — no changed file carries an unused file, export or
dependency* runs `if: always()` under `shell: bash`. It runs `knip`, pinned exactly in the root
`package.json`, configured in `knip.jsonc`, where each setting carries its reason as a comment.
- Default mode: knip reads the test files as entry points, so an export a test imports counts as
  used. Production mode, where tests are not consumers, would make the gate a lever on how the unit
  tests are written.
- `--include files,exports,types,dependencies` keeps the four kinds canon names: an unused file, an
  unused export, an unused exported type (a type is an export), and an unused dependency of any
  workspace. Unlisted binaries and unresolved imports are other faults, not unused code.
- `ignore: ["tests/**"]` keeps findings in the Cucumber step files and their support out of the
  report, because canon's row covers what ships. knip still reads their imports, so what they use
  stays used.
- `ignoreDependencies: ["tsx"]`: Cucumber loads it through the `requireModule` string in
  `cucumber.js`, which knip's Cucumber plugin does not read.

**One report and one gate.** The first command prints every finding and exits 0. The second writes
knip's JSON report. The complexity gate's changed-set line and one `jq` filter keep the findings in
files the change touches, print each as `<file>: <name>`, and fail if there is one. knip's paths are
repository-relative, like `git diff`'s.

**A manifest is a file too.** A change to `package.json` brings that manifest's unused dependencies
into the changed set. So a dependency bump, the Dependabot pin's included, reds if the manifest
carries one, and the manifest has to stay clean.

**The plant.** An unused export added to a production file reds the step and names it.

**Limits.** An unused finding in a file the change does not touch is reported and does not fail.
Test code's own unused exports are not reported.

### A test leaves nothing in its temporary directory

Canon: the cleanup rule. A test removes what it creates with `fs.rmSync`, and restores any mode it
stripped with `fs.chmodSync` first, in the same hook.

**Where the suites run.** *Test* and *Cucumber* each run with `TMPDIR` set to a directory of their
own, `$RUNNER_TEMP/suite-tmp/vitest` and `$RUNNER_TEMP/suite-tmp/cucumber`, created empty by
*Resolve the evidence root*. Their commands are unchanged, so their run-time gates time the same
commands as before.

**The two cache settings, and why each is there.** Without them the toolchain, not a test, writes to
`TMPDIR`, and the rule could not stay "nothing left".
- `NODE_COMPILE_CACHE`, on both suites, points Node's compile cache at
  `$RUNNER_TEMP/node-compile-cache`. Vitest turns that cache on, and by default it lives in
  `TMPDIR`. The setting moves it.
- `TSX_DISABLE_CACHE: "1"`, on *Cucumber* only, turns tsx's cache off. tsx keeps its cache in
  `TMPDIR` and reads no setting that moves it. A fresh runner never gets a warm hit, so turning it
  off costs nothing in CI; local runs keep it.
- Neither is a named exclusion. An exemption by name would also pass a test that leaks under that
  name.

**The check.** The step *No test leaves an entry in its temporary directory* runs after *Cucumber*,
under the same condition, so it is skipped when *Test* was skipped and never passes over a directory
no suite wrote to. It lists every entry in each suite's directory, counted by suite and by prefix
with `mkdtemp`'s six-character suffix stripped, and fails if there is any.

The plant: remove one step file's `rmSync`. The check reds and names the suite and the prefix, for
example `5 cucumber/scn-grammar` when scnGrammar's steps keep their five directories.

**Limits.** A cancelled run skips the check. A suite killed by its own `timeout` is still checked,
so what its unrun teardown would have removed is reported beside the timeout's red. The check reads
only the two suite directories, so a test that writes somewhere other than `os.tmpdir()` is not
seen.

### Self-reconciliation

Canon: `fitness-functions.md` → *Self-reconciliation — the capstone*, and `ci-and-release.md` → *The
shape to copy*.

**What it runs.** The last step of `ci.yml`, *Self-reconciliation balance*, runs `balance` over
`features`, the run's `vitest.json` and `cucumber.json`, the step record, `ci.yml` and
`package.json`. Its exit sets the job's result: a balanced ledger passes, an out-of-balance one
reds at exit 1, and an input it could not read reds at exit 2.

**It runs on every run.** The step carries `if: always()`, like the gates above it, so a red run
still reconciles. That run is the one where the ledger matters most, because it names the
obligations that have no evidence.
- When an earlier gate reds but both suites finished, both reports are whole. The step reconciles
  and the ledger names what is out of balance: a failing assertion shows its scenario as
  *Evidence Observation is failing*.
- When a suite is killed before it writes its report, the report is absent (Vitest) or empty
  (Cucumber). A failed install or build leaves both absent. The step then refuses at exit 2, naming
  the input it could not read.
- `--vitest` and `--cucumber` are always passed. Passing them only when their files exist would
  reconcile a crashed suite as if it had no evidence at all, which is 254 of 276 rows out of balance
  when measured, with the crash visible only as *Not supplied* in the provenance. `--ci-steps` is
  passed only when its file exists, and in CI it always does: the dump step that writes it is
  itself `if: always()`.
- No report is ever written in place of a missing one.

**The plant.** A failing unit assertion: *Test* reds, and *Self-reconciliation balance* runs and
prints the ledger with that scenario out of balance. The same assertion without the `if:` leaves the
step `skipped`. *Test*'s `timeout` lowered to 1 second: the step runs and refuses at exit 2, naming
`--vitest`.

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

   **A runner is matched only in the last stage of a pipeline.** A step that hands the runner's
   output to another command — `cucumber-js --dry-run --format usage-json | jq … | awk …` — is
   using the runner as a tool, and the command that reads it passes the verdict, so the step is a
   candidate check, not your suite. The same holds inside a manifest script the step invokes. A
   `|` inside a quoted argument reads as a pipe too, which costs one `notChecks` line, never a
   check gone silent.

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
   with a title saying what the check is about, and no Given/When/Then. **That is
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
