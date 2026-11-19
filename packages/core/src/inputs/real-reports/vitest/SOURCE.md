# Vitest's own JSON reports

The report here is one Vitest's JSON reporter wrote, copied from Vitest's own repository. The readers' tests read it as a report in Vitest's shape.

| | |
|---|---|
| Tool | Vitest |
| Version | 5.1.1, the version in [`packages/vitest/package.json`](https://github.com/vitest-dev/vitest/blob/45d199c586bff37bac3cb653ab37f85ef1e3537a/packages/vitest/package.json) at the commit |
| Repository | [vitest-dev/vitest](https://github.com/vitest-dev/vitest) |
| Commit | [`45d199c586bff37bac3cb653ab37f85ef1e3537a`](https://github.com/vitest-dev/vitest/tree/45d199c586bff37bac3cb653ab37f85ef1e3537a) |
| Licence | MIT, its text in [LICENSE](LICENSE), copied from the same commit |

## What was copied

| File here | Copied from |
|---|---|
| [json-reporter.json](json-reporter.json) | [`test/e2e/test/reporters/__snapshots__/reporters.test.ts.snap`](https://github.com/vitest-dev/vitest/blob/45d199c586bff37bac3cb653ab37f85ef1e3537a/test/e2e/test/reporters/__snapshots__/reporters.test.ts.snap), the snapshot `json reporter 1` |

## How the report was lifted out

Vitest's test `json reporter`, in [`test/e2e/test/reporters/reporters.test.ts`](https://github.com/vitest-dev/vitest/blob/45d199c586bff37bac3cb653ab37f85ef1e3537a/test/e2e/test/reporters/reporters.test.ts), runs Vitest's `JsonReporter` over a fixed set of test modules, parses what it writes and stores the parsed report as a snapshot. The snapshot holds the report in the snapshot's own quoting: a trailing comma after each last member, and line breaks written raw inside strings.

The copy takes the lines between the snapshot's opening and closing backticks and undoes that quoting alone: each trailing comma is dropped and each raw line break inside a string is written as `\n`. The result is parsed as JSON and written with two-space indentation. Every member, value and member order is the snapshot's.

The snapshot file holds five other JSON reporter snapshots: `json reporter (no outputFile entry) 1` and the four `json reporter with outputFile … 2`. Each holds the same report, line for line, so none is copied a second time. The other snapshots in the file are JUnit, TAP and messages, not JSON reports.
