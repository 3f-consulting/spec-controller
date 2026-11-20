# How spec-controller works

This page is the long version of the [README](../README.md). It covers the gap spec-controller closes, what each kind of disagreement reports, what `balance` cannot see, how to read the full report, and how spec-controller differs from coverage and mutation testing. To set it up, start with [`quickstart.md`](./quickstart.md).

## The gap it closes

Software built from a written specification has three things to keep in step:

- the *document specification*: a document that says what the application should do;
- the checks that test it, its *executable specifications*: scenarios, tests and fitness functions. A *fitness function* is a CI check, such as lint or a complexity limit;
- the application itself: its behaviour and its fitness.

Each link between them needs something to hold it:

| Link | What holds it today |
|---|---|
| checks ↔ application | **Mechanism**: check the application via the behavioural tests themselves, plus coverage, mutation testing, etc |
| document specification ↔ checks | **Nothing but care.** The document specification says one thing, the checks prove another, and nothing notices when they drift |
| document specification ↔ application | only through the other two |

Today's mechanism holds the checks ↔ application link well at the unit layer. `balance` makes that link hold for every kind of quality check: each named behaviour must be answered by a check that ran against the application and passed, and a CI check must have been able to fail its build.

`balance` never reads your document specification. Whether the checks say what it says is a judgement, not a reconciliation.

That link is where spec-controller is heading: specification-driven development, in which the document specification becomes executable. `balance` holds the checks to the application. `analyse` and `migrate`, the modes that follow it, will hold the document specification to the checks. This is why each behaviour is written as a scenario, not only as a code in a list. Any test can cite a code in a list. A scenario says what its test must show, so a reader can judge whether the test proves it.

## What double entry buys: a change becomes deliberate

Every behaviour is recorded twice: as a scenario, and as the test that proves it. The two records must agree. So **changes to your quality checks become deliberate, not accidental.**

Each kind of disagreement has its own outcome, shown below. [Reading the full report](#reading-the-full-report) defines a *phantom claim* and the *unnamed claim*. Every outcome except `satisfied` turns the build red, except where `--written-claims-only` leaves a phantom claim or the unnamed claim out of the verdict:

| You change | The report shows |
|---|---|
| Delete a test | `missing` on its scenario |
| Skip a test | `missing`: a skipped test proves nothing |
| Break the behaviour a test checks | `failing` |
| Re-point a test at another scenario | `missing` on the original |
| Drop the claim code from a test's title | the test still runs, but lands on the unnamed claim (`cites-no-claim`), and its scenario reads `missing` |
| Delete a scenario but keep its tests or its CI check | they still run and pass, but their evidence lands on a phantom claim (`cites-unknown-claim`) |
| Cite a scenario from a unit test when its tags ask only for `@e2e` | `not-asked-for`: evidence the scenario never asked for |
| Delete a CI check step | `missing` on its fitness function's scenario |
| Let a CI check step or its job run under `continue-on-error: true` | `cannot-fail`: it passes, but its red might not fail the CI run. The run's step record gives the step's own outcome: a red it swallowed reads `failing`, and a green still reads `cannot-fail`. Without the step record, the step reads not recorded, citing no claim, and its scenario reads `missing` |
| Copy a scenario and keep its claim code | each copy gets its own Claim Reconciliation under that code. Every Quality Check Reconciliation on it (one for each kind of quality check it asks for) reads `duplicate-claim-code`, or `no-quality-check` for a copy that asks for none. No evidence can be credited to either copy |
| Tag a scenario `@wip` while its tests still cite it | the scenario is put off, so it asks for nothing, and its tests' evidence lands on a phantom claim (`cites-unknown-claim`) |
| Write a scenario's tags but no claim code | `no-claim-code`: nothing can cite it |
| Remove the tags naming a scenario's kinds of quality check while nothing cites it | `no-quality-check`: it asks for nothing, and nothing answers |
| Leave a test file that fails before any of its tests runs | `never-ran`, on the unnamed claim: its evidence never ran, and the run is `not-reconciled`, as `unsound` |

To remove a behaviour cleanly, you change both the scenario and its evidence. That change shows in the diff, and review judges it there.

This matters most when an agent writes the code. An agent makes the mistakes a person makes, many times faster, and too often for review alone to catch them. An agent asked to make failing tests pass can delete them. Here, deleting them gives a red build, not a quiet green.

**The limits:**

- **Deliberate is not right.** A change made in both places balances. Review decides whether the change should have been made.
- **A change inside one check is one entry, and `balance` does not see it.** A row reads the step record: your CI run's own record of whether the step ran and what it reported. It does not read what the tool examined. So a lint step narrowed to match no files still exits 0, and its row reads satisfied. And because the row reads the step record, a red that `continue-on-error` swallowed still turns its row red.
- **Delete a scenario but keep its step definitions**, and Cucumber runs nothing and reports nothing. With no result reported, `balance` cannot see it. A check for unused step definitions catches this, and this repository runs one.
- **No named behaviours, no second entry, no protection.** Code that arrives with no scenario gives `balance` nothing to reconcile. There is no mode that guards CI checks without scenarios: a check that fails already fails its build, so such a guard would be your automated tests again. What `balance` adds is the second entry.
- **Under `--written-claims-only`, a deferral tag takes its scenario out of the gate.** Tag a scenario `@wip` and the tests citing it land on a phantom claim, which that flag leaves out of the verdict, so even a failing test leaves the build green. Review a deferral tag as you would a deleted test.
- **Whether a test is a good test is assumed.** A balanced row means the evidence exists and passes, and that a CI check's failure would have failed its build. It does not mean the test checks what its title says, or checks anything at all. A test that asserts nothing is a fitness function's to catch, as the [user guide](./user-guide.md) says, outside `balance`.

## Reading the full report

Here is part of the report for a larger set of scenarios, with a CI pipeline. It shows the Summary, the Step account and the Claim Reconciliations, without the key above each table.

<div class="sample-report">

```markdown
## Summary

- Run verdict: out of balance

### Claim Reconciliations

| Total | Balanced | Out of balance |
| --- | --- | --- |
| 7 | 2 | 5 |

### Quality Check Reconciliations, by kind

| Kind | Evidence Obligations | Evidence Observations | Satisfied | Failing | Missing | Cites an unknown claim | Cites no claim |
| --- | --- | --- | --- | --- | --- | --- | --- |
| unit | 3 | 4 | 1 | 1 | 1 | 1 | 1 |
| fitness | 2 | 2 | 1 | 1 | 0 | 0 | 0 |
| All | 5 | 6 | 2 | 2 | 1 | 1 | 1 |

### Evidence Observations, by where they were filed

| Where filed | Evidence Observations |
| --- | --- |
| On an executable claim | 4 |
| On a phantom claim | 1 |
| On the unnamed claim | 1 |
| Total | 6 |

### Out of balance by feature

| Feature file | Out of balance |
| --- | --- |
| `checkout.feature` | 3 |

## Step account

| Workflow | Job | Steps read | Runners | Reconciler steps | Non-checks | Plumbing | Fitness functions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ci.yml | build | 7 | 1 | 2 | 1 | 1 | 2 |

## Claim Reconciliations

| Claim | Unit | Fitness | Verdict | Reconciling items |
| --- | --- | --- | --- | --- |
| CLM-CHK-001 | U/1 |  | balanced | — |
| CLM-CHK-002 | U/1 |  | out-of-balance | unit: failing (`src/checkout.test.ts`: `[CLM-CHK-002] charges the card`) — `expected 1 charge, got 0` |
| CLM-CHK-003 | U/- |  | out-of-balance | unit: missing |
| CLM-CHK-005 |  | F/1 | balanced | — |
| CLM-CHK-006 |  | F/1 | out-of-balance | fitness: failing (`ci.yml:build:Lint`) |
| CLM-CHK-004 | — | — | out-of-balance | unit: cites-unknown-claim (`src/checkout.test.ts`: `[CLM-CHK-004] applies the discount`) |
| (unnamed claim) | — | — | out-of-balance | unit: cites-no-claim (`src/checkout.test.ts`) — 1 ran, 1 passed, 0 failed |
```

</div>

Read it as double entry. Each claim is an account. Its tags say what it is owed. The evidence that ran is what it was paid. In this sample:

- two claims balance: a unit test and a complexity check;
- one test is failing;
- one CI check, the lint step, is failing;
- one scenario has no test at all;
- one test cites a scenario that does not exist;
- one test cites nothing.

The two claims with an `F` are CI checks: the complexity limit that passes, and the lint step that failed. `balance` reconciles a check the same way as a test: its scenario is owed one, and the step's result, read from the run's step record, is the evidence. A scenario tagged `@unit @e2e` is owed both. It balances only when a unit test and an end-to-end run each arrive and pass. No single test runner can see that.

The **Step account** says what became of every CI step the run read. This sample has seven:

- the test runner's step;
- the two steps that are the reconciler's own;
- the install, named a non-check;
- GitHub's checkout action, counted as plumbing;
- the two checks, counted as fitness functions.

The report uses these exact terms:

- A *Claim Reconciliation* is the evidence reconciled for one claim: one row of the table. A claim is usually a scenario. The Claim Reconciliation sets the evidence the claim asks for, if any (its *Evidence Obligations*), against the results reported for it (its *Evidence Observations*). Each pairing is a *Quality Check Reconciliation*, with its own outcome. The row lists each one that is not `satisfied` as a reconciling item.
- A *phantom claim* comes from a test that names a scenario which does not exist. The usual cause is a typo or a deleted scenario.
- The *unnamed claim* takes any test that names no scenario at all, several scenarios, or a code that several scenarios share.
- A *cannot-fail* check passes, but its red might not fail the CI run: its CI step or job sets `continue-on-error`, or `balance` did not read its workflow and so cannot tell whether it does.
- The *run verdict* is `balanced`, `out-of-balance`, or `not-reconciled`. A `not-reconciled` verdict gives the reason the run could not be relied on: `unsound`, `claim-code-errors`, `configuration-errors` or `nothing-to-reconcile`.

[`ubiquitous-language.md`](./ubiquitous-language.md) has the rest.

## Why not coverage or mutation testing?

Both answer their own questions well, and both live at the unit layer:

| Kind of quality check | Coverage | Mutation testing | `spec-controller` |
|---|---|---|---|
| `@unit` | yes | yes | yes |
| `@integration`, `@e2e` | rarely collected, and counts lines | possible, slow, rare | yes |
| `@performance` | no such idea | no such idea | yes |
| `@fitness` (lint, complexity, type checks, any CI check) | no such idea | no such idea | yes |

Coverage tells you how much of the application the unit tests reach. Mutation testing tells you whether those tests would notice the application change. Neither knows which behaviours your scenarios name. So neither notices a named behaviour with no proof, or a passing test credited to a scenario that asked for a different kind of evidence. `spec-controller` reconciles all five kinds of quality check in one account.

**For a team already well tested at the unit layer, `spec-controller` finds nothing at that layer that coverage and mutation testing miss.** What it finds is above it: a named behaviour with no passing proof, a test credited to a scenario that asked for a different kind of evidence, and a CI check that cannot fail or never ran. Keep your coverage gate and your mutation threshold. They are inputs here, not rivals.
