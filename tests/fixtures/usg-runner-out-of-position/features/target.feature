@TOP
Feature: a fixture target whose check step writes a report named after its unit runner

  A FIXTURE target (NOT under features/) standing in for the shape that destroyed the substring
  reading of rule D on the first real pipeline it was pointed at. Two steps carry the word
  vitest and only one of them runs it:

    Unit tests   pnpm test                                                  -> vitest, via the manifest
    Rule check   pnpm lint:rules --outputFile.json="$EVIDENCE_DIR/vitest.json"  -> eslint

  The second is the measured shape of this repository's own Test step, reached here on an
  ORDINARY check so that nothing about the reconciler can be doing the work: the reconciler's
  step is excluded too, and by construction rather than by this rule.

  BOTH STEPS ARE LOAD-BEARING AND NEITHER IS DECORATION. The check step is the claim — it must
  stay a candidate and reach the books. The runner step is the CONTROL — a reader recognising
  nothing at all would satisfy the claim while being blind, and the control is what tells the
  two apart.

  lint:rules is registered and cited by nothing, so it reaches this axis as an uncited static
  check for one reason rather than two: the seam resolves a bare check tag for the handle, and
  no scenario below carries it.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TOP-001
    Scenario: the target source is exercised
      Given the target source
