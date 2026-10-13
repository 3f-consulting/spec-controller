# Releasing spec-controller

Two packages go out together: `@3f-consulting/spec-controller-core`, the pure engine, and
`spec-controller`, the command that resolves it. A release sends both, core first, from one run of
`.github/workflows/release.yml`.

**Nobody cuts a release.** Every merge to `main` that changes a published package publishes both
packages in that merge's own run, at the next counter version, and then tags what it published.
There is no credential stored anywhere, no release PR, nothing to promote afterwards and nothing to
rotate.

**Read *When a publish returns `E401`* before your first release.** The trap in it is an
authentication error whose cause is not authentication.

---

## How a release happens

**A merge publishes when it changes what a tarball is made of**, and only then. `release.yml` runs
on `push` to `main` filtered to these paths:

| Path | Why it is in the tarball |
|---|---|
| `packages/*/src/**`, except `*.test.ts` | compiled into `dist`, the one entry in `files` |
| `packages/*/package.json`, `packages/*/README.md` | npm always packs both |
| `packages/*/tsconfig.build.json`, the root `tsconfig.json` | decide what `dist` compiles to |

A merge touching only `doc/`, `features/`, `tests/`, `.github/`, the root `package.json` or the
lockfile publishes nothing. Replayed over the last 40 commits on `main` (2026-09-18),
24 would have published and 16 would not. Among the 16 is every docs-only commit and the last
by-hand pin move.

### The version is a counter

The run takes the **line** from the committed CLI manifest — everything before its last `.N`, so
`0.1.0` is the line `0.1.` — and finds the highest number already on that line across
**both packages on the registry and the repository's `v*` tags**. It stamps the next number into both
manifests **in the run's working copy only**. Nothing is committed back: `main` is protected, and the
committed manifest is not the published version. It stays where a human last put it while the
registry counts on.

**Major and minor are a by-hand act, and it is an ordinary merge.** Edit both manifests to start a
new line — `0.2.0-alpha.0`, or `1.0.0` — and merge. Nothing is on that line yet, so the run publishes
exactly what you wrote; the next merge after it counts on from there. On a stable line the counter
moves the patch number and ignores prereleases.

### Watching one

```bash
gh run list --workflow release.yml --limit 5
gh run watch <run-id>

npm view spec-controller dist-tags
npm view @3f-consulting/spec-controller-core dist-tags
npm view spec-controller@<version> dependencies
git ls-remote --tags origin "v<version>"
```

The `dependencies` line matters because the CLI's packed manifest names core by a **concrete**
version: it is the check that the two went out in lockstep. Nothing is owed after the run goes green.

### What the workflow does, in order

The `release` job:

1. Checks out, enables corepack, installs with a frozen lockfile.
2. **Builds**, **typechecks**, runs **`pnpm test`** and **`pnpm cucumber`**.
3. **Stamps the next counter version** on both manifests in the working copy.
4. **Packs both packages, once.** Every step after this reads those same two files.
5. **Smokes them in a clean room** — installs the tarballs into a directory holding nothing else of
   this repository, outside the workspace, and starts the command there.
6. **Publishes core, then the CLI**, with `npm publish` over the packed tarballs.

Then two jobs run on what was published. The `latest` job runs `scripts/latest-is.sh` for each
package and reds unless the `latest` dist-tag is the version just published, waiting up to
`LATEST_WAIT_S` for the registry to serve it. The `tag` job creates `v<version>` on the commit that
was built, and a GitHub release for that tag with notes generated from the merged pull requests.
The `tag` job is its own job so the only token that can write to the repository never shares a
runner with the build, and it starts no other workflow. **The tag records a release; it never causes one**, and nothing listens for tags.

### Two merges close together

Runs are serialised (`concurrency: release`, never cancelling a running one). GitHub holds at most
one pending run, and a newer pending run cancels the older: for merges A, B and C in quick
succession, A publishes, B is cancelled, C publishes — and C's commit contains B's change, because
squash merges keep `main` linear. Each run reads the counter inside its own turn, after the previous
run's publish and tag, so no number is minted twice.

---

## Authentication — there is no credential

The workflow authenticates with **npm trusted publishing**. The job asks GitHub for a short-lived
OIDC id-token, npm exchanges it for a publish token scoped to the one package, and that token dies
with the run. `permissions: id-token: write` is what switches it on and is the whole of the
configuration.

Three facts decide whether it works, and all three are measurable:

- **The command has to be `npm publish`.** Measured in `npm@11.19.1`: `lib/commands/publish.js:147`
  calls `oidc()`, unconditionally and not guarded on what kind of spec it was handed — which is why
  publishing a *tarball* authenticates just as publishing a directory does.
- **The npm has to be new enough.** Trusted publishing needs npm `>= 11.5.1`. `actions/setup-node`
  offers no way to choose an npm; it installs whatever the Node it fetches bundles. Node 22 bundles
  10.9.x and Node 24 bundles 11.19.x, which is why the workflow pins Node 24.
- **Each package needs its own trusted publisher.** The exchange is per package
  (`/-/npm/v1/oidc/token/exchange/package/<name>`), so both packages carry a connection on
  npmjs.com naming the org, this repository, and `release.yml`.

**No provenance attestation is produced, and that is not a misconfiguration.** npm enables
provenance only when the id-token says the repository is public. This one is private, so none
appears; it will start appearing by itself when the repository flips, with no edit here.

### When a publish returns `E401`, read it as the trusted publisher

**`oidc()` never throws.** Every failure inside it — the permission missing, the exchange refused,
connection fields that do not match the run — logs at `verbose` and returns, and the publish then
falls back to the `.npmrc` `actions/setup-node` wrote. That file's token is
`${NODE_AUTH_TOKEN}`, and since setup-node v7 nothing sets that variable, so npm sends the
unexpanded text `${NODE_AUTH_TOKEN}` as the token. It is no more a token than v6's placeholder
`XXXXX-XXXXX-XXXXX-XXXXX` was, so what you see is:

```
npm error code E401
npm error Unable to authenticate
```

with **nothing in the log to say an exchange was attempted at all**. It reads like a missing
secret. There is no secret. It is the trusted publisher.

**`--loglevel=verbose` is where it says why** — the `oidc` lines name which of the checks failed.
Then compare the connection on npmjs.com against the run:

| Field | Must be |
|---|---|
| Organization or user | the **GitHub org** |
| Repository | the **repository** name — not the package name |
| Workflow filename | `release.yml` — the file name alone |
| Environment name | **blank** — this job declares no environment |
| Allow npm publish | **ticked** |

npm does not validate any of these when the connection is saved, so a wrong one is only ever
discovered here.

---

## What cannot be taken back

**A published version cannot be recalled.** npm's unpublish window does not undo it: whether or not
you unpublish inside the window, **that version number and that package name are burned** — npm
will not let anyone republish them, you included.

There is no half-way house. The previous shape had one — a version could sit on the registry
unreachable and simply never be approved — and it is gone with everything else that went with it.
**The merge is now the point of no return.** That is why the clean-room smoke runs before the
publish, and why a pull request touching a package is reviewed as a release: the question is not
*"can I fix this later"* but *"is this the artefact"*.

### If the run fails

**Re-run it.** Nothing is tagged until both packages are on the registry, and the counter reads
the registry, so a re-run always picks a number nobody has used.

- **Before anything published** — the re-run publishes the number the failed run would have. A fix
  that needs a code change is an ordinary pull request, and its merge publishes.
- **After core published and the CLI did not** — core's number is spent. The re-run's counter sees it
  on the registry and takes the **next** number for both, so the two packages go out in lockstep one
  number higher and the spent core version is simply never named by a CLI.
- **After both published and the `latest` job failed** — re-run that job alone (*Re-run failed
  jobs*). Re-running the whole workflow would publish the next number. If it fails again with time to
  spare, read `npm view <pkg> dist-tags`: a `latest` that is not the published version is the fault
  the job exists to catch.
- **After both published and the `tag` job failed** — the release happened; only its record is
  missing. Nothing needs re-running. Create the tag by hand on the commit the run built, if you want
  the record: `gh api repos/{owner}/{repo}/git/refs -f ref=refs/tags/v<version> -f sha=<sha>`.

Core publishes first because between the two publishes there is a window in which
`npm i spec-controller` would resolve an engine nobody can fetch, and sending core first is what
keeps that window on the harmless side.

---

## Versions and pinning

Both packages are **semver**, and both are on `0.x`.

### This repository pins spec-controller, and that pin is where a bump starts

`package.json` at the workspace root carries `spec-controller` as an **exact published version** in
`devDependencies`, and there is no root script of that name — so `pnpm spec-controller …` falls
through to `node_modules/.bin/spec-controller` and runs the *installed* package. Measured on
a branch with the script gone: the report's own provenance reads `Tool version:
0.1.0-alpha.3` and `Tool SHA: unknown (not a git checkout)`, against `0.1.0-alpha.4` and this
checkout's HEAD for the workspace build run over the same argv. The `ci.yml` step that invokes the
tool (`Self-reconciliation balance`) goes through it, which is what makes this repository an
ordinary adopter of its own product rather than a special case.

**That pin is the single declaration of which reader judges this tree.** There is no second
"minimum readable version" banked anywhere, deliberately: a second spelling of the same fact agrees
with the first only until somebody edits one of them.

**The pin follows the registry by bot PR, within a day of a release publishing, weekends included.** `.github/dependabot.yml`
lets Dependabot move exactly this one dependency, and keeps it exact. `dependabot-auto-merge.yml`
merges its PR once `ci` is green. The PR touches the root `package.json` and the lockfile, neither of
which is in `release.yml`'s `paths:`, so its merge publishes nothing and cannot loop.

**The bot sees the root pin only because `packages/spec-controller` is excluded from its
view.** Dependabot's npm parser drops every manifest requirement whose name is also the name of
a workspace package, and the workspace package here is named `spec-controller` — the name the root
pins from the registry. The bot's first pin PR, #311, therefore moved no pin: it rewrote
`pnpm-lock.yaml` alone and left the root at `0.1.0-alpha.3`. `exclude-paths: [packages/spec-controller]`
in `.github/dependabot.yml` is the fix, measured with the Dependabot CLI over this tree: without it
the job reproduced #311's shape exactly; with it, the root pin moved by one exact line, and core and
the CLI moved together in the lockfile.

**Its lockfile carries more than the pin, and that is accepted only when the pin really moves.**
Dependabot's pnpm path always runs `pnpm update <dep>@<version> --lockfile-only --no-save -r`, which
re-resolves in-range transitive packages as well; the same command under this repository's pnpm
reproduces the same churn, and no Dependabot key turns it off. So `dependabot-auto-merge.yml` reads
what the PR changes before it arms anything, and refuses unless the changed files are exactly the
root `package.json` and `pnpm-lock.yaml`, the root pin differs from the merge base's, the new pin is
an exact version, and nothing else in the root `package.json` changes.
A refused PR fails that job with the reason and is left disarmed; `ci` still gates the churn on a PR
that passes.

**Dependabot checks once a day, every day, weekends included, so no human act is needed in the
pin loop.** The schedule is `interval: cron` with
`cronjob: "30 11 * * *"`, which is 11:30 UTC on all seven days. `daily`, which this replaced, runs
Monday to Friday only, so a release published on a Saturday waited for Monday or for a person. Once a
day is as often as GitHub allows: its config check rejects any `cronjob` that fires more often than
every 24 hours. A pin therefore lags a publish by up to 24 hours. That lag is accepted because
only step 3 of an expand/contract waits on the pin, and an adopter's own Dependabot lags the same way.
A merge to `main` that changes `.github/dependabot.yml` also starts a run at once. *Check for
updates* under Insights → Dependency graph → Dependabot runs one early, but the loop never needs it,
and neither is a hand move of the pin.

**No day's wait — our own two packages are exempt from both age gates, by name.** `allow:` limits the bot to spec-controller, so a cooldown only delays our own
releases, and each was judged by this repository's `ci` before `release.yml` published it. So
`.github/dependabot.yml` exempts spec-controller from Dependabot's cooldown with `cooldown: exclude:`
— leaving `cooldown:` out would not do it, because GitHub then applies a default of three days. And
because pnpm 11 refuses a lockfile entry younger than its `minimumReleaseAge` — 1440 minutes by
default, enforced in CI — `pnpm-workspace.yaml`'s `minimumReleaseAgeExclude` names `spec-controller`
and `@3f-consulting/spec-controller-core`, and nothing else. Measured over a Dependabot CLI dry run
that pinned `0.1.0-alpha.12` three hours after it published: with no exemption the frozen install
reds with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, naming both entries; with both names it passes;
with `spec-controller` alone it reds naming core. The exemption names packages, not versions, so
unlike a version pin it needs no pruning; every other dependency stays
under the policy in full.

**The workflows' actions move by a second entry, monthly, and a person merges them.** Every action
in `.github/workflows/` is pinned by SHA with its version in a trailing comment
(`@<sha> # vX.Y.Z`). actionlint alone is not an action: its step downloads the official release
binary and verifies it against a SHA-256 pinned beside its version in the step's `env:`, and
Dependabot does not move it, so a person moves the version and checksum together. A `github-actions`
entry in `.github/dependabot.yml` moves those pins: once a month, every action bump in one grouped
PR, and a release only after a 7-day cooldown. Dependabot moves the SHA and rewrites the version
comment with it. `dependabot-auto-merge.yml` refuses that PR, because it changes workflow files and
not exactly `package.json` and `pnpm-lock.yaml`, so auto-merge is never armed and a person merges it
once `ci` is green. A green `ci` proves the bump in `ci.yml`
alone. Before merging a bump that touches `mutation.yml`, dispatch `mutation.yml` on the PR's
branch. A bump in `release.yml` is first exercised by the next package release, so read that run.

**When the model moves and the pinned reader cannot read the tree**, the cure is the expand
merge in *A model change the pinned reader cannot read* below. The pin is never moved by hand to
reach it.

**Never widen the pin to escape a skew.** A range or a dist-tag would make the red go away by
making the reader unpredictable, which is the failure this arrangement exists to end. This is a
convention and no guard enforces it: measured once, `grep -rn devDependencies --include='*.ts'`
returned two readers of the root `devDependencies` and both left with that slice, so nothing in the
tree reds on a widened specifier.

- **`0.x` says the surface may still move.** A minor bump on `0.x` may carry a breaking change, and
  a consumer who cannot absorb one should pin exactly rather than by caret.
- **The `./internal` subpath is never published.** The workspace offers it and `publishConfig`
  drops it at publish time, so a consumer never has it.
- The two packages are released **in lockstep at the same version**. The CLI's dependency on core is
  written `workspace:*` in this tree and rewritten to that exact version by `pnpm pack`, so a
  release that sent one without the other would leave a package naming an engine the registry does
  not have.

### Prerelease dist-tags

**A prerelease cannot be published without `--tag`.** npm refuses it outright: *"You must specify a
tag using --tag when publishing a prerelease version."* `release.yml` derives the tag from each
package's own manifest rather than hard-coding one — the prerelease identifier becomes the
dist-tag, a stable version becomes `latest`:

```
0.1.0-alpha.2 -> alpha    1.0.0-beta.3 -> beta    2.0.0-rc.1 -> rc    0.1.0 -> latest
```

A hard-coded `--tag alpha` would publish the first stable release under `alpha`, which is a silent
fault with no guard.

**`latest` is never moved onto a prerelease.** The committed manifests are on the stable line
`0.1.N`, so every release is a plain version and moves `latest` itself, and a bare
`npm i spec-controller` installs the current build. The `latest` job checks that it did.

---

## The release path asks nothing about this repository

`release.yml` gates on what says **this artefact is sound**: the build, the typecheck, both suites,
and the clean-room install of the packed tarballs. It **does not run the self-reconciliation**, and
that is a rule rather than an oversight:

> **The release path consults nothing that is about this repository rather than about the artefact.**

The self-reconciliation is a statement about this repository's own bookkeeping. The fitness axis is
the same category row for row — complexity bars, corpus traceability, anemic-domain conformance,
this suite's own mutation score, the duration of the observer. Not one of those says the tarball
works. The type-soundness row is `pnpm typecheck`, and the release runs it directly, so the one
artefact-relevant member of the axis is covered on its own terms.

Two things go wrong when a release does ask:

- **A model skew becomes a deadlock.** When this repository reconciles itself with a *pinned
  published* spec-controller and the model moves, the self-reconciliation reds — and the only cure is
  publishing a version that can read the new tree. A release path consulting the reconciliation
  would refuse to publish the cure for the disease.
- **A lapsed cron blocks a release.** The mutation row is answered by the verdict of a **scheduled
  nightly sweep**, and its step fails when no sweep of `main` finished inside the last 26 hours. A
  release path that ran it would refuse to publish whenever the schedule had lapsed. The row's
  earlier shape, a record fetched from the nightly, was measured doing exactly that on a real
  release run: its step redded on a cold evidence root and the job died before it packed anything.

**And there is no residual left to state.** Repository bars are `ci.yml`'s, and `main`'s `strict`
protection discharges them on every pull request before it can merge — so every release run has
already passed all of them, because **every release run is a merge**. `release.yml` has no
`workflow_dispatch` trigger and nothing else can start it, so no published version exists that
`main` never contained.

---

## A model change the pinned reader cannot read

The reader that judges this tree is the **pinned published** spec-controller, so a change to the
model it reads cannot land in one merge: on the branch that makes the change, the pinned reader is
still the old one and `Self-reconciliation balance` reds. There was once a hatch here — a release
started by hand from the branch, before it merged. It is gone, along with `release.yml`'s
manual trigger, and **nothing publishes except a merge to `main`.**

A change like that lands as a **parallel change** — *expand–migrate–contract* — over two merges and
a bot PR.

1. **Expand.** The reader accepts both the old shape and the new one. That merge touches a package,
   so it publishes.
2. **The bot moves the pin.** Dependabot's PR moves the root `devDependencies["spec-controller"]` to
   the release step 1 published, and `dependabot-auto-merge.yml` merges it on green — no human act.
   The bot runs on a daily cron, `0 22 * * *`, weekends included, so this lags the publish by up to
   24 hours and nothing shortens that but waiting. The name-scoped
   `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` is what lets its `Install dependencies`
   accept a release hours old.
3. **Migrate.** With the new reader pinned, the tree drops the old shape.
4. **Contract.** The reader stops accepting the old shape **only once no adopter still writes it**,
   and `doc/how_to_use.md` says so in the same merge.

**Step 4 is a deliberate step, never a consequence of step 3.** The reader dropping a shape is what
breaks an adopter's next pin bump, and an adopter is not this repository: they move on their own
clock. The tree can be clean of the old shape for weeks before the reader is entitled to refuse it.

**The order enforces itself.** Merge step 3 before the pin has moved and the pinned reader cannot
read the tree, so `main` reds. And if a newer reader turns the tree red, the bot's pin PR is what
goes red — that red is a finding about the tree, fixed in the tree, never by holding the pin back or
publishing by hand.

**Worked example — retiring `specController.fitnessChecks`.** The expand merge taught the reader to
raise a fitness obligation from the `@fitness` tag alone, and to accept a manifest still carrying
`specController.fitnessChecks` by naming it as a retired key. Its migrate step deletes that key from
this repository's own `package.json` — and it waits, because the pinned reader cannot read a tree
with no list at all until the bot's PR moves the pin to the expand merge's release. Written *at or
after* that release, never as an equality: the pin lags and jumps. **Today's reader neither accepts
that key nor names it**, which changes nothing about the
ordering rule the example teaches: step 3 cannot merge before the pin has moved.
