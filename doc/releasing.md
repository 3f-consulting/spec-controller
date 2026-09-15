# Releasing spec-controller

Two packages go out together: `@3f-consulting/spec-controller-core`, the pure engine, and
`spec-controller`, the command that resolves it. A release sends both, core first, from one run of
`.github/workflows/release.yml`.

**Read the first section before your first release.** The trap in it is an authentication error
with no authentication cause.

---

## Before your first release: the credential, and what an `E401` means

**This repository stages with a token and promotes by hand.** `release.yml` reads `NPM_TOKEN` from
the repository secrets on its two staging steps, and nothing else in the file authenticates.

**It does not use OIDC trusted publishing, and that is a fact about npm rather than a preference.**
Measured in npm's own source, 11.19.1 and 12.0.2:

```
oidc() is called from lib/commands/publish.js only
lib/commands/stage/publish.js has no reference to it
```

`npm stage publish` never attempts the exchange. A staging workflow running under `id-token: write`
with no token falls back to whatever is in the `.npmrc`, finds `actions/setup-node`'s placeholder
`XXXXX-XXXXX-XXXXX-XXXXX`, and fails `E401`. **Configuring a trusted publisher on the package
changes nothing, because npm never looks.** `man npm-stage` names trusted publishing as one of the
flows that *lacks* proof-of-presence — the alternative staging replaces, not a layer beneath it.
They are alternatives: a human gate, or provenance. This repository takes the human gate.

**So an `E401` at `Stage core` means the token and only the token** — expired, revoked, or the
secret missing. Rotate it and re-run. It is never a trusted-publisher problem, and the hours are in
believing otherwise.

**The token is stage-only.** It carries no publish right at all, so a future edit swapping
`npm stage publish` for `npm publish` fails loudly rather than shipping to consumers unreviewed.
That is what makes *nothing automated reaches a consumer* structural rather than conventional. It
expires: rotation is revoke, reissue with the same settings, `gh secret set NPM_TOKEN`. Nothing in
the repository changes, so no commit and no release are needed.

*(Lived 2026-09-15, publishing `0.1.0-alpha.2`. Six faults in one attempt, three of them chasing an
authentication error that had no authentication cause. Every one was a premise this file or*
`release.yml` *stated confidently and nobody had executed.)*

---

## How a release is cut

A release runs on a **tag** matching `v*`, or on a hand-started `workflow_dispatch`. Nothing else
triggers it, and it is a separate file from `ci.yml` for that reason — `ci.yml` runs on every push
to `main` and on every pull request, and a release living in it would attempt one on both.

The workflow, in order:

1. Checks out, enables corepack, installs with a frozen lockfile.
2. **Builds**, **typechecks**, runs **`pnpm test`** and **`pnpm cucumber`**.
3. **Packs both packages, once.** Every step after this reads those same two files.
4. **Smokes them in a clean room** — installs the tarballs into a directory holding nothing else of
   this repository, outside the workspace, and starts the command there.
5. **Stages core, then the CLI**, with `npm stage publish`.

Then it stops. **A staged version is not a released one.**

### The operator promotes

`npm stage publish` puts a version on the registry in a staged state. Consumers cannot install it
until a person promotes it, and promotion takes a **stage-id** — never a package spec:

```
npx -y npm@latest stage list
npx -y npm@latest stage approve <stage-id>
```

`stage list` prints the id, package, version, dist-tag and a **status**. A freshly staged version
reads `validating` for a few moments before it reads `staged`; approve it then.

**`npm stage approve <package>@<version>` is not a form of this command.** It fails with
`stage-id must be a valid UUID`, which reads like a bad paste rather than a wrong shape.

**`npm stage` is newer than the npm on most machines, and that failure reads as a typo rather than a
version.** An older local npm answers `Unknown command: "stage"`. Node 24 bundles 11.19.x, which has
it, and that is why `release.yml` pins Node 24 rather than 22. `npx -y npm@latest` sidesteps a
global upgrade and reads your existing `~/.npmrc`, so your login carries. If you are not logged in,
`stage list` answers `E401` — run `npx -y npm@latest login` first.

**Approving prompts for proof of presence.** npm prints a URL, you authenticate in a browser, and
only then does the version publish. That cannot use an identity minted for a workflow run, so there
is no automating it — which is the property, not the inconvenience. Promoting from the package's
page on npmjs.com does the same thing by the same rule.

**A releaser who stages and walks away has not released.** Both packages need promoting, and core
needs promoting **first**: the CLI's packed manifest names core by a concrete version, so between
the two promotions `npm i spec-controller` resolves an engine nobody can fetch.

---

## What cannot be taken back

**Staging is the recoverable half. Promotion is not.**

- A **staged** version that should not go out is simply never approved.
- A **promoted** version cannot be recalled. npm's unpublish window does not undo it: whether or not
  you unpublish inside the window, **that version number and that package name are burned** — npm
  will not let anyone republish them, you included.

So the question to answer before typing `npm stage approve` is not "can I fix this later". It is
"is this the artefact". The clean-room smoke in step 4 above exists because the answer used to be
unknowable from inside the workspace: everything here resolves through the workspace manifest, and
npm *replaces* that manifest's `exports` map with `publishConfig.exports` wholesale at publish
time. The two readings differ nowhere except inside an installed tarball.

---

## Versions and pinning

Both packages are **semver**, and both are on `0.x`.

### This repository pins spec-controller, and that pin is where a bump starts

`package.json` at the workspace root carries `spec-controller` as an **exact published version** in
`devDependencies`, and the root `spec-controller` script is the bare binary name — so `pnpm
spec-controller …` runs the *installed* package. Both `ci.yml` steps that invoke the tool (`Corpus
tags` and `Self-reconciliation balance`) go through it, which is what makes this repository an
ordinary adopter of its own product rather than a special case (`3F-3105`).

**That pin is the single declaration of which reader judges this tree.** There is no second
"minimum readable version" banked anywhere, deliberately: a second spelling of the same fact agrees
with the first only until somebody edits one of them.

**When the model moves and the pinned reader can no longer read the tree**, the cure is the stage0
bump in *Releasing while the self-reconciliation is red* below — publish from the branch, promote,
bump the pin in the same review. The pinned reader says so itself: handed a flag its version does
not accept, it names its own version and tells you to bump the pin (`@SCN-SLF-008`).

**Never widen the pin to escape a skew.** A range or a dist-tag would make the red go away by
making the reader unpredictable, which is the failure this arrangement exists to end — and
`@SCN-SLF-009` reds on any specifier that is not one exact version.

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

**A prerelease cannot be staged or published without `--tag`.** npm refuses it outright: *"You must
specify a tag using --tag when publishing a prerelease version."* `release.yml` derives the tag from
each package's own manifest rather than hard-coding one — the prerelease identifier becomes the
dist-tag, a stable version becomes `latest`:

```
0.1.0-alpha.2 -> alpha    1.0.0-beta.3 -> beta    2.0.0-rc.1 -> rc    0.1.0 -> latest
```

A hard-coded `--tag alpha` would stage the first stable release under `alpha`, which is a silent
fault with no guard.

**`latest` is never a prerelease.** While these packages have no stable release the documented
install line is:

```
npm i spec-controller@alpha
```

Do not hand-move `latest` onto a prerelease to make the bare install work; it moves on its own when
`0.1.0` publishes.
---

## The release path asks nothing about this repository

`release.yml` gates on what says **this artefact is sound**: the build, the typecheck, both suites,
and the clean-room install of the packed tarballs. It runs **neither the self-reconciliation nor
`pnpm verify`**, and that is a rule rather than an oversight:

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
- **A lapsed cron blocks a release.** `SCN-FIT-002` prints a number a **scheduled nightly sweep**
  leaves behind. `ci.yml` fetches that record; the release path has no equivalent, so on a runner
  starting with a cold evidence root that row's own step reds and the job dies before it packs
  anything. That was measured, on a real run, before it was removed.

**The residual, stated rather than hidden.** A tag can be cut from any commit, so the release path's
rigour is the tag-cutter's discipline plus the workflow's own gates. Repository bars are `ci.yml`'s
and are discharged on every merge to `main`: a tag cut from `main` has already passed all of them; a
tag cut from an **unmerged branch** has not — which is exactly the case the next section is about.
What bounds it is that nothing merges by this route. `main` still requires the whole ladder, the
self-reconciliation included.

`@SCN-REL-004` in `features/release.feature` holds this rule, and holds it by putting the release's
whole gate list to a run with a cold evidence root — one the reconciliation and the fitness axis both
refuse — and watching every gate the release states pass it.

---

## Releasing while the self-reconciliation is red

This is the hatch the rule above exists for: Rust's stage0 bump, in this repository's terms. Use it
when a change to the model means the **pinned published** spec-controller can no longer read this
tree, so the self-reconciliation reds on the very branch that fixes it.

1. **The model change lands on a branch.** CI reds at `Self-reconciliation balance`, naming the skew.
2. **Cut a prerelease tag from that branch** — `v0.1.0-alpha.N`. The release workflow stages both
   packages. It never asks the self-reconciliation anything, so the red does not stop it.
3. **Promote the staged versions**, core first, with `npm stage list` then
   `npm stage approve <stage-id>` (see *The operator promotes*). Until you do, nothing has changed
   for anybody.
4. **Bump the pin on the branch**, in the same review, to the version you just promoted.
5. **CI greens** — the new pinned reader can read the tree. The branch merges.

Step 4 is what makes step 2's tag honest: the prerelease exists to be pinned, and a branch that
staged one without bumping to it has published a version nothing uses.
