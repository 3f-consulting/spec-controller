@TSP
Feature: a fixture target whose pipeline is two workflows and three jobs

  A FIXTURE target (NOT under features/) standing in for the consumer the scope section is written
  for — one whose pipeline is not one file and not one job. ci.yml runs a single job; nightly.yml
  runs two, and one of those holds a check nothing else in the tree would ever mention. A report
  that states a bare total over this target tells its reader nothing about where the total came
  from, which is exactly what @SCN-USG-020 is about.

  ITS JOBS ARE WRITTEN IN AN ORDER THE SORTED REPORT HAS TO CHANGE. nightly.yml writes sweep before
  audit, so a reader emitting jobs in the order it met them reports them the other way round from a
  reader that sorts. Without that the sorting claim would agree by coincidence with the file.

  THE TWO FIGURES PART COMPANY IN ci.yml AND NOWHERE ELSE, deliberately. That job runs four steps
  of which two are candidates — one is the unit runner this manifest names, one is a step it names
  a non-check — while both nightly jobs are candidates end to end. A fixture where every job's two
  figures agreed could not tell a reader that reported steps twice from one that reported the pair.

  THE CHECK NAMES MATCH NO CONVENTION OF THIS TOOL'S, and one of them invokes no script of the
  target's at all. Nothing here turns on a name, which is what keeps the scope section a statement
  about what was read rather than about what was recognised.

  NO RECONCILER STEP. The reconciler and its dump come out by construction whatever a manifest says
  (@SCN-USG-014), so a pipeline running them here would put a second exclusion into counts this
  fixture is not about.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TSP-001
    Scenario: the target source is exercised
      Given the target source
