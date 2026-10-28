# What each fitness function catches

Each fitness function this repository runs in CI is a scenario in [`features/fitness-functions.feature`](../features/fitness-functions.feature). Most of them automate a kind of comment a technical lead makes in code review, so a reviewer's attention goes to design and intent. The rest guard the method itself: they keep the red proofs, the mutation scopes and the suite time limits honest.

Each table below gives, for each check:
- the comment it automates;
- how many times it caught a real problem on a pull request between 15 July and 15 October 2026.

A **real catch** is a red on a commit that was meant to pass. A red the method makes on purpose is not counted, and neither is a red caused by the runner rather than the change. Deliberate reds include a scenario's red commit, a test written before its code, and a planted violation that proves a check fires. The counts are refreshed at each quarterly gate review.

Many of these checks and rules first ran on `main` between 30 September and 14 October 2026, near the end of the window, and more after it, from 20 October. For them, a zero says little yet.

Quality checks fall into three categories: product, technical and process conformance. The first two group the product quality characteristics of ISO/IEC 25010:2023, in the standard's order; process conformance is 3F's extension of it. Each characteristic is listed, including those no check holds and those that do not apply to a command-line tool run inside its adopter's CI.

## One check, many rules: ESLint

One check runs ESLint over [`eslint.config.js`](../eslint.config.js), the repository's one ESLint configuration. It fails on any error in the tree, and on any warning in a file the push touches. ESLint's output names the rule that failed, so its rules need no scenario each. They are listed here with the characteristic each holds, and each characteristic's table below carries one row for its rules.

| Rule | Characteristic | Real catches |
|---|---|---|
| The engine's idiom: no host global, random number or class in core, no decorator or `…Deps` type, no operations-layer file name, no mutable core record, no sandbox name | Modularity | counted under Import boundaries |
| No type, field, function, variable or parameter in core's domain is named for an external tool or format | Modularity | 0 |
| No string, template part or regular expression in core's domain names an external tool, format, flag or syntax | Modularity | 0 |
| No numeric literal type in core's domain | Modularity | 0 |
| Only the exit-code module sets the process's exit code | Modularity | 0 |
| No production source file writes message prose outside its package's catalogue, so core's domain holds no sentence for a reader | Modularity | 1 |
| Complexity: cognitive complexity and function length | Analysability | 13 |
| No suppression comment that suppresses nothing | Analysability | 0 |
| No comment disables a mutant | Testability | 0 |
| No unit test file runs code at collection time or in a hook that runs once for many tests | Testability | 3 |
| Evidence layers cross a seam | Scenarios a reader can trust | 0 |

In the counting window each rule was a check of its own, except two. Import boundaries held the engine's idiom with its import rules, so its catches are not split between them. The complexity check held the dead suppressions, so they are counted with complexity.

**Product conformance:** what the product does.

## Functional suitability

Only the behavioural tests hold it: the unit, integration and end-to-end suites. No fitness function holds it.

**Technical conformance:** the code's other qualities, tests included.

## Performance efficiency

No check holds it. spec-controller declares no performance claim, so it runs no `@performance` scenario. Running cost does not apply: spec-controller has no deployment of its own, and each run uses its adopter's CI minutes.

## Compatibility

No fitness function holds it. Interoperability with each runner's report format is held by the behavioural scenarios of that format's reader. Co-existence has no check.

## Interaction capability

No fitness function holds it. The wording of the report and the help is held by behavioural scenarios over their text.

## Reliability

No check holds it. Availability and recoverability do not apply: spec-controller has no deployment, and each run is one process in its adopter's CI. Operability has no check.

## Security

| Check | Real catches |
|---|---|
| Workflow security | 1 |
| Semgrep: four security patterns | 0 |

Semgrep runs this repository's four rules, one file each under [`.semgrep/`](../.semgrep/), over the packages, and its output names the rule that failed. In the counting window each was a check of its own, so each keeps its own count:

| Rule | Real catches |
|---|---|
| No child process runs through a shell | 0 |
| No code is built from a string while the program runs | 0 |
| No regular expression is built from a value the program receives | 0 |
| A file is written only where its location has been checked | 0 |

Workflow security's catch is the same pull request as the published-package checks under *Flexibility*.

## Maintainability

Its headings are the standard's sub-characteristics of maintainability.

### Modularity

| Check | Real catches |
|---|---|
| Import boundaries | 4 |
| ESLint: the engine's idiom and core's domain language, seven rules | 1 |
| A unit test citing a domain concept's scenario lives in core's domain | 0 |

Import boundaries runs dependency-cruiser over [`config/.dependency-cruiser.js`](../config/.dependency-cruiser.js), and its output names the rule that failed. Two of its rules keep each input format's parser in its homes. In the counting window each was a check of its own, so each keeps its own count:

| Rule | Real catches |
|---|---|
| Only core's Gherkin module imports the Gherkin parser | 0 |
| Only core's workflow module and the run store import the YAML parser | 0 |

### Reusability

No check holds it. Core is published as a package of its own, and its front door is held under *Modularity*.

### Analysability

| Check | Real catches |
|---|---|
| ESLint: complexity and function length, and no dead suppression | 13 |

Supportability and observability sit here. No check holds them yet. It is the comment that an error should tell its reader something stable to search for or report.

### Modifiability

| Check | Real catches |
|---|---|
| Duplication: no clone touches a changed production file | 0 |
| Unused code: no changed file carries an unused file, export or dependency | 8 |
| Test helpers written once: no helper in a changed test file copies one in another | 0 |
| CRAP: complex code must be tested | 0 |
| Typecheck | 8 |

### Testability

| Check | Real catches |
|---|---|
| Mutation verdict recorded | 0 |
| ESLint: no comment disables a mutant | 0 |
| Test code stays within the declared ceiling ratio to production code | 0 |
| ESLint: no unit test file runs code at collection time or in a hook that runs once for many tests | 3 |
| Every production source file is in a mutation scope or on the recorded list | 0 |

Mutation verdict recorded never fails on a red sweep or on a lapsed schedule. It prints each scope's result from the newest full sweep, a `LAPSED:` line when no full sweep falls inside its window, or a `NO SCOPE MEASURED:` line when the newest ran no scope job. Each read is tried three times, whether `gh` errors or answers empty, so an empty page from the API is not taken for a lapse or for a sweep with no scope. The step fails, with an `UNREAD:` line, only when a read errors on all three tries.

## Flexibility

Installability is held by the published packages and types, by the packed command declaring no runtime dependency, by it carrying the repository's licence and a notice for every package its bundle carries, and by its build refusing an engine entry point the bundle does not map, so the command carries one copy of the engine. Scalability does not apply to a command-line tool run once per CI run.

| Check | Real catches |
|---|---|
| Published packages | 1 |
| Published types | 1 |
| The packed command declares no runtime dependency | 0 |
| The packed command carries the repository's licence and a notice for every package its bundle carries | 0 |
| Building the command fails, naming the import, when it imports an engine entry point the bundle does not map | 0 |

The two published checks and workflow correctness share their one catch: a single pull request reddened all three.

## Safety

No check holds it. spec-controller carries no safety concern.

**Process conformance:** checks on how the work is done and recorded.

## Comments and docs

| Check | Real catches |
|---|---|
| Comment share: no file over its comment-line ceiling | 5 |
| No ticket ID in a comment, description or document | 0 |
| No scenario code in a comment, description or document | 2 |
| No narrated history in a comment, description or document | 1 |
| No title or description names a code identifier or a source file | 1 |

## Scenarios a reader can trust

| Check | Real catches |
|---|---|
| No step on a scenario Cucumber does not run | 0 |
| Every scenario takes its steps from one step-definition file | 0 |
| No Given, When or Then names an interface mechanic | 0 |
| ESLint: evidence layers cross a seam | 0 |
| No unused step definition | 0 |

## Guards on the method

These checks don't replace a review comment. They keep the pipeline's own evidence honest.

| Check | Real catches |
|---|---|
| The unit suite runs inside its time limit | 55 |
| The behavioural suite runs inside its time limit | 34 |
| A red proof of a unit scenario runs exactly the tests whose titles carry its code | 0 |
| A red proof of an integration or e2e scenario runs exactly that scenario | 0 |
| A red proof that selects no test fails, saying no test was selected | 0 |
| A red proof in which no selected test reported a result fails as not a red | 0 |
| A release compares each package's whole built `dist` with the last release's | 0 |
| A release whose comparison cannot reach the registry publishes nothing and warns | 0 |
| A release npm does not serve yet is waited for, then compared or failed | 0 |
| No test leaves an entry in its temporary directory | 0 |
| The behavioural suite refuses a command bundle older than the lockfile | 0 |
| Workflow correctness | 1 |

The two suite checks are the steps that run each suite. Their counts include any test that failed on a commit meant to pass, as well as runs over the time limit.
