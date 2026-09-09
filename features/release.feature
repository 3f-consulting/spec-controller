@REL
Feature: A release verifies the artefact it publishes, in the tree a stranger installs it into

  Everything in this repository resolves through the WORKSPACE manifest. npm does not: at
  publish time it REPLACES the `exports` map with `publishConfig.exports` wholesale rather
  than merging them, and the workspace-only subpaths go with it. The two readings differ
  nowhere else, which is why 3F-3086 got as far as it did — the published CLI threw
  ERR_PACKAGE_PATH_NOT_EXPORTED on its first command while 605 tests and thirteen gates were
  green, and none of them was wrong.

  SO THE SUBJECT HERE IS THE PACKED ARTEFACT, NEVER THE TREE IT WAS PACKED FROM. A scenario
  that reads a manifest is reading the source of the artefact; a scenario that installs the
  tarball outside the workspace is reading the artefact. Only the second one stands where a
  consumer stands, and this file exists because the first one cannot be made to.

  ITS PRECEDENT IN THIS CORPUS IS @LAD, which asserts properties of this repository's own
  pipeline rather than of the product's behaviour. A release is a pipeline in the same sense:
  the thing being specified is what a tag does, and the evidence is what the tag leaves behind.

  WHAT A GREEN HERE DOES NOT ESTABLISH. Nothing in this file runs GitHub Actions, and nothing
  in it publishes. A live release is proven exactly once, by the tag that cuts it, and its
  evidence is the workflow run and the registry — not this suite. The scenarios here assert
  over the packed artefacts and over the release workflow AS PARSED, and they are written to
  say so rather than to let a green imply a release was exercised.

  Rule: the artefact a consumer resolves is the artefact this release verified

    ONE PACK, READ MORE THAN ONCE. The tarballs this rule installs are the tarballs a publish
    would send. A second pack anywhere in that chain would make the verification a rehearsal of
    a DIFFERENT artefact, which is the fault in its purest form: the dry run proves a thing
    nobody ships.

    AND THE NEGATIVE ARM IS THE POINT, BECAUSE THE POSITIVE ONE REDS ON NOTHING. A clean-room
    install that succeeds says the artefact was sound; it says nothing about whether this check
    could have noticed an artefact that was not. The fault it has to be able to see is live in
    this tree today and is not hypothetical — no manifest here carries a `prepare`, `prepack` or
    `prepublishOnly` hook, `dist/` is untracked and gitignored, and `files` selects it. A
    checkout followed by a pack therefore ships a package whose command names a file that is not
    in the tarball, and the install of it SUCCEEDS. So the artefact packed without its build is
    driven through the same clean room, and the run there has to fail.

    THE CLEAN ROOM HOLDS NOTHING ELSE, WHICH IS THE OTHER HALF OF STANDING WHERE A CONSUMER
    STANDS. A directory inside this repository resolves through its node_modules and its
    workspace links whatever the tarball says; a directory outside it, holding one manifest and
    the two tarballs' own dependencies, resolves through the published map alone.

    @integration @SCN-REL-001
    Scenario: the packed artefacts install into a tree holding nothing else and the CLI runs there, and a tarball packed without its build reds
      Given the two packages packed from a tree whose build has run
      When they are installed into a directory holding nothing else of this repository
      Then the reconciler starts there and describes what it reconciles
      And the same two packages packed from a checkout that never built do not start there at all

  Rule: the packed manifest is complete for somebody who has never seen this repository

    A CONSUMER RESOLVES THE MANIFEST IN THE TARBALL, AND IT IS NOT THE ONE IN THIS TREE. The Rule
    above installs the artefact and starts it; this one reads what the artefact says about itself
    to somebody who has never seen the repository it came out of. Four things have to be true of
    that document, and only one of them is about a file: the dependency specifiers have to name
    versions a registry can serve rather than a workspace nobody else has, the fields these
    packages publish differently from the way they develop have to stand as published, the licence
    the manifest declares has to travel beside it, and the manifest has to say where it came from.

    THREE OF THE FOUR ALREADY HELD ON THE DAY THIS WAS WRITTEN, and that is exactly why the
    scenario is worth having rather than exactly why it is not. They hold because `pnpm pack`
    behaves well, not because anything in this repository holds it to that — and a scenario whose
    only content is the current output is a snapshot rather than a check. So every property here is
    stated as something that CAN red, and each one is shown redding: the reading below is run a
    second time over the packages as this WORKSPACE holds them, where the CLI's core dependency is
    still a workspace specifier, core's map still offers the `./internal` subpath the publish-time
    map drops, and neither package directory holds a licence at all — pnpm copies the workspace
    root's in as it packs.

    THE FOURTH PROPERTY IS THE ONE THIS SCENARIO ARRIVED TO ADD, and its counter-case is this
    repository's own history rather than a second arm. No manifest here carried `repository` when
    the Rule was written, and the packed manifests carried none either — measured, so the field's
    presence afterwards is the source manifest's doing and not something the packer infers from a
    git remote. The first run of this scenario redded on it, on real tarballs, and the run is on
    the record; the arm below cannot red on it a second time without deleting the field again.

    @integration @SCN-REL-002
    Scenario: no workspace specifier survives packing, publishConfig is applied, and the licence and the repository link both travel
      Given the two packages this release packs, as their tarballs carry them
      When each packed manifest is read against what its own workspace manifest promised a consumer
      Then no dependency is named by a specifier only this workspace could resolve
      And every field these packages publish differently from the way they develop stands as published
      And the licence and the link back to the repository both travel with the artefact
      And reading the same packages as this workspace holds them, rather than as the tarballs carry them, reds instead

  Rule: no window exists in which the CLI resolves a core that is not there

    `pnpm pack` REWRITES THE CLI'S DEPENDENCY ON CORE INTO A CONCRETE VERSION, and that version has
    to be on the registry already or the very first `npm i spec-controller` fails at resolution. A
    release that sends the CLI first is therefore broken between its own two acts: for as long as
    the second one takes, the package a stranger installs names an engine nobody can fetch. Nothing
    about the two commands makes the order obvious — they sit one line apart and either arrangement
    parses — so the order is a property somebody has to hold, and this is where it is held.

    FOUR WAYS THAT WINDOW OPENS, AND EVERY ONE OF THEM IS A PROPERTY OF ONE FILE plus the artefact
    that file would send. The CLI can go first. A step can run after the last of the two and change
    what was sent. The CLI's packed manifest can name an engine version this release does not stage
    at all — a range nothing satisfies is the same fault wearing arithmetic. And the release can
    fail to reach the registry at all, which is the widest of the four rather than a separate
    subject: this publisher has direct publication switched off registry-side, so a release running
    the ordinary publish is refused outright and the window is the whole of it.

    WHAT A GREEN HERE DOES NOT ESTABLISH, SAID BEFORE THE SCENARIO RATHER THAN AFTER IT. Nothing
    below runs GitHub Actions, reaches a registry, or stages anything at all. Its subject is the
    release AS PARSED — the steps that file states, in the order it states them — together with the
    manifest inside a tarball packed here and thrown away. A live release is proven exactly once, by
    the tag that cuts it, and its evidence is that run and the registry.

    AND THE NEGATIVE ARM IS WHERE THE READING EARNS ITS KEEP. Every property above is true of the
    file as it stands, so the positive arm alone would be a snapshot of today's document rather than
    a check on tomorrow's. Three more releases are built out of this one by moving the document and
    reading it back through the same reader: the two staging steps swapped, a step appended behind
    them, and the ordinary publish in place of the staged one. Each has to red, and the third is the
    one the registry would otherwise teach us the hard way.

    @integration @SCN-REL-003
    Scenario: the release stages core before the CLI, and the CLI's packed manifest names a concrete core version rather than a range nothing satisfies
      Given the release this repository would cut, and the two packages it packs
      When the release is read against the artefact it would stage
      Then core is staged before the CLI that resolves it
      And nothing in the release runs after the staging
      And the CLI's packed manifest names the exact core version this release stages
      And the release proves who it is without carrying a repository secret
      And a release that reverses the two, one that runs a step after staging, and one that publishes outright each red instead

  Rule: a release can be cut while the self-reconciliation is red

    THE CURE MUST NOT BE BLOCKED BY THE DISEASE. 3F-3105 bootstraps this repository's own
    reconciliation onto a PINNED PUBLISHED spec-controller. When the model moves and the pinned
    reader can no longer read the tree, `balance:self` reds, and the only thing that clears it is
    publishing a version that can. A release path consulting the reconciliation would refuse to cut
    that release for the very reason the release is being cut, and the tree would be stranded on a
    red nothing but a hand publish could clear. So the release path does not ask.

    AND THE LINE IS NOT `balance:self`, WHICH IS WHERE THE FIRST DRAFT OF THIS FILE PUT IT. The
    self-reconciliation is excluded because it is a statement about THIS REPOSITORY'S BOOKKEEPING
    rather than about the artefact — and the fitness axis is that same category, row for row:
    complexity bars, corpus traceability, anemic-domain conformance, this suite's own mutation
    score, the duration of the observer. Not one of them says the tarball works. Excluding the one
    while keeping the other drew the line in two places in the same file, and the second place cost
    every real release: `SCN-FIT-002` prints a number a SCHEDULED sweep leaves behind, `ci.yml`
    fetches that record and the release had no equivalent, so the fitness pass reds on a cold runner
    and the job dies before it packs anything (measured, 3F-3249). One rule covers both exclusions:
    THE RELEASE PATH CONSULTS NOTHING THAT IS ABOUT THIS REPOSITORY RATHER THAN ABOUT THE ARTEFACT.

    THE ABSENCE ARM IS WORTH LITTLE ALONE, AND IT IS THE ARM THAT READS MOST NATURALLY. "No gate of
    this release consults the reconciliation" is satisfied in full by a release that had stopped
    gating on anything at all, and by one whose steps were deleted. So the run the gates are put to
    below is one the reconciliation actually REFUSES — an evidence root as cold as a release
    runner's, which is what every runner starts with and what a developer's machine never has, since
    the last run's output is still sitting there. That coldness is the whole of the fault: 3F-3249
    was green on this axis only because a sweep record from the day before was waiting for it.

    A LEDGER CANNOT SEE AN UNRAISED DEBIT, so the gates are compared as an ordered list rather than
    searched for the two names. A gate added, removed or renamed reds until somebody says which side
    of the line it is on, which is the only shape that can notice a THIRD repository-scoped gate
    arriving tomorrow — asking what would stop being counted, rather than only what would fail.

    WHAT A GREEN HERE DOES NOT ESTABLISH. Four of the release's gates are not put to the cold run,
    and the reason is the same for all four: this run is standing on them. It is running under the
    package manager one of them enables, out of the tree another produced, inside the behavioural
    pass of a third, beside the Vitest pass of the fourth — and on CI that containing run's evidence
    root is the runner's own temporary directory, cold by construction. A third invocation from in
    here would prove nothing the containing run does not, and one of them would not terminate. They
    are named in the comparison rather than dropped from it.

    AND THE RESIDUAL, WHICH THIS RULE WIDENS BY NOT ONE INCH BUT NOW STATES ONCE. Repository bars
    are `ci.yml`'s, discharged on every merge to `main`. A tag cut from `main` has already passed all
    of them; a tag cut from an unmerged branch has not, and that is exactly the case in which a
    release is being cut to escape a red. Nothing merges by this route — `main` still requires the
    whole ladder, `balance:self` included.

    @integration @SCN-REL-004
    Scenario: no gate of the release asks about this repository, and a run the reconciliation refuses still reaches the packing
      Given a run whose evidence is as cold as a release runner's, and the release this repository would cut
      When the reconciliation, the axis beside it, and every gate the release states are all put to that run
      Then the reconciliation refuses the run, and so does the axis that measures this repository
      And no gate the release states asks anything about this repository rather than about the artefact
      And every gate the release states passes the run those two refused, so the release reaches the packing
      And a release gating on either of them packs nothing at all
