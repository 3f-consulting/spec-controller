@MSG
Feature: Human-facing message prose lives off the mutated surface, keyed by a code

  THE MUTANT NOBODY CAN KILL. Stryker mutates every string literal in the domain, so the two
  invariant messages `makeQualityCheckReconciliation` throws carry sixteen mutants between them —
  the template chunks emptied, the `"Exists"` / `"None"` words emptied, and the ternaries that pick
  between them flipped. Every one survives, and the test that would kill them is a test asserting
  wording. That test must not be written: prose is the one thing in this tree allowed to be
  rewritten without a ticket, and a suite that pins it turns every copy-edit red. So the survivors
  are not a gap in the suite — they are the suite being asked a question it must refuse to answer.

  THE CURE IS TO MOVE THE QUESTION, NOT TO ANSWER IT (portfolio-endorsed 2026-08-26, and an adopter's repository
  3F-2777 does the same for its state-model loader). A fault gets a CODE at the throw site and
  carries its parameters as fields; the prose that renders it moves to a catalogue held as data,
  and the catalogue is excluded from the mutate glob. What remains on the mutated surface is the
  logic — which fault, and what its parameters are — and that logic is exactly what the suite can
  and should pin. The sixteen mutants do not become killed; they cease to exist, and the ones
  that replace them are the ternaries deciding `Exists` against `None`, now asserted as fields.

  THE EXCLUSION IS THE PART THAT COULD BE A HOLE. "Do not mutate this file" is one edit away from
  "do not mutate this directory", and nothing would go red. Two things close it, and neither is a
  promise: the catalogue is a mapped type over the fault codes, so a code cannot exist without a
  message and a template cannot reach for a parameter its fault does not carry (the compiler
  forces both, the way `OUTCOME_DESCRIPTION` already forces an outcome to have a gloss), and a
  guard reads the real stryker config back and asserts the exclusion names the catalogue and
  nothing else. An exclusion that widened would red on the guard, not on a reviewer noticing.

  WHERE IT LIVES, AND WHY NOT OUTSIDE THE DOMAIN. The obvious home for data the domain must not
  mutate is a folder outside the domain — and the domain-purity guard (@SCN-DPG-001) exists to say
  a domain module imports only the domain layer. So the catalogue stays INSIDE the domain and
  leaves the mutated surface by CONFIG, which is the axis the problem is actually on: the mutate
  glob is a statement about what mutation testing can usefully ask, not about what the domain may
  depend on. Purity and mutability are two different questions and are answered in two different
  files.

  THE TWO CARVE-OUTS SURVIVE. A runner's own words are passed through verbatim, never rewritten
  into a catalogue entry (name-the-fault-never-the-cure), and a message with parameters keeps its
  parameter logic in code where mutation still reaches it. The catalogue holds the sentence; it
  never holds the reasoning that fills the blanks.

  Rule: a domain invariant names its fault by code and carries its parameters, not its prose

    @unit @SCN-MSG-001
    Scenario: a divergent (outcome, side-presence) pair throws a coded fault carrying which side diverged and what was required
      Given an outcome whose canon row disagrees with the sides the reconciliation carries
      When that reconciliation is minted
      Then minting is refused
      And the refusal names its fault by code, and names which of the two sides diverged
      And the refusal carries the outcome, the side-presence canon required of that side, and the side-presence actually carried

  Rule: every fault code has a message, and the mutate exclusion names the catalogue and nothing else

    @unit @SCN-MSG-002
    Scenario: the catalogue is total over the fault codes with no empty entry, and the stryker exclusion covers exactly it
      Given a sample fault for every code a domain invariant can raise
      When each sample's message is rendered from the catalogue
      Then every code renders a message that is not blank
      And each message carries every parameter its own fault supplied
      And the mutated surface excludes the catalogue and nothing wider
