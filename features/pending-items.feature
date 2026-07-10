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

    @unit @integration @SCN-PND-003
    Scenario: an unrecognised `<x>pending` (no such quality-check) is passed through, ignored like any unrecognised tag
      Given the planted unknown-pending fixture — an `@foopending` scenario, a bare `@pending` scenario, and a plain unknown `@foo` scenario
      When the parser derives each unknown scenario's evidence obligations
      Then every scenario declares no evidence obligation — the unknown `<x>pending` and bare `@pending` are ignored exactly like the plain unknown tag

  # The met→balanced and neither→missing results are the established @LDG baselines
  # (@SCN-LDG-001 satisfied→balanced; @SCN-LDG-003 absent→missing). This Rule adds the third:
  # the pending result — a deliberately-deferred obligation reconciles as a one-sided
  # Pending Item (owed IOU), never a Reconciling Item.
  Rule: The pending result of an obligation

    @unit @integration @SCN-PND-004
    Scenario Outline: <quality-check> — obligation declared pending → Pending Item (owed IOU)
      Given a planted fixture scenario declaring a pending "<quality-check>" obligation
      When the reconciler reconciles it against no observation
      Then the scenario raises exactly one Pending Item for "<quality-check>"
      And the scenario posts no both-missing reconciling item — nothing is reconciled

      Examples:
        | quality-check |
        | lint          |
        | unit          |
        | integration   |
        | e2e           |
        | performance   |

  # A Pending Item is one-sided: the pending TAG's existence alone raises it — no observation
  # is sought. Even when a matching observation exists for the pending obligation's check, the
  # pending declaration governs: the obligation never reconciles against the observation (never
  # `satisfied`), and the observation is not flagged `undemanded` — the pending pair stays
  # DEMANDED. (Verdict-neutral / run-neutral are @SCN-PND-006..008; this pins the one-sidedness.)
  Rule: A Pending Item is one-sided and never affects the verdict or the run

    @unit @integration @SCN-PND-005
    Scenario: the pending tag's existence alone raises the Pending Item — no observation is sought
      Given a planted fixture scenario declaring a pending "integration" obligation, with a matching integration observation citing it
      When the reconciler reconciles the fixture against that matching observation
      Then the scenario raises exactly one Pending Item for "integration"
      And the matching observation is not flagged undemanded — the pending pair stays demanded

    @unit @integration @SCN-PND-006
    Scenario: a Pending Item is not a Reconciling Item (it is not an error)
      Given a planted fixture scenario declaring a pending "integration" obligation alongside a genuinely missing "unit" obligation
      When the reconciler reconciles the mixed fixture against no observation
      Then the missing "unit" obligation is the scenario's only reconciling item — its one error
      And the pending "integration" check names no reconciling item and no evidence-obligation outcome — the Pending Item is a structurally distinct category, never counted as an error
