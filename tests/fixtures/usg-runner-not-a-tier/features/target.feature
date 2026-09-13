@TNT
Feature: a fixture target whose runner block carries a key that is not a tier

  A FIXTURE target (NOT under features/) standing in for the smuggling the runner block's key
  closure forbids. Its manifest names one real tier and one key that is not a tier at all:

    "runners": { "unit": "vitest", "lint": "eslint" }

  and its pipeline runs `pnpm lint:rules`, whose script body is `eslint`. So the bogus key is
  not inert here — a reader honouring any key would resolve `eslint` through the manifest at
  that step exactly as it resolves `vitest` at the unit suite, and would take a real fitness
  check out of the report on the strength of a word the consumer invented.

  BOTH STEPS ARE LOAD-BEARING. The check step is the claim: it must stay on the books, and its
  key must be named on the report as one the tool does not recognise. The unit step is the
  CONTROL — a reader that recognised nothing at all would satisfy the absence while being
  blind, and only the unit row still standing beside it tells the two apart.

  lint:rules is registered and cited by nothing, so it reaches this axis as an uncited static
  check for one reason rather than two: the seam resolves a bare check tag for the handle, and
  no scenario below carries it.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TNT-001
    Scenario: the target source is exercised
      Given the target source
