# cucumber-js's own JSON reports

The reports here are ones cucumber-js's JSON formatter wrote, copied from cucumber-js's own repository. The readers' tests read each as a report in Cucumber's shape.

| | |
|---|---|
| Tool | cucumber-js |
| Version | 13.3.0, the version in [`package.json`](https://github.com/cucumber/cucumber-js/blob/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7/package.json) at the commit |
| Repository | [cucumber/cucumber-js](https://github.com/cucumber/cucumber-js) |
| Commit | [`b023a5cfccdf9317648c35ba0ccbd12a320d5cd7`](https://github.com/cucumber/cucumber-js/tree/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7) |
| Licence | MIT, its text in [LICENSE](LICENSE), copied from the same commit |

## What was copied

Each file is copied from [`features/fixtures/formatters/`](https://github.com/cucumber/cucumber-js/tree/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7/features/fixtures/formatters) at the commit: every JSON formatter fixture there, six in all.

| File here | Copied from |
|---|---|
| [failed.json](failed.json) | [`failed.json.ts`](https://github.com/cucumber/cucumber-js/blob/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7/features/fixtures/formatters/failed.json.ts) |
| [passed-rule.json](passed-rule.json) | [`passed-rule.json.ts`](https://github.com/cucumber/cucumber-js/blob/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7/features/fixtures/formatters/passed-rule.json.ts) |
| [passed-scenario-outline.json](passed-scenario-outline.json) | [`passed-scenario-outline.json.ts`](https://github.com/cucumber/cucumber-js/blob/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7/features/fixtures/formatters/passed-scenario-outline.json.ts) |
| [passed-scenario.json](passed-scenario.json) | [`passed-scenario.json.ts`](https://github.com/cucumber/cucumber-js/blob/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7/features/fixtures/formatters/passed-scenario.json.ts) |
| [rejected-pickle.json](rejected-pickle.json) | [`rejected-pickle.json.ts`](https://github.com/cucumber/cucumber-js/blob/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7/features/fixtures/formatters/rejected-pickle.json.ts) |
| [retried.json](retried.json) | [`retried.json.ts`](https://github.com/cucumber/cucumber-js/blob/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7/features/fixtures/formatters/retried.json.ts) |

The folder's `*.message.json.ts` files are not copied: they hold cucumber-js's message stream, not its JSON report.

## How each report was lifted out

Each fixture is a module whose `module.exports` is the report, written as a JavaScript literal. cucumber-js's scenarios in [`features/formatters.feature`](https://github.com/cucumber/cucumber-js/blob/b023a5cfccdf9317648c35ba0ccbd12a320d5cd7/features/formatters.feature) run cucumber-js with its JSON formatter and require what it writes to equal that export. Before comparing, they set each step's duration to 0 and cut each feature's URI, each step's match location and each error message down to its first line, relative to the run's folder. A fixture is therefore what the formatter wrote, with those values normalised.

The copy evaluates the module and writes its export as JSON with two-space indentation. Every member, value and member order is the module's. The report from `rejected-pickle.json.ts` is the empty list, as cucumber-js writes for a run whose one scenario was filtered out.
