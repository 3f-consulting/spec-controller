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

  Rule: every subpath these packages publish is held to a surface written down for it

    ONE BARREL WAS GUARDED AND THE OTHERS WERE NOT, AND NOBODY DECIDED THAT. The scenario above
    holds the core barrel to a frozen list in both directions, and it has done its job. What it
    could never do is notice a SECOND published surface arriving beside it. Two had:
    `@3f-consulting/spec-controller-core` was also publishing `./internal` — thirteen exports, no
    list, no guard, and a header calling itself "NOT THE PUBLIC v1 CONTRACT" while the manifest
    published it anyway — and `spec-controller` was publishing `./mutation-ratchet`, whose value
    half was pinned and whose type half was not. Neither gap was ruled; both are what a per-barrel
    arrangement does when a barrel is added. Both subpaths have since been un-published, each on
    its own ruling, and this Rule is what made either of them a decision rather than an accident.

    SO THIS IS THE SCENARIO THAT MATTERS, AND SINCE 3F-3229 IT IS THE ONLY ONE HERE. Holding each
    surface to its list is the easy half; reconciling the SET of surfaces the manifests publish
    against the SET somebody wrote a list for is what stops this recurring. A guard wired per barrel
    by hand is a guard whose coverage is a fact nobody is checking — the same
    two-lists-that-never-reconcile shape as 3F-2826, one layer out.

    THE VALUE HALF AND THE TYPE HALF RETIRED AS STATEMENTS, NOT AS CHECKS. Two further scenarios
    stood here until 3F-3229 — one saying a value symbol added to or dropped from a published
    subpath reds the guard, one saying the same of a type added, renamed or dropped. Both remain
    true and both are still reconciled, inside the single arm that now carries an instance of every
    drift this rule detects. What they had that this scenario does not is a separate entry on the
    ledger; and the real barrel they read is the barrel the scenario above already holds to both
    halves in both directions, measured rather than assumed. What no other scenario in this
    repository can see is a subpath ARRIVING with no list written for it, which is why this is the
    one that stayed.

    THE LISTS STAY HAND-WRITTEN, AND THAT IS THE WHOLE MECHANISM. @SCN-API-001's own guard says why:
    a list derived from the barrel is a barrel that redefines its own expectation, green by
    construction forever. Generalising means ONE mechanism over N written-down lists — never one
    mechanism that reads each barrel and agrees with it.

    THE TYPE HALF IS NOT THE VALUE HALF WITH A DIFFERENT NAME. TypeScript types are erased, so a
    runtime reflection cannot see them; and spelling each expected type into a typed literal reds
    on a type DROPPED or RENAMED and stays
    green on one ADDED, because nothing references what nobody wrote. Reading the compiled type surface
    through the compiler API is what closes the add, and this rule's evidence reads it that way.

    @unit @SCN-API-006
    Scenario: a subpath the manifest publishes with no surface written down for it reds the guard
      Given every package manifest in this workspace, and the surfaces written down for this workspace
      When what each manifest publishes to a consumer is read — its publish-time map standing in for its workspace map wholesale, the way npm replaces one with the other rather than merging them
      Then the subpaths those manifests publish are exactly the subpaths a surface is written for, both directions
      And a subpath a manifest publishes with no surface written for it reds the guard
      And a surface written for a subpath no manifest publishes any longer reds the guard

  Rule: a module these packages publish imports only what these packages publish

    THE GUARD BESIDE THIS ONE READS THE MANIFESTS AND STOPS THERE. @SCN-API-006 reconciles the
    subpaths the manifests publish against the subpaths a surface is written for, both directions,
    and it was green on the day the published CLI could not start. It is not wrong — it answers
    "is every published subpath held to a list", and every one was. What nobody asked is the other
    half: whether the modules that TRAVEL IN THE TARBALL import only what those same manifests
    publish.

    3F-2837 UN-PUBLISHED core's `./internal` AND KEPT THE WORKSPACE KEY so in-repo importers go on
    resolving it. That is right, and it is exactly why nothing here could red: every gate in this
    tree resolves through the workspace map, and npm REPLACES that map with the publish-time one
    rather than merging them. `ingest/ingestQualityChecks.ts` imported
    `@3f-consulting/spec-controller-core/internal` and travels in the tarball; the installed binary
    threw ERR_PACKAGE_PATH_NOT_EXPORTED on `balance --help` while every gate stayed green.

    SO THE READING IS OF THE PUBLISHED MODULE SET, NEVER THE SOURCE TREE. A module the workspace
    keeps and never ships — everything under `tests/checks/` — may reach `./internal` freely, which
    is the seam's whole purpose. The rule binds exactly what `files` and the build would ship, which
    is also why a source-tree reading would have to exempt nineteen modules and would then be an
    exemption list nobody maintains.

    @unit @SCN-API-007
    Scenario: a module that travels in the tarball importing a subpath no manifest publishes reds the guard
      Given the modules each package would publish, and the specifiers its manifests offer a consumer
      When each published module's imports of a workspace sibling are read against those specifiers
      Then every such specifier is one the manifests publish
      And a published module importing a workspace subpath the manifests do not publish reds the guard
      And a module this workspace never publishes may import that subpath without redding it

  Rule: the v1 barrel exposes QualityCheckReconciliation for reading, not construction

    @unit @SCN-API-002
    Scenario: an external consumer cannot construct a QualityCheckReconciliation
      Given the frozen v1 barrel exports the QualityCheckReconciliation type but not its constructor
      When external code assembles a QCR-shaped object literal and assigns it to QualityCheckReconciliation
      Then it is a type error — the nominal brand makes the engine the only mint
      And the barrel still exposes the type for reading the reconciliation the engine produced
