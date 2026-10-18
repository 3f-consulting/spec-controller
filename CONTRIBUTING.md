# Contributing to spec-controller

## Build and test

You need Node ≥ 22 and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test        # unit tests (Vitest)
pnpm cucumber    # integration and end-to-end scenarios (Cucumber)
```

CI runs more than these, including mutation testing, the lint gates and the reconciliation of this repository's own scenarios. `.github/workflows/ci.yml` is the full list.

## Make a change

Open a pull request against `main`. It merges when CI is green.

A push to `main` that changes only `doc/`, `README.md`, `CONTRIBUTING.md` or `LICENSE` runs no CI, so run `pnpm docs:check` before making one. It runs every documentation check CI runs, each from the same package script, and exits non-zero if any fails. It needs [Vale](https://vale.sh) on your `PATH`, at the version `.github/workflows/ci.yml` installs.

## Report a problem

Open an issue at https://github.com/3f-consulting/spec-controller/issues. Say what you ran, what you expected and what happened, and attach the report if `balance` produced one.
