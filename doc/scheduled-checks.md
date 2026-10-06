# Scheduled checks — run on a cadence, gate every push on the verdict

Some quality checks cost more than a per-push ladder can afford: a full mutation
sweep, a long soak, a large end-to-end matrix. You still want their verdict to
hold the line on every push. The pattern is to run the check on a schedule, and
on each push read **whether the newest scheduled run passed**, as long as that
run is recent enough to be about this code.

`spec-controller` does not run your schedule, and nothing crosses from the
scheduled run to the push except that run's own conclusion, which GitHub already
records. A push reads it with one step of stock `gh`. There is no
spec-controller machinery to install, and there is no code of yours to write.

The recipe below is the one this repository runs against itself, in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml),
[`.github/workflows/mutation.yml`](../.github/workflows/mutation.yml) and
[`stryker.config.js`](../stryker.config.js). Every block is copied from those
files rather than summarised, because a recipe that disagrees with the pipeline
it came from is worse than no recipe.

It has three pieces, and none of them is a number crossing a run boundary:

1. **The bar lives in the tool's own config**, so the scheduled run's
   conclusion *is* the verdict.
2. **One push step reads that conclusion**, carrying the scenario's `@SCN` as
   its `id:`.
3. **Nothing names a bar**, so the ledger reads the check by that step's
   outcome.

---

## 1. The bar is the tool's, in the tool's own config

Mutation testing's community tool already has a gate. Stryker's
`thresholds.break` ends the run non-zero when the score falls below it, which is
Stryker's own documented CI shape. This repository states it in
`stryker.config.js`:

```js
  thresholds: { break: 95 },
```

So the nightly workflow does nothing clever. It runs one job per gated scope,
each sweeping that scope alone, and a job ends in failure when its sweep scores
below 95 or dies. One strong scope cannot carry a weak one, because each is
scored on its own:

```yaml
    timeout-minutes: ${{ matrix.timeout }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - scope: core-domain
            mutate: "packages/core/src/domain/**/*.ts,!packages/core/src/domain/**/*.test.ts,!packages/core/src/domain/messages.ts"
            timeout: 52
          - scope: core-provenance
            mutate: "packages/core/src/provenance/**/*.ts,!packages/core/src/provenance/**/*.test.ts"
            timeout: 5
          - scope: core-assemble
            mutate: "packages/core/src/assemble/**/*.ts,!packages/core/src/assemble/**/*.test.ts"
            timeout: 8
          - scope: spec-controller-cli-allocate
            mutate: "packages/spec-controller/src/cli-allocate/**/*.ts,!packages/spec-controller/src/cli-allocate/**/*.test.ts"
            timeout: 15
          - scope: core-render
            mutate: "packages/core/src/render/**/*.ts,!packages/core/src/render/**/*.test.ts"
            timeout: 51
```

```yaml
      - name: Mutation test ${{ matrix.scope }}
        run: pnpm mutation --mutate "$MUTATE"
        env:
          MUTATE: ${{ matrix.mutate }}
```

`pnpm mutation` is `stryker run` and nothing else. Keep the report as an
artefact with `if: always()`. The push reads only whether the run succeeded, so
the score lives in that report and nowhere else.

**The whole run's conclusion is what the push reads, not just a sweep's.** Any
step in any of the scheduled jobs that fails for a reason of its own reads on
the push exactly as a sweep below its bar does. Keep each job to the check and
its report.

---

## 2. One push step reads the verdict

This is the whole of the push side, copied from `ci.yml`:

```yaml
      - name: Mutation score
        id: SCN-<FFF>-<NNN>
        if: always()
        env:
          GH_TOKEN: ${{ github.token }}
        run: test "$(gh run list --workflow mutation.yml --branch main --status completed --created ">=$(date -u -d '26 hours ago' +%FT%TZ)" --limit 1 --json conclusion --jq '.[0].conclusion')" = success
```

Read it flag by flag:

| part | what it decides |
| -- | -- |
| `id: SCN-<FFF>-<NNN>` | the step *is* the scenario's evidence. The run's own step record carries this `id` with the step's `outcome`, and `balance` reads that record. |
| `if: always()` | the step runs even after an earlier check has redded, so the scenario's row on the ledger gets an outcome instead of reading `broken`. |
| `GH_TOKEN` | the run's own token. `gh` needs a token in the environment to call the API at all. |
| `--workflow mutation.yml` | which scheduled workflow to read. |
| `--branch main` | the branch this ladder gates. It is written out, not derived from `github.ref_name`: nothing sweeps a feature branch, so a pull request reads the verdict for the line it is merging into. A hand-dispatched sweep of some other branch is never the one read. |
| `--status completed` | runs that have **finished**, whatever their conclusion. It does not filter on `success`: the night that finds a regression concludes `failure`, and a filter on success would reach back past it to an older green run. A sweep still running has nothing to report yet. |
| `--created ">=…"` | the window (below). |
| `--limit 1` with `--jq '.[0].conclusion'` | the newest such run, and only its conclusion. |
| `test … = success` | the step passes only if that conclusion is `success`. With no run inside the window, `.[0].conclusion` is `null`, and `null` is not `success`. |

It needs one permission. `gh run list` reads **another workflow's** runs, which
the job's token does not do unless you say so. This repository writes the block
out at the top of `ci.yml`:

```yaml
permissions:
  contents: read
  actions: read
```

Write it out rather than leaning on the repository default. Without
`actions: read` the step fails, and its failure reads exactly like a schedule
that has lapsed, so you would go looking for the wrong fault.

**The window is a derivation, not a number you pick.** It is your schedule's
cadence plus a margin. A nightly is **24 h + 2 h = 26 h**, which is the
`'26 hours ago'` in the step. A twice-daily sweep reads the same rule and gets
**12 h + 2 h = 14 h**. Copy the derivation, never our number: it is a fact
about your pipeline, not about your code. (`date -d` is GNU `date`, which is what
GitHub's Ubuntu runners have.)

A lapsed schedule leaves no run inside the window, so the step fails. That is
how a nightly that quietly stopped running says so on the next push, without a
timestamp anywhere in your own code: GitHub records each run's creation time,
and `--created` reads it.

---

## 3. Nothing names a bar

The check is declared by its `@fitness` scenario and the CI step whose `id:` is that scenario's
`@SCN`, and neither names a bar — nothing does:

```yaml
      - name: Mutation score
        id: SCN-<FFF>-<NNN>
        if: always()
        run: gh run list --workflow mutation.yml ...
```

It is answered by that step's outcome, exactly like `eslint` or `pnpm typecheck`. The bar is 95 in
Stryker's config and **nowhere else**. `balance` runs no check; it reads the record.

**The two artefacts are that scenario and that step's `id:`, and there is no
third.** They are **both authored, neither derived from the other**, which is
what lets them disagree: a `@fitness` scenario whose `@SCN` no CI step states
reconciles **missing** and the run is out of balance, and a step stating an
`@SCN` no scenario carries posts to a **phantom** row. Nothing else declares
this check — no manifest lists it, and no key names its bar. This repository's
scenario is in
[`features/fitness-checks.feature`](../features/fitness-checks.feature):

```gherkin
  @fitness @SCN-<FFF>-<NNN>
  Scenario: the newest nightly mutation sweep of the gated branch, finished inside its window, cleared the break threshold its runner states
```

The rest is the ordinary wiring every converted check shares: a dump of
`toJSON(steps)` with `if: always()`, and `balance --ci-steps` over it. See
[*Wiring into CI*](./how_to_use.md#wiring-into-ci).

---

## What a lapse looks like on a push

**On an ordinary push, a failing `Mutation score` step reds the job, and the balance
step behind it does not run.** GitHub aborts a job at its first red and skips
every later step that does not carry `if: always()`. The balance step carries no
such condition in this repository, by a standing ruling: a merge is
decided on a green run, and a green job is one in which every step ran. So you do
not see a lapsed, crashed or below-bar sweep as a `failing` line on the ledger.
You see a red job, with the `Mutation score` step as its red. This was measured
on CI: the ledger's `failing` line for this row appeared only in a run
instrumented to keep the balance step running behind the red.

If you want the ledger line as well, give your balance step `if: always()`. That
is a choice about your whole ladder, not about this row.

---

## What this gives up

Reading a verdict instead of a number is cheaper than carrying the number across,
and it costs four things. They are named here so that nobody finds them later.

- **The push does not show the score.** The row reads satisfied or failing,
  and each scope's number stays in that scope's Stryker report.
- **A lapsed schedule, a crashed sweep and a below-bar sweep all read the same.**
  All three fail the step. The nightly's own run is where they are told apart.
- **A failed report upload reads as a mutation failure.** The step reads the
  whole scheduled run's conclusion, not the sweep steps'.
- **The window's headroom is unchanged:** about 1.4 h, measured over six nights.
  GitHub starts a scheduled run late by an amount that varies from night to
  night, and a push that lands after last night's run has aged past 26 h, but
  before tonight's has finished, finds no run and fails.

---

## Ownership

`spec-controller` observes, and is run as a tool. It is not in your enforcement
path. You own the check, its bar, its schedule and its window. The one push step
above is plain GitHub Actions and stock `gh`, and nothing in it imports
spec-controller. `balance` reads the step's outcome from the run's own record,
the same way it reads every other converted check's.
