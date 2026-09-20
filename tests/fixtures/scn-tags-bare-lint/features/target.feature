@TGT
Feature: a fixture target carrying a bare @lint tag

  A FIXTURE target (NOT under features/) standing in for an adopter's codebase whose @SCN
  scenario still carries bare `@lint` — the retired check name. The word named a quality
  check once, raises nothing anywhere now, and is grammar nowhere: the static check must red
  and name the tag. Never a real features/ scenario — a planted fixture only.

  THE TIERED SCENARIO BESIDE IT IS THE CONTROL, and it is why this tree holds two scenarios
  rather than one. Only a LITERAL leaves the derived tier set; the set itself stays, because
  it is what `isGrammar` reads for every tier tag there is. A change that took the array out
  instead would red this scenario too — and would still exit 1, which is exactly what makes
  an exit code alone no evidence here.

  Rule: the retired check name, and a tier tag beside it

    @lint @SCN-TGT-001
    Scenario: a scenario whose only tag beside its id is the retired check name
      Given the target source

    @unit @SCN-TGT-002
    Scenario: a tiered scenario, the control
      Given the target source
