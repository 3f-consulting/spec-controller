# Releasing spec-controller

Two packages are released together: `@3f-consulting/spec-controller-core`, the pure engine, and
`spec-controller`, the command that resolves it. **Nobody cuts a release.** Every push to `main`
that passes CI and changes a published package since the last release publishes both, core first,
in the run of `.github/workflows/release.yml` that follows that push's CI run, at the next counter
version, and then tags what it published.
No credential is stored anywhere. There is no release PR, nothing to promote afterwards and nothing
to rotate.

**Read *When a publish returns `E401`* before your first release.** It describes an authentication
error whose cause is not authentication.

---

## What a merge does

### Which merges publish

**A push to `main` publishes when what a tarball is made of has changed since the last release**,
and only then. `release.yml` runs when the `CI` workflow completes on `main`. Its first job,
`changes`, goes on only if that CI run succeeded and was started by a `push`. It checks out the
commit CI ran on and diffs these paths between that commit and the nearest `v*` tag reachable from it
(`git describe --tags --match 'v*' --abbrev=0`). The `release` job runs only if one of them changed:

| Path | Why it is in the tarball |
|---|---|
| `packages/*/src/**`, except `*.test.ts` and `*.test-utils.ts` | compiled into `dist`, the one entry in `files` |
| `packages/*/package.json`, `packages/*/README.md` | npm always packs both |
| `packages/*/tsconfig.build.json`, the root `tsconfig.json` | decide what `dist` compiles to |

A push that changes only `doc/**`, the root `README.md`, `CONTRIBUTING.md` or `LICENSE` does not run
CI at all (`paths-ignore` in `ci.yml`), so it cannot release. A merge that touches only `doc/`,
`features/`, `tests/`, `.github/`, the root `package.json` or the lockfile publishes nothing while the
last release is tagged, because no published path changed since that tag.

`release.yml` has no `workflow_dispatch` trigger, and a CI run started any way other than a `push`
releases nothing. **Nothing publishes except a push to `main`**, so no published version exists that
`main` never contained.

### What the workflow does, in order

The `release` job:

1. Checks out the commit CI ran on, sets up Node 24, enables corepack, and installs with a frozen
   lockfile, which packing needs to resolve the CLI's workspace dependency on core.
2. **Downloads the `built-packages` artifact** that CI's run uploaded: the compiled `dist` of both
   packages. The job builds nothing and runs no typecheck and no tests; those are CI's.
3. **Stamps the next counter version** on both manifests in the working copy.
4. **Packs both packages, once.** Every later step reads those same two files.
5. **Smokes them in a clean room**: installs the tarballs into a directory outside the workspace
   that holds nothing else of this repository, and starts the command there.
6. **Publishes core, then the CLI**, with `npm publish` over the packed tarballs.

Two jobs then run on what was published:

- The `latest` job runs `scripts/latest-is.sh` for each package. It reds unless the `latest`
  dist-tag is the version just published, waiting up to `LATEST_WAIT_S` for the registry to serve it.
- The `tag` job creates `v<version>` on the commit that was built, and a GitHub release for that tag
  with notes generated from the merged pull requests. It is a separate job so that the only token
  that can write to the repository never shares a runner with the build. It starts no other
  workflow. **The tag records a release; it never causes one**, and nothing listens for tags.

Core publishes first because between the two publishes there is a window in which
`npm i spec-controller` would resolve an engine nobody can fetch. Sending core first keeps that
window on the harmless side.

### Two merges close together

Runs are serialised (`concurrency: release`, never cancelling a running one). GitHub holds at most
one pending run, and a newer pending run cancels the older. For merges A, B and C in quick
succession, A publishes, B is cancelled and C publishes. C's commit contains B's change, because
squash merges keep `main` linear. Each run reads the counter inside its own turn, after the previous
run's publish and tag, so no number is minted twice.

### Watching one

```bash
gh run list --workflow release.yml --limit 5
gh run watch <run-id>

npm view spec-controller dist-tags
npm view @3f-consulting/spec-controller-core dist-tags
npm view spec-controller@<version> dependencies
git ls-remote --tags origin "v<version>"
```

The `dependencies` line is the check that the two packages went out in lockstep: the CLI's packed
manifest names core by a **concrete** version. Nothing is owed after the run goes green.

---

## Versions and dist-tags

Both packages are **semver**, and both are on `0.x`.

### The version is a counter

The run takes the **line** from the committed CLI manifest: everything before its last `.N`, so
`0.1.0` is the line `0.1.`. It finds the highest number already on that line across **both packages
on the registry and the repository's `v*` tags**, and stamps the next number into both manifests
**in the run's working copy only**. Nothing is committed back, because `main` is protected. The
committed manifest is therefore not the published version: it stays where a human last put it while
the registry counts on. On a stable line the counter moves the patch number and ignores prereleases.

**Starting a new major or minor line is done by hand, as an ordinary merge.** Edit both manifests to
start the new line, for example `0.2.0-alpha.0` or `1.0.0`, and merge. Nothing is on that line yet,
so the run publishes exactly what you wrote, and the next merge counts on from there.

### Lockstep, `0.x` and what is published

- The two packages are released **in lockstep at the same version**. In this tree the CLI's
  dependency on core is written `workspace:*`; `pnpm pack` rewrites it to that exact version. A
  release that sent one package without the other would leave a package naming an engine the
  registry does not have.
- **`0.x` says the surface may still move.** A minor bump on `0.x` may carry a breaking change. A
  consumer who cannot absorb one should pin exactly rather than by caret.
- **The `./internal` subpath is never published.** The workspace offers it and `publishConfig`
  drops it at publish time, so a consumer never has it.

### Prerelease dist-tags

**npm refuses to publish a prerelease without `--tag`:** *"You must specify a tag using --tag when
publishing a prerelease version."* `release.yml` derives the tag from each package's own manifest
instead of hard-coding one. The prerelease identifier becomes the dist-tag, and a stable version
becomes `latest`:

```
0.1.0-alpha.2 -> alpha    1.0.0-beta.3 -> beta    2.0.0-rc.1 -> rc    0.1.0 -> latest
```

A hard-coded `--tag alpha` would publish the first stable release under `alpha`, a silent fault with
no guard.

**`latest` is never moved onto a prerelease.** The committed manifests are on the stable line
`0.1.N`, so every release is a plain version and moves `latest` itself, and a bare
`npm i spec-controller` installs the current build. The `latest` job checks that it did.

---

## What the release checks, and what it does not

`release.yml` runs only after CI succeeds on the push, so everything `ci.yml` checks gates the
release: the build, the typecheck, both suites and every repository bar. The release adds one check
of its own before it publishes, the clean-room install of the packed tarballs, and one after, the
`latest` job.

CI on `main` includes `Mutation verdict recorded`, which prints each scope's conclusion from the
newest full mutation sweep of `main` started in the last 30 hours and fails only when there is no
such sweep, and `Self-reconciliation balance`. A lapsed nightly sweep therefore reds CI on `main`,
and no release runs. A red sweep does not red CI: it stops new work from starting until a full
sweep of `main` is green.

`main`'s `strict` protection runs the same bars on every pull request before it can merge. A push to
`main` that changes `packages/*/README.md` is not covered by CI's `paths-ignore`, whose `README.md`
entry matches the root file only, so it runs CI and, if CI succeeds, a release.

---

## Authentication: there is no credential

The workflow authenticates with **npm trusted publishing**. The job asks GitHub for a short-lived
OIDC id-token, npm exchanges it for a publish token scoped to the one package, and that token dies
with the run. `permissions: id-token: write` switches it on and is the whole of the configuration.

Three measurable facts decide whether it works:

- **The command has to be `npm publish`.** Measured in `npm@11.19.1`: `lib/commands/publish.js:147`
  calls `oidc()` unconditionally, not guarded on what kind of spec it was handed. That is why
  publishing a *tarball* authenticates just as publishing a directory does.
- **The npm has to be new enough.** Trusted publishing needs npm `>= 11.5.1`. `actions/setup-node`
  offers no way to choose an npm; it installs whatever the Node it fetches bundles. Node 22 bundles
  10.9.x and Node 24 bundles 11.19.x, so the workflow pins Node 24.
- **Each package needs its own trusted publisher.** The exchange is per package
  (`/-/npm/v1/oidc/token/exchange/package/<name>`), so both packages carry a connection on
  npmjs.com naming the org, this repository, and `release.yml`.

**No provenance attestation is produced, and that is not a misconfiguration.** npm enables
provenance only when the id-token says the repository is public. This repository is private, so
none appears. Attestations will appear by themselves when the repository becomes public, with no
edit here.

---

## How the repository's pin moves

### The pin decides which reader judges this tree

The workspace root `package.json` carries `spec-controller` in `devDependencies` as an **exact
published version**, and there is no root script of that name. `pnpm spec-controller …` therefore
falls through to `node_modules/.bin/spec-controller` and runs the *installed* package. Measured with
no such script: the report's own provenance reads `Tool version: 0.1.0-alpha.3` and
`Tool SHA: unknown (not a git checkout)`, against `0.1.0-alpha.4` and this checkout's HEAD for the
workspace build run over the same argv. The `ci.yml` step that invokes the tool
(`Self-reconciliation balance`) goes through it, so this repository is an ordinary adopter of its
own product, not a special case.

**That pin is the single declaration of which reader judges this tree.** No second "minimum
readable version" is kept anywhere, on purpose: a second spelling of the same fact agrees with the
first only until somebody edits one of them.

### Dependabot moves it, with no human act

**The pin follows the registry by bot PR, within a day of a release publishing, weekends
included.** `.github/dependabot.yml` lets Dependabot move exactly this one dependency, and keeps it
exact. `dependabot-auto-merge.yml` merges its PR once `ci` is green. The PR touches the root
`package.json` and the lockfile, neither of which is a published path, so the release's `changes`
job finds no published path changed since the last tag. Its merge publishes nothing and cannot loop.

**The schedule.** `interval: cron` with `cronjob: "30 11 * * *"`, which is 11:30 UTC on all seven
days. `daily` is not used because it runs Monday to Friday only. Once a day is as often as GitHub
allows: its config check rejects any `cronjob` that fires more often than every 24 hours. A pin
therefore lags a publish by up to 24 hours. That lag is accepted because only step 3 of an
expand/contract waits on the pin, and an adopter's own Dependabot lags the same way. A merge to
`main` that changes `.github/dependabot.yml` also starts a run at once. *Check for updates* under
Insights → Dependency graph → Dependabot runs one early, but the loop never needs it, and neither is
a hand move of the pin.

**The bot sees the root pin only because `packages/spec-controller` is excluded from its view.**
Dependabot's npm parser drops every manifest requirement whose name is also the name of a workspace
package, and the workspace package here is named `spec-controller`, the name the root pins from the
registry. `exclude-paths: [packages/spec-controller]` in `.github/dependabot.yml` fixes that.
Measured with the Dependabot CLI over this tree: without the exclusion, the job rewrites
`pnpm-lock.yaml` alone and leaves the root pin unmoved; with it, the root pin moves by one exact
line, and core and the CLI move together in the lockfile.

**The PR's lockfile carries more than the pin, and auto-merge accepts that only when the pin really
moves.** Dependabot's pnpm path always runs `pnpm update <dep>@<version> --lockfile-only --no-save -r`,
which also re-resolves in-range transitive packages. The same command under this repository's pnpm
reproduces the same churn, and no Dependabot key turns it off. So `dependabot-auto-merge.yml` reads
what the PR changes before it arms anything, and refuses unless all of these hold:

- the changed files are exactly the root `package.json` and `pnpm-lock.yaml`;
- the root pin differs from the merge base's;
- the new pin is an exact version;
- nothing else in the root `package.json` changes.

A refused PR fails that job with the reason and is left disarmed. On a PR that passes, `ci` still
gates the churn.

### Our own two packages are exempt from both age gates, by name

`allow:` limits the bot to spec-controller, so a cooldown would only delay our own releases, and
each of those was judged by this repository's `ci` before `release.yml` published it.

- **Dependabot's cooldown.** `.github/dependabot.yml` exempts spec-controller with
  `cooldown: exclude:`. Leaving `cooldown:` out would not do it, because GitHub then applies a
  default of three days.
- **pnpm's `minimumReleaseAge`.** pnpm 11 refuses a lockfile entry younger than its
  `minimumReleaseAge`, 1440 minutes by default, and CI enforces it. `pnpm-workspace.yaml`'s
  `minimumReleaseAgeExclude` names `spec-controller` and `@3f-consulting/spec-controller-core`, and
  nothing else. Measured over a Dependabot CLI dry run that pinned `0.1.0-alpha.12` three hours after
  it published: with no exemption the frozen install reds with
  `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, naming both entries; with both names it passes; with
  `spec-controller` alone it reds naming core.

The exemption names packages, not versions, so unlike a version pin it needs no pruning. Every
other dependency stays under the policy in full.

### Never widen the pin

**Never widen the pin to escape a skew.** A range or a dist-tag would make the red go away by making
the reader unpredictable, which is the failure this arrangement exists to prevent. This is a
convention and no guard enforces it: a one-off `grep -rn devDependencies --include='*.ts'` finds no
TypeScript reader of the root `devDependencies`; the only check that reads the pin's specifier is
`dependabot-auto-merge.yml`, which refuses a non-exact pin on a Dependabot PR and on nothing else, so nothing reds when a person
widens the specifier.

**When the model moves and the pinned reader cannot read the tree**, the cure is the expand merge in
*A model change the pinned reader cannot read* below. The pin is never moved by hand to reach it.

### The workflows' actions move monthly, and a person merges them

Every action in `.github/workflows/` is pinned by SHA with its version in a trailing comment
(`@<sha> # vX.Y.Z`). A `github-actions` entry in `.github/dependabot.yml` moves those pins: once a
month, every action bump in one grouped PR, and a release only after a 7-day cooldown. Dependabot
moves the SHA and rewrites the version comment with it.

`dependabot-auto-merge.yml` refuses that PR, because it changes workflow files and not exactly
`package.json` and `pnpm-lock.yaml`. Auto-merge is never armed, and a person merges it once `ci` is
green. A green `ci` proves only the bump in `ci.yml`:

- before merging a bump that touches `mutation.yml`, dispatch `mutation.yml` on the PR's branch;
- a bump in `release.yml` is first exercised by the next package release, so read that run.

actionlint is not an action. Its step downloads the official release binary and verifies it against
a SHA-256 pinned beside its version in the step's `env:`. Dependabot does not move it, so a person
moves the version and checksum together.

Semgrep is not an action either. `Install Semgrep` installs it with `pip --require-hashes --no-deps`
from `.semgrep/requirements.txt`, a lock of `semgrep==<version>` and every dependency, each with its
hashes. Its first line is the `pip-compile` command that wrote it. Dependabot does not move it, so a
person regenerates the lock with that command, under the runner's `python3`, to move the version.
Each rule is its own file in `.semgrep/`, run by its own step with no registry ruleset and metrics
off.

---

## A model change the pinned reader cannot read

The reader that judges this tree is the **pinned published** spec-controller, so a change to the
model it reads cannot land in one merge: on the branch that makes the change, the pinned reader is
still the old one and `Self-reconciliation balance` reds. Nothing publishes from a branch, so such a
change lands as a **parallel change** (*expand–migrate–contract*) over two merges and a bot PR:

1. **Expand.** The reader accepts both the old shape and the new one. That merge touches a package,
   so it publishes.
2. **The bot moves the pin.** Dependabot's PR moves the root `devDependencies["spec-controller"]` to
   the release step 1 published, and `dependabot-auto-merge.yml` merges it on green, with no human
   act. The bot runs once a day (see *Dependabot moves it*), so this lags the publish by up
   to 24 hours and nothing shortens that but waiting. The name-scoped `minimumReleaseAgeExclude` in
   `pnpm-workspace.yaml` is what lets its `Install dependencies` accept a release hours old.
3. **Migrate.** With the new reader pinned, the tree drops the old shape.
4. **Contract.** The reader stops accepting the old shape **only once no adopter still writes it**,
   and `doc/how_to_use.md` says so in the same merge.

**Step 4 is a deliberate step, never a consequence of step 3.** The reader dropping a shape is what
breaks an adopter's next pin bump, and adopters move on their own clock. The tree can be clean of
the old shape for weeks before the reader is entitled to refuse it.

**The order enforces itself.** Merge step 3 before the pin has moved and the pinned reader cannot
read the tree, so `main` reds. If a newer reader turns the tree red, the bot's pin PR is what goes
red. That red is a finding about the tree, fixed in the tree, never by holding the pin back or
publishing by hand.

**Worked example: retiring `specController.fitnessChecks`.** The expand merge taught the reader to
raise a fitness obligation from the `@fitness` tag alone, and to accept a manifest still carrying
`specController.fitnessChecks` by naming it as a retired key. Its migrate step deleted that key
from this repository's own `package.json`, and it waited, because the pinned reader could not read a
tree with no list at all until the bot's PR moved the pin to the expand merge's release. That
condition is written *at or after* that release, never as an equality: the pin lags and jumps. The
current reader names that key as one the `specController` block does not read, and reads nothing
from it, which changes nothing about the ordering rule
the example teaches: step 3 cannot merge before the pin has moved.

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
registry, so a re-run always picks a number nobody has used. A re-run needs the `built-packages`
artifact from the CI run it follows, and CI keeps that artifact for one day (`retention-days: 1`).
A re-run after that cannot download it and fails. The change is still unreleased since the last tag,
so the next push to `main` that runs CI and passes publishes it.

- **Before anything published.** The re-run publishes the number the failed run would have. A fix
  that needs a code change is an ordinary pull request, and its merge publishes.
- **After core published and the CLI did not.** Core's number is spent. The re-run's counter sees it
  on the registry and takes the **next** number for both, so the two packages go out in lockstep one
  number higher and the spent core version is never named by a CLI.
- **After both published and the `latest` job failed.** Re-run that job alone (*Re-run failed
  jobs*). If the `tag` job succeeded, re-running the whole workflow publishes nothing: its `changes`
  job diffs against the new `v<version>` tag and finds no published path changed. If the `tag` job
  failed too, re-running the whole workflow publishes the next number. If the `latest` job fails
  again with time to spare, read `npm view <pkg> dist-tags`: a `latest` that is not the published
  version is the fault the job exists to catch.
- **After both published and the `tag` job failed.** The release happened, but the newest `v*` tag
  is still the one before it. The next push to `main` that passes CI diffs against that older tag,
  finds published paths changed, and publishes again at a new number, even if it touches only
  `tests/` or `.github/`, and so does the bot's pin PR. Create the tag by hand on the commit the run
  built: `gh api repos/{owner}/{repo}/git/refs -f ref=refs/tags/v<version> -f sha=<sha>`.

### When a publish returns `E401`, read it as the trusted publisher

**`oidc()` never throws.** Every failure inside it (the permission missing, the exchange refused,
connection fields that do not match the run) logs at `verbose` and returns. The publish then falls
back to the `.npmrc` that `actions/setup-node` wrote. That file's token is `${NODE_AUTH_TOKEN}`, and
from setup-node v7 nothing sets that variable, so npm sends the unexpanded text `${NODE_AUTH_TOKEN}`
as the token. What you see is:

```
npm error code E401
npm error Unable to authenticate
```

with **nothing in the log to say an exchange was attempted at all**. It reads like a missing secret.
There is no secret. It is the trusted publisher.

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
