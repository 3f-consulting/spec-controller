@TGT
Feature: a fixture target carrying recognised community deferral tags

  A FIXTURE target (NOT under features/) standing in for a codebase whose tiered @SCN
  scenarios also carry the community deferral tags spec-controller recognises — @skip,
  @todo, @ignore, @pending. The static check must pass: these are the product's own
  policy, not tags that mean nothing. Never a real features/ scenario — a planted
  fixture only.

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
