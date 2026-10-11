# spec-controller's ubiquitous language

The words spec-controller's code, scenarios, report and help use, and what each means. A review checks spec-controller against this file. It has two parts: the **domain terms** that are spec-controller's own, defined here, and the terms **borrowed from the methodology**, which are named here and defined in the 3F canon.

Each definition below restates what spec-controller already says in [`how_to_use.md`](./how_to_use.md), its feature files or its report. If the two ever disagree, the behaviour wins and this file is corrected.

## Domain terms

### The commands and the run

| Term | Meaning |
|---|---|
| `balance` | The command that reconciles the Gherkin scenarios against the test and CI evidence and writes the Evidence Reconciliation. It is a gate: an out-of-balance run exits `1`. |
| `allocate` | The command that prints the next `@SCN` code for a feature part: one past the highest the repository has ever carried. |
| host modifier | A flag that goes before the command (`--store`, `--run-id`). It needs a command, or `--help`, after it. |
| re-render | `--render-from-json`: Markdown rebuilt from a saved Evidence Reconciliation JSON, with no reconciliation and no live inputs. |
| `--exit-zero` | The same report, exiting `0` on an out-of-balance or scenario-code-error verdict. The on-ramp before gating. |
| run verdict | The whole run's headline and its exit code: BALANCED, OUT-OF-BALANCE, UNSOUND, PENDING, NOTHING TO RECONCILE or SCENARIO CODE ERRORS. |
| verdict ladder | The order in which the run verdict is decided: nothing to reconcile (`5`), unsound (`4`), scenario code errors (`1`), out of balance (`1`), then pending under `--strict` (`3`). |
| nothing to reconcile | The ledger carries no Scenario Reconciliation at all, so the run has no basis for a verdict (exit `5`). |
| usage error | A malformed invocation, refused before anything runs (exit `2`). |
| retired flag | A flag refused as retired, naming what replaced it. |
| target | The repository being reconciled. `--target` names it in the report's provenance. |
| provenance | The report's header recording what was reconciled (the target, its source SHA, the tool SHA and the input paths), so a reconciliation is reproducible and attributable. |
| source SHA | The target's commit, by default its resolved `HEAD`. |
| tool SHA | The tool's own identity, taken from its install, never from the target. |
| run integrity | The report section that surfaces broken evidence as a harness failure and stamps the run unsound. |
| proof never ran | A behaviour whose proof was never exercised in the run. |
| Test volume | The report's balancing identity: every evidence observation lands on a scenario, a phantom scenario or the suspense scenario, and the three counts sum to the total. |

### Fitness functions in CI

| Term | Meaning |
|---|---|
| discovery scope | The CI workflows `--ci` names. Every step of every job in them is read. |
| candidate | A step in the discovery scope that is not a declared runner, the reconciler or a non-check. Every candidate is a fitness function. |
| uncited fitness function | A candidate whose step cites no fitness scenario. |
| step accounting | The report's tally of the steps read, by disposition (candidates, runners, the reconciler, excluded), so every step read is accounted for. |
| check step | The CI step that already runs a check, carrying the check's `@SCN` as its `id:`. |
| citation | The `@SCN` on a check step's `id:`: a citation of the scenario, never a definition of the check. |
| step record | The CI run's own record of what each of its steps did: the `toJSON(steps)` dump `--ci-steps` reads. |

### The run store

| Term | Meaning |
|---|---|
| store | The root `--store` names. It turns any run into a stored run, and spec-controller holds no opinion on where it lives. |
| stored run | A run written to `<store>/<target>/<run-id>/`: its reports plus a `run.yaml` manifest. |
| run directory | `<store>/<target>/<run-id>/`. |
| run id | The stored run's name, by default an ISO-8601 UTC timestamp. |
| run manifest | The `run.yaml` a stored run stamps. It records only a run that wrote its report. |

### Configuration

| Term | Meaning |
|---|---|
| `specController` block | The block in a target's `package.json` holding `runners`, `notChecks` and `deferralTags`. |
| `runners` | The declared behavioural runners, keyed by the four canon tiers and nothing else. A value is a runner's name, or `null` to say the tier has none. |
| `notChecks` | The target's list of steps that are neither runners nor checks, each written `<workflow file>:<job id>:<step name>` and matched exactly. Such a step is reported as excluded. |
| configuration not read | A `specController` entry the run could not use: one of the wrong kind, read as absent, or a key the block does not read. Each is named on the report, and neither refuses the run. |
| deferral tag | A tag that defers every evidence obligation on its scenario to a Pending Item. The built-in set is `@wip`, `@ignore`, `@skip`, `@todo` and `@pending`, and `deferralTags` extends it. |
| `@<check>pending` | A tag deferring only that one quality check's obligation on its scenario. |

### Scenario codes

| Term | Meaning |
|---|---|
| feature part | The `<FFF>` in `@SCN-<FFF>-<NNN>`: two to five uppercase letters or digits. |
| header code | A feature file's own code tag, the feature part its scenarios' codes are filed under. |
| account class | A feature file, as the class its scenarios' codes are filed under. |
| by-feature cut | The report's grouping by feature part, which a misfiled code falsifies. |
| shared `@SCN` code | A code two scenarios carry. They reconcile as one Scenario Reconciliation. |
| known part, unknown part | A part is known when a feature file in `features/` is headed with it. `allocate` refuses an unknown part unless `--new` is given. |
| highest seen | The highest code `allocate` found for a part, with where it was seen. |
| excluded `@SCN` occurrence | An `@SCN` id seen outside a tag, which is reported and excluded. |
| Gherkin parse gate | The corpus reader's refusal of a corpus the Gherkin parser rejects. |

### Terms in use that this file does not yet define

These appear in spec-controller's text, but nothing there defines them yet: **converted** and **unconverted** fitness function; **corpus** and **corpus census**; **Summary views**; **Out-of-balance by feature**; **Fitness evidence obligations** (as a report section); **harness**; and **term** and **pair** in the term-spelling feature.

## Borrowed from the methodology

Named here, defined in their home. The index of homes is `ubiquitous-language-index.md` in the 3F canon, and each term's home is named below.

- **The evidence model** (`double-entry-manifesto.md`):
  - Evidence Reconciliation, Ledger, Scenario Reconciliation, Quality Check Reconciliation, Summary, Balancing off;
  - Evidence Obligation, Evidence Observation, Test Specification, Attribution;
  - Outcome and its handles; Verdict (balanced, out-of-balance); Reconciling item; Pending Item; Watermelon;
  - Scenario, phantom scenario, suspense scenario;
  - scenario code errors (`no-scn-code`, `foreign-scn-code`, `no-feature-code`, `duplicate-feature-code`); Unsound; `--strict`.
- **Quality checks** (`technical-design/quality-checks.md`):
  - quality check;
  - the tiers `@unit`, `@integration`, `@e2e`, `@performance` and `@fitness`;
  - fitness function; static check; dynamic check;
  - the adoption states `new-client`, `annotated` and `conformant`;
  - runner; the reconciler; `ci-run-time`; threshold.
- **Evidence layers and codes** (`evidence-manifesto.md`): the `@SCN-<FFF>-<NNN>` scenario ID; feature code; the `@wip` and `@<quality-check>pending` deferral scopes.
