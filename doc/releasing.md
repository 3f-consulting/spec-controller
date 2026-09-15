# Releasing spec-controller

Two packages go out together: `@3f-consulting/spec-controller-core`, the pure engine, and
`spec-controller`, the command that resolves it. A release sends both, core first, from one run of
`.github/workflows/release.yml`.

**Read the first section before your first release.** The trap in it is not a code fault and does
not read like a configuration fault either.

---

## Before your first release: npm never validated the trusted publisher

This repository publishes over OIDC. There is no `NPM_TOKEN`, no repository secret, and no
`--provenance` flag — the workflow mints an identity per run under `id-token: write`, and npm's
trusted-publisher configuration for each package says which workflow it will believe.

**npm does not validate that configuration when you save it.** A wrong organisation, a wrong
repository name, a wrong workflow filename — all three are accepted silently at npm's form, and the
first thing that notices is the first staging attempt. What you see then is an **authentication
failure**, in a step that runs `npm`, in a job whose earlier steps were all green:

> `npm error code E404` / `npm error need auth`

That reads like a code fault and it is not one. **Suspect the configuration first and the code
second.** Check, on npmjs.com, for each of the two packages:

- the organisation is `3f-consulting` and the repository is `spec-controller`;
- the workflow filename is exactly `release.yml` — not a path, not `Release`, the filename;
- the environment field is empty, because this workflow declares none.

npm's publish errors lie about their cause in both directions: an `E404` on a `PUT` means
*unauthenticated*, not *no such package*.

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
until a person promotes it:

```
npm stage approve <package>@<version>
```

**That command is newer than the npm on most machines, and the failure reads as a typo rather than
as a version.** `npm stage` is not in npm 11.5.1 — the version OIDC trusted publishing needs — and
arrived later; Node 24 bundles 11.19.x, which has it, and that is why `release.yml` pins Node 24
rather than 22. An older local npm answers `Unknown command: "stage"`, which looks like a wrong
command rather than an old one. Two ways through, neither requiring a global upgrade:

```
npx -y npm@latest stage approve <package>@<version>
```

`npx` reads your existing `~/.npmrc`, so your login carries. Or promote from the package's page on
npmjs.com, which may be the easier route anyway given promotion needs proof of presence.

*(Lived 2026-09-15, promoting `0.1.0-alpha.2`: the tag pushed, the workflow staged, and the promote
stopped on a local npm two commands short of the one CI had been pinned to for this exact reason.)*

or from the package's page on npmjs.com. **Promotion needs proof of presence and cannot use an
identity minted for a workflow run**, so there is no automating it — which is the property, not the
inconvenience. "Allow npm publish" is unchecked on both trusted publishers, so a workflow attempting
an ordinary `npm publish` is **refused by the registry** and nothing arrives at all.

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
3. **Promote the staged versions**, core first, with `npm stage approve` or from npmjs.com. Until
   you do, nothing has changed for anybody.
4. **Bump the pin on the branch**, in the same review, to the version you just promoted.
5. **CI greens** — the new pinned reader can read the tree. The branch merges.

Step 4 is what makes step 2's tag honest: the prerelease exists to be pinned, and a branch that
staged one without bumping to it has published a version nothing uses.
