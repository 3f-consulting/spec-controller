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

## Report a problem

Open an issue at https://github.com/3f-consulting/spec-controller/issues. Say what you ran, what you expected and what happened, and attach the report if `balance` produced one.
