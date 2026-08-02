@SHR
Feature: two scenarios name one static guard

  A FIXTURE target (NOT under features/) standing in for a codebase where TWO scenarios
  each name the SAME static guard by @lint=lint:double-obligation. The guard runs in CI and
  exists as a script, so it is wired-and-green. One run of one static guard is evidence for
  BOTH naming scenarios (@SCN-LDG-024, 3F-1850): the credit posts to each naming account, by
  reference — canon's "posts to every account that names it". The only lint credit is the
  named one; there is no undemanded static guard here.

  Rule: two scenarios name the same static guard

    @unit @lint=lint:double-obligation @SCN-SHR-001
    Scenario: the first naming scenario of lint:double-obligation
      Given the target source

    @unit @lint=lint:double-obligation @SCN-SHR-002
    Scenario: the second naming scenario of lint:double-obligation
      Given the target source
