# What each fitness function catches

Each fitness function this repository runs in CI is a scenario in [`features/fitness-functions.feature`](../features/fitness-functions.feature). Most of them automate a kind of comment a technical lead makes in code review, so a reviewer's attention goes to design and intent. The rest guard the method itself: they keep the red proofs, the mutation scopes and the suite time limits honest.

Each table below gives, for each check:
- the comment it automates;
- how many times it caught a real problem on a pull request between 15 July and 15 October 2026.

A **real catch** is a red on a commit that was meant to pass. A red the method makes on purpose is not counted, and neither is a red caused by the runner rather than the change. Deliberate reds include a scenario's red commit, a test written before its code, and a planted violation that proves a check fires. The counts are refreshed at each quarterly gate review.

Twenty-three of these checks first ran on `main` between 30 September and 14 October 2026, and four more after the window, from 20 October. For them, a zero says little yet.

**Technical conformance:** checks on the code, tests included.

## Readability, structure, complexity

| Check | Real catches |
|---|---|
| Complexity: cognitive complexity and function length | 13 |
| CRAP: complex code must be tested | 0 |

## Design and architecture

| Check | Real catches |
|---|---|
| Import boundaries | 4 |
| No type, field, function, variable or parameter in core's domain is named for an external tool or format | 0 |
| No string, template part or regular expression in core's domain names an external tool, format, flag or syntax | 0 |
| No sentence for a reader is written in core's domain | 0 |
| A unit test citing a domain concept's scenario lives in core's domain | 0 |
| No production source file writes message prose outside its package's catalogue | 1 |
| Only one module imports the Gherkin parser | 0 |
| Only the workflow module and the run store import the YAML parser | 0 |

## Duplication and unused code

| Check | Real catches |
|---|---|
| Duplication: no clone touches a changed production file | 0 |
| Unused code: no changed file carries an unused file, export or dependency | 8 |
| Test helpers written once: no helper in a changed test file copies one in another | 0 |

## Tests missing or weak

| Check | Real catches |
|---|---|
| Mutation score | 7 |
| No comment disables a mutant | 0 |
| Test code stays within the declared ceiling ratio to production code | 0 |
| No unit test file runs code at collection time or in a hook that runs once for many tests | 3 |
| Every production source file is in a mutation scope or on the recorded list | 0 |

## Correctness the compiler and the packaging can see

| Check | Real catches |
|---|---|
| Typecheck | 8 |
| Published packages | 1 |
| Published types | 1 |
| Workflow correctness | 1 |

The three published and workflow checks share their one catch: a single pull request reddened all three.

## Security

| Check | Real catches |
|---|---|
| Workflow security | 1 |
| No child process runs through a shell | 0 |
| No code is built from a string while the program runs | 0 |
| No regular expression is built from a value the program receives | 0 |
| A file is written only where its location has been checked | 0 |

Workflow security's catch is the same pull request as the three checks above.

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
| Evidence layers cross a seam | 0 |
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
| A pull request's mutation run selects exactly the scopes its production files are in | 0 |
| No test leaves an entry in its temporary directory | 0 |

The two suite checks are the steps that run each suite. Their counts include any test that failed on a commit meant to pass, as well as runs over the time limit.
