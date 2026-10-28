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

  Rule: a step runs a package script when it invokes it in a form its package manager documents

    npm runs a script through run, or its aliases run-script, rum and urn, and runs the test
    script through its test shortcut, test, t or tst. pnpm runs a script through run or by its
    bare name, and runs the test script through test, t or tst, after any of the selections
    --filter with its selector, -F with its selector, -r and --recursive. yarn runs a script
    through run or by its bare name, after workspace and a workspace name, and after workspaces
    foreach and its options. After workspaces foreach, its options and the value of --from,
    --include, --exclude, -j or --jobs, the rest is read as a yarn command: run or a bare name
    runs a script, and exec runs the command that follows it, never a script by that command's
    name. An option written after the script name is not read.

    @unit @SCN-WFS-021
    Scenario: a step running npm's test shortcut, as `npm test`, `npm t` or `npm tst`, is the unit runner when the manifest's `test` script runs it

    @unit @SCN-WFS-022
    Scenario: a step running a script through `npm run-script`, `npm rum` or `npm urn` runs that script, as `npm run` does

    @unit @SCN-WFS-023
    Scenario: a step running `pnpm t` or `pnpm tst` runs the manifest's `test` script

    @unit @SCN-WFS-024
    Scenario: a step running a script after a pnpm selection, `--filter`, `-F` or `-r`, runs that script

    @unit @SCN-WFS-025
    Scenario: a step running a script in a yarn workspace, through `yarn workspace <name>` or `yarn workspaces foreach`, runs that script

  Rule: a script is run only where a command runs, so a step whose text only names a script runs nothing

    A script is run where a command opens with its invocation: at the start of a line, or after
    &&, ||, ;, |, a background & or |&, past any NAME=value assignments, any shell word that
    opens a command and any command that runs the command after it. The shell words are !, a
    subshell's (, a group's {, and the if, then, elif, else, while, until and do that open the
    condition and the body of an if and of a while, until or for loop; a redirection's >& is no
    background &. A shell word is the shell's own and no word of the command it opens, so in if
    ! vitest run; then exit 1; fi the command is vitest run, and vitest is the step's runner.
    The commands that run the command after them are the launchers a runner is read through,
    env, nice, nohup, time, command, exec, xargs, timeout, stdbuf, sudo, yarn exec, yarn dlx,
    cross-env, dotenv, xvfb-run, nyc, c8 and flock, each read past its options, the value of an
    option that takes one, and the operands it takes before the command, such as timeout's
    duration or flock's lock file. time at the start of a pipeline is bash's keyword, which
    takes only -p, so in time -f v pnpm test the command is -f. A script named anywhere else,
    as another command's argument, runs nothing. Quotes are read as the shell reads them. A
    separator inside a single- or double-quoted argument is part of that argument and separates
    no command, even when the argument runs on to the next line. An apostrophe opens a quote as
    a single quote does, and a quote escaped with a backslash opens none. The body of a
    here-document, up to the line that ends it, is text: nothing in it runs, and a quote in it
    opens none. A here-document opened inside a command or process substitution is read the
    same way, and there its body also ends at a line that opens with its delimiter and holds a
    ), read on from after the delimiter. A here-document fed to bash or sh, given only options,
    is instead that shell's script. A << inside (( … )), inside ${ … } or in a comment opens no
    here-document. A substitution's contents are read by the same rules as the top level,
    though no command inside one is read as run. A comment runs to the end of its line: a
    backslash at its end joins no lines, so the command on the next line runs.

    @unit @SCN-WFS-026
    Scenario: a step that names a script as another command's argument does not run it, and one that runs it after `&&`, `;` or `|` does

    @unit @SCN-WFS-027
    Scenario: a step running a script behind a command that runs the command after it, such as `env`, `sudo`, `xargs` or `timeout`, past that command's options, runs that script

    @unit @SCN-WFS-028
    Scenario: a step running a script after a background `&`, in a subshell or a group, or in the body of an `if`, `while`, `until` or `for`, runs that script

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
    it follows. A backslash-newline that no other backslash escapes is removed, so the two lines
    join with nothing between, and a launcher continued onto the next line after a blank still
    hands on to the runner. A runner named anywhere else, as an argument, a quoted argument
    included, inside a path, a flag or an =-joined value, leaves the step a candidate.

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
    is a candidate, and so is one that pipes the output of a subshell that runs it. A stage's stdout
    reaches the pipe unless its own redirection sends it elsewhere, so 2>&1 keeps it on the pipe and
    > out takes it off.

    @unit @SCN-WFS-007
    Scenario: a check step piping a declared runner's output into another command is a candidate, never excluded as the runner

  Rule: each step is read as the check it runs, under the name the report gives it

    A step's continue-on-error is read from the step and from its job. The job's verdict depends
    on the step only when continue-on-error is absent, false or the string "false" on both; any
    other value, an expression included, leaves the verdict not depending on it.

    @unit @SCN-WFS-008
    Scenario: a step that runs a manifest script is read under that script's name, and an unnamed step under its first non-blank command, trimmed

    @unit @SCN-WFS-009
    Scenario: the runner each suite's step runs is read from the workflow and the manifest scripts it invokes

    @unit @SCN-WFS-010
    Scenario: a step is read as a check whatever its script is named

    @unit @SCN-WFS-012
    Scenario: a uses: step is read under the action it uses, or under its trimmed name, with its own continue-on-error

    @unit @SCN-WFS-017
    Scenario: a step's continue-on-error is read from the step or from its job, and only an absent value, false or the string "false" leaves its job's verdict depending on it

    @unit @SCN-WFS-018
    Scenario: a step's id: is read trimmed, so a padded code cites as if written unpadded

  Rule: every workflow the CI input names is read

    @unit @SCN-WFS-011
    Scenario: a check run by the second of two workflows is read, as one run by the first is

    @unit @SCN-WFS-020
    Scenario: a workflow that does not parse is refused by the reader, never read as one with no steps

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

  Rule: the run's step record is read by what each step did

    Each step in the record is read by its outcome, what the step itself did. Its conclusion, which
    continue-on-error turns to success, is never read.

    @unit @SCN-WFS-019
    Scenario: each step in the run's record is read by its outcome, never its conclusion, so a red the job swallowed still reads failed
