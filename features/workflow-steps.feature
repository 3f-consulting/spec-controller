@WFS
Feature: balance reads a workflow's steps

  balance reads the command each step of a workflow runs, through launchers, pipes and command lists, the action each step uses, and the record a run writes of its steps.

  Rule: a runner named as a binary is recognised at the step that invokes it through a manifest script

    A step that runs a manifest script is read through that script. The script's body is read for
    the runner as a step's own command is, as the command a line runs, and a script that runs
    another script is followed up to three levels deep, never revisiting a script. A step
    recognised as a runner is named on the report.

    @unit @SCN-WFS-001
    Scenario: a step running `pnpm test` is the unit runner when the manifest's `test` script runs vitest

  Rule: a runner is recognised only as the command a step runs, and named anywhere else it leaves the step a candidate

    A runner is recognised only as the command word of a simple command in the last stage of a
    pipeline: the first word after any leading NAME=value assignments, or the word a launcher
    hands on to, the launchers being timeout with its duration, npx, npm exec, pnpm exec,
    pnpm dlx, pnpm, yarn, bunx, python -m, python3 -m, poetry run, uv run, pipenv run,
    hatch run, pdm run, coverage run -m and bundle exec. A launcher hands on to the word right after it, so
    an option between a launcher and the runner leaves the step a candidate. A runner declared as
    several words, such as a build tool and its test task, is recognised where a command, after any
    launchers, opens with all of those words; the launchers are set aside first, so a runner
    declared with a launcher's words matches no command. Each command of an
    &&, || or ; list is read the same way, in the step's own command and in any manifest script
    it follows. A line ending in a backslash joins the next line with a space before it is read, so a
    launcher continued onto the next line still hands on to the runner. A runner named anywhere else, as an argument, inside a path, a flag or an
    =-joined value, leaves the step a candidate.

    @unit @SCN-WFS-002
    Scenario: a check step naming a runner in a path or an argument is a candidate, never excluded as the runner

    @unit @SCN-WFS-003
    Scenario: a runner started through a launcher, after an environment assignment or later in a command list is recognised

    @unit @SCN-WFS-004
    Scenario: a pytest suite started through a Python launcher is recognised as the unit runner

    @unit @SCN-WFS-005
    Scenario: an RSpec suite started through bundle exec is recognised as the unit runner

    @unit @SCN-WFS-006
    Scenario: a runner declared with its test task is recognised only on a step that runs that task, and another task run through the same build tool is a candidate

  Rule: a runner whose output another command reads is a tool of a check, and the step is a candidate

    A runner is recognised only in the last stage of a shell pipeline, in the step's own command
    and in any manifest script it follows. A step that pipes a runner's output into another command
    is a candidate.

    @unit @SCN-WFS-007
    Scenario: a check step piping a declared runner's output into another command is a candidate, never excluded as the runner

  Rule: each step is read as the check it runs, under the name the report gives it

    @unit @SCN-WFS-008
    Scenario: a step that runs a manifest script is read under that script's name, and an unnamed step under its first non-blank command, trimmed

    @unit @SCN-WFS-009
    Scenario: the runner each suite's step runs is read from the workflow and the manifest scripts it invokes

    @unit @SCN-WFS-010
    Scenario: a step is read as a check whatever its script is named

    @unit @SCN-WFS-012
    Scenario: a uses: step is read under the action it uses, or under its trimmed name, with its own continue-on-error

  Rule: every workflow the CI input names is read

    @unit @SCN-WFS-011
    Scenario: a check run by the second of two workflows is read, as one run by the first is

  Rule: the step that dumps GitHub's step record is read wherever GitHub lets its expression be written

    @unit @SCN-WFS-013
    Scenario: the step-record expression is read however GitHub lets it be spelled, beside env values that are not text and inside a command

  Rule: a uses: value is read as the owner and repository it names

    @unit @SCN-WFS-014
    Scenario: a uses: value is read as its owner and repository, whatever ref or sub-path follows

    @unit @SCN-WFS-015
    Scenario: a local action, a container image and another owner's look-alike are read as owned by someone other than actions

  Rule: a step's entry in the run's record is read under the scenario code its id states

    @unit @SCN-WFS-016
    Scenario: a step record entry whose id is a feature part outside two to five characters is read as no citation, beside ids of two and five characters that are
