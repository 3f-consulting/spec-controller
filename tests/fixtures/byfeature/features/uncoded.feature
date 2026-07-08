Feature: an uncoded feature

  A FIXTURE feature with NO @<FFF> header code — discoverFeatures yields featureCode=null,
  so the feature-name map has no entry for XYZ (@SCN-RPT-006, the uncoded edge).
  Its scenario carries @SCN-XYZ-001: featureCodeOf yields "XYZ", the map misses, and the
  by-feature cut falls back to the bare "XYZ". Required-but-missing → out-of-balance → it
  surfaces in the by-feature cut.

  @unit @SCN-XYZ-001
  Scenario: an uncoded scenario with no backing evidence
    Given the target repo's source
