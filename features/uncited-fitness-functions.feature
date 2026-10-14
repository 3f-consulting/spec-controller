@USG
Feature: Detect uncited fitness-functions — a CI check no scenario cites

  Every check a CI step runs is reported. A check whose step cites a scenario posts to that
  scenario's row; a check whose step cites none lands on the suspense row as an uncited fitness
  function, and the report counts running and uncited fitness functions under "### Fitness functions".

  A fitness function is any CI step left once the manifest's named runners, the reconciler,
  GitHub's plumbing actions and the steps the manifest names non-checks are taken out. A step's
  name never decides it, and neither does whether it reads source or executes code.

  Rule: a CI check no scenario cites is reported as an uncited fitness function

    A step cites a scenario by carrying that scenario's code as its `id:`. A step with no `id:`
    cites nothing: its check lands on the suspense row under its own name, marked
    cites-no-scenario, is shown under "### Fitness functions", and reds the run. The check is never dropped from the count.

    A step whose `id:` names a code no scenario carries posts to a phantom row under that code,
    not to the suspense row.

    @unit @SCN-USG-001
    Scenario: a CI check no scenario cites is reported as an uncited fitness function

  Rule: a check a scenario cites is attributed, not an uncited fitness function

    The check posts to the cited scenario's row and counts among the running fitness functions.
    The citation comes from the step's `id:` alone.

    @integration @SCN-USG-002
    Scenario: a check a scenario cites is attributed, not an uncited fitness function
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is cited by a scenario
      When the reconciliation report is rendered for the target
      Then lint:foo is attributed to the scenario citing it, not reported uncited

  Rule: a step invoking a runner the manifest names is not a candidate fitness function

    The manifest names one runner per tier. A step that invokes that runner, directly or through
    a manifest script, is that tier's runner and is not a fitness function.

    @unit @SCN-USG-003
    Scenario: test and cucumber CI steps are not candidate fitness functions, because the manifest names their runners

  Rule: a CI check whose script name matches no convention of the tool's is reported as an uncited fitness function

    A check is found whatever its script is called, and reported uncited when its step cites no
    scenario.

    @unit @SCN-USG-004
    Scenario: an uncited check whose script name carries no prefix of ours is an uncited fitness function

  Rule: a fitness function is observed wherever in the workflows it runs

    By default every workflow file in the target's workflow directory is read. A cited check running in a
    sibling workflow is satisfied, and no watermelon is raised against it. An uncited check running
    in a sibling workflow is reported uncited.

    @unit @integration @SCN-USG-006
    Scenario: a cited fitness function enforced from a sibling workflow is satisfied, with no watermelon raised against it
      Given a target whose ci.yml runs no fitness function and whose nightly.yml runs lint:nightly
      And a scenario cites lint:nightly
      When the reconciliation report is rendered over the target's workflow directory
      Then lint:nightly reconciles satisfied, with no watermelon raised against it

    @unit @SCN-USG-007
    Scenario: an uncited fitness function running in a sibling workflow is reported uncited

  Rule: an explicitly supplied CI file narrows observation to that file

    Naming one CI file reads that file alone. Runs are observed only from the CI files read; a
    manifest script that CI does not run is not counted.

    @integration @SCN-USG-008
    Scenario: an explicitly supplied CI file narrows observation to that file alone
      Given a target whose nightly.yml runs lint:sweep and whose ci.yml does not
      When the reconciliation report is rendered for that target's ci.yml alone
      Then lint:sweep is not counted among the running fitness functions

  Rule: a CI check whose script name matches no convention of the tool's, that a scenario cites, is attributed

    The check posts to the cited scenario's row. Its name plays no part.

    @unit @SCN-USG-005
    Scenario: a cited check whose script name carries no prefix of ours is attributed, not an uncited fitness function

  Rule: a runner named as a binary is recognised at the step that invokes it through a manifest script

    A step that runs a manifest script is read through that script. The script's body is read for
    the runner as a step's own command is, as the command a line runs, and a script that runs
    another script is followed up to three levels deep, never revisiting a script. A step
    recognised as a runner is named on the report.

    @unit @SCN-USG-011
    Scenario: a step running `pnpm test` is the unit runner when the manifest's `test` script runs vitest

  Rule: a runner is recognised only as the command a step runs, and named anywhere else it leaves the step a candidate

    A runner is recognised only as the command word of a simple command in the last stage of a
    pipeline: the first word after any leading NAME=value assignments, or the word a launcher
    hands on to, the launchers being timeout with its duration, npx, npm exec, pnpm exec,
    pnpm dlx, pnpm, yarn and bunx. Each command of an &&, || or ; list is read the same way, in
    the step's own command and in any manifest script it follows. A runner named anywhere
    else, as an argument, inside a path, a flag or an =-joined value, leaves the step a candidate.

    @unit @SCN-USG-012
    Scenario: a check step naming a runner in a path or an argument is a candidate, never excluded as the runner

    @unit @SCN-USG-033
    Scenario: a runner started through a launcher, after an environment assignment or later in a command list is recognised

  Rule: a runner whose output another command reads is a tool of a check, and the step is a candidate

    A runner is recognised only in the last stage of a shell pipeline, in the step's own command
    and in any manifest script it follows. A step that pipes a runner's output into another command
    is a candidate.

    @unit @SCN-USG-029
    Scenario: a check step piping a declared runner's output into another command is a candidate, never excluded as the runner

  Rule: a tier whose runner is null has no runner; a tier the block omits has not been told

    The report says a tier with a null runner has none, and says a tier the block omits is unnamed.
    Neither excludes or recognises any step.

    @unit @SCN-USG-016
    Scenario: a null runner reports the tier as having none, and an absent key reports it as unnamed

  Rule: the runner block is keyed by the four tiers and no other

    The tiers are unit, integration, e2e and performance. Any other key is named on the report,
    excludes nothing, and does not stop the run. A check whose script that key names is still
    reported as a fitness function.

    @unit @SCN-USG-019
    Scenario: a runners key that is not one of the four tiers is reported, never silently honoured

  Rule: a specController entry the tool cannot use is named on the report, and the run is not refused over it

    An entry of the wrong kind is read as absent. The report names where it is, the kind it is and
    the kind that is read there; every other entry takes effect as it would without it.

    A key the block does not read, a retired key included, is named as unknown in the same words as
    any other. A saved run, re-rendered, names the same entries its live report named.

    @unit @SCN-USG-025
    Scenario Outline: a specController entry of a kind its reader does not take is named on the report with the kind it is and the kind that is read, and every other entry takes effect as without it

    @unit @SCN-USG-028
    Scenario Outline: a key the specController block does not read, a retired one included, is named on the report as unknown in the same words as any other, and the run is not refused over it

    @unit @SCN-USG-026
    Scenario Outline: a specController block whose every entry is a kind its reader takes names nothing as the wrong kind

    @unit @SCN-USG-027
    Scenario: a saved run re-rendered names the same specController entries its live report named

  Rule: a step the manifest names a non-check is excluded, and the report says so

    Each non-check entry names a workflow file, a job and a step name as GitHub shows it in the run
    log, and matches that step exactly. There is no wildcard form.

    The report names every excluded step, and names every entry that matches no step as stale.

    @unit @SCN-USG-015
    Scenario: a step named in `notChecks` is not a candidate, and is reported as excluded rather than dropped

  Rule: the reconciler is not one of the reconciled rows

    The step that runs this tool's balance invocation, directly or through a manifest script, is
    the reconciler. The step that dumps GitHub's step record is its input. Both are excluded without
    any configuration. The report names both under "### The reconciler", saying which runs the
    reconciliation and which writes the step record it reads, and lists neither as excluded. The same tool run for another
    purpose stays a candidate, and neither step is recognised by its title.

    @unit @SCN-USG-014
    Scenario: the balance step and its step-record dump are not candidates, and no configuration says so

  Rule: a step is a candidate whatever form it takes

    A `uses:` step is a candidate like a `run:` step. A `run:` step is reported by the manifest
    script it invokes; a `uses:` step by its step name, or by its `uses:` value when it has no
    name.

    @unit @SCN-USG-013
    Scenario: a `uses:` step is a candidate fitness function, reported by the action it uses

  Rule: a step whose only work is one of GitHub's own plumbing actions is not a check

    The plumbing actions are actions/checkout, actions/setup-*, actions/cache,
    actions/upload-artifact and actions/download-artifact. A step is matched on the owner and
    repository of its `uses:` value; the ref after the at sign and any sub-path do not change the
    answer.

    @unit @SCN-USG-030
    Scenario: a step that only uses one of GitHub's plumbing actions is not a candidate fitness function, whatever ref pins it

    Any other action stays a candidate: another of GitHub's own actions, another owner's checkout,
    a repository whose name only begins with checkout, a local action and a docker image.

    @unit @SCN-USG-031
    Scenario: an action outside the closed list stays a candidate — dependency review, another owner's look-alike and a local action

    A plumbing step the manifest names a non-check is excluded and named as the manifest says, and
    its entry is not stale.

    @unit @SCN-USG-032
    Scenario: a plumbing step the manifest names a non-check is excluded as the manifest says, and its entry is not stale

  Rule: a manifest naming no runners makes every step a candidate

    With no runners block, every step except the reconciler, its step-record dump and GitHub's
    plumbing is a candidate, the target's own test suite included. No error or warning asks for
    configuration. A candidate citing nothing posts to suspense, so the run reds; --exit-zero
    changes only the exit status, never the report.

    @unit @SCN-USG-017
    Scenario: a target with no runners block reports every step of its pipeline but GitHub's plumbing as a candidate

  Rule: the report names the scope it read

    The report lists each workflow and job read, with the steps read and the candidates found in
    each job, sorted. It makes no judgement about whether that scope is plausible.

    @unit @SCN-USG-020
    Scenario: the report names the workflows, the jobs and the step count discovery ranged over

  Rule: every step the reader saw is accounted for

    Every step read leaves as a candidate, a runner, the reconciler, an excluded step or one of
    GitHub's plumbing actions. The report states how many steps it read and how many it accounted
    for, and the two are equal. Plumbing steps are counted, not named.

    A saved report with no plumbing figure renders that figure as nought.

    @unit @SCN-USG-018
    Scenario: candidates, runners, the reconciler, the excluded and GitHub's plumbing sum to the steps read
