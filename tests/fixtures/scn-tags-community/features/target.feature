@TGT
Feature: a fixture target carrying recognised community deferral tags

  A FIXTURE target (NOT under features/) standing in for a codebase whose tiered @SCN
  scenarios also carry the community deferral tags spec-controller recognises: the set is
  skip, todo, ignore and pending, each written as a tag on the scenarios below. The static
  check must pass over them — these are the product's own policy, not tags that mean
  nothing. Never a real features/ scenario; a planted fixture only.

  A LINE OF PROSE MAY NOT OPEN WITH AN @ (3F-2817). It did, and Gherkin read it as a tag
  line, so this file was invalid and nothing noticed: a fixture corpus is never run by
  pnpm cucumber, so the one reader with a parser in it never saw this file at all. The
  refusal this slice puts in the shared discovery is what finally read it.

  Rule: recognised community deferral tags alongside a tier

    @unit @skip @SCN-TGT-001
    Scenario: a tiered scenario deferred with @skip
      Given the target source

    @integration @todo @SCN-TGT-002
    Scenario: a tiered scenario deferred with @todo
      Given the target source

    @unit @ignore @pending @SCN-TGT-003
    Scenario: a tiered scenario carrying two recognised deferral tags
      Given the target source
