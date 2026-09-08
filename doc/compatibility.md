# Compatibility — what you can build on

This page answers one question, and deliberately only one:

> **What can I configure today without it being taken away?**

If you are wiring `spec-controller` into a repository, you are about to write configuration and tag a
corpus of scenarios, and you need to know which of that work is safe. Everything below is a
commitment about the mechanisms this tool reads. How to *use* them is
[`doc/how_to_use.md`](./how_to_use.md); this page is only about how long they last.

---

## The commitment, and it is a choice rather than an obligation

`spec-controller` is at `0.1.0-alpha.1`. **Semantic versioning does not oblige us to anything before
`1.0.0`, and saying otherwise would be dishonest.** So the pre-1.0 position is not offered here as
cover — it is offered as the reason the commitment below is worth writing down at all.

**We undertake the following anyway, as a choice:**

1. Every mechanism named on this page **works today and keeps working**.
2. A mechanism that stops being *necessary* does not stop *working* at that moment. Those are
   different events, and they are separated by at least one major version.
3. **A supported mechanism is removed only in a major version**, and only after its replacement has
   shipped and you can move to it without a flag day.
4. A change to which evidence obligations your corpus raises is **measured against real corpora
   before it ships**, and the numbers are published.

A consumer who cannot rely on that will not adopt, and adoption is the entire point of shipping this
at all. The version number is `0.1.0-alpha.1`; the commitment is the sentence, not the number.

---

## What "on a deprecation path" means here

It is the phrase most likely to be misread, so it is pinned:

**A mechanism on a deprecation path will stop being NECESSARY. It will not stop WORKING.**

Those are two different events with a major version between them:

| Event | What it means for you |
|---|---|
| **Stops being necessary** | A replacement has shipped. Corpora that adopt it no longer need the old mechanism. Yours still works, unchanged, for as long as you keep it. |
| **Removed** | Only in a major version, only after the above, and only where moving does not need a flag day. |

*Will stop being necessary* is not *is forbidden*. If you read a statement of direction anywhere —
in a changelog, an issue, a design note — and it sounds absolute, **this page is the one that
governs.** A direction is a plan for the tool; this page is a promise to you.

---

## The mechanisms

Every entry below carries the same three clauses, in the same order: **supported now** · **stops
being necessary when** · **removed only in a major version**. Where the middle clause reads *nothing
is pending*, that is the honest answer rather than a missing clause — inventing a speculative sunset
for a mechanism with no designed replacement would be the same fault as an absolute framing, one
register quieter.

**This section documents what the READER accepts, not what we happen to use.** The difference is
worth stating because it is currently large: this repository has converted every one of its own
static checks to the last mechanism below, so its `package.json` carries no `checkRegistry`, no
`thresholds` and no `staticChecks` at all. **None of that is a withdrawal.** Each of those
mechanisms is read exactly as it was, our having stopped using them is not a step you are asked to
take, and the sunset clause on each still says what it said. When we do intend to stop reading one,
it changes here first and in a major version — a promise is not withdrawn by a delivery landing.

### `specController.checkRegistry` — both spellings

**Supported.** It routes a static check's credit to the scenario it discharges, and it works in
`0.1.0-alpha.1`. It **stops being necessary** for any check you convert to a Cucumber-run fitness
scenario, because a converted check's credit arrives already citing its `@SCN` and the registry has
nothing left to join. It is **removed only in a major version**, and a corpus that never converts
keeps it and keeps working.

Both spellings are supported and neither is preferred:

```jsonc
"specController": {
  "checkRegistry": {
    // Object form — names the characteristic AND the fitness scenario the credit posts to.
    "lint:complexity-exceptions": { "check": "complexity", "scn": "SCN-CHK-004" },

    // String form — names the characteristic only; the corpus decides which row the credit
    // posts to. An object carrying no "scn" is the object spelling of exactly this.
    "typecheck": "typecheck"
  }
}
```

**The `@SCN` above is YOURS, not ours, and that is a deliberate change.** This page used to cite
scenarios out of our own corpus, which read as more honest and turned out to be less: we migrated
every one of our static checks to the mechanism two entries below, and the codes those examples
named stopped existing while the examples went on naming them. `SCN-CHK-004` belongs to whoever is
reading — a feature code this repository has never allocated — so the example illustrates the shape
without making a claim about a tree you cannot see. Where an example on this page *does* cite one of
our codes, that citation is held to our corpus by a check that runs on every push.

**Why it exists, so that its ending is legible rather than arbitrary.** A static check's run reaches
the reconciliation as an anonymous script handle — `lint:complexity` — and nothing in that handle
says which scenario the run credits. The registry is what says so. When a check becomes a fitness
scenario that Cucumber runs, its credit arrives already carrying its `@SCN`, the handle leaves the
reconciliation, and the entry has nothing left to carry. **The entry is then deleted as a
consequence of converting, never as a migration of its own.** There is no step at which you are
asked to stop doing the thing you were told to do.

If you never convert a check, you never touch the registry.

### `specController.thresholds`

**Supported.** It carries the bar a measured check's number is held against, keyed by the
scenario's `@SCN` and the characteristic:

```jsonc
"specController": {
  "thresholds": {
    "SCN-CHK-012": { "ci-run-time": { "atMost": 75 } },
    "SCN-CHK-013": { "mutation": { "atLeast": { "mutationGate": "domain" } } }
  }
}
```

**A bar carries a direction, and the direction is half of it.** `atMost` is a ceiling — hold the
pipeline under seventy-five seconds. `atLeast` is a floor — hold the mutation score above what a
gate records. A bare number (`"ci-run-time": 75`) is the ceiling spelling and stays supported; it is
the direction being implicit that makes it worth spelling out, because the two readings differ by
which builds go green rather than by style.

**A replacement HAS shipped, and this entry is the one place on this page that said otherwise.**
For a check converted to a fitness scenario the bar lives on its `specController.fitnessChecks` row,
so a converted check needs no entry here. This block remains the answer for a measured
characteristic you have **not** converted, it is **removed only in a major version**, and nothing
asks you to move before then.

A measured characteristic has no runnable script handle — nothing invokes `ci-run-time` — so the
check registry cannot name it, and this block is how such a characteristic is recognised at all. The
two blocks are read together and neither substitutes for the other.

### The `--measurements` document shape

**Supported.** A measured check posts its number through one artefact, and this is its shape:

```json
{ "measurements": [ { "scnId": "SCN-CIP-001", "checkTag": "ci-run-time", "measured": 42.1 } ] }
```

Both terms are read bare, so you may spell either the way a feature file does (`@SCN-CIP-001`,
`@ci-run-time`) and it resolves the same. A row missing either term of its address, or carrying a
number that is not finite and non-negative, is **dropped rather than posted** — a measurement whose
citation is absent means the artefact is broken, not that a check went uncited, and reporting it as
uncited would blame your corpus for a fault in the wrapper that measured it.

**Nothing is pending against this shape.** New optional keys may be added — a reader that ignores a
key it does not recognise is not a breaking change — but the three keys above keep their names and
their meanings, and are **removed only in a major version**.

### The observed script prefixes — and what they do not reach

**Supported.** A `package.json` script whose name begins `lint:` or `guard:`, invoked by a CI `run:`
step, is observed as a running static check. **They stop being necessary when a fitness corpus names
its own command**, at which point there is no anonymous handle left to discover. They are **removed
only in a major version.**

**And here is the limit, stated plainly because you will otherwise meet it by surprise.** That set is
exactly `lint:` and `guard:`. If your checks are named by any other convention — `static-check:`,
`check:`, `verify:` — **prefix discovery does not see them.** Registered checks are unaffected: the
registry names the handle directly, so a registered check reconciles under any script name at all.
What you lose is the *unregistered* case — a check that runs in CI and is registered by nothing
produces no row, rather than surfacing as one nobody cited.

**We are not going to widen that set**, and saying so is more useful than a promise we do not intend
to keep. The direction of travel removes the question rather than answering it. Until then, the
supported answer is the next entry.

### `specController.staticChecks`

**Supported.** It names scripts that are static checks under a naming convention the prefixes do not
reach, **extending** discovery rather than replacing it:

```jsonc
"specController": {
  "staticChecks": ["typecheck", "static-check:domain-purity"]
}
```

Membership is a property of the check — does it analyse source without running it — not of its name.
`tsc --noEmit` is static analysis under any reading and no prefix recognises it, and your scripts are
not ours to rename. **It stops being necessary at the same moment the prefixes do**, and is
**removed only in a major version.**

It only widens discovery. A check you have *named* in the registry has always reconciled regardless
of its script name; this is for the check nobody named.

### The characteristic tag on a fitness scenario

**Supported.** A scenario carrying a bare characteristic tag your configuration recognises —
`@complexity`, `@typecheck`, `@vocab` from the check registry; `@ci-run-time` and its family from
the thresholds block — raises exactly one evidence obligation for that characteristic, **whether or
not the scenario carries steps.** A stepless fitness scenario is the
common shape and stays fully supported; a stepped one raises the same obligation, so giving a fitness
check a runnable example does not silently drop the characteristic the scenario was written to hold.

**Nothing is pending against this** — it is the direction the other entries move toward, not away
from. It is **removed only in a major version.**

The tag set is yours: an unrecognised bare tag raises nothing, and a corpus that has registered
nothing raises nothing. The tool adds no obligation to your books under a word you never used.

**There is now a SECOND route to the same obligation, and both are read.** A scenario carrying the
single tag `@fitness` gets its characteristic from its configured row rather than from its tag —
that is the next entry. The two live side by side and neither is being taken away: a bare
characteristic tag raises what it has always raised, an `@fitness` scenario raises what its row
names, and a scenario reached by both raises the obligation once. What changed is that a corpus now
has a choice about where the word lives, not that the tag stopped working.

### `specController.fitnessChecks`

**Supported**, and it is the newest of these mechanisms rather than the oldest. A row says which
scenario a check is about, what the check asserts, and the command that runs it — so a check stops
being an anonymous script handle that something else has to route, and becomes a scenario that runs
and reports like every other scenario you have:

```jsonc
"specController": {
  "fitnessChecks": [
    { "scn": "SCN-CHK-004", "characteristic": "vocab",
      "command": "pnpm lint:blocked-vocabulary" },

    // A row carrying a bar is MEASURED — its command prints a number and the number is held
    // to the bar. `atMost` is a ceiling: keep the pipeline under seventy-five seconds.
    { "scn": "SCN-CHK-012", "characteristic": "ci-run-time",
      "command": "pnpm --silent timing:score --scn SCN-CHK-012",
      "atMost": 75 },

    // `atLeast` is a floor, and a bar may name a recorded gate instead of a figure — the
    // number then comes from the record rather than from this file.
    { "scn": "SCN-CHK-013", "characteristic": "mutation",
      "command": "pnpm --silent mutation:score",
      "atLeast": { "mutationGate": "domain" } }
  ]
}
```

**The direction is half of the bar, so both keys are spelled.** `atMost` holds a number down and
`atLeast` holds it up; the two differ by which builds go green rather than by style, and a bar read
in the wrong direction reds a fast suite and greens a slow one. It is the **presence** of either key
that makes a row measured — a bar naming a gate nothing can source leaves the row measured with no
bar rather than quietly passing, and the reconciliation says so.

**Nothing is pending against it** — it is what the other entries move toward. It is **removed only in
a major version**, and a corpus that converts nothing never writes a row.

#### `notExaminedExit` — for a check whose subject is sometimes legitimately absent

Some checks have nothing to look at on some runs, through no fault of anyone's. A check over pull
request metadata, run on a branch that has no pull request. A check over a directory this particular
repository does not have. The run examined nothing — and **both of the answers normally available
are wrong**: exiting clean is a green nobody earned, and exiting with a violation reds honest work
for the circumstances it ran in.

So a row may name the exit code its command uses to say *I examined nothing*:

```jsonc
"specController": {
  "fitnessChecks": [
    { "scn": "SCN-CHK-021", "characteristic": "traceability",
      "command": "pnpm check:pr-metadata",
      "notExaminedExit": 3 }
  ]
}
```

The scenario is then reported **skipped** — neither passed nor failed, in Cucumber's own vocabulary.
It still appears in the report, so the check is still recorded as having run; it does not count
toward the run's exit code; and it is visibly not a pass.

Three rules, and the first is the one that keeps this narrow:

- **No field means no third state.** Every non-zero exit is a fault, which is what you want for
  almost every check. You opt in to the third answer or you never meet it.
- **`0` and `1` are refused where the rows are read**, not discovered at runtime. A row naming `0`
  reports *examined nothing* on exactly the runs where the check worked; a row naming `1` turns
  every real finding into one. Both leave a check unable to say something it must be able to say.
- **Every other code is yours**, `2` and `4` included. What an ending means is a property of your
  command, and the row is where your command is written down.

This repository's own first user of the field is its scenario ⟷ sub-issue check, which cannot answer
its question without a pull request body to read. That is a *member* of the class and not the reason
for it: the field exists because a check with no subject must be able to say so.

#### What a row you got wrong actually does — because it is not what you would guess

**A row the reader cannot make sense of is DROPPED, not rejected.** Mistype a characteristic and the
row goes quiet: no error, no warning, and the check simply stops running. That leniency is
deliberate — one bad line in your manifest should not take down every check you have — and it means
a typo costs you a check rather than a build.

**What catches it is the scenario, which survives the row.** Your fitness corpus is a feature file
you wrote; the row is a line you wrote beside it. Drop the row and the scenario is still there,
carrying a code nothing configures — so the fitness pass has no command to run for it and reds
naming it, and the reconciliation's census names it too:

```
✖ Then the check this scenario names finds no violations
    AssertionError: SCN-CHK-004: no row of specController.fitnessChecks names this scenario, so
    there is no command to run. Write its row: the @SCN it is about, the characteristic it
    asserts, and the command that returns a violation.
```

and, on the reconciliation:

```
1 @fitness scenario(s) no configured row names: SCN-CHK-004.
```

Do not reach for a generated corpus and a regenerate-and-diff row to catch this instead. That is
the arrangement this repository ran for one commit and then retired: a corpus emitted from the rows
drops the scenario with the row, so the two sides can never disagree and there is nothing left to
notice the loss. The scenario has to be authored for its survival to mean anything.

**Two values are refused outright, and refusing them reds every fitness scenario you have.** The
manifest is read once for the whole pass, so `notExaminedExit: 0` or `1` on one row fails all of
them — including rows you did not touch. **Read the first line before you go hunting**: it names the
row, not the checks.

```
Error: SCN-CHK-004: notExaminedExit: 1 is refused where the rows are read, because an ordinary
violation ends that way, so this row turns every finding the check makes into a check that examined
nothing, and a red into a non-failure. …
```

One line of configuration, however many scenarios went red.

---

## What would break you, and what we undertake not to do silently

There is one class of change that can hurt a consumer without touching a single line of their
configuration: **a change to the reader that alters which evidence obligations a corpus raises.**
Your feature files are unchanged, your `package.json` is unchanged, and your reconciliation comes
back different.

**The standing rule, which applies to every such change from now on:**

> A change to which obligations a corpus raises ships with a **before/after reconciliation over the
> known consumer corpora**, taken before the change merges, with the numbers published.

**And the measurement has to be shown to discriminate before a zero is believed.** A before/after
that reports no difference is indistinguishable from a probe that never ran — which is the exact
failure this whole tool exists to name, turned on ourselves. So the negative is earned by planting a
case of the newly-affected shape into a copy of the corpus and watching the reconciliation move.

**This is already how the most recent such change shipped, and the numbers are the evidence for the
rule rather than an illustration of it.** The obligation rule changed so that a fitness
characteristic is read from the scenario's tag rather than from the scenario having no steps. Before
and after, over the consumer corpus of the day: **identical — same summary, same ledger, same
obligations, differing only in the run timestamp. Delta: zero rows.** Not one obligation raised,
credited or lost. And the probe was proven to fire first: a scenario of the newly-admitted shape was
planted into a copy of that corpus, and the reconciliation moved. The zero was a real zero, not a
check that examined nothing.

---

## What this page does not cover

So that the commitment has edges:

- **Internal module layout, file paths, and any symbol not exported from the package.** Reorganised
  freely.
- **The exact prose of the rendered report** — its headings, its wording, its column order. The
  reconciliation's *model* is what you build on; if you need it stable, read the JSON.
- **The `analyse` and `migrate` capabilities**, which are a separate, closed offering and not part of
  this package.
- **The scheduled-check wiring** described in [`doc/scheduled-checks.md`](./scheduled-checks.md),
  which is a pattern for your CI rather than a surface this tool reads.

If something you depend on is not on this page and not in this list, that is an omission rather than
a decision — ask, and it will be added or ruled on.
