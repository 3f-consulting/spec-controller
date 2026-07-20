@SHR
Feature: two scenarios demand one static guard

  A FIXTURE target (NOT under features/) standing in for a codebase where TWO scenarios
  each demand the SAME static guard by @lint=lint:double-demand. The guard runs in CI and
  exists as a script, so it is wired-and-green. One run of one static guard is evidence for
  BOTH demanders (@SCN-LDG-024, 3F-1850): the credit posts to each demanding account, by
  reference — canon's "posts to every account that demands it". The only lint credit is the
  demanded one; there is no undemanded static guard here.

  Rule: two scenarios demand the same static guard

    @unit @lint=lint:double-demand @SCN-SHR-001
    Scenario: the first demander of lint:double-demand
      Given the target source

    @unit @lint=lint:double-demand @SCN-SHR-002
    Scenario: the second demander of lint:double-demand
      Given the target source
