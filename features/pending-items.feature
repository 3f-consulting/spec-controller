@PND
Feature: A pending evidence obligation raises a Pending Item

  A `<quality-check>pending` tag (evidence-manifesto §11B) declares an evidence
  obligation that is owed but deliberately deferred to a later slice. This slice is
  the PARSE only: it recognises the tag and derives a pending obligation. What a
  pending obligation *does* on the ledger — the one-sided Pending Item — is slice 2.

  Seam: parse/scenarios.ts derives EvidenceObligation[] from a scenario's tags. A
  `<qc>pending` tag over a RECOGNISED quality-check derives `{ qualityCheck: <qc>, pending: true }`
  — the obligation gains a `pending?: boolean` flag (absent = a normal obligation).
  `@lintpending` derives `{ qualityCheck: "lint", pending: true }` with NO guard payload
  (one-sided; the guard doesn't exist yet). The `pending` suffix is significant: a SEPARATE
  recognition from the bare tier tag, so `@integrationpending` is not `@integration`. We give
  special meaning ONLY to our recognised lexicon (the five `<qc>pending`); anything outside it
  — an unknown `<x>pending`, or bare `@pending` — is ignored silently, exactly like any
  unrecognised tag. We do not police the developer's tags.

  Fixture policy: exercised over planted feature-strings under tests/fixtures/ fed to the
  pure parser — never a real `@<qc>pending` scenario in the scanned features/ corpus.

  Rule: A `<quality-check>pending` tag parses as a pending evidence obligation

    @unit @integration @SCN-PND-001
    Scenario Outline: <tag> declares a pending <quality-check> obligation
      Given a planted fixture scenario tagged "<tag>"
      When the parser derives its evidence obligations
      Then it declares a pending "<quality-check>" obligation

      Examples:
        | tag                 | quality-check |
        | @lintpending        | lint          |
        | @unitpending        | unit          |
        | @integrationpending | integration   |
        | @e2epending         | e2e           |
        | @performancepending | performance   |

    @unit @integration @SCN-PND-002
    Scenario: `@integrationpending` is not read as `@integration` — the suffix is significant
      Given the planted suffix-significance fixture — a bare `@integration` scenario alongside an `@integrationpending` one
      When the parser derives each scenario's evidence obligations
      Then the bare `@integration` scenario declares a plain "integration" obligation and no pending one
      And the `@integrationpending` scenario declares a pending "integration" obligation and no plain one
