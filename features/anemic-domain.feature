@ANM
Feature: A concept's behaviour never drains into a procedural layer beside it

  A concept module co-locates its type with the pure functions over it, and it owns its
  own behaviour. The failure mode is the anemic split: the behaviour is lifted out into
  a module beside it named for a procedural layer — an *-operations, *-service or
  *-manager — leaving the concept as inert data. Canon names it
  (technical-design/functional-domain-modelling.md, and the fitness-functions.md ruling
  of 2026-08-05) and this static check reds it, so the rule stops being one everyone has
  to remember.

  THE TIMING IS THE POINT. 3F-2416 scoped the module-size ceiling off the concept
  modules, which removed the one force actively PUSHING behaviour out of them: under the
  ceiling, hiving a rich aggregate's operations into a second module was the cheapest
  route to green. With that pressure gone, the next drain would be an unforced error —
  and an unforced error nobody notices is exactly what a check is for. This one fences
  the door the scope-off opened.

  THE SCOPE IS A DOMAIN DIRECTORY, NOT THE WORD. A renderService under render/ is
  ordinary and legitimate; the claim is about where behaviour lives relative to its
  concept, not about a word being banned. A check that redded the word wherever it
  appeared would be a spell-checker, and the first legitimate *Service at an edge would
  get it switched off. The second example below plants exactly that case, so the scope
  is asserted rather than assumed.

  WHAT THIS CHECK DOES NOT ESTABLISH. It reds a NAME. Behaviour can drain out of a
  concept into a module called anything at all, and a green here is not evidence the
  domain is not anemic — that judgement stays with the reviewer. Canon asks for exactly
  this much ("a filename-signature static check is enough to fence the obvious case"),
  and the value is that the unmissable version of the mistake becomes unmissable.

  WHY THE CHECK IS NAMED `lint:anemic-domain`. runningStaticChecks observes a script only
  when its name carries an observed prefix (`lint:` / `guard:`). A name outside that set
  would run in CI while being structurally invisible to the ledger — a real quality check
  kept off the books, which is exactly where a watermelon hides. Named so it IS observed;
  the `@lint=lint:anemic-domain` tag below is then what keeps it out of the suspense row
  as an uncited static check. Observed AND required is the balanced state. (The sibling
  purity checks — @DPG, @EPG — deliberately chose the opposite: @unit-only, enforced by
  pnpm test, off the ledger. That is right for them and wrong here, because this check's
  whole subject is the design conformance the tool sells.)

  Rule: a procedural-layer module under a domain directory reds the anemic-domain check

    @unit @integration @lint=lint:anemic-domain @SCN-ANM-001
    Scenario: a procedural-layer module beside the domain concepts reds the build
      Given every module tracked in the real spec-controller repository
      When the anemic-domain check runs over the real tree
      Then a module named for a procedural layer under a domain directory is a violation
      And the same name outside a domain directory is not
      And a module named for its concept is not
      And the check passes clean over the real tree
