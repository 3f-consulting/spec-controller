# spec-controller

**Reassurance that your software keeps doing what you said it does.**

`spec-controller balance` fails your build when your scenarios and your tests stop agreeing.

You write each behaviour as a scenario in a `.feature` file. You give the scenario two kinds of tag: the evidence it needs, such as `@unit` or `@e2e`, and a claim code of the form `@CLM-<FFF>-<NNN>`. Each test cites the code of the scenario it proves.

On every CI run, `balance` reconciles the scenarios against the test reports and CI steps that actually ran. Every check a scenario asks for must have run, be credited to that scenario, pass, and be able to fail. Any disagreement turns the build red.

**What you need first:** your behaviours written as Gherkin scenarios with claim codes, and tests that cite them. For CI checks, you also need GitHub Actions (see *Who it fits*, below). `balance` keeps a codebase reconciled, but it does not name your behaviours for you.

## A small example

<div class="sample-report">

A scenario:

```gherkin
@CHK
Feature: Checkout

  @unit @CLM-CHK-001
  Scenario: an empty basket cannot be checked out
```

A Vitest test that cites it, in its title:

```ts
it("[CLM-CHK-001] refuses an empty basket", () => { /* … */ });
```

`balance` reconciles them, and the Claim Reconciliation balances:

```markdown
### CLM-CHK-001

- Title: `an empty basket cannot be checked out`
- File: `checkout.feature`

- Verdict: balanced

Each row is one Quality Check Reconciliation: its outcome, its kind of quality check, where to look, and what was said.

| Outcome | Kind | Where to look | Said |
| --- | --- | --- | --- |
| satisfied | unit | `src/checkout.test.ts` `[CLM-CHK-001] refuses an empty basket` |  |
```

Delete the test, and the run is out of balance and exits `1`:

```markdown
### CLM-CHK-001

- Title: `an empty basket cannot be checked out`
- File: `checkout.feature`

- Verdict: out-of-balance

Each row is one Quality Check Reconciliation: its outcome, its kind of quality check, where to look, and what was said.

| Outcome | Kind | Where to look | Said |
| --- | --- | --- | --- |
| missing | unit |  |  |
```

</div>

`satisfied` is a unit Evidence Obligation answered by a passing unit test. `missing` is a unit Evidence Obligation that no unit test answered.

## What double entry buys: a change becomes deliberate

Every behaviour is recorded twice: as a scenario and as the test that proves it. The two records must agree. So **changes to your quality checks become deliberate, not accidental.**

Each kind of disagreement has its own outcome. *The gap it closes* defines a *fitness function*, and *Reading the full report* defines a *phantom claim* and the *unnamed claim*.

Every outcome except `satisfied` turns the build red:

| You change | The report shows |
|---|---|
| Delete a test | `missing` on its scenario |
| Skip a test | `missing`: a skipped test proves nothing |
| Break the behaviour a test checks | `failing` |
| Re-point a test at another scenario | `missing` on the original |
| Drop the claim code from a test's title | the test still runs but lands on the unnamed claim (`cites-no-claim`), and its scenario reads `missing` |
| Delete a scenario but keep its tests or its CI check | they still run and pass, but their evidence lands on a phantom claim (`cites-unknown-claim`) |
| Cite a scenario from a unit test when its tags ask only for `@e2e` | `not-asked-for`: evidence the scenario never asked for |
| Delete a CI check step | `missing` on its fitness function's scenario |
| Let a CI check step or its job run under `continue-on-error` | without the run's step record, `cannot-fail`: it passes, but its red might not fail the CI run. With the record, the step's own outcome decides: a red it swallowed reads `failing`, and a green reads `satisfied` |
| Copy a scenario and keep its claim code | each copy gets a Claim Reconciliation of its own under that code, and every Quality Check Reconciliation on it (its row for one kind of quality check) reads `duplicate-claim-code`: no evidence can be credited to either |
| Tag a scenario `@wip` while its tests still cite it | the scenario is put off, so it asks for nothing, and its tests' evidence lands on a phantom claim (`cites-unknown-claim`) |
| Write a scenario's tags but no claim code | `no-claim-code`: nothing can cite it |
| Remove the tags naming a scenario's kinds of quality check while nothing cites it | `no-quality-check`: it asks for nothing, and nothing answers |
| Leave a test file that fails before any of its tests runs | `never-ran`, on the unnamed claim: its proof never ran, and the run is `not-reconciled`, as `unsound` |

To remove a behaviour cleanly, you change both the scenario and its evidence. That change shows in the diff, where review judges it.

This matters most when an agent writes the code. An agent asked to make failing tests pass can delete them. Here, that gives a red build, not a quiet green.

**The limits:**

- **Deliberate is not right.** A change made in both places balances. Review decides whether it should have been made.
- **A change inside one check is one entry, and `balance` does not see it.** A lint step narrowed to match no files still exits 0, and its row reads satisfied. A row reads your CI run's own record of whether the step ran and what it reported, so a red that `continue-on-error` swallowed still turns its row red. The row does not read what the tool examined.
- **Delete a scenario but keep its step definitions**, and Cucumber runs nothing and says nothing. No result is reported, so `balance` cannot see it. A check for unused step definitions catches this, and this repository runs one.
- **No named behaviours, no second entry, no protection.** Code that arrives with no scenario gives `balance` nothing to reconcile.
- **Whether a test is a good test is assumed.** A balanced row means the evidence exists and holds. It does not mean the test checks what its title says.

## The gap it closes

Software built from a written specification has three things to keep in step:

- the spec: a document saying what the application should do (a *document specification*);
- the checks that test it: its *executable specifications*, meaning scenarios, tests and fitness functions (CI checks such as lint or a complexity limit);
- the application itself: its behaviour and its fitness.

Each link between them needs something to hold it:

| Link | What holds it today |
|---|---|
| checks ↔ application | **Mechanism**: check the application via the behavioural tests themselves, plus coverage, mutation testing, etc |
| spec ↔ checks | **Nothing but care.** The spec says one thing, the checks prove another, and nothing notices when they drift |
| spec ↔ application | only through the other two |

`balance` makes the checks ↔ application link hold for every kind of quality check, not only unit tests. It never reads your spec, because whether the checks say what the spec says is a judgement, not a reconciliation.

## Reading the full report

Here is part of the report for a larger set of scenarios, with a CI pipeline: the Summary and the Claim Reconciliations.

<div class="sample-report">

```markdown
## Summary

- Run verdict: out-of-balance

Each row is one count from the reconciliation: what is counted, then how many.

| Counted | Count |
| --- | --- |
| Claim Reconciliations | 7 |
| Claim Reconciliations balanced | 2 |
| Claim Reconciliations out of balance | 5 |
| Quality Check Reconciliations | 7 |
| Quality Check Reconciliations out of balance | 5 |
| failing | 2 |
| missing | 1 |
| cites-unknown-claim | 1 |
| cites-no-claim | 1 |
| missing unit | 1 |
| Evidence Observations | 6 |
| unit | 4 |
| fitness | 2 |
| on an executable claim | 4 |
| on a phantom claim | 1 |
| on the unnamed claim | 1 |
| fitness functions that ran | 2 |
| claim codes written outside a tag | 0 |

### Out of balance by feature

Each row is a feature file, then how many of its claims are out of balance.

| File | Count |
| --- | --- |
| `checkout.feature` | 3 |

### Step account

Each row is one job of a workflow, then how its steps were read.

| Workflow | Job | Steps read | Runners | Reconciler steps | Non-checks | Plumbing | Candidates |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ci.yml` | `build` | 7 | 1 | 2 | 1 | 1 | 2 |
| Total |  | 7 | 1 | 2 | 1 | 1 | 2 |

- Accounted for: 7

## Claim Reconciliations

### CLM-CHK-001

- Title: `an empty basket cannot be checked out`
- File: `checkout.feature`

- Verdict: balanced

Each row is one Quality Check Reconciliation: its outcome, its kind of quality check, where to look, and what was said.

| Outcome | Kind | Where to look | Said |
| --- | --- | --- | --- |
| satisfied | unit | `src/checkout.test.ts` `[CLM-CHK-001] refuses an empty basket` |  |

### CLM-CHK-002

- Title: `a basket is charged to the card`
- File: `checkout.feature`

- Verdict: out-of-balance

Each row is one Quality Check Reconciliation: its outcome, its kind of quality check, where to look, and what was said.

| Outcome | Kind | Where to look | Said |
| --- | --- | --- | --- |
| failing | unit | `src/checkout.test.ts` `[CLM-CHK-002] charges the card` |  |

### CLM-CHK-003

- Title: `a voucher lowers the total`
- File: `checkout.feature`

- Verdict: out-of-balance

Each row is one Quality Check Reconciliation: its outcome, its kind of quality check, where to look, and what was said.

| Outcome | Kind | Where to look | Said |
| --- | --- | --- | --- |
| missing | unit |  |  |

### CLM-CHK-005

- Title: `every function stays inside the complexity limit`
- File: `checkout.feature`

- Verdict: balanced

Each row is one Quality Check Reconciliation: its outcome, its kind of quality check, where to look, and what was said.

| Outcome | Kind | Where to look | Said |
| --- | --- | --- | --- |
| satisfied | fitness | `ci.yml:build:Complexity` |  |

### CLM-CHK-006

- Title: `the source passes the lint rules`
- File: `checkout.feature`

- Verdict: out-of-balance

Each row is one Quality Check Reconciliation: its outcome, its kind of quality check, where to look, and what was said.

| Outcome | Kind | Where to look | Said |
| --- | --- | --- | --- |
| failing | fitness | `ci.yml:build:Lint` |  |

### CLM-CHK-004

- Claim: a code no executable claim has

- Verdict: out-of-balance

Each row is one Quality Check Reconciliation: its outcome, its kind of quality check, where to look, and what was said.

| Outcome | Kind | Where to look | Said |
| --- | --- | --- | --- |
| cites-unknown-claim | unit | `src/checkout.test.ts` `[CLM-CHK-004] applies the discount` |  |

### The unnamed claim

- Verdict: out-of-balance

Each row is one Quality Check Reconciliation: its outcome, its kind of quality check, where to look, and what was said.

| Outcome | Kind | Where to look | Said |
| --- | --- | --- | --- |
| cites-no-claim | unit | `src/checkout.test.ts` `rounds the total` |  |

Each row is one group of the unnamed claim's evidence: its kind of quality check, its file, the claim code it shares, how many of its tests ran, passed and failed, and the names of those that failed.

| Kind | File | Claim code | Ran | Passed | Failed | Failures |
| --- | --- | --- | --- | --- | --- | --- |
| unit | `src/checkout.test.ts` |  | 1 | 1 | 0 |  |
```

</div>

Read it as double entry. Each claim is an account: its tags are what it is owed, and the evidence that ran is what it was paid. In this sample:

- two claims balance, a unit test and a complexity check;
- one test is failing;
- one CI check, the lint step, is failing;
- one scenario has no test at all;
- one test cites a scenario that doesn't exist;
- one test cites nothing.

The two `fitness` rows are CI checks: a complexity limit that holds, and a lint step that failed. A check is reconciled the same way as a test: its scenario is owed one, and the step's result, read from the run's step record, is the evidence. A scenario tagged `@unit @e2e` is owed both, and balances only when a unit test and an end-to-end run each arrive and pass. No single test runner can see that.

The **Step account** says what became of every CI step the run read: the test runner's step, the two steps that are the reconciler's own, the install named a non-check, GitHub's checkout action as plumbing, and the two checks as candidates.

The report uses these exact terms:

- A *Claim Reconciliation* is the evidence reconciled for one claim. A claim is usually a scenario. It sets the evidence the claim asks for, if any (its *Evidence Obligations*), against the results reported for it (its *Evidence Observations*). Each of its rows is a *Quality Check Reconciliation*, with its own outcome.
- A *phantom claim* comes from a test that names a scenario which does not exist. The cause is usually a typo, or a scenario since deleted.
- The *unnamed claim* takes any test that names no scenario at all, or a code several scenarios share.
- A *cannot-fail* check is one that passes, but whose CI step or job sets `continue-on-error`, so its red might not fail the CI run.
- The *run verdict* is `balanced`, `out-of-balance`, or `not-reconciled` with the reason the run could not be relied on: `unsound`, `claim-code-errors` or `nothing-to-reconcile`.

[`docs/ubiquitous-language.md`](./docs/ubiquitous-language.md) has the rest.

## Why not coverage or mutation testing?

Both answer their own questions well, and both live at the unit layer:

| Kind of quality check | Coverage | Mutation testing | `spec-controller` |
|---|---|---|---|
| `@unit` | yes | yes | yes |
| `@integration`, `@e2e` | rarely collected, and counts lines | possible, slow, rare | yes |
| `@performance` | no such idea | no such idea | yes |
| `@fitness` (lint, complexity, type checks, any CI check) | no such idea | no such idea | yes |

Coverage and mutation testing tell you how much of the application the unit tests reach, and whether those tests would notice the application change. Neither knows which behaviours your scenarios name. So neither notices a named behaviour with no proof, or a passing test credited to a scenario that asked for a different kind of evidence. `spec-controller` reconciles all five kinds of quality check in one account.

**For a team already well tested at the unit layer, `spec-controller` adds hygiene, not discovery.** Above the unit layer, once behaviours are named, nothing else holds each one to its proof. Keep your coverage gate and your mutation threshold: they are inputs here, not rivals.

## Who it fits

- **CI:** GitHub Actions. This is the real requirement: a CI check becomes evidence through the run's own step record.
- **Unit evidence:** one of:
  - Vitest's JSON report;
  - Jest's JSON report (`--jest`);
  - pytest's JUnit XML (`--pytest`);
  - Go's JUnit XML from gotestsum (`--junit`);
  - Java's JUnit XML reports from Maven Surefire (`--junit`);
  - Kotlin's JUnit XML reports from Gradle (`--junit`);
  - Ruby's RSpec JSON report (`--rspec`).
- **Integration and end-to-end evidence:** the JSON report of any Cucumber implementation, in any language.
- **Fitness evidence:** any check your pipeline runs, in any language.
- **The scenarios:** a list of named behaviours in `.feature` files. A `@unit` scenario needs no step definitions: a title and its tags are the whole scenario. A test cites a scenario as `[CLM-<FFF>-<NNN>]`, in brackets:
  - a Vitest or Jest test, in its title;
  - a Go test, in a subtest's name;
  - a JUnit 5 test in Java or Kotlin, in its `@DisplayName`;
  - an RSpec example, in its description.

  A pytest test cites it with `@pytest.mark.clm` instead.

## Try it

```
npm install -g spec-controller
```

`spec-controller` requires Node ≥ 22.12. Then run this from your repository:

```
spec-controller balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

Pass whichever reports you have. The *What you need* section of [`docs/user-guide.md`](./docs/user-guide.md) says how to produce each one.

`balance` is a gate: an out-of-balance run exits `1`. To watch before you gate, add `--exit-zero`. You get the same report, but an out-of-balance verdict exits `0`. Remove the flag when you are ready to gate. On GitHub Actions, `--format md:$GITHUB_STEP_SUMMARY` puts the report on the run's summary page.

**Before you name anything, `balance` lists what ran.** With no scenarios, every test and CI step it reads lands on the unnamed claim, one row each, saying whether it passed or failed, and where to look. That tells you nothing your CI does not already show. It is a starting inventory, and the value begins when you name the behaviours. Setup steps your pipeline runs, such as publishing or version bumps, are listed as checks until you name them in `specController.notChecks`. GitHub's own checkout, setup, cache and artifact actions are left out for you.

[`docs/quickstart.md`](./docs/quickstart.md) takes you from nothing to a first run in CI. [`docs/user-guide.md`](./docs/user-guide.md) is the full reference: every flag, every runner, and the CI wiring in detail.

At `0.x`, nothing is promised between versions ([`docs/compatibility.md`](./docs/compatibility.md)). Pin an exact version.

## Starting from an existing codebase

`balance` keeps a reconciled codebase reconciled, but it does not get one there. That work is yours: name each behaviour as a scenario, and put its claim code on the tests that prove it. Before that, use the inventory and `--exit-zero` described in *Try it*, above.

## Built with Claude Code, and how it's kept honest

This repository was built with Claude Code, by an author who does not write TypeScript. The commit history is the agent's working log. Each commit title follows the issue-key convention, `[KEY-123] summary`, where the ID refers to a private tracker.

The repository holds itself to the discipline it asks of you. Its own CI reconciles its own scenarios with `balance` on every run, and gates on:
- mutation testing at 95% per scope;
- cognitive complexity, function length and CRAP;
- duplication and unused code;
- dependency boundaries;
- published-package checks (publint, attw);
- workflow linting and security (actionlint, zizmor);
- code-level security, by this repository's own Semgrep rules;
- a ceiling on test code against production code.

**Why these gates:** each fitness function this repository runs in CI is a scenario in [`features/fitness-functions.feature`](./features/fitness-functions.feature), and its Rule says what it holds and why. Some of these gates are meant to take over the routine feedback a technical lead gives in code review, so that a reviewer's attention goes to design and intent. The rest guard the method itself.

The agent has been caught. Claude Code once re-pointed two live tests at scenarios they did not prove, to clear this tool's own red. Review caught it, and the change was reverted. That is the first limit in *What double entry buys*, seen in practice: a change made in both places balances, and review is what judges it.

## The library

The reconciliation engine ships separately as **`@3f-consulting/spec-controller-core`**: the same logic, pure, with no CLI and no I/O. Its README is [`packages/core/README.md`](./packages/core/README.md).

## Licence

MIT, see [`LICENSE`](./LICENSE). © 2026 3F Consulting Ltd.
