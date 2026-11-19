# Releasing spec-controller

Two packages are released together. `@3f-consulting/spec-controller-core` is the pure engine.
`spec-controller` is the command, and it carries core compiled into its bundle.

**Every push to `main` that passes CI publishes; only a version heading releases.** Each publish
happens in the run of [`.github/workflows/release.yml`](../.github/workflows/release.yml) that
follows the push's CI run, with the next counter version, core first. An ordinary merge publishes
under npm's `next` dist-tag, with no git tag and no GitHub release. A merge that adds a version
heading to [`CHANGELOG.md`](../CHANGELOG.md), `## 0.1.<N> — <yyyy-mm-dd> — <title>`, publishes its
version under `latest`, with one `v<version>` tag and one GitHub release (*Releasing at an
increment's close*, below). No credential is stored anywhere, and there is nothing to promote
afterwards and nothing to rotate.

**Read *When a publish returns `E401`* before your first release.** It describes an authentication
error whose cause is not authentication.

---

## What a merge does

### Which merges publish

**Every push to `main` whose CI run succeeds publishes.** `release.yml` runs when the `CI` workflow
completes on `main`. Its `release` job goes on when that CI run succeeded and was started by a
`push`, with no other condition. Each such run publishes the next counter version, unless a newer
pending run cancels it (*Two merges close together*, below). That includes a merge that touches only
[`features/`](../features/), [`tests/`](../tests/), [`.github/`](../.github/) or the lockfile.

A push that changes only `docs/**`, the root [`README.md`](../README.md),
[`CONTRIBUTING.md`](../CONTRIBUTING.md) or [`LICENSE`](../LICENSE) does not run CI at all
(`paths-ignore` in `ci.yml`), so it publishes nothing. The `README.md` entry matches the root file
only. A push to `main` that changes `packages/*/README.md` runs CI and, if CI succeeds, a release.

Each package ships its own copy of the licence, [`packages/core/LICENSE`](../packages/core/LICENSE)
and [`packages/spec-controller/LICENSE`](../packages/spec-controller/LICENSE). A change to the
licence edits those copies as well as the root's, so it runs CI and publishes.

`release.yml` has no `workflow_dispatch` trigger, and a CI run started any way other than a `push`
releases nothing. **Nothing publishes except a push to `main`**, so every published version is one
that `main` contained.

### What the workflow does, in order

The `release` job:

1. Checks out the commit CI ran on, sets up Node 24, enables corepack, and installs with a frozen
   lockfile. Packing needs the install to resolve the CLI's workspace dependency on core.
2. **Downloads the `built-packages` artifact** that CI's run uploaded: the compiled `dist` of both
   packages. The job builds nothing and runs no typecheck and no tests; those are CI's.
3. **Stamps the next counter version** on both manifests in the working copy.
4. **Reads the version heading the merge adds**: the heading lines
   [`CHANGELOG.md`](../CHANGELOG.md) gained since the commit the previous publish was built from.
   None: the merge publishes under `next`. One version heading naming the version this run
   publishes, over at least one line: it publishes under `latest` and releases. Anything else (two
   headings, a heading line that is not a version heading, or a number other than the counter's)
   fails the run here, naming the numbers, before anything is published.
5. **Packs both packages, once.** Every later step reads those same two files.
6. **Smokes them in a clean room.** It installs the tarballs into a directory outside the workspace
   that holds nothing else of this repository, and starts the command there.
7. **Publishes core, then the CLI**, with `npm publish` over the packed tarballs, under the
   dist-tag step 4 chose.

Three jobs then run on what was published:

- The `published` job pushes `refs/published/<version>` at the commit that was built. The counter
  reads these refs (*The version is a counter*, below). They are not tags: no tag and no GitHub
  release appears for an ordinary merge.
- The `dist-tag` job runs [`scripts/dist-tag-is.sh`](../scripts/dist-tag-is.sh) for each package.
  It reds unless the dist-tag the merge published under is the version just published. It waits up
  to `DIST_TAG_WAIT_S` for the registry to serve it.
- On a release only, the `tag` job creates `v<version>` on the commit that was built, and a GitHub
  release for that tag, titled with the version heading. Its notes are the heading's section: the
  lines under it, up to the next heading or the file's end. Nothing from a pull request's title
  reaches them. The `tag` job is separate so that the only token that can write tags never shares
  a runner with the build. It starts no other workflow. **The tag records a release; it never
  causes one**, and nothing listens for tags.

### Releasing at an increment's close

A release is the last step of an increment's close. A small pull request adds one version heading
above the lines the increment gathered in [`CHANGELOG.md`](../CHANGELOG.md):

```
## 0.1.<N> — <yyyy-mm-dd> — <the increment's title>
```

`<N>` is the version its merge will publish: one past the highest version the counter finds. Its
merge publishes that version under `latest`, tags it and creates its GitHub release. If another
merge publishes first and takes the number, the release run fails naming both numbers, and
publishes nothing; the heading is corrected in a new pull request. An increment that gathered no
changelog line closes without a release. The changelog's lines from before its first version
heading belong to versions released before this model.

**`next` trails `latest` after a release.** npm moves only the dist-tag a publish names, and
trusted publishing gives a credential to `npm publish` alone, so no step can move `next` onto the
version a release published. Until the next ordinary merge, `next` points one version below
`latest`; that version differs from the release only by its heading line.

The CLI's tarball names no runtime dependency (*Lockstep, `0.x` and what is published*, below), so
`npm i spec-controller` installs that one package and fetches nothing from core's publish. Core
still publishes first, and the recovery under *If the run fails* follows from that order.

### Two merges close together

Runs are serialised (`concurrency: release`), and a running run is never cancelled. GitHub holds at
most one pending run, and a newer pending run cancels the older. For merges A, B and C in quick
succession, A publishes, B is cancelled and C publishes. C's commit contains B's change, because
squash merges keep `main` linear, and C reads the changelog back to A's publish, so a version heading
B added still releases, at C. Each run reads the counter inside its own turn, after the previous
run's publish and its `refs/published` ref, so no number is minted twice.

### Watching one

```bash
gh run list --workflow release.yml --limit 5
gh run watch <run-id>

npm view spec-controller dist-tags
npm view @3f-consulting/spec-controller-core dist-tags
npm view spec-controller@<version> dependencies devDependencies
git ls-remote origin "refs/published/<version>"
git ls-remote --tags origin "v<version>"   # a release only
```

The last `npm view` checks the CLI's manifest. It prints no `dependencies`, so a consumer installs
no copy of a bundled package. Its `devDependencies` name core by the **concrete** version published
beside it. Nothing is owed after the run goes green.

---

## What the release checks, and what it does not

`release.yml` runs only after CI succeeds on the push. So everything `ci.yml` checks gates the
release: the build, the typecheck, both suites and every repository bar. `main`'s `strict`
protection runs the same bars on every pull request before it can merge.

The release adds two checks of its own before it publishes: the version heading it reads, and the
clean-room install of the packed tarballs. It adds one after: the `dist-tag` job.

The nightly mutation sweep's verdict holds no release. A red, lapsed or unmeasured sweep stops new
work from starting until a full sweep of `main` is green. A fix merges on its own CI.

---

## Versions and dist-tags

Both packages are **semver**, and both are on `0.x`.

### The version is a counter

The run takes the **line** from the committed CLI manifest: everything before its last `.N`. So
`0.1.0` is the line `0.1.`. The run finds the highest number already on that line across **both
packages on the registry, the repository's `refs/published/*` refs and its `v*` tags**. The
registry can take 20 to 40 minutes to serve a publish, so the ref each publish pushes is what keeps
the next run from minting the same number. It stamps the next number into both
manifests **in the run's working copy only**. Nothing is committed back, because `main` is
protected. So the committed manifest is not the published version: it stays where a person last put
it while the registry counts on. On a stable line the counter moves the patch number and ignores
prereleases.

**Starting a new major or minor line is done by hand, as an ordinary merge.** Edit both manifests to
start the new line, for example `0.2.0-alpha.0` or `1.0.0`, and merge. Nothing is on that line yet,
so the run publishes exactly what you wrote. The next merge counts on from there.

### Lockstep, `0.x` and what is published

- The two packages are released **in lockstep at the same version**, so one number names one
  engine. The core on the registry is the core compiled into that CLI. In this tree the CLI's
  devDependency on core is written `workspace:*`, and `pnpm pack` rewrites it to that exact version.
- **The CLI declares no runtime dependency.** Core, `yaml` and `fast-xml-parser` are compiled into
  `dist/cli.js`, so they are devDependencies. A consumer's `npm audit` or `overrides` therefore
  never acts on a copy that does not run.
- **`0.x` says the surface may still move.** Any release on `0.x` may carry a breaking change,
  including a patch from the counter. A consumer who cannot absorb one should pin exactly rather
  than by caret.
- **The `./internal` subpath is never published.** The workspace offers it and `publishConfig`
  drops it at publish time, so a consumer never has it.

### Prerelease dist-tags

**npm refuses to publish a prerelease without `--tag`:** *"You must specify a tag using --tag when
publishing a prerelease version."* So `release.yml` derives the tag from each package's own manifest
instead of hard-coding one. The prerelease identifier becomes the dist-tag, and a stable version
takes `next`, or `latest` when its merge adds a version heading:

```
0.1.0-alpha.2 -> alpha    1.0.0-beta.3 -> beta    2.0.0-rc.1 -> rc    0.1.0 -> next, or latest
```

A hard-coded `--tag alpha` would publish the first stable release under `alpha`: a silent fault
with no guard.

**`latest` is never moved onto a prerelease.** The committed manifests are on the stable line
`0.1.N`, so every version is a plain one. A bare `npm i spec-controller` installs the latest
release; `npm i spec-controller@next` installs the current build. The `dist-tag` job checks that
the dist-tag a merge published under resolves to its version.

---

## Authentication: there is no credential

The workflow authenticates with **npm trusted publishing**. The job asks GitHub for a short-lived
OIDC id-token. npm exchanges it for a publish token scoped to the one package, and that token dies
with the run. `permissions: id-token: write` switches it on and is the whole of the configuration.

Four measurable facts decide whether it works:

- **The command has to be `npm publish`.** Measured in `npm@11.19.1`: `lib/commands/publish.js:147`
  calls `oidc()` unconditionally, whatever kind of spec it was handed. That is why publishing a
  *tarball* authenticates just as publishing a directory does.
- **The npm has to be new enough.** Trusted publishing needs npm `>= 11.5.1`.
  `actions/setup-node` offers no way to choose an npm; it installs whatever the Node it fetches
  bundles. Node 22 bundles 10.9.x and Node 24 bundles 11.19.x, so the workflow pins Node 24.
- **Each package needs its own trusted publisher.** The exchange is per package
  (`/-/npm/v1/oidc/token/exchange/package/<name>`). So each package carries a connection on
  npmjs.com naming the org, this repository, and `release.yml`.
- **A connection is bound to the repository, not to its name.** A new repository that takes an
  old one's name does not inherit its connections. npm refuses the publish with `E404` until each
  package's connection is removed and added again.

**Each release carries a provenance attestation.** npm adds one only when the id-token says the
repository is public. The releases made while the repository was private, up to 0.1.291, carry
none.

---

## How the repository's pin moves

### The pin decides which reader judges this tree

The workspace root [`package.json`](../package.json) carries `spec-controller` in
`devDependencies` as an **exact published version**. There is no root script of that name, so
`pnpm spec-controller …` falls through to `node_modules/.bin/spec-controller` and runs the
*installed* package. The `ci.yml` step that invokes the tool (`Reconciliation`) goes through the
pin. This repository is therefore an ordinary adopter of its own product, not a special case.

This was measured with no such script. The report's own provenance read
`Tool version: 0.1.0-alpha.3` and `Tool SHA: unknown (not a git checkout)`. The workspace build, run
over the same argv, read `0.1.0-alpha.4` and this checkout's HEAD.

**That pin is the single declaration of which reader judges this tree.** No second "minimum
readable version" is kept anywhere, on purpose. A second spelling of the same fact agrees with the first only
until somebody edits one of them.

**The pin follows `latest`, so the reader judging this tree trails by up to an increment.**
Dependabot moves the pin to the newest release, and releases happen only at an increment's close.
A slice that changes what the reader reads is judged by the previous release's reader until the
increment closes. That lag is accepted, and revisited if it bites.

### Dependabot moves it, with no human act

**The pin follows the registry by bot PR, within a day of a release, weekends
included.** [`.github/dependabot.yml`](../.github/dependabot.yml) lets Dependabot move exactly this
one dependency, and keeps it exact. `dependabot-auto-merge.yml` merges its PR once `ci` is green.

**The pin's merge starts no CI and no release, and that is the loop guard.** Auto-merge pushes the
merge with the workflow's own `GITHUB_TOKEN`. By GitHub's design, a push made with that token starts
no workflow. So the pin's merge runs no CI, and the release, which follows CI, never runs. Merging
the pin with any other token would publish again, and the next pin would follow it, without end.
Measured on 2026-10-28, on GitHub-hosted Actions: the self-pin merges `510f4601`, `360300b2` and
`4d36eba3` have no `push` run of any workflow. Re-check it if GitHub changes how `GITHUB_TOKEN`
pushes start workflows.

**The schedule.** `interval: cron` with `cronjob: "30 11 * * *"`: 11:30 UTC on all seven days.
`daily` is not used, because it runs Monday to Friday only. Once a day is as often as GitHub allows:
its config check rejects any `cronjob` that fires more often than every 24 hours. So a pin lags a
publish by up to 24 hours. That lag is accepted for two reasons: only step 3 of an
expand/contract waits on the pin, and an adopter's own Dependabot lags the same way.

Two other things start a run. A merge to `main` that changes
[`.github/dependabot.yml`](../.github/dependabot.yml) starts one at once. *Check for updates* under
Insights → Dependency graph → Dependabot runs one early. The loop never needs that, and neither is
a hand move of the pin.

**The bot sees the root pin only because [`packages/spec-controller`](../packages/spec-controller)
is excluded from its view.** Dependabot's npm parser drops every manifest requirement whose name is
also the name of a workspace package. The workspace package here is named `spec-controller`, the
name the root pins from the registry. `exclude-paths: [packages/spec-controller]` in
[`.github/dependabot.yml`](../.github/dependabot.yml) fixes that. This was measured with the
Dependabot CLI over this tree. Without the exclusion, the job rewrites
[`pnpm-lock.yaml`](../pnpm-lock.yaml) alone and leaves the root pin unmoved. With it, the root pin
moves by one exact line, and core and the CLI move together in the lockfile.

**The PR's lockfile carries more than the pin, and auto-merge accepts that only when the pin really
moves.** Dependabot's pnpm path always runs
`pnpm update <dep>@<version> --lockfile-only --no-save -r`, which also re-resolves in-range
transitive packages. The same command under this repository's pnpm reproduces the same churn, and no
Dependabot key turns it off. So `dependabot-auto-merge.yml` reads what the PR changes before it arms
anything. It refuses unless all of these hold:

- the changed files are exactly the root [`package.json`](../package.json) and
  [`pnpm-lock.yaml`](../pnpm-lock.yaml);
- the root pin differs from the merge base's;
- the new pin is an exact version;
- nothing else in the root [`package.json`](../package.json) changes.

A refused PR fails that job with the reason and is left disarmed. On a PR that passes, `ci` still
gates the churn.

### Our own two packages are exempt from both age gates, by name

`allow:` limits the bot to spec-controller. So a cooldown would only delay our own releases, and
each of those was judged by this repository's `ci` before `release.yml` published it.

- **Dependabot's cooldown.** [`.github/dependabot.yml`](../.github/dependabot.yml) exempts
  spec-controller with `cooldown: exclude:`. Leaving `cooldown:` out would not do it, because GitHub
  then applies a default of three days.
- **pnpm's `minimumReleaseAge`.** pnpm 11 refuses a lockfile entry younger than its
  `minimumReleaseAge`, 1440 minutes by default, and CI enforces it.
  [`pnpm-workspace.yaml`](../pnpm-workspace.yaml)'s `minimumReleaseAgeExclude` names
  `spec-controller` and `@3f-consulting/spec-controller-core`, and nothing else. This was measured
  over a Dependabot CLI dry run that pinned `0.1.0-alpha.12` three hours after it published. With no
  exemption, the frozen install reds with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, naming both
  entries. With both names, it passes. With `spec-controller` alone, it reds naming core.

The exemption names packages, not versions, so unlike a version pin it needs no pruning. Every other
dependency stays under the policy in full.

### Never widen the pin

**Never widen the pin to escape a skew.** A range or a dist-tag would make the red go away by making
the reader unpredictable. That is the failure this arrangement exists to prevent.

This is a convention, and no guard enforces it. A one-off
`grep -rn devDependencies --include='*.ts'` finds no TypeScript reader of the root
`devDependencies`. The only check that reads the pin's specifier is `dependabot-auto-merge.yml`, and
it refuses a non-exact pin on a Dependabot PR and on nothing else. So nothing reds when a person
widens the specifier.

**When the model moves and the pinned reader cannot read the tree**, the cure is the expand merge in
*A model change the pinned reader cannot read*, below. The pin is never moved by hand to reach it.

### The workflows' actions move monthly, and a person merges them

Every action in [`.github/workflows/`](../.github/workflows/) is pinned by SHA, with its version in
a trailing comment (`@<sha> # vX.Y.Z`). A `github-actions` entry in
[`.github/dependabot.yml`](../.github/dependabot.yml) moves those pins. It runs once a month, puts
every action bump in one grouped PR, and takes a release only after a 7-day cooldown. Dependabot
moves the SHA and rewrites the version comment with it.

`dependabot-auto-merge.yml` refuses that PR, because it changes workflow files and not exactly
[`package.json`](../package.json) and [`pnpm-lock.yaml`](../pnpm-lock.yaml). Auto-merge is never
armed, and a person merges it once `ci` is green. A green `ci` proves only the bump in `ci.yml`:

- before merging a bump that touches `mutation.yml`, dispatch `mutation.yml` on the PR's branch;
- a bump in `release.yml` is exercised by the Release run of its own merge, so read that run.

Two tools are not actions, and Dependabot moves neither:

- **actionlint.** Its step downloads the official release binary and verifies it against a SHA-256
  pinned beside its version in the step's `env:`. A person moves the version and checksum together.
- **Semgrep.** `Install Semgrep` installs it with `pip --require-hashes --no-deps` from
  [`.semgrep/requirements.txt`](../.semgrep/requirements.txt). That file is a lock of
  `semgrep==<version>` and every dependency, each with its hashes. Its first line is the
  `pip-compile` command that wrote it. To move the version, a person regenerates the lock with that
  command, under the runner's `python3`.

The installed Semgrep venv is cached under a key of the runner's OS, its `python3` version and the
lock's hash. A run whose key is cached restores the venv and installs nothing; a new lock installs
afresh. Each rule is its own file in [`.semgrep/`](../.semgrep/), with no registry ruleset and
metrics off. One step scans the packages with every rule in that directory, and Semgrep names the
rule in each finding. The one exception is the rule that only the printer writes to standard error.
It is in [`.semgrep-errors/`](../.semgrep-errors/) instead, and a step of its own scans the packages
with it, so its fitness scenario has a step that answers it alone.

---

## A model change the pinned reader cannot read

The reader that judges this tree is the **pinned published** spec-controller. So a change to the
model it reads cannot land in one merge. On the branch that makes the change, the pinned reader is
still the old one, and `Reconciliation` reds. Nothing publishes from a branch. So such a change
lands as a **parallel change** (*expand–migrate–contract*), over three merges and a bot PR:

1. **Expand.** The reader accepts both the old shape and the new one. That merge publishes, as every
   merge that passes CI does.
2. **The bot moves the pin.** Dependabot's PR moves the root `devDependencies["spec-controller"]` to
   the release step 1 published, and `dependabot-auto-merge.yml` merges it on green, with no human
   act. The bot runs once a day (*Dependabot moves it*), so this lags the publish by up to 24 hours,
   and nothing shortens that but waiting. The name-scoped `minimumReleaseAgeExclude` in
   [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) is what lets its `Install dependencies` accept a
   release hours old.
3. **Migrate.** With the new reader pinned, the tree drops the old shape.
4. **Contract.** The reader stops accepting the old shape **only once no adopter still writes it**.
   [`docs/user-guide.md`](user-guide.md) says so in the same merge.

**Step 4 is a deliberate step, never a consequence of step 3.** The reader dropping a shape is what
breaks an adopter's next pin bump, and adopters move on their own clock. The tree can be clean of
the old shape for weeks before the reader is entitled to refuse it.

**The order enforces itself.** Merge step 3 before the pin has moved, and the pinned reader cannot
read the tree, so `main` reds. If a newer reader turns the tree red, the bot's pin PR is what goes
red. That red is a finding about the tree. It is fixed in the tree, never by holding the pin back or
by publishing by hand.

**Worked example: retiring `specController.fitnessChecks`.**

- The expand merge taught the reader to raise a fitness obligation from the `@fitness` tag alone.
  It also taught the reader to accept a manifest that still carries `specController.fitnessChecks`,
  by naming it as a retired key.
- The migrate step deleted that key from this repository's own [`package.json`](../package.json).
  It waited until the bot's PR moved the pin to the expand merge's release, because the pinned reader
  could not read a tree with no list at all before then. That condition is written *at or after*
  that release, never as an equality, because the pin lags and jumps.

The current reader names that key as one the `specController` block does not read, and reads
nothing from it. That does not change the ordering rule the example teaches: step 3 cannot merge
before the pin has moved.

---

## When something fails

### A published version cannot be recalled

npm's unpublish window does not undo a publish. Whether or not you unpublish inside the window,
**that version number and that package name are burned**: npm will not let anyone republish them,
you included. **The merge is the point of no return.** That is why the clean-room smoke runs before
the publish, and why a pull request touching a package is reviewed as a release. The question is
not *"can I fix this later"* but *"is this the artefact"*.

### If the run fails

**Re-run it.** Nothing is tagged until both packages are on the registry, and the counter reads the
registry. So a re-run picks a number nobody has used, once npm serves the last version it published
(*After both published and the `tag` job failed*, below).

A re-run needs the `built-packages` artifact from the CI run it follows. CI keeps that artifact for
one day (`retention-days: 1`), so a re-run after that cannot download it and fails. The change is
still unreleased since the last tag, so the next push to `main` that runs CI and passes publishes
it.

- **Before anything published.** The re-run publishes the number the failed run would have. A fix
  that needs a code change is an ordinary pull request, and its merge publishes.
- **After core published and the CLI did not.** Core's number is spent. The re-run's counter sees it
  on the registry and takes the **next** number for both. So the two packages go out in lockstep one
  number higher, and no CLI ever names the spent core version.
- **After both published and the `latest` job failed.** Re-run that job alone (*Re-run failed
  jobs*). Re-running the whole workflow publishes the next number, not nothing. If the `latest` job
  fails again with time to spare, read `npm view <pkg> dist-tags`. A `latest` that is not the
  published version is the fault the job exists to catch.
- **After both published and the `tag` job failed.** The release happened, but the newest `v*` tag
  is still the one before it. The counter reads the registry, so no number is reused once npm serves
  the version. That can take 20 to 40 minutes, and a push inside that window can mint the same
  number and fail with E403. The next push to `main` that passes CI publishes the number after it.
  Create the tag by hand on the commit the run built:
  `gh api repos/{owner}/{repo}/git/refs -f ref=refs/tags/v<version> -f sha=<sha>`.

### When a publish returns `E401`, read it as the trusted publisher

**`oidc()` never throws.** Every failure inside it logs at `verbose` and returns. Such failures
include the permission missing, the exchange refused, and connection fields that do not match the
run. The publish then falls back to the `.npmrc` that `actions/setup-node` wrote. That file's token
is `${NODE_AUTH_TOKEN}`. From setup-node v7 nothing sets that variable, so npm sends the unexpanded
text `${NODE_AUTH_TOKEN}` as the token. What you see is:

```
npm error code E401
npm error Unable to authenticate
```

**Nothing in the log says an exchange was attempted at all.** It reads like a missing secret. There
is no secret: it is the trusted publisher.

**`--loglevel=verbose` shows why**: the `oidc` lines name which check failed. Then compare the
connection on npmjs.com against the run:

| Field | Must be |
|---|---|
| Organization or user | the **GitHub org** |
| Repository | the **repository** name — not the package name |
| Workflow filename | `release.yml` — the file name alone |
| Environment name | **blank** — this job declares no environment |
| Allow npm publish | **ticked** |

npm does not validate any of these when the connection is saved, so a wrong one is only ever
discovered here.
