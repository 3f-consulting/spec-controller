# Contributing to spec-controller

## Build and test

You need Node ≥ 22 and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm build       # both packages
pnpm typecheck
pnpm test        # unit tests (Vitest)
pnpm cucumber    # integration and end-to-end scenarios (Cucumber)
```

## Make a change

Open a pull request against `main`. It merges when CI is green.

Put a helper that more than one unit test file uses in a `*.test-utils.ts` file beside them. Do not copy it into each file. No check finds a copied helper; review does.

Before a change that touches only [`doc/`](doc/), [`README.md`](README.md), [`CONTRIBUTING.md`](CONTRIBUTING.md) or [`LICENSE`](LICENSE), run `pnpm docs:check`. It runs every documentation check and exits non-zero if any fails. It needs [Vale](https://vale.sh) on your `PATH`, at the version [`.github/workflows/ci.yml`](.github/workflows/ci.yml) installs.

## Report a problem

Open an issue at https://github.com/3f-consulting/spec-controller/issues. Say what you ran, what you expected and what happened. If `balance` produced a report, attach it.
