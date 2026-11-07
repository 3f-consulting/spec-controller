# spec-controller

**Reassurance that your software keeps doing what you said it does.**

`balance` fails your build when your scenarios and your tests stop agreeing.

You write each behaviour as a scenario in a `.feature` file. You give the scenario two kinds of tag: the evidence it needs, such as `@unit` or `@e2e`, and a scenario code of the form `@SCN-<FFF>-<NNN>` or `@CLM-<FFF>-<NNN>`. Each test cites the code of the scenario it proves.

On every CI run, `balance` reconciles the scenarios against the test reports and CI steps that actually ran. Every check a scenario asks for must have run, be credited to that scenario, pass, and be able to fail. Any disagreement turns the build red.

**What you need first:** your behaviours written as Gherkin scenarios with `@SCN` codes, and tests that cite them. For CI checks, you also need GitHub Actions (see *Who it fits*, below). `balance` keeps a codebase reconciled, but it does not name your behaviours for you.

## A small example

<div class="sample-report">

A scenario:

```gherkin
@CHK
Feature: Checkout

  @unit @SCN-CHK-001
  Scenario: an empty basket cannot be checked out
```

A Vitest test that cites it, in its title:

```ts
it("[SCN-CHK-001] refuses an empty basket", () => { /* … */ });
```

`balance` reconciles them, and the row balances:

```markdown
| Claim | Unit | Verdict | Reconciling items | CI steps |
| --- | --- | --- | --- | --- |
| SCN-CHK-001 | U/1 | balanced | — |  |
```

Delete the test, and the run is out of balance and exits `1`:

```markdown
| Claim | Unit | Verdict | Reconciling items | CI steps |
| --- | --- | --- | --- | --- |
| SCN-CHK-001 | U/- | out-of-balance | unit: Evidence Observation is missing |  |
```

</div>

`U/1` is a unit obligation answered by one unit test. `U/-` is a unit obligation that no unit test answered.

## What double entry buys: a change becomes deliberate

Every behaviour is recorded twice, as a scenario and as the test that proves it, and the two records must agree. So **changes to your quality checks become deliberate, not accidental.**

Each kind of disagreement has its own outcome. Every outcome except `satisfied` turns the build red:

| You change | The report shows |
|---|---|
| Delete a test | `missing` on its scenario |
| Skip a test | `missing`: a skipped test proves nothing |
| Break the behaviour a test checks | `failing` |
| Re-point a test at another scenario | `missing` on the original |
| Drop the scenario code from a test's title | the test still runs but lands on the unnamed claim (`cites-no-scenario`), and its scenario reads `missing` |
| Delete a scenario but keep its tests or its CI check | they still run and pass, but their evidence lands on a phantom claim (`cites-unknown-scenario`) |
| Cite a scenario from a unit test when its tags ask only for `@e2e` | `no-evidence-obligation`: evidence the scenario never asked for |
| Delete a CI check step | `missing` on its fitness function's scenario |
| Let a CI check step or its job run under `continue-on-error` | without the run's step record: `watermelon`, passing, but its red might not fail the CI run. With the record, the step's own outcome decides: a red it swallowed reads `failing`, and a green reads `satisfied` |
| Copy a scenario and keep its `@SCN` code | both copies share one row, and every Quality Check Reconciliation on it reads `duplicate-scn-code`: no evidence can be credited to either |
| Write a scenario's tags but no `@SCN` code | `no-scn-code`: nothing can cite it |
| Remove the tags naming a scenario's kinds of quality check while nothing cites it | `both-missing`: it asks for nothing, and nothing answers |
| Leave a test file that fails before any of its tests runs | `broken`, on the unnamed claim: its proof never ran |

To remove a behaviour cleanly, you change both the scenario and its evidence. That change shows in the diff, where review judges it.

This matters most when an agent writes the code. An agent asked to make failing tests pass can delete them. Here, that gives a red build, not a quiet green.

**The limits:**

- **Deliberate is not right.** A change made in both places balances. Review decides whether it should have been made.
- **A change inside one check is one entry, and `balance` does not see it.** A lint step narrowed to match no files still exits 0, and its row reads satisfied. A row reads from your CI run's own record whether the step ran and what it reported, so a red that `continue-on-error` swallowed still turns its row red. It does not read what the tool examined.
- **Delete a scenario but keep its step definitions**, and Cucumber runs nothing and says nothing. Nothing posts, so `balance` cannot see it. A check for unused step definitions catches this, and this repository runs one.
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

Here is part of the report for a larger set of scenarios: the run verdict and the Claim Reconciliations section.

<div class="sample-report">

```markdown
### Run verdict

**OUT-OF-BALANCE** — the accounts do not agree. At least one Claim Reconciliation carries a reconciling item. This run FAILED. (exit 1)

## Claim Reconciliations

- 8 Claim Reconciliation(s): 3 balanced, 5 out-of-balance.
- 1 Claim Reconciliation(s) for cited scenario ids with no real scenario.
- 1 Claim Reconciliation(s) for evidence observations no one scenario can take, aggregated into "(unnamed claim)".
- 0 @SCN ids seen in non-tag context, excluded: each is an @SCN code written in a feature file's prose, a comment or step text rather than as a tag, so it marks no scenario and raises no claim

Key: each evidence cell reads *obligation*/*observations*.
- The letter says the scenario's tags raise an Evidence Obligation of that kind: (F)itness, (U)nit, (I)ntegration, (E)2e, (P)erformance. `-` means they raise none of that kind, as a pending tag raises none.
- The number counts the scenario's Evidence Observations of that kind that ran. `-` means none.
- For example, `U/2` is a unit obligation answered by two unit tests; `U/-` is a unit obligation that no unit test answered; `-/1` is one unit test citing a scenario that raises no unit obligation, which puts the row out of balance even where its unit evidence is pending.
- A blank cell means no obligation and no Evidence Observation that ran; `—` marks the row of a phantom claim or of the unnamed claim.
- A row named `feature file : scenario title` is a scenario that carries no @SCN code. The run reads none of its tags, so its evidence cells are blank, and its reconciling item says that no Evidence Observation can link to it.
- In Reconciling items, `—` means the row has no reconciling item, and *untagged* means a scenario that carries an @SCN code and no tag that raises an Evidence Obligation.
- On the unnamed claim's row, the counts after an item, such as `1 ran, 1 passed, 0 failed`, are of that item's own tests, and a fitness item counts its CI steps; a broken item stands alone, outside those counts.
- CI steps names the steps the Evidence observations table gives for each kind of quality check other than fitness that the row obligates or observes, whether or not an Evidence Observation of that kind ran for the row, and the step each of the row's fitness Evidence Observations names: `U/-` beside a step names the step that runs unit tests, none of which answered this row. A blank CI steps cell means no such step is known.
- Where a row's item says its CI step or its job sets `continue-on-error`, the name in parentheses after it is its fitness function. Remove `continue-on-error` from its CI step and from its job, or set it to false, and the check's red fails the CI run.

| Claim | Fitness | Unit | E2e | Verdict | Reconciling items | CI steps |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-CHK-001 |  | U/1 |  | balanced | — | ci.yml:build:Unit tests |
| SCN-CHK-002 |  | U/1 |  | out-of-balance | unit: Evidence Observation is failing (src/checkout.test.ts: [SCN-CHK-002] charges the card) | ci.yml:build:Unit tests |
| SCN-CHK-003 |  | U/- |  | out-of-balance | unit: Evidence Observation is missing | ci.yml:build:Unit tests |
| SCN-CHK-005 |  | U/3 | E/2 | balanced | — | ci.yml:build:Unit tests, ci.yml:build:End-to-end tests |
| SCN-CHK-006 | F/1 |  |  | balanced | — | ci.yml:build:Complexity |
| SCN-CHK-007 | F/1 |  |  | out-of-balance | fitness: Evidence Observation is failing (SCN-CHK-007) | ci.yml:build:Lint |
| SCN-CHK-004 | — | — | — | out-of-balance | unit: Evidence Observation cites an unknown Scenario (src/checkout.test.ts: [SCN-CHK-004] applies the discount) — passed | ci.yml:build:Unit tests |
| (unnamed claim) | — | — | — | out-of-balance | unit: Evidence Observation cites no Scenario (src/checkout.test.ts) — 1 ran, 1 passed, 0 failed | ci.yml:build:Unit tests |
```

</div>

Read it as a ledger. Each scenario is an account: its tags are what it is owed, and the evidence that ran is what it was paid. In this sample:

- three accounts balance;
- one test is failing;
- one CI check is failing;
- one scenario has no test at all;
- one test cites a scenario that doesn't exist;
- one test cites nothing.

The `U/3` `E/2` row balances on three unit tests and two end-to-end runs together. It says that every proof it was promised, at both layers, arrived and passed. No single test runner can see that.

The two `F/1` rows are CI checks: a complexity limit that holds, and a lint step that failed. A check is reconciled the same way as a test: its scenario is owed one, and the step's result is the evidence.

The report uses these exact terms:

- A *Claim Reconciliation* is one row of the ledger, one per claim. A claim is usually a scenario. The row sets the evidence the claim asks for, if any (its *Evidence Obligations*), against the results reported for it (its *Evidence Observations*).
- A *phantom claim* comes from a test that names a scenario which does not exist. The cause is usually a typo, or a scenario since deleted.
- The *unnamed claim* takes any test that names no scenario at all, or a code several scenarios share.
- A *watermelon* is a check that passes, but whose CI step or job sets `continue-on-error`, so its red might not fail the CI run.

[`docs/ubiquitous-language.md`](./docs/ubiquitous-language.md) has the rest.

## Why not coverage or mutation testing?

Both answer their own questions well, and both live at the unit layer:

| Kind of quality check | Coverage | Mutation testing | `spec-controller` |
|---|---|---|---|
| `@unit` | yes | yes | yes |
| `@integration`, `@e2e` | rarely collected, and counts lines | possible, slow, rare | yes |
| `@performance` | no such idea | no such idea | yes |
| `@fitness` (lint, complexity, type checks, any CI check) | no such idea | no such idea | yes |

Coverage and mutation testing tell you how much of the application the unit tests reach, and whether those tests would notice the application change. Neither knows which behaviours your scenarios name. So neither notices a named behaviour with no proof, or a passing test credited to a scenario that asked for a different kind of evidence. `spec-controller` keeps one ledger across all five kinds of quality check.

**For a team already well tested at the unit layer, it adds hygiene, not discovery.** Above the unit layer, once behaviours are named, nothing else holds the link. Keep your coverage gate and your mutation threshold: they are inputs here, not rivals.

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
- **The scenarios:** a list of named behaviours in `.feature` files. A `@unit` scenario needs no step definitions: a title and its tags are the whole scenario. A test cites a scenario as `[SCN-<FFF>-<NNN>]`, in brackets:
  - a Vitest or Jest test, in its title;
  - a Go test, in a subtest's name;
  - a JUnit 5 test in Java or Kotlin, in its `@DisplayName`;
  - an RSpec example, in its description.

  A pytest test cites it with `@pytest.mark.scn` instead.

## Try it

```
npm install -g spec-controller
```

It requires Node ≥ 22. Then run this from your repository:

```
spec-controller balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

Pass whichever reports you have. The *What you need* section of [`docs/user-guide.md`](./docs/user-guide.md) says how to produce each one.

`balance` is a gate: an out-of-balance run exits `1`. To watch before you gate, add `--exit-zero`. You get the same report, but an out-of-balance verdict exits `0`. Remove the flag when you are ready to gate. On GitHub Actions, `--format md:$GITHUB_STEP_SUMMARY` puts the report on the run's summary page.

**Before you name anything, it lists what ran.** With no scenarios, it reports every test and CI step, grouped by file, with what passed and what failed. That tells you nothing your CI does not already show. It is a starting inventory, and the value begins when you name the behaviours. Setup steps your pipeline runs, such as publishing or version bumps, are listed as checks until you name them in `specController.notChecks`. GitHub's own checkout, setup, cache and artifact actions are left out for you.

[`docs/quickstart.md`](./docs/quickstart.md) takes you from nothing to a first run in CI. [`docs/user-guide.md`](./docs/user-guide.md) is the full reference: every flag, every runner, and the CI wiring in detail.

At `0.x`, nothing is promised between versions ([`docs/compatibility.md`](./docs/compatibility.md)). Pin an exact version.

## Starting from an existing codebase

`balance` keeps a reconciled codebase reconciled, but it does not get one there. That work is yours: name each behaviour as a scenario, and put its code on the tests that prove it. Before that, use the inventory and `--exit-zero` described in *Try it*, above.

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

**Why these gates:** each fitness function this repository runs in CI is a scenario in [`features/fitness-functions.feature`](./features/fitness-functions.feature), and its Rule says what it holds and why. These gates are meant to take over the routine feedback a technical lead gives in code review, so that a reviewer's attention goes to design and intent. The rest guard the method itself.

The agent has been caught. Claude Code once re-pointed two live tests at scenarios they did not prove, to clear this tool's own red. Review caught it, and the change was reverted. That is the first limit above in practice: a change made in both places balances, and review is what judges it.

## The library

The reconciliation engine ships separately as **`@3f-consulting/spec-controller-core`**: the same logic, pure, with no CLI and no I/O. Its README is [`packages/core/README.md`](./packages/core/README.md).

## Licence

MIT, see [`LICENSE`](./LICENSE). © 2026 3F Consulting Ltd.
