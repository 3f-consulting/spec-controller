@VOC
Feature: Audit every surface's vocabulary against the manifesto (one-time, report-only)

  The closed-vocabulary completeness audit (slice 4 of [spec-controller] Outputs
  & vocabulary). Prior sweeps failed two ways — scope was GUESSED and the sweeper had
  DISCRETION. This removes both. The tool scans every file by default (the only exclusions:  node_modules, .git, lockfiles, and the audit's own detection machinery — the meta-mention exemption, the files that name the rejected vocabulary), decomposes every name into words (camelCase / kebab /
  snake / dotted / path → words: rootProgramme → root, programme) and checks each word
  against the approved word-set (manifesto domain vocabulary + the endorsed generic-technical
  allowlist + the ruled-allowed-outright report/spec/feature). Burden flips: a word in
  NEITHER set flags. The banned shortenings (supply, execution(s), state, and bare
  obligation / observation / unattributed / ghost) always flag.

  Two scanning modes keep the audit useful without flooding on ordinary English: NAME mode
  (code identifiers, JSON/YAML keys, feature tags, filenames) applies the full closed
  vocabulary — every word must prove it is approved; PROSE mode (comments, doc/markdown
  prose, string literals, titles) examines only the controlled domain vocabulary — a banned
  or rejected-alias word flags, ordinary English is left alone, and any COMPOSITE token
  (a deliberate multi-word name embedded in prose) is escalated to NAME mode.

  The tool is report-only — NOT a wired CI gate, NOT a standing lint:*-vocab guard (operator
  ruling 2026-07-02: the audit is a one-time completeness instrument, re-run once at slice 5
  to prove zero). It emits two artefacts for operator review: a per-name manifest
  (surface | file | symbol | current | new | action | decision — `new` from the manifesto's
  rejected-alias→canonical mapping) and a coverage matrix (surfaces × flagged-words, counts)
  so completeness is confirmable at a glance — a surface with zero rows catches a miss.

  The unit arm proves the word-decomposition + classification + matrix assembly in isolation;
  the integration arm drives the real CLI over a fixture corpus carrying known banned and
  known approved names and asserts the emitted manifest + matrix.

  Rule: a name whose word is outside the approved set flags; an all-approved name does not

    @unit @integration @SCN-VOC-001
    Scenario: the audit flags a non-conforming word across surfaces and passes an approved one
      Given a fixture corpus carrying a banned word in an identifier and an approved word in another
      When the vocabulary audit runs over the corpus
      Then the manifest lists the banned name with its canonical replacement
      And the approved name is not flagged

  Rule: the coverage matrix enumerates every surface, so a zero-flag surface still appears

    @unit @integration @SCN-VOC-002
    Scenario: a surface with no flagged word still appears as a coverage-matrix row
      Given a fixture corpus that flags a word on one surface only
      When the vocabulary audit renders the coverage matrix over the corpus
      Then the coverage matrix lists every scanned surface as a row
      And a surface with zero flagged words is present with a zero count

