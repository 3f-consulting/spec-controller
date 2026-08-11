@TGP
Feature: a fixture target whose CI runs a guard:-prefixed check no scenario cites

  A FIXTURE target (NOT under features/) standing in for a codebase whose CI runs one static
  check under the guard: prefix rather than lint: — an adopter's repository-shaped case. The prefix is what
  FINDS it: guard: sits in the discovery set beside lint:, so guard:domain-purity is a running
  static check here for exactly the reason lint:foo is one in the usg target. test / cucumber
  carry neither prefix and this target configures nothing, so they never reach this axis.

  THE HANDLE IS REGISTERED AND STILL UNCITED, which is the shape only the one posting rule can
  produce and the reason this manifest carries a checkRegistry at all. specController maps
  guard:domain-purity to the bare check domain-purity, so the seam can resolve a tag for the
  handle; nothing in the corpus below carries that tag, so it reaches no @SCN and the credit
  cites no scenario. Leaving the handle unregistered would report the same uncited check for a
  second reason — a handle nothing registers reaches nothing either — and this target would
  then go on passing under a reader that took every registered handle for an attributed one.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TGP-001
    Scenario: the target source is exercised
      Given the target source
