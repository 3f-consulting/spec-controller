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
    "lint:complexity-exceptions": { "check": "complexity", "scn": "SCN-CPX-006" },

    // String form — names the characteristic only; the corpus decides which row the credit
    // posts to. An object carrying no "scn" is the object spelling of exactly this.
    "typecheck": "typecheck"
  }
}
```

**Why it exists, so that its ending is legible rather than arbitrary.** A static check's run reaches
the reconciliation as an anonymous script handle — `lint:complexity` — and nothing in that handle
says which scenario the run credits. The registry is what says so. When a check becomes a fitness
scenario that Cucumber runs, its credit arrives already carrying its `@SCN`, the handle leaves the
reconciliation, and the entry has nothing left to carry. **The entry is then deleted as a
consequence of converting, never as a migration of its own.** There is no step at which you are
asked to stop doing the thing you were told to do.

If you never convert a check, you never touch the registry.

### `specController.thresholds`

**Supported.** It carries the ceiling a measured check's number is held against, keyed by the
scenario's `@SCN` and the characteristic:

```jsonc
"specController": {
  "thresholds": {
    "SCN-CIP-013": { "ci-run-time": 75 },
    "SCN-MUT-011": { "mutation": { "atLeast": { "mutationGate": "domain" } } }
  }
}
```

**Nothing is pending against it** — no replacement is designed, so no sunset is stated. It is
**removed only in a major version**, after a replacement has shipped.

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
