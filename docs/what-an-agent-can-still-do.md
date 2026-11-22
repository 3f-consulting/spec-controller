# What an agent can still do

`balance` turns a quiet change to your checks into a red build: a deleted test, a test re-pointed at another scenario, a CI check set never to fail. What still passes it is of two kinds. Some changes are deliberate, and review decides them. Some properties belong to other tools, which `balance` reconciles rather than repeats.

## Deliberate changes, which review decides

- **Remove a behaviour.** Removing a behaviour cleanly takes three deletions in one change: the scenario, its tests and the code they prove. It balances, because it is deliberate, and it shows in the diff. A partial delete does not balance: a scenario deleted alone leaves its tests citing a claim nobody wrote, and tests deleted alone leave the scenario's proof missing. Code left behind, which no test exercises, is what your mutation testing and unused-code checks report.
- **Set a scenario aside with a deferral tag**, such as `@wip`. Under `--written-claims-only`, the tests citing it then leave the gate, so even a failing one leaves the build green. A scenario deleted on its own leaves the gate the same way under that flag.
- **Add a non-check** to `spec-controller.yml`, or **remove the `balance` step**, or **edit the step that saves the step record**, in your workflow.

## What other tools hold

spec-controller uses maintained tools where they exist ([how it works](./how-it-works.md#coverage-and-mutation-testing-beside-it)). These are theirs:

- **Empty a test, or weaken its assertion.** `balance` assumes a passing test is a valid one. A lint rule such as `expect-expect` fails a test with no assertion, and mutation testing fails a weak one. A full mutation sweep is too slow for every push, so run it on a schedule, and start no new work while the newest sweep is red ([how it works](./how-it-works.md#coverage-and-mutation-testing-beside-it)).
- **Delete one of several tests citing a scenario.** The others still answer, so the scenario still balances: `balance` checks that each kind of proof the scenario asks for arrived, not how many tests there were. What the deleted test alone held, mutation testing reports.
- **Let a failure through in a way `balance` does not read.** It reads `continue-on-error`, a fallback `|| true`, `|| :` or `|| exit 0`, and `set +e` or `set +o errexit`, in a step or a package script it runs. These always swallow a failure. It does not read a pipe without `pipefail`, a `shell:` without `-e`, a shell file the step runs, a reusable workflow or composite action, or a swallow written another way. Reading every `||` as a swallow would turn a legitimate guard red, such as `|| status=$?` followed by `exit "$status"`, and a gate that reds a correct step teaches a team to mark it a non-check, which hides it for good. So `balance` reads the forms that always swallow, names the rest here, and leaves them to review.

## What to do about it

- **Require review of the files that hold the specification and the gate.** Put [`features/`](../features/), [`spec-controller.yml`](../spec-controller.yml) and [`.github/workflows/`](../.github/workflows/) under CODEOWNERS, so a person reviews every change to them.
- **Make the `balance` step a required check** in your branch protection, so a change that removes or skips it cannot merge.
- **Review a deferral tag as you would a deleted test.**
- **Run your test framework's assertion lint on every push, and a mutation sweep on a schedule**, and start no new work while the newest sweep is red. They catch what `balance` assumes.
