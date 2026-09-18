# Releasing spec-controller

Two packages go out together: `@3f-consulting/spec-controller-core`, the pure engine, and
`spec-controller`, the command that resolves it. A release sends both, core first, from one run of
`.github/workflows/release.yml`.

**Nobody cuts a release.** Every merge to `main` that changes a published package publishes both
packages in that merge's own run, at the next counter version, and then tags what it published.
There is no credential stored anywhere, no release PR, nothing to promote afterwards and nothing to
rotate. The portfolio rule is `the maintainers' private notes` → *Continuous delivery: every
package-changing merge publishes, and the version is a counter*; this file is what is true of *these
two packages*.

**Read *When a publish returns `E401`* before your first release.** The trap in it is an
authentication error whose cause is not authentication, and this file used to teach the exact
opposite of what it now teaches.

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
lockfile publishes nothing. Replayed over the last 40 commits on `main` (3F-3529, 2026-09-18),
24 would have published and 16 would not. Among the 16 is every docs-only commit and the last
by-hand pin move.

### The version is a counter

The run takes the **line** from the committed CLI manifest — everything before its last `.N`, so
`0.1.0-alpha.5` is the line `0.1.0-alpha.` — and finds the highest number already on that line across
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

Then the `tag` job creates `v<version>` on the commit that was built. It is its own job so the only
token that can write to the repository never shares a runner with the build, and it starts no other
workflow. **The tag records a release; it never causes one**, and nothing listens for tags any more.

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
falls back to the `.npmrc` `actions/setup-node` wrote. That file holds the placeholder
`XXXXX-XXXXX-XXXXX-XXXXX`, so what you see is:

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

*(This file previously taught the inverse — that an `E401` on the publish step meant an expired
token and could never be a trusted-publisher problem. That was true of the shape it described and
is exactly wrong about this one. Lived 2026-09-15, publishing `0.1.0-alpha.2`: six faults in one
attempt, three of them chasing an authentication error that had no authentication cause.)*

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
`3F-3476`'s branch with the script gone: the report's own provenance reads `Tool version:
0.1.0-alpha.3` and `Tool SHA: unknown (not a git checkout)`, against `0.1.0-alpha.4` and this
checkout's HEAD for the workspace build run over the same argv. Both `ci.yml` steps that invoke the
tool (`Corpus tags` and `Self-reconciliation balance`) go through it, which is what makes this
repository an ordinary adopter of its own product rather than a special case (`3F-3105`).

**That pin is the single declaration of which reader judges this tree.** There is no second
"minimum readable version" banked anywhere, deliberately: a second spelling of the same fact agrees
with the first only until somebody edits one of them.

**The pin follows the registry by bot PR, a day behind it (3F-3529).** `.github/dependabot.yml`
lets Dependabot move exactly this one dependency, and keeps it exact. `dependabot-auto-merge.yml`
merges its PR once `ci` is green. The PR touches the root `package.json` and the lockfile, neither of
which is in `release.yml`'s `paths:`, so its merge publishes nothing and cannot loop.

**The day is pnpm's, not ours.** pnpm 11 refuses a lockfile entry younger than its
`minimumReleaseAge` — 1440 minutes by default, enforced in CI — so a same-day pin reds at
`Install dependencies` with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`. Dependabot's `cooldown:
default-days: 1` keeps its PRs outside that window, which is why `pnpm-workspace.yaml` no longer
carries the hand-kept `minimumReleaseAgeExclude` pair it used to. Measured on 3F-3529's branch: with
the pair removed, a frozen install passes under an explicit 1440-minute window and reds, naming
exactly the two `0.1.0-alpha.3` entries, under a four-day one. The only route that still needs an
exclude is the stage0 hatch below, which pins a version on the day it publishes.

**When the model moves and the pinned reader can no longer read the tree**, the cure is the stage0
bump in *Releasing while the self-reconciliation is red* below.

**Never widen the pin to escape a skew.** A range or a dist-tag would make the red go away by
making the reader unpredictable, which is the failure this arrangement exists to end. This is a
convention and no guard enforces it: measured at `3F-3476`, `grep -rn devDependencies --include='*.ts'`
returned two readers of the root `devDependencies` and both left with that slice, so nothing in the
tree reds on a widened specifier.

- **`0.x` says the surface may still move.** A minor bump on `0.x` may carry a breaking change, and
  a consumer who cannot absorb one should pin exactly rather than by caret.
- **The frozen public contract is the CLI's flags and the core barrel** — what
  `@3f-consulting/spec-controller-core` exports from its main entry point. Breaking either is a
  major-version event whatever the leading digit says. The `./internal` subpath is *not* part of it:
  the workspace offers it and `publishConfig` drops it at publish time, so a consumer never had it.
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

**`latest` is never MOVED onto a prerelease — but it carries one today.** npm points `latest` at a
package's first-ever publish whatever its version, so both packages have `latest` at
`0.1.0-alpha.1`, the reader from before the fitness-axis rework: no `tags` command and no
`--ci-steps` flag. A bare `npm i spec-controller` installs it. While these packages have no stable
release the documented install line is therefore:

```
npm i spec-controller@alpha
```

Do not hand-move `latest` onto a prerelease to make the bare install work; it moves on its own when
`0.1.0` publishes.

---

## The release path asks nothing about this repository

`release.yml` gates on what says **this artefact is sound**: the build, the typecheck, both suites,
and the clean-room install of the packed tarballs. It **does not run the self-reconciliation**, and
that is a rule rather than an oversight:

> **The release path consults nothing that is about this repository rather than about the artefact.**

The self-reconciliation is a statement about this repository's own bookkeeping. The fitness axis is
the same category row for row — complexity bars, corpus traceability, anemic-domain conformance,
this suite's own mutation score, the duration of the observer. Not one of those says the tarball
works. `SCN-FIT-011` is `pnpm typecheck`, and the release runs it directly, so the one
artefact-relevant member of the axis is covered on its own terms.

Two things go wrong when a release does ask:

- **A model skew becomes a deadlock.** When this repository reconciles itself with a *pinned
  published* spec-controller and the model moves, the self-reconciliation reds — and the only cure is
  publishing a version that can read the new tree. A release path consulting the reconciliation
  would refuse to publish the cure for the disease.
- **A lapsed cron blocks a release.** `SCN-FIT-002` is answered by the verdict of a **scheduled
  nightly sweep**, and its step fails when no sweep of `main` finished inside the last 26 hours. A
  release path that ran it would refuse to publish whenever the schedule had lapsed. The row's
  earlier shape, a record fetched from the nightly, was measured doing exactly that on a real
  release run: its step redded on a cold evidence root and the job died before it packed anything.

**The residual, stated rather than hidden.** Repository bars are `ci.yml`'s, and `main`'s `strict`
protection discharges them on every pull request before it can merge — so every merge-started
release has already passed all of them. A run **started by hand from an unmerged branch** has not,
which is exactly the case the next section is about. What bounds it is that nothing merges by that
route. `main` still requires the whole ladder, the self-reconciliation included.

---

## Releasing while the self-reconciliation is red

This is the hatch the rule above exists for: Rust's stage0 bump, in this repository's terms. Use it
when a change to the model means the **pinned published** spec-controller can no longer read this
tree, so the self-reconciliation reds on the very branch that fixes it.

1. **The model change lands on a branch.** CI reds at `Self-reconciliation balance`, naming the skew.
2. **Start the release by hand on that branch** — `gh workflow run release.yml --ref <branch>`. It
   publishes both packages at the next counter number and tags the branch's commit. It never asks
   the self-reconciliation anything, so the red does not stop it.
3. **Bump the pin on the branch**, in the same review, to the version just published — and, because
   that version is minutes old, add it to `pnpm-workspace.yaml` as a `minimumReleaseAgeExclude` pair
   (core and the CLI), or CI reds at `Install dependencies` on pnpm's release-age policy.
4. **CI greens** — the new pinned reader can read the tree. The branch merges, and because it touches
   a package, the merge publishes the next number as any merge does.
5. **Delete the exclude pair** once the pin has moved on: Dependabot moves the pin a day later, and
   it does not edit `pnpm-workspace.yaml`. A pair naming a version the pin has left is dead weight.

Step 3 is what makes step 2 honest: the prerelease exists to be pinned, and a branch that published
one without bumping to it has released a version nothing uses.

**This route publishes from an unmerged branch, so it is the one case where the person starting the
run is the whole of the repository's bars.** It is deliberate, it is bounded by the fact that nothing
merges this way, and it is the only reason to start `release.yml` by hand.
