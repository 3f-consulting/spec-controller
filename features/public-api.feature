@API
Feature: The public core exports exactly the frozen v1 contract surface

  The `@3f-consulting/spec-controller-core` package is the public contract every
  downstream consumer builds on. Its entrypoint barrel must export a known,
  frozen set of symbols — no more, no less — so the surface cannot drift
  silently: a symbol accidentally added to the barrel, or one quietly dropped,
  must red CI as a visible, reconciled change to this scenario rather than an
  unnoticed break in the contract. Double-entry on the contract itself.

  @SCN-API-001 @unit
  Scenario: The core barrel re-exports exactly the frozen v1 surface
    Given the frozen v1 contract surface — its value exports and its type exports
    When the core package barrel's actual exports are reflected
    Then the barrel's value exports equal the frozen value surface exactly, both directions
    And the barrel's type exports equal the frozen type surface exactly, both directions
    And any symbol added to or removed from the public core reds the guard
