// Fixture: the `guard` discrimination (@SCN-VOC-001).
//
// `guard` is canon's DIFFERENT WORD (L5) and also its BANNED SHORTENING (L129), so the
// audit must discriminate rather than blanket-ban. These two identifiers are the fixture
// pair that proves it over real files on disk:
//
//   runGuard        → ["run", "guard"]          — no qualifier co-occurs → FLAGS, action `review`
//   runStaticGuard  → ["run", "static", "guard"] — `static` co-occurs    → passes
//
// The action is `review`, not `rename`: bare, `guard` may be the different word standing
// alone rather than a shortening, so a human looks rather than a sweep renaming it.
//
// This file's own NAME carries `static` + `guard`, so the filename surface passes too —
// deliberate, so the fixture does not itself contribute a bare-guard flag.

/** The bare-`guard` arm — must flag for review. */
export function runGuard(): string {
  return "bare";
}

/** The qualified arm — must not flag. */
export function runStaticGuard(): string {
  return "qualified";
}
