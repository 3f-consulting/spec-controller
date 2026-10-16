# spec-controller

**Reassurance that your software keeps doing what you said it does.**

Software built from a written specification has three artefacts: the spec, the tests and the code. Each link between them needs something to hold it:

| Link | What holds it today |
|---|---|
| tests ↔ code | **Mechanism**: the tests themselves, coverage, mutation testing |
| spec ↔ tests | **Nothing but care.** The spec says one thing, the tests prove another, and nothing notices when they drift |
| spec ↔ code | only through the other two |

`spec-controller` holds the middle link. You write each behaviour in your spec as a scenario in a `.feature` file, tagged with the evidence it needs, such as `@unit` or `@e2e`. On every CI run, `balance` reconciles those scenarios against the test reports and CI steps that actually ran. When the two disagree, the build goes red.

Here is a sample of what it prints:

<div class="sample-report">

```markdown
### Run verdict

**OUT-OF-BALANCE** — the accounts do not agree. At least one Scenario Reconciliation carries a reconciling item. This run FAILED. (exit 1)

## Scenario Reconciliations

- 6 Scenario Reconciliation(s): 2 balanced, 4 out-of-balance.
- 1 Scenario Reconciliation(s) for cited scenario ids with no real scenario.
- 1 Scenario Reconciliation(s) for evidence observations citing no scenario, aggregated into "(no scenario)".
- 0 @SCN ids seen in non-tag context, excluded

Key: each evidence cell reads *obligation*/*observations*.
- The letter says the scenario's tags raise an Evidence Obligation of that kind: (F)itness, (U)nit, (I)ntegration, (E)2e, (P)erformance. `-` means none is raised.
- The number counts the Evidence Observations posted to the scenario for that kind. `-` means none.
- For example, `U/2` is a unit obligation answered by two unit tests; `U/-` is a unit obligation that no unit test answered; `-/1` is one unit test citing a scenario that asks for no unit evidence.
- A blank cell means neither; `—` marks a row that is not a scenario of the corpus: a cited code no feature declares, or evidence that cites no scenario.

| Scenario | Unit | E2e | Verdict | Reconciling items |
| --- | --- | --- | --- | --- |
| SCN-CHK-001 | U/1 |  | ✓ balanced | — |
| SCN-CHK-002 | U/1 |  | ✗ out-of-balance | unit ✗ Evidence Observation is failing |
| SCN-CHK-003 | U/- |  | ✗ out-of-balance | unit ∅ Evidence Observation is missing |
| SCN-CHK-005 | U/3 | E/2 | ✓ balanced | — |
| SCN-CHK-004 | — | — | ✗ out-of-balance | unit 👻 Evidence Observation cites an unknown Scenario (src/checkout.test.ts) — passed |
| (no scenario) | — | — | ✗ out-of-balance | unit ❓ Evidence Observation cites no Scenario (src/checkout.test.ts) — 1 ran, 1 passed, 0 failed |
```

</div>

Read it as a ledger. Each scenario is an account: its tags are what it is owed, and the evidence that ran is what it was paid. In this sample, two accounts balance, one test is failing, one scenario has no test at all, one test cites a scenario that doesn't exist, and one test cites nothing. One balanced account, the `U/3` `E/2` row, is proved by three unit tests and two end-to-end runs at once: the row says that every proof it was promised, at both layers, arrived and passed, which no single test runner can see.

## What double entry buys: a change becomes deliberate

Every behaviour is recorded twice, once as a scenario and once as the test that proves it, and the two must agree. So **changes to your quality checks become deliberate, not accidental.**

- **Delete a test**, and its scenario reads `missing`. The build goes red.
- **Skip a test**, and its scenario reads `missing`. A skipped test proves nothing.
- **Re-point a test** at another scenario, and the original reads `missing`.
- **Delete a CI check step**, and its fitness function's scenario reads `missing`.
- **Delete a scenario but keep its unit tests or its CI check**, and they still run and pass, but their evidence posts to a scenario that doesn't exist.

To remove a behaviour cleanly, you change both places: the scenario and its evidence. That change shows in the diff, and review judges it.

This matters most when an agent writes the code. Asked to make failing tests pass, an agent can delete them. Here that gives a red build, not a quiet green.

**The limits, said plainly:**

- **Deliberate is not right.** A change made in both places balances; whether it should have been made is for review to decide.
- **A change inside one check is one entry, and is not seen.** A lint step narrowed to match no files still exits 0, and its row reads satisfied. A row checks that the step ran and what it reported, read from your CI run's own record, so a red that `continue-on-error` swallowed still turns its row red. It does not read what the tool examined.
- **Delete a scenario but keep its step definitions**, and Cucumber runs nothing and says nothing. Nothing posts, so `balance` can't see it. A check for unused step definitions catches it; this repository runs one.
- **No named behaviours, no second entry, no protection.** Code that arrives with no scenario raises nothing to reconcile.
- **Whether a test is a good test is assumed.** A balanced row means the evidence exists and holds, not that the test checks what its title says.

## Why not coverage or mutation testing?

Both are good at their own questions, and both live at the unit tier:

| Tier | Coverage | Mutation testing | `spec-controller` |
|---|---|---|---|
| `@unit` | yes | yes | yes |
| `@integration`, `@e2e` | rarely collected, and counts lines | possible, slow, rare | yes |
| `@performance` | no such idea | no such idea | yes |
| `@fitness` (lint, complexity, type checks, any CI check) | no such idea | no such idea | yes |

Coverage and mutation testing guard the link between tests and code. Neither can see the spec, so neither notices a named behaviour with no proof, or a passing test that proves a different behaviour from the one it cites. `spec-controller` keeps one ledger across all five tiers.

**For a team already well tested at the unit tier, it adds hygiene, not discovery.** Above the unit tier, once behaviours are named, nothing else holds the link. Keep your coverage gate and your mutation threshold: they are inputs here, not rivals.

## What it found on a real codebase

On its first run over another of our products, `balance` balanced 228 of 229 scenarios. The one exception was a real problem: two passing unit tests cited a scenario that asked only for end-to-end evidence. That product's CI was green and had no way to notice. The fix was to point each test's citation at the scenario it actually proved.

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
- **The spec:** a list of named behaviours in `.feature` files. Unit-level scenarios need no step definitions: a title and its tags are the whole scenario. A test cites a scenario as `[SCN-<FFF>-<NNN>]`, in brackets:
  - a Vitest or Jest test, in its title;
  - a Go test, in a subtest's name;
  - a JUnit 5 test in Java or Kotlin, in its `@DisplayName`;
  - an RSpec example, in its description.

  A pytest test cites it with `@pytest.mark.scn` instead.

## Try it

```
npm install -g spec-controller
```

It requires Node ≥ 22. Then, from your repository, run:

```
spec-controller balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

Pass whichever reports you have. The *What you need* section of [`doc/how_to_use.md`](./doc/how_to_use.md) says how to produce each one.

`balance` is a gate: an out-of-balance run exits `1`. To watch before you gate, add `--exit-zero`. You get the same report, but an out-of-balance verdict exits `0`. Remove the flag when you're ready to gate. On GitHub Actions, `--format md:$GITHUB_STEP_SUMMARY` puts the report on the run's summary page.

**Before you name anything, it lists what ran.** With no scenarios, it reports every test and CI step, grouped by file, with what passed and what failed. That tells you nothing your CI doesn't already show: it is a starting inventory, and the value begins when you name the behaviours. Setup steps your pipeline runs, such as publishing or version bumps, are listed as checks until you name them in `specController.notChecks`. GitHub's own checkout, setup, cache and artifact actions are left out for you.

[`doc/how_to_use.md`](./doc/how_to_use.md) has the full flags, CI wiring and a worked example.

At `0.x`, nothing is promised between versions ([`doc/compatibility.md`](./doc/compatibility.md)). Pin an exact version.

## Built with Claude Code, and how it's kept honest

This repository was built with Claude Code, by an author who doesn't write TypeScript. The commit history is the agent's working log. Each commit title follows the issue-key convention, `[KEY-123] summary`, where the ID refers to a private tracker.

The repository is held to the same discipline it sells. Its own CI reconciles its own scenarios with `balance` on every run, and gates on:
- mutation testing at 95% per scope;
- cognitive complexity, function length and CRAP;
- duplication and unused code;
- dependency boundaries;
- published-package checks (publint, attw);
- workflow linting and security (actionlint, zizmor);
- code-level security, by this repository's own Semgrep rules;
- a ceiling on test code against production code.

**Why these gates:** each fitness function this repository runs in CI is a scenario in [`features/fitness-functions.feature`](./features/fitness-functions.feature), and its Rule says what it holds and why. Most gates automate a kind of feedback a technical lead gives in code review, so that a reviewer's attention goes to design and intent. The rest guard the method itself. [`doc/fitness-functions.md`](./doc/fitness-functions.md) names the review comment each gate automates and how many real problems it caught last quarter.

It has been caught. Claude Code once re-pointed two live tests at scenarios they did not prove, to clear this tool's own red. Review caught it, and the change was reverted. That is the first limit above in practice: a change made in both places balances, and review is what judges it.

## Getting there

`balance` keeps a reconciled codebase reconciled. Getting a brownfield codebase reconciled in the first place is a service.

## The library

The reconciliation engine ships separately as **`@3f-consulting/spec-controller-core`**: the same logic, pure, with no CLI and no I/O.

## License

MIT, see [`LICENSE`](./LICENSE). © 2026 3F Consulting Ltd.
