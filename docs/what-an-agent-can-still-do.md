# What an agent can still do

`balance` turns a quiet change to your checks into a red build: a deleted test, a test re-pointed at another scenario, a CI check set never to fail. Some changes still pass it. Each one shows in a diff, so the defence is review, and a review your agent cannot skip.

## Changes `balance` cannot see

- **Edit the specification and the tests together.** Delete a scenario and its tests in one change, and the books still balance. Double entry makes the change deliberate; review decides whether it was right.
- **Set a scenario aside with a deferral tag**, such as `@wip`. Under `--written-claims-only`, the tests citing it then leave the gate, so even a failing one leaves the build green.
- **Delete one of several tests citing a scenario.** The others still answer, so the scenario still balances. `balance` checks that each kind of proof the scenario asks for arrived, not how many tests there were.
- **Empty a test, or weaken its assertion.** `balance` assumes a test is a valid test. A lint rule such as `expect-expect` catches a test with no assertion; mutation testing catches a weak one.
- **Add a non-check** to `spec-controller.yml`, or **remove the `balance` step**, or **edit the step that saves the step record**, in your workflow.
- **Let a failure through in a way `balance` does not read.** It reads `continue-on-error`, a fallback `|| true`, `|| :` or `|| exit 0`, and `set +e` or `set +o errexit`, in a step or a package script it runs. It does not read a pipe without `pipefail`, a `shell:` without `-e`, a shell file the step runs, a reusable workflow or composite action, or a swallow written another way.

## What to do about it

- **Require review of the files that hold the specification and the gate.** Put [`features/`](../features/), [`spec-controller.yml`](../spec-controller.yml) and [`.github/workflows/`](../.github/workflows/) under CODEOWNERS, so a person reviews every change to them.
- **Make the `balance` step a required check** in your branch protection, so a change that removes or skips it cannot merge.
- **Review a deferral tag as you would a deleted test.**
- **Run your test framework's assertion lint and mutation testing** beside `balance`. They catch what `balance` assumes.
