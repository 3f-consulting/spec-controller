@ACT
Feature: A composite action this repository ships carries its own CLI — a caller installs nothing

  AN ACTION THAT CANNOT RUN WITHOUT THE CALLER INSTALLING THE TOOL IS NOT A LIBRARY. The three
  composite actions under `.github/actions/` were each written to be imported by another
  repository — `persist-measurements` (3F-2771), `restore-measurements` (3F-2766) and
  `mutation-ratchet` (3F-2787) all say so in as many words, and each takes every project-owned
  term as an input so a second repository passes different values rather than forking the file.
  Every one of them then reaches its CLI as `npx --no -- spec-controller-<name>`, which resolves
  the bin out of the CALLER's `node_modules`, from a `dist/` that is build output and is not
  committed. A cross-repo `uses:` checks the action out into a workspace that has neither, so the
  step dies before it runs. an adopter's repository met both dead ends wiring 3F-2748 and — correctly — refused to
  vendor this repository into its pipeline.

  SO THE FILE THE STEP RUNS TRAVELS WITH THE ACTION. Each CLI is bundled to a single file with its
  dependencies inlined and committed beside the `action.yml` that names it, and the step runs it as
  `node "${{ github.action_path }}/<bundle>"`. `github.action_path` is the one directory a
  composite action can rely on having: the checkout is the CALLER's tree, and the caller's tree is
  precisely what a library must not have opinions about. A sibling repository path
  (`packages/spec-controller/dist/…`) is not an alternative — it is not committed, and on a
  cross-repo `uses:` it is not there at all.

  THE BINS STAY. Bundling is additive: `spec-controller-persist-measurements` and its siblings
  remain in the package manifest, and a project that HAS installed the package keeps reaching them
  directly. What changes is how the ACTION reaches its CLI, and nothing about what the CLI does —
  every input, every flag, and the `measurements.json` name the restore finds its payload by are
  the same bytes on either side of this.

  A COMMITTED BUILD OUTPUT IS THE ONE SANCTIONED EXCEPTION HERE, AND IT IS MECHANISED RATHER THAN
  HONOURED. Every JS action in the world ships its build this way, and every one of them can rot:
  the source is edited, the bundle is not rebuilt, and the step goes on running last month's code
  while the tree reads as though it were fixed. `.gitignore` ignores `dist/` with no re-includes,
  which is the discipline this exception is carved out of — so the carve-out is scoped to exactly
  the bundle paths, and a check rebuilds each bundle from its source and reds on any difference. A
  rule nobody can forget is the only kind worth having over an artefact nobody reads.

  AND THE CHECK IS NOT THE ONLY WITNESS, BECAUSE IT CANNOT SEE THE ROUTE THAT BROKE. Everything
  below reads FILES — the action's YAML, the bundle beside it — and runs each bundle under `node`
  directly. None of that exercises a real `uses:`, which is precisely where the defect lived: the
  actions existed, were well-formed, and did not run. So a second job in this repository's own CI
  checks the tree out, installs NOTHING, builds NOTHING, and calls each action through `uses:`
  against fixture inputs. That job is off this ledger — a `uses:` step invokes no package script,
  so `runningStaticChecks` cannot observe it — and it is kept anyway, because a construction-level
  check that has never watched the thing actually run is the arrangement that shipped the defect.

  WHAT A GREEN HERE DOES NOT ESTABLISH. The check reds a step that reaches OUTSIDE its own
  directory and a bundle that has fallen behind its source. It says nothing about whether the CLI
  inside the bundle is correct — that is the job of the scenarios those CLIs already carry
  (@MUT, @RAT) — and nothing about an action whose step shells out to a tool the runner happens to
  provide (`gh`, `node` itself). It fences the route the defect actually came in by, and no more.

  WHY THE CHECK IS NAMED `lint:action-bundles`. `runningStaticChecks` observes a script only when
  its name carries an observed prefix (`lint:` / `guard:`). A name outside that set would run in CI
  while being invisible to this repository's own ledger — a real quality check kept off the books,
  which is where a watermelon hides. Named so it IS observed; the bare `@action-bundles` tag on the
  fitness scenario below is what then keeps it out of the suspense row as an uncited static check.

  Rule: a composite action's step runs a file that travels with it, never a bin from the caller's workspace

    @unit @integration @SCN-ACT-001
    Scenario: a bundled CLI does its own work in a tree with nothing installed
      Given a workspace holding neither this package nor anything built from it
      When each action's own bundled command is asked there to do the work it is for
      Then each one does that work, against only the tree it was pointed at

    @unit @integration @SCN-ACT-002
    Scenario: a step reaching for a workspace bin instead of the file beside it reds the check
      Given an action whose step reaches for a bin out of the workspace it is called from
      And an action beside it whose step runs the file committed alongside it
      When the check reads what each of their steps runs
      Then it reds the first, naming the action, the step and the command it objects to
      And it says nothing at all about the second

  Rule: a committed bundle cannot fall behind the source it mirrors

    @unit @integration @SCN-ACT-003
    Scenario: a committed bundle that no longer matches a fresh build of its source reds the check
      Given an action whose committed bundle was built from the source it travels with
      When that bundle is edited and the check builds the source afresh
      Then it reds that action, and names how to bring the bundle back into line
      And it says nothing once the bundle is built from its source again

  Rule: this repository's own actions are self-contained

    THE FITNESS SCENARIO, AND WHY IT CARRIES NO STEPS. The Rules above hold the CHECK against
    planted trees — examples, so they have steps. This one holds this repository's own actions
    against the check, which is a whole-system characteristic with nothing to exemplify. The bare
    `@action-bundles` tag raises the Evidence Obligation the CI run of `lint:action-bundles`
    settles.

    @action-bundles @SCN-ACT-004
    Scenario: every action this repository ships runs from its own directory, and its bundle matches its source
