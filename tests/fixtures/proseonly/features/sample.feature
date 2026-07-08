@POC
Feature: a prose-only-codes fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose Gherkin
  the prose-only-code audit parses. It tags one scenario and
  mentions two @SCN ids in prose: the tagged one (legitimate) and a DANGLING one that
  is never a tag anywhere — the prose-only code the report's Warnings must surface.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @POC / @SCN-POC-NNN.

  Rule: a tagged scenario alongside a dangling prose reference

    @unit @SCN-POC-001
    Scenario: a tagged scenario with an anchor
      Given the target repo's source
      # see also @SCN-POC-001 referenced again in a comment (legitimate — it IS tagged)
      # and @SCN-POC-999 — a dangling reference, never tagged anywhere
