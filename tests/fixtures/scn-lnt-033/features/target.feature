@TSC
Feature: a fixture target whose corpus names neither of the two static checks its CI runs

  A FIXTURE target (NOT under features/) standing in for a codebase running two static
  checks nobody has written a scenario for — the ordinary state of a pipeline nobody has
  annotated yet. Its manifest REGISTERS both handles (lint:advisory to the bare check
  complexity, lint:enforced to tech-conformance) and its corpus carries neither tag, so the
  citation seam resolves a bare check for each and then reaches no @SCN for either: both
  credits cite nothing and fold onto the suspense row as uncited static checks.

  REGISTERING BOTH AND CARRYING NEITHER IS WHAT LEAVES THE SEVERANCE AS THE ONLY VARIABLE.
  The two checks are identical in every respect this axis reads — same prefix, same manifest,
  same registry treatment, same absence from the corpus — except that the job's verdict
  depends on one of them and not on the other. A fixture whose two checks differed in their
  citation as well could report the same census for a reason that has nothing to do with the
  key, and the arm would go on passing while asserting something else.

  THE SCENARIO BELOW CARRIES NO CHECK TAG, DELIBERATELY. Its @unit obligation is what makes
  this a corpus rather than an empty file; a tag naming either check would make that check
  CITED and take the whole claim away, since what this target is for is the count of the
  checks nothing names.

  Rule: the target holds itself to the one behaviour it has written down

    @unit @SCN-TSC-001
    Scenario: the target keeps a behaviour it has actually specified
