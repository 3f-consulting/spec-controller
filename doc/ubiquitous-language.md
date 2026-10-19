# spec-controller's ubiquitous language

The words spec-controller's code, scenarios, report and help use, and what each means. A review checks spec-controller against this file. It has two parts: the **domain terms** that are spec-controller's own, defined here, and the terms **borrowed from the methodology**, which are named here and used as the methodology spec-controller implements defines them.

Each definition below restates what spec-controller already says in [`how_to_use.md`](./how_to_use.md), its feature files or its report; the evidence model's definitions also state the reconciliation model those follow. If the two ever disagree, the behaviour wins and this file is corrected.

**One vocabulary across every surface**: code identifiers, JSON keys, Markdown headings, and a database schema if there ever is one. A machine key is language you read as much as prose is; it gets no private dialect. **One term, three forms — the form follows the surface, the word never changes, and a term from this file is `backticked` wherever it appears.** Prose spells it out (`static check`, `phantom claim`); a handle hyphenates it (`static-check`, `phantom-claim`, `quality-check`, `both-missing`); a code identifier camel-cases it (`staticCheck`). A handle is not a licence to abbreviate: `check` is not a short `static-check`, it is a different word.

An evidence-model term's **Double-check** entry names the words seen standing in for it. A review or a vocabulary sweep checks each use of those words by its sense: renamed to the term where it means the term, kept where it means something else. It is never a gate and never closed; a newly found synonym is added to it.

## Domain terms

### The evidence model

Correctness is the agreement of two independent records: the `Evidence Obligations` written in the test specifications (the debit side) and the `Evidence Observations` seen when those tests run against the real code (the credit side). Each term carries the bookkeeping term it borrows, which explains the analogy.

#### The subject

| Term | Meaning | Bookkeeping term | Double-check |
|---|---|---|---|
| `Behaviour` | One thing the **`Application code`** should do, stated so it can be proved. A `scenario` describes a `behaviour`; its `Evidence Obligations` are the `Quality Checks` it raises; its `Evidence Observations` exercise it against the real code. `Behaviour` is what the **`Test Specification`** exists to describe — the reason a `scenario` is written at all, and the thing `broken` says was never exercised. | Transaction — the real-world event an entry records | feature; functionality |
| `Application code` | The system under test — the reality that `evidence observations` evidence. On the credit side, but *not an entry itself*. | *(the subject the books describe)* — the real-world thing the accounts account for | |
| `Document specification` | Written intent: a document saying what the **`Application code`** should do, its behaviour and its fitness — a manifesto, a proposal, a technical design. Needed to make intent clear enough to build from, and never sufficient: a document is not evidence. Its life is meant to be short; once **`executable specifications`** express it, they are the current truth. `balance` never reads one, so whether the checks say what the document says is judgement, not reconciliation. | Source documents — the contracts and invoices the entries are vouched against | spec, the spec (unqualified, where it could mean either kind) |
| `Executable specification` | A quality check that states what the application must do and is run against it: a scenario, a unit test, a fitness function. The preferred kind of specification, because running it is the evidence. The **`Test Specification`** is the collection of them. | *(the entries themselves)* — what the books record | living documentation (the field's other name, kept as a synonym); the Gherkin spec |

#### The `claims` — a scenario, a phantom claim or an unnamed claim

| Term | Meaning | Bookkeeping term | Double-check |
|---|---|---|---|
| `Claim` | What one row of the `ledger` is about: a statement the evidence is weighed against. A claim is one of three kinds: a **`scenario`**, written in a feature file; a **`phantom claim`**, named by evidence and written nowhere; or the **`unnamed claim`**, for evidence that names no claim. Every `evidence observation` lands on exactly one claim, and each claim has one **`Claim Reconciliation`**. | *(the thing an account is opened for)* — the subject an account is kept about | real or invented scenario; invented scenario |
| `Scenario` | A single **`behaviour`** written in a feature file — a `Scenario:` with its `@`-tags and its `@SCN` id. It describes one `behaviour`; each `quality-check` it names raises one **`evidence obligation`**; its `@SCN` is the code an **`evidence observation`** cites to post against it. A `scenario` is a post in the debit journal. A `scenario` is the one kind of **`claim`** that is written down: a cited id with no `scenario` behind it is a **`phantom claim`**, and evidence observations that cite nothing land on the **`unnamed claim`**. Neither is a `scenario`, and the collection of rows is never `scenarios`. A fitness function's scenario is a `scenario` (an `@fitness` scenario), not a fourth kind. | *(the thing an account is opened for)* — the subject an account is kept about | declared (for a real `scenario`); fitness scenario (as a kind of scenario) |
| `Phantom claim` | A claim the evidence names and nobody wrote: a cited `scenario` id with no `scenario` behind it — the claim a `Claim Reconciliation` is kept for when an `evidence observation` cites a `scenario` that does not exist (`outcome` *cites-unknown-scenario*) — one per fabricated id, always out-of-balance. | Posting to a non-existent account — a posting naming an account that does not exist | ghost (as a top-level kind); undeclared (for a fabricated scenario); phantom scenario |
| `Unnamed claim` | The placeholder claim a `Claim Reconciliation` is kept for when its `evidence observations` name no claim: they cite *no* `scenario` (`outcome` *cites-no-scenario*) or never ran (`outcome` *broken*) — one bucket, always out-of-balance. | Suspense account — an account holding postings that match no real account | unattributed (as a top-level kind); suspense scenario; observed claim |

#### The debit side

| Term | Meaning | Bookkeeping term | Double-check |
|---|---|---|---|
| `Test Specification` | The **`executable specifications`** taken together: feature files (`@`-tags), step definitions, test code — the record of the **behaviours** to be proved, and the `Evidence Obligations` for each. | Debit journal — the book of original entry for debits | |
| `Evidence Obligation` | A `Scenario` raises one for each `Quality Check` it names, to be met by `Evidence Observations`. These are the `@`-tags on the `Scenario`: the behavioural checks `@unit`, `@integration`, `@e2e`, `@performance`, and `@fitness`. | Debit — the entry for what an account requires | demand, declare, require, insist, expect — every inflection (demanded, demander, declared, undeclared, required, requirement, …); obligation (bare); the `Declared` prefix |

#### The credit side

| Term | Meaning | Bookkeeping term | Double-check |
|---|---|---|---|
| The run reports | Raw vitest / cucumber output — reality's record. | Credit journal — the book of original entry for credits | |
| `Static Check` | A source code check run over the actual code — an ESLint rule, a type check, a custom script. It is a fitness function assessed *statically* — as opposed to one assessed by running the suite (`coverage`, `mutation`, `ci-run-time`). Its run produces one **`evidence observation`** for its `quality-check`. `Static check` names only this source-reading subset, never fitness functions in general. **How its evidence posts:** like every evidence observation, a fitness function's — static or run — **cites an `@SCN`**, and where it lands is the ordinary three-way answer, not a special case. Cites the `@SCN` of a **real `scenario`** that raises the evidence obligation → it posts there. Cites an `@SCN` **no `scenario` carries** → a **`phantom claim`** (`outcome` *cites-unknown-scenario*). Cites **nothing** → the **`unnamed claim`** (`outcome` *cites-no-scenario*). Surfaced either way, never omitted. | *(the instrument that produces a credit)* — what the credit journal records the running of | static guard, `staticGuard`, `<static-guard>`; guard (bare noun, for a fitness function); check (bare) |
| `Dynamic Check` | A fitness function assessed by **running** — the code, or a measurement of a run: `ci-run-time`, `coverage`, `mutation`, `crap`, `self-balance`. The other kind of fitness function besides a `static check`; neither names the class as a whole. Its evidence posts exactly as a `static check`'s does. Not Ford, Parsons and Kua's *dynamic* fitness function, which names a shifting threshold (*Building Evolutionary Architectures*, ch. 2, *Result: Static Versus Dynamic*); here *static* and *dynamic* say how the evidence is obtained, as in static and dynamic analysis. | | static check (for a fitness function assessed by running) |
| `Evidence Observation` | An observed piece of evidence — a test or a fitness function has both run and is `attributed` to a `scenario`. | Credit — the entry for what an account is provided | observation (bare); credit, credit side (in a sentence that names no debit); supply; execution; declared (for evidence) |
| `Freshness` | An `Evidence Observation`'s validity window. An `Evidence Observation` is valid only within a window of time relative to the run being reconciled: evidence proves the code *as it is now*, so an evidence observation from an earlier state is not evidence for this one. For every check run **in the push build** — behavioural, statically-assessed, and the per-push measured checks (`ci-run-time`) — the window is degenerate, **this build**, because the suite regenerates its reports in the same run, so `freshness` is implicit and never surfaces. A **scheduled** fitness function — one too slow for the push path, run on a cadence off it (a nightly `mutation`, a slow `@performance` or `@e2e`) — carries the same `Evidence Obligation` with a **wider, explicit** window: its cadence. An `Evidence Obligation` whose only `Evidence Observation` falls outside its window has none admitted, so it reconciles **`missing`**, exactly as if none ran — a scheduled check that silently stops running therefore reds on its own once its window lapses, and one that ran-and-failed reads `failing` on the same books. `Freshness` governs whether an `Evidence Observation` is **admitted**, not how it reconciles: it adds no `Outcome`, and it puts no clock inside the reconciliation — "now" is the run's own instant, an input, so a reconciliation stays a pure function of its records. | Cut-off — a transaction counts only in the period it belongs to | |

#### Posting

| Term | Meaning | Bookkeeping term | Double-check |
|---|---|---|---|
| `Attribution` / `attributed` (by `@SCN`) | Tying an `evidence observation` to its `scenario`. A debit self-posts by living in the `scenario`. **One rule: the evidence observation cites.** An `evidence observation` cites the `@SCN` of its `scenario` — a behavioural test cites its stepped `scenario`; a fitness function's run cites its own. One evidence observation names one `scenario` and posts to exactly one `Claim Reconciliation`. **One that cites more than one `scenario` credits none of them** and posts to the unnamed claim, naming each code, whatever the runner: no reader picks one. One that posts to no real `scenario` is **phantom** (its `@SCN` names no real `scenario`) or **unnamed** (it cites nothing). How it cites is set out under *How an evidence observation cites*, below. | Posting — recording a journal entry into its account | name-match, name-matched (posting) |
| `Quality Check` | A **`quality-check`** is the key an evidence obligation is raised by and its evidence matched on. There are five, flat peers: the behavioural `unit`, `integration`, `e2e` and `performance`, and `fitness`. A scenario names its quality checks by its tags and raises one `Evidence Obligation` per tag. A **behavioural** check is an example of a `behaviour` on a stepped `scenario`. A **fitness** check is a whole-system property against a `threshold`, and **one `@fitness` scenario is one check**: it is identified by its `@SCN` and described by its title, and several fitness functions are several `scenarios` — as the CI pipeline's two timed suites are two. Nothing classifies a fitness function further: no characteristic word, no roster, no roll-up. The behavioural/fitness grouping lives in the model and the docs — **never in the tag**: no `@behavioural=unit`, no `@fitness=complexity`. Whether a fitness function is assessed by **reading** the source (a **`Static Check`** — ESLint, `tsc`) or by **running** the suite (coverage, mutation, CI run time) is a property of the check, not a difference in how its evidence posts: every evidence observation cites its `@SCN` (see `Attribution`). The CI pipeline timing its own suites is the prototype of the fitness shape — an `@fitness` scenario, the measured time citing its `@SCN` — never a harness carve-out and never named around to dodge reconciliation. | *(the sub-account coordinate)* — the key an entry is classified and matched by | runtime (for the behavioural family `@unit`, `@integration`, `@e2e`, `@performance`); kind, level, (kind, level) — the two-axis grid; `lint` (as a catch-all for fitness functions); characteristic (a word classifying a fitness function); `@fitness=<check>` or any group-prefixed check tag |
| `Ledger` | The `evidence obligations` (debits) and `evidence observations` (credits) organised by **`claim`**, keyed by `quality-check` — this is where reconciliation happens. The **`Evidence Reconciliation`** is the whole — all `Claim Reconciliations`; the `ledger` is the per-scenario evidence grid *within* it. The report renders the `Evidence Reconciliation`; only its grid displays the `ledger`. This distinction is the point of the term. **Every `evidence observation` posts to exactly one `Claim Reconciliation`, never to none.** An evidence observation that posts nowhere has vanished from the books — the fault the `ledger` exists to make impossible. Every evidence observation cites the `@SCN` of one `scenario` and posts there — behavioural or fitness alike; one citing no real `scenario` still posts, to a **`phantom claim`** or the **`unnamed claim`**. Posting is not classifying — an entry posts here whatever it later reconciles to, including nothing. | Ledger — the accounts with their posted debit and credit entries, by account | |

#### How an evidence observation cites

One form per runner, and nothing else. The `scenario`'s tag line (`@SCN-<FFF>-<NNN> @unit @e2e`) raises the `evidence obligations`; each `evidence observation` then reaches that `scenario` by the one form its runner's report can carry:

| `quality-check` | the evidence observation | the form that cites | example |
|---|---|---|---|
| `unit` | a Vitest assertion | a bracketed `[SCN-…]` in its `it` title, else in an enclosing `describe` title — the most specific wins | `describe("[SCN-<FFF>-<NNN>] a feature part whose highest live code …", …)` |
| `integration`, `e2e`, `performance` | the Cucumber report's run of the `scenario` | the `scenario`'s own `@SCN` tag, which the report carries | the same `@SCN-<FFF>-<NNN>` tag line, as Cucumber reports it |
| `fitness` | the CI step that runs the check, read on its `outcome` | the step's `id:` | `id: SCN-FIT-<NNN>` on the step, against `@fitness @SCN-FIT-<NNN>` |

**A citation form counts only when a reader is built for it.** A bare or `@`-prefixed code in a test title, a marker comment in a step-definition file, a code in any other comment, a Playwright spec or a k6 script is read by nothing, so it cites nothing: the evidence observation it was meant for posts to the **unnamed claim**. The three forms are the whole mechanism; the readers are `packages/core/src/lib/scnCitation.ts` (through `packages/core/src/parse/vitest.ts`), `packages/core/src/parse/cucumber.ts` and `packages/core/src/parse/ciStepRecord.ts`.

#### Reconciling

| Term | Meaning | Bookkeeping term | Double-check |
|---|---|---|---|
| `Balancing off` | Reconciling one `claim` — its `evidence obligations` against its `evidence observations`, `quality-check` by `quality-check` — into its `Claim Reconciliation`. | Balancing off — computing one account's balance | |
| `Quality Check Reconciliation` | A sub-row — one **`quality-check`**'s evidence reconciled within a `claim`; carries an **`outcome`**. | Sub-account — a subdivision of an account, balanced off on its own | sub-account; reconciled evidence obligation |
| `Outcome` | The eleven-valued result of a `Quality Check Reconciliation` — one thing in two representations: the **`outcome` handle**, the short machine name the code and the JSON carry (`missing`, `no-evidence-obligation`), and the `outcome` itself, the sentence the reconciliation asserts. The sentence is the valuable half, because it is checkably true or false of a case where the handle is only a label. Settle a dispute by asking whether the sentence is true of the case, never by arguing what the handle connotes. | *(whether a sub-account balances, and how)* — the balance-status of one sub-account | state; outcome tag (a `tag` is authored in a feature file; a handle is computed); the flat triad attributed / ghost / unattributed; `undemanded` (for `no-evidence-obligation`); uncoded (for `no-scn-code`) |
| `Claim Reconciliation` | A row — the evidence reconciled for one **`claim`**, `quality-check` by `quality-check`; carries a **`verdict`** and its **`reconciling items`**. Its claim is one of three kinds: a **`scenario`** (written in a feature file), a **`phantom claim`** (cited, but no feature defines it), or the **`unnamed claim`** (evidence citing nothing). The collection is the **`Claim Reconciliations`** — *never* `scenarios` or `claims`, since a row is the reconciliation of a claim, not the claim. | Account — the record for one thing that carries a balance | account; scenario balance; scenarios (for the collection); Scenario Reconciliation |
| `Verdict` | The **two-valued** roll-up of a `Claim Reconciliation`: *balanced* (every `quality-check` *satisfied*) or *out-of-balance* (any `reconciling item`) — never a third value. A `phantom claim`'s or the `unnamed claim`'s reconciliation is always out-of-balance; a `scenario` with neither `evidence obligation` nor `evidence observation` is out-of-balance via `both-missing` (one whose tests run untagged is out-of-balance via `no-evidence-obligation`), never a separate "empty" `verdict`. A **`Pending Item`** never affects the `verdict` — it is not a `reconciling item`. | Balanced / out of balance — an account whose two sides agree / don't | |
| `Reconciling item` | A `Quality Check Reconciliation` whose `outcome` is an exception — in three shapes: a debit-side exception (missing / failing / `watermelon` / no-scn-code), a credit-side exception (cites-unknown-scenario / cites-no-scenario / no-evidence-obligation / broken), or **neither** — a real `scenario` with no `evidence obligation` and no `evidence observation` (both-missing). | Reconciling item — a line explaining a difference between two records | |
| `Pending Item` | A **one-sided** `Quality Check Reconciliation` raised by a `<quality-check>pending` tag — deliberately deferred, so it raises **no `Evidence Obligation`**, so nothing reconciles. *Not* a `Reconciling Item` (not an error): it never flips the `verdict` and never fails the run — a disclosed IOU, surfaced so it can't sit owed forever. Because there is no `Evidence Obligation`, an `Evidence Observation` citing that `scenario` at a pending `quality-check` is `no-evidence-obligation` — exactly as when no `Evidence Obligation` was raised at all. | Memorandum entry / note — an item disclosed but not posted to an account | warnings (credit-side) |
| `Watermelon` | A passing `evidence observation` from a check that could not fail its job — its step or its job carries `continue-on-error`; the *`watermelon`* `outcome`. Green on the outside, and nothing behind it holds the build. It is read from the workflow file when no step record is supplied; with one, the step's own `outcome` answers the row, so a swallowed red reads *failing*. Neither route reads what the check examined, so a check over zero files that exits 0 is *satisfied*, not a watermelon. | | fabricated; green-but-fake |

#### The whole run

| Term | Meaning | Bookkeeping term | Double-check |
|---|---|---|---|
| `Evidence Reconciliation` | All `Claim Reconciliations` taken together — the whole reconciliation; the key concept the domain models, which the report renders. | Trial balance — the statement of all account balances | trial balance (kept as the bookkeeping root of the metaphor); Ledger (for the whole) |
| `Summary` | Totals: N `Claim Reconciliations`, X balanced, Y out-of-balance. | *(the totals — no distinct classic term)* — the aggregate of the trial balance | headline tallies |
| `Scenario code errors` | A whole-run section of the report listing faults in the scenario **codes** themselves: **`foreign-scn-code`** (a scenario's code names a feature other than the one it sits in), **`no-feature-code`** (a feature file carries no header code while its scenarios carry ids), **`duplicate-feature-code`** (two feature files claim one feature code), **`several-scn-codes`** (one `scenario` carries more than one `@SCN`, so — as on the credit side under `Attribution` — no reader picks one, and it raises its evidence obligations under none of them). It is **neither a `reconciling item` nor a roll-up of `verdicts`, and it reds the run on its own** — a run can be out of balance for a reason that is not any `scenario`'s `verdict`. The first three leave every posting unambiguous: what is wrong is the codes, not a `Claim Reconciliation`'s balance. A duplicated scenario code is deliberately **not** here — it stops its `Claim Reconciliation` reconciling, so it sits on the rows as `duplicate-scn-code`. | *(a fault in the chart of accounts, not in any account)* — the books cannot be read until the coding is fixed | chart of accounts; coding errors; uncoded (for `foreign-scn-code` or `no-feature-code`) |
| `Unsound` | A run carrying any `broken` item is **`unsound`** — a derived whole-run stamp (not an `outcome`): exit 4, the evidence could not be trusted to reconcile. | | |
| `--strict` | The run mode in which a **`Pending Item`** escalates to a failure — a deliberately-deferred IOU is not tolerated (Cucumber's `--strict`, ESLint's `--max-warnings 0`): exit 3. Without it a `Pending Item` never affects the `verdict` and never fails the run. | | |

### The commands and the run

| Term | Meaning |
|---|---|
| `balance` | The command that reconciles the Gherkin scenarios against the test and CI evidence and writes the Evidence Reconciliation. It is a gate: an out-of-balance run exits `1`. |
| `allocate` | The command that prints the next `@SCN` code for a feature part: one past the highest the repository has ever carried. |
| host modifier | A flag that goes before the command (`--store`, `--run-id`). It needs a command, or `--help`, after it. |
| re-render | `--render-from-json`: Markdown rebuilt from a saved Evidence Reconciliation JSON, with no reconciliation and no live inputs. |
| `--exit-zero` | The same report, exiting `0` on an out-of-balance or scenario-code-error verdict, or on a `--strict` run held back by pending items. It never moves a run that could not judge (unsound, nothing to reconcile, or an unexpected error before the verdict). The on-ramp before gating. |
| run verdict | The whole run's headline and its exit code: BALANCED, OUT-OF-BALANCE, UNSOUND, PENDING, NOTHING TO RECONCILE or SCENARIO CODE ERRORS. |
| verdict ladder | The order in which the run verdict is decided: nothing to reconcile (`5`), unsound (`4`), scenario code errors (`1`), out of balance (`1`), then pending under `--strict` (`3`). An unexpected error before any verdict (`6`) is not on the ladder; a run that reached its verdict keeps it. |
| nothing to reconcile | The ledger carries no Claim Reconciliation at all, so the run has no basis for a verdict (exit `5`). |
| usage error | A malformed invocation, refused before anything runs (exit `2`). |
| retired flag | A flag refused as retired, naming what replaced it. |
| target | The repository being reconciled. `--target` names it in the report's provenance. |
| provenance | The report's header recording what was reconciled (the target, its source SHA, the tool SHA and the input paths), so a reconciliation is reproducible and attributable. |
| source SHA | The target's commit, by default its resolved `HEAD`. |
| tool SHA | The tool's own identity, taken from its install, never from the target. |
| run integrity | The report section that surfaces broken evidence as a harness failure and stamps the run unsound. |
| proof never ran | A behaviour whose proof was never exercised in the run. |
| Test volume | The report's balancing identity: every evidence observation lands on a scenario, a phantom claim or the unnamed claim, and the three counts sum to the total. |

### Fitness functions in CI

| Term | Meaning |
|---|---|
| pipeline step | A step of a CI job, as the pipeline declares it: it runs a command or uses an action. |
| discovery scope | The CI workflows `--ci` names. Every step of every job in them is read. |
| candidate | A step in the discovery scope that is not a declared runner, the reconciler or a non-check. Every candidate is a fitness function. |
| uncited fitness function | A candidate whose step cites no scenario. |
| step accounting | The report's tally of the steps read, by disposition (candidates, runners, the reconciler, excluded), so every step read is accounted for. |
| check step | The CI step that already runs a check, carrying the check's `@SCN` as its `id:`. |
| citation | The `@SCN` on a check step's `id:`: a citation of the scenario, never a definition of the check. |
| converted fitness function | A fitness function whose CI step carries its `@fitness` scenario's `@SCN` as its `id:`, so `balance` credits its result to that scenario. |
| unconverted fitness function | A fitness function that runs in CI with no scenario's `@SCN` as its step's `id:`. `balance` finds it running and reports it as an uncited fitness function. |
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
| `runners` | The declared behavioural runners, keyed by the four tiers and nothing else. A value is a runner's name, or `null` to say the tier has none. |
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
| shared `@SCN` code | A code two scenarios carry. They reconcile as one Claim Reconciliation. |
| known part, unknown part | A part is known when a feature file in `features/` is headed with it. `allocate` refuses an unknown part unless `--new` is given. |
| highest seen | The highest code `allocate` found for a part, with where it was seen. |
| excluded `@SCN` occurrence | An `@SCN` id seen outside a tag, which is reported and excluded. |
| Gherkin parse gate | The corpus reader's refusal of a corpus the Gherkin parser rejects. |

### The corpus, the report's views and term spelling

| Term | Meaning |
|---|---|
| corpus | The feature files under `--features`, whose scenarios one run reconciles. |
| corpus census | The count of the corpus's scenarios, read from the Ledger summary. |
| Summary views | The report's `## Summary views` section: the tallies by subject. It holds the by-quality-check view, *Out-of-balance by feature* and *Fitness evidence obligations*. |
| Out-of-balance by feature | The Summary views subsection that groups out-of-balance Claim Reconciliations by feature, opening with an *N of M* total line. |
| Fitness evidence obligations | The Summary views subsection listing the fitness Evidence Obligations that `@fitness` scenarios raise, apart from behavioural items, opening with an *N of M* total line. |
| harness | What produces the evidence `balance` reads: the test runners, the step definitions and the reports they write. A broken one is reported as a harness failure, and the run is stamped Unsound. |
| term | A hand-typed value naming a check: a check step's `id:` or a deferral tag. It is stored and looked up bare, without its leading `@` or surrounding space. |
| pair | The scenario code and quality check at which an Evidence Obligation, and the Evidence Observations answering it, are booked. A term names a pair, and a credit at a named pair reconciles as a matched obligation. |

## Descriptions for marketing use

The terms above are exact, and the code, the report and the help use them as they stand. Where a term's meaning is opaque to someone meeting the tool for the first time, it has a description below for writing *about* spec-controller: the README's prose, a talk, an article. Each stays as close to the definition as it can while a newcomer can read it. None is used in an error message, the report or the help, which keep the terms.

| Term | Description for marketing use |
|---|---|
| `Evidence Obligation` | A proof a scenario asks for: its tags say which kinds of test or check must show that it holds. |
| `Evidence Observation` | A proof that actually ran: one test's result, or one CI check's result, naming the scenario it proves. |
| `Claim Reconciliation` | One line per claim, setting the proofs it asked for against the proofs that ran. |
| `Phantom claim` | Where a test lands when it names a scenario that does not exist, usually a typo or a scenario since deleted. |
| `Unnamed claim` | The holding pile for test and check results that name no scenario at all. |
| `Watermelon` | A check that passes but could not have failed the build: green on the outside, nothing inside holding it. |

## Borrowed from the methodology

Named here, and used as the methodology defines them; [`how_to_use.md`](./how_to_use.md) describes each as spec-controller reads it.

- **Quality checks**:
  - the tiers `@unit`, `@integration`, `@e2e`, `@performance` and `@fitness`;
  - fitness function;
  - the adoption states `new-client`, `annotated` and `conformant`;
  - runner; the reconciler; `ci-run-time`; threshold.
- **Evidence layers and codes**: the `@SCN-<FFF>-<NNN>` scenario ID; feature code; the `@wip` and `@<quality-check>pending` deferral scopes.
