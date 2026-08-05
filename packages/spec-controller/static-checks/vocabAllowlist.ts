/**
 * The endorsed generic-technical allowlist (starter set, 2026-07-02) — the words this
 * repository has RULED generic, so a name built from them is not domain vocabulary and does
 * not flag.
 *
 * SPLIT OUT OF `vocabWordSets.ts` (3F-2419), which had grown past the 400-line module
 * ceiling. This was the seam to cut: the largest block in that file and the only one
 * depending on nothing else in it. Every consumer imports it from HERE — deliberately not
 * re-exported from `vocabWordSets.ts`, which would have bought the line count back while
 * hiding where the data lives.
 *
 * THE WORD-ORDER IS NOT COSMETIC — it is the order the rulings arrived in, and the tagged
 * comment blocks are the audit trail for those rulings (why `observe` / `running` are
 * allowlisted; why the two retired side-adjectives and `anomaly` were REMOVED). Moving a word
 * without its reason destroys the record, so the reasons travel with the words. Do not "tidy" it.
 */

export const GENERIC_ALLOWLIST: ReadonlySet<string> = new Set([
  // structure / access
  "root", "id", "list", "get", "set", "node", "index", "key", "value", "name",
  "map", "entry", "item",
  // io / format
  "path", "dir", "file", "read", "write", "json", "md", "yaml", "csv", "format",
  "serialise", "parse", "render", "emit",
  // cli / run plumbing
  "cli", "run", "arg", "flag", "option", "config", "cwd", "target", "source",
  "input", "output",
  // test plumbing
  "test", "fixture", "golden", "snapshot", "step", "mock",
  // counting / connectives
  "count", "total", "raw", "delta", "by", "is", "has", "to", "from", "of",
  "build", "add", "check",
  // -------------------------------------------------------------------------
  // The comprehensive generic batch-allowlist (operator-endorsed 2026-07-02).
  // Every remaining generic / plumbing / language / config / process
  // word in the audit residual tail.
  // -------------------------------------------------------------------------
  // test / BDD-step / assertion plumbing
  "ok", "not", "with", "than", "less", "greater", "exists", "expected", "defined",
  "property", "ends", "or", "and", "does", "containing", "passed", "warned", "force",
  "tagged", "block", "tag", "tags", "gherkin", "gwt", "bdd", "sb", "world", "runner",
  "phrase", "capture", "captured", "obs", "tv", "sg", "thunk", "bind", "bbalanced",
  "bunit", "regen", "chunk", "chunks", "original", "byfeature", "proseonly", "sample",
  "foo", "bar", "planted", "spanning", "volume", "ticket", "typecheck", "failing", "gate",
  // JS/TS language + stdlib ops
  "each", "flat", "sort", "sorted", "replace", "pop", "size", "every", "some", "search",
  "char", "upper", "lower", "last", "locale", "compare", "iso", "val", "obj", "elements",
  "groups", "columns", "column", "cell", "table", "col", "part", "buffer", "max", "bound",
  "spaced", "sequence", "promise", "stat", "uint", "directory", "define", "partial", "own",
  "empty", "single", "multi", "non", "quote", "quoted", "literal", "pascal", "camel",
  "snake", "acronym", "shaped", "composite", "stem", "ident", "distinct", "collect", "scan",
  "call",
  // node / fs / process / path / io
  "readdir", "mkdir", "dirname", "basename", "ext", "without", "stdio", "child", "env",
  "cmd", "walk", "mk", "sep", "url", "uri", "ur", "ls", "io", "absolute", "relative",
  "rooted", "prefix",
  // reader-layer technical words — the ingest seam (readers of runner reports + CI config)
  "ingest",
  // git / CI / diff plumbing
  "git", "github", "hub", "head", "ref", "pull", "request", "event", "branches", "fetch",
  "depth", "jobs", "job", "uses", "on", "workflows", "porcelain", "hunk", "checkout",
  "commit", "committed", "since", "pathspec", "pathspecs", "tracked", "deleted", "added",
  "removed", "updated", "held", "renumber", "diff", "offenders", "violation", "violations",
  "change",
  // dates / time
  "date", "timestamp", "utc", "instant", "time", "now",
  // short var-names / abbreviations
  "rec", "ds", "seg", "segs", "za", "rbm", "pbf", "wm", "ldg", "nf", "rs", "req", "reg",
  "exp", "obl", "st", "tok", "prev", "prior", "err", "idx", "bmd", "bjson", "bfrom", "scen",
  "sl", "ses", "xes", "zes", "ches", "shes", "es", "re",
  // report / model structure (generic)
  // `metadata`: the small top-level presentation-metadata object holding the
  // feature titles — a generic-technical structure word (sibling of `meta` / `model` /
  // `document`), NOT a reconciliation/bookkeeping term.
  "metadata",
  "document", "headline", "views", "emitter", "route", "marker", "glyph", "order", "note",
  "title", "label", "detail", "coverage", "schema", "version", "legacy", "saved",
  "rehydrate", "roundtrip", "round", "tripped", "derive", "assemble", "sourced", "sourcing",
  "override", "overrides", "threaded", "persist", "writer", "renderer", "rendered",
  "reformatted", "template", "outline", "example", "purpose", "links", "facts", "reason",
  "reasons", "current", "pattern", "occurrence",
  // the audit tool's OWN identifiers (self-scan)
  "prose", "surface", "surfaces", "classify", "decompose", "singularise", "canonical",
  "alias", "rejected", "reserved", "banned", "generic", "allowlist", "allowed", "ruled",
  "term", "domain", "word", "words", "heading", "flagged", "approved", "segment", "segments",
  "shortening", "scoping", "conforming", "decision", "breakdown", "grand", "exempt", "exempted",
  // project / process meta (docs)
  "issue", "issues", "pr", "project", "projects", "management", "ruling", "operator",
  "review", "rename", "candidate", "technical", "decisions", "assumptions", "questions",
  "goals", "ideas", "blog", "competitors", "scope", "discover", "discovered", "detect",
  "invoked", "invokes", "directly", "direct", "main", "execute", "performance", "comment",
  "comments", "command", "commands", "marks", "register", "registry",
  // external tool / lang / config tokens (docs + config surfaces)
  "java", "typescript", "webdriver", "flow", "rail", "portal", "python", "users", "steven",
  "story", "saver", "pnpm", "workspace", "tsconfig", "esbuild", "ecma", "engines", "manager",
  // The tsconfig compiler option that shares the retired noun's spelling is NOT here: it is
  // a @SCN-VOC-018 homograph, greened by POSITION (its `compiler` key path) rather than by
  // membership, so an allowlist entry would green the retired noun everywhere too (3F-2329).
  "dev", "dependencies", "compiler", "resolution", "indexed", "unchecked",
  "access", "skip", "exclude", "include", "lib", "strict", "allow", "description", "use",
  "ai", "driven", "readme", "support", "supported", "subissues", "ui", "response", "rate",
  "verb", "vs", "programme", "portable", "session", "lockfiles", "relates", "companions",
  // plain-English connectives escalated on non-D prose
  "all", "no", "only", "over", "but", "are", "at", "here", "there", "we", "yet", "the",
  "per", "other", "existing", "full", "bare", "next", "first", "simple", "across", "point",
  "starting", "compared",
  // -------------------------------------------------------------------------
  // Approved domain-adjacent tail (operator ruling 2026-07-02): each
  // COULD be a reconciliation/attribution concept but is ruled generic/allowlist.
  // -------------------------------------------------------------------------
  "unit", "integration", "runtime", "lint", "real", "exemption", "exemptions",
  "unwired", "absent", "external", "enforced", "cited", "coded", "uncoded", "equivalent",
  "behaviour", "bearing", "subject", "missing", "required", "tally", "tallies",
  // Outcome/level VALUE words (domain-by-reference in the manifesto; allowlisting harmless).
  "satisfied", "present",
  // NB: the two retired SIDE-ADJECTIVES and `anomaly` were REMOVED from this allowlist.
  // They are non-canon side-adjectives / an invented synonym, not generics: the sides are
  // DEBIT / CREDIT, and a non-`satisfied` credit-side Quality Check Reconciliation is a
  // RECONCILING ITEM, not an "anomaly". They were swept from every identifier surface, so
  // they now reach an HONEST zero (not an allowlisted one).
  // -------------------------------------------------------------------------
  // Refined-wordset operator-endorsed core (2026-07-02) — the
  // test-framework, generic-code and tooling words the operator ruled generic
  // Full list; a handful overlap the batch above.
  // -------------------------------------------------------------------------
  // test-framework (vitest / chai / cucumber)
  "expect", "describe", "assert", "equal", "be", "given", "when", "then", "before",
  "contain", "includes", "deep", "have", "cucumber", "vitest",
  // generic-code (general-purpose programming / plumbing / ops)
  "spawn", "opts", "stderr", "exit", "payload", "occurrences", "bin", "message",
  "cells", "starts",
  // tooling (the audit tool's own naming)
  "vocab", "vocabulary",
  // the double-entry metaphor
  "double",
  // -------------------------------------------------------------------------
  // Residual generic tail (2026-07-02) — the remaining plumbing /
  // structure / abbreviation words in the audit residual, all ruled generic
  // (none carry a reconciliation / bookkeeping meaning). Closes to the endorsed
  // 41-word residual (13 rename-spine + 28 domain-adjacent).
  // -------------------------------------------------------------------------
  "abs", "action", "after", "argv", "array", "artefacts", "artifacts", "assertion",
  "attributed", "audit", "bad", "base", "body", "buf", "checking", "ci",
  "code", "codes", "colon", "content", "contents", "context", "ctx", "decide",
  "dest", "directive", "doc", "docs", "encoding", "error", "ex", "excluded",
  "exec", "extract", "filename", "filter", "find", "flush", "fmt", "fmts",
  "handle", "header", "headers", "ids", "it", "join", "kept", "length",
  "line", "lines", "lnt", "locator", "log", "manifest", "markdown", "match",
  "matrix", "meta", "mkdtemp", "mode", "model", "modes", "package", "pair",
  "pairs", "parsed", "pkg", "plan", "planned", "push", "record", "recursive",
  "reduce", "regenerated", "region", "regions", "rel", "relativize", "repo", "resolve",
  "rest", "result", "results", "rm", "rmd", "row", "rows", "script",
  "scripts", "section", "sections", "seen", "sha", "slice", "slug", "split",
  "src", "start", "status", "stdout", "store", "stringify", "sync", "text",
  "tmpdir", "token", "tokens", "trb", "trim", "untagged", "usg", "warning",
  "warnings", "companion", "companions",
  // Residual generics surfaced by the slice-5 sweep (2026-07-02). The retired NEGATIVE was
  // here until 3F-2329 adopted its canon row; `BANNED_WORDS` is consulted ahead of
  // `isApproved`, so leaving it would be a false record of a ruling this slice reversed —
  // exactly why the retired outcome handle's entry went at 3F-2300.
  "zero", "based",
  // -------------------------------------------------------------------------
  // Portable-paths plumbing generics (2026-07-02 drift-restore).
  // Legitimate cross-repo path machinery, not domain drift:
  //   realpath — fs.realpathSync (resolve symlinks so /var → /private/var matches)
  //   os       — node:os (tmpdir)
  //   foreign  — the "foreign cwd" test concept (cwd ≠ target repo)
  //   mac      — macOS (the /var → /private/var symlink note)
  // -------------------------------------------------------------------------
  "realpath", "os", "foreign", "mac",
  // -------------------------------------------------------------------------
  // The three-grain re-term generics — plumbing/structure words surfaced
  // by the container re-term + the bidirectional-reconciler sweep, ruled generic (no
  // bookkeeping meaning): `group`/`suffix` (renderer grouping); `uncited`/`matched`
  // (reconciler predicates); `eo` (evidence-obligation short var); `both` (both-missing
  // adjective); `citations` (the byScn credit list).
  // -------------------------------------------------------------------------
  "group", "suffix", "uncited", "matched", "eo", "both", "citations",
  // -------------------------------------------------------------------------
  // "running" — deliberate descriptor: the running-guard observer,
  // `runningStaticChecks` / `runningStaticCheckCount`. It names the guards that RUN (the
  // required-versus-running distinction that replaced the `CI` mechanism leak), NOT a silent
  // pass — a tagged, endorsed allowlist entry, not an incidental generic.
  // -------------------------------------------------------------------------
  "running",
  // -------------------------------------------------------------------------
  // "observe" — deliberate verb: the running-guard OBSERVER,
  // `runningStaticChecks`. The manifesto defines an evidence
  // observation as "an OBSERVED piece of evidence" (double-entry-manifesto.md
  // line 25); `observe` is that verb form — the act of reading the running CI
  // guards into evidence observations. A tagged, endorsed allowlist entry, NOT a
  // silent pass. Distinct from the retired past-adjective `observed` (swept above:
  // the sides are DEBIT / CREDIT, never an "observed side") and from the bare noun
  // `observation` (still flags per operator ruling — report-only).
  // -------------------------------------------------------------------------
  "observe",
  // -------------------------------------------------------------------------
  // @SCN-VOC-007 — `threshold` is the CANON metric word that replaces the retired
  // the retired metric word (a threshold is a ceiling, not something spent down). Allowlisted
  // rather than left to pass by accident: the rename target of a banned word must be
  // APPROVED, or the purge trades a flagged word for an `unknown` one and the audit's
  // green means nothing. Before this entry it flagged `unknown` on stryker.config.json's
  // `thresholds` key — a green nobody chose. The plural folds onto this stem.
  // -------------------------------------------------------------------------
  "threshold",
]);
