@MSG
Feature: Human-facing message prose lives off the mutated surface, keyed by a code

  THE MUTANT NOBODY CAN KILL. Stryker mutates every string literal in the domain, so the two
  invariant messages a Quality Check Reconciliation throws, when a side's presence differs from
  what its outcome requires, carry sixteen mutants between them —
  the template chunks emptied, the `"Exists"` / `"None"` words emptied, and the ternaries that pick
  between them flipped. Every one survives, and the test that would kill them is a test asserting
  wording. That test must not be written: prose is the one thing in this tree allowed to be
  rewritten without a ticket, and a suite that pins it turns every copy-edit red. So the survivors
  are not a gap in the suite — they are the suite being asked a question it must refuse to answer.

  THE CURE IS TO MOVE THE QUESTION, NOT TO ANSWER IT. A fault gets a CODE at the throw site and
  carries its parameters as fields; the prose that renders it moves to a catalogue held as data,
  and the catalogue is excluded from the mutate glob. What remains on the mutated surface is the
  logic — which fault, and what its parameters are — and that logic is exactly what the suite can
  and should pin. The sixteen mutants do not become killed; they cease to exist, and the ones
  that replace them are the ternaries deciding `Exists` against `None`, now asserted as fields.

  ONE CATALOGUE PER PACKAGE, AND THE RULE HOLDS FOR EVERY ONE. The domain's faults are not the only
  prose in this tree: every human-facing message is reached by a code, through a catalogue held as
  data and excluded by name from the mutate glob of the scope that contains it. Each adapter that
  prints text owns its catalogue as a JSON data file, named for its language, keyed by each code's
  stable value and written in the ICU message format, so a message names the values it prints as
  placeholders. There is one catalogue per package, because the import rules let core import
  nothing of the app and let the app reach core only through its published entry point, so no
  single catalogue can serve both. Core's lives in `render`, keyed by the values the domain
  reports. The app's lives beside the app package's own messages module, keyed by an app-wide
  code, and every app scope extends it. Whichever catalogue a code belongs to, the same rule
  holds: every code has exactly one entry, nothing else does, and no entry renders blank.

  THE EXCLUSION IS THE PART THAT COULD BE A HOLE. "Do not mutate this file" is one edit away from
  "do not mutate this directory", and nothing would go red. What closes half of it is not a promise
  but the compiler: each data file is typed against its codes, so a code cannot exist without a
  message, the way `OUTCOME_DESCRIPTION` already forces an outcome to have a gloss. A code given
  two entries is what the compiler cannot see, because the data file keeps only the last, so the
  linter refuses a key given twice. The exclusion ITSELF is held by
  review alone, and that is said here rather than left to be found. No check reads the Stryker
  config back: its subject would be this repository's own Stryker configuration, which a reader
  who copies this corpus does not have. A widened exclusion reds nothing — what it still
  cannot do is make a catalogue lie. An accepted residual, not an oversight, and the same trade
  the Stryker configuration already carries in writing for the lost kill its own threshold cannot see.

  WHERE IT LIVES. The domain says what happened as a typed value — a fault's code and its
  parameters, an outcome, a kind — and holds no sentence for a reader. The words are presentation,
  so core's catalogue lives in `render`, the adapter that writes the report, and holds an entry only
  for what the report reads. It leaves the mutated surface by config: the mutate glob is a statement
  about what mutation testing can usefully ask, not about where the words may live.

  TWO THINGS STAY OUT OF THE CATALOGUE. A runner's own words are passed through verbatim, never
  rewritten into a catalogue entry, and a message with parameters keeps its
  parameter logic in code where mutation still reaches it. The catalogue holds the sentence; it
  never holds the reasoning that fills the blanks.

  Rule: a domain invariant names its fault by code and carries its parameters, not its prose

    @unit @SCN-MSG-001
    Scenario: an Evidence Obligation or Evidence Observation that diverges from its outcome is refused with a coded fault that carries its parameters, and the report catalogue words that fault from its parameters alone

  Rule: every code in a message catalogue has one message, which prints the values its code is given

    @unit @SCN-MSG-002
    Scenario: every code has exactly one message

    @unit @SCN-MSG-003
    Scenario: every message belongs to a code

    @unit @SCN-MSG-004
    Scenario: no message is empty

    @unit @SCN-MSG-005
    Scenario: a message uses only the values its code gives it

    @unit @SCN-MSG-006
    Scenario: a message uses every value its code gives it

    @unit @SCN-MSG-007
    Scenario: every message parses

    @unit @SCN-MSG-008
    Scenario: every message prints its words as written

  Rule: a message holds no choice between words, other than a count's plural forms

    @unit @SCN-MSG-009
    Scenario: no message chooses between words other than by a count's plural forms

  Rule: every error a reader is shown carries one error code, and nothing else the tool prints carries one

    An error is what refuses a run, stops it on an unexpected error, or is named under the report's
    errors in the inputs.

    @unit @SCN-MSG-010
    Scenario Outline: an error shows its reader the error code of what went wrong — <error>

      Examples:
        | error                                         | what went wrong                      |
        | a flag the command does not take              | the flag unknown to the command      |
        | a flag the command has retired                | the retired flag                     |
        | a command the tool does not have              | the unknown command                  |
        | a request for a scenario code not in its form | the request not in the code's form   |
        | an unexpected error before its verdict        | the unexpected error                 |
        | an unexpected error that cannot be formatted  | the unexpected error                 |
        | an unexpected error after its verdict         | the unexpected error after a verdict |

    @unit @SCN-MSG-011
    Scenario: a balanced run shows no error code

  Rule: a reader can look up every error code and every way a run can end

    @unit @SCN-MSG-012
    Scenario: every code the tool can give is documented

    @unit @SCN-MSG-013
    Scenario: every documented code is one the tool can give
