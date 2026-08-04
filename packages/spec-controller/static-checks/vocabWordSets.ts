/**
 * The closed vocabulary itself — the approved word-sets, the banned shortenings,
 * the rejected-alias mapping and the qualifier tables the audit engine judges
 * against. Split out of `vocabAudit.ts` (3F-2311, @SCN-VOC-001 Read) so the
 * ENGINE and the VOCABULARY grow independently: the engine is logic and changes
 * when a matcher changes; this file is a ruling record and changes every time the
 * operator rules a word in or out.
 *
 * THE RETIRED WORDS THEMSELVES ARE NO LONGER HERE (@SCN-VOC-010, 3F-2330). `BANNED_WORDS`
 * now DERIVES canon's blocked-vocabulary rows from `blockedVocabulary.md`, the vendored
 * copy of the canon table, so this file holds no list for canon to drift from. What stays
 * is what canon's appendix does not carry: the glossary-level rejected aliases, the
 * approved sets, the qualifier tables, and the per-inflection rename targets.
 *
 * BEHAVIOUR-PRESERVING BY CONSTRUCTION, with ONE stated exception. Every set below is
 * byte-for-byte what `vocabAudit.ts` held, and `vocabAudit.ts` re-exports all nine, so no
 * call site moved. The exception is `BANNED_WORDS`, which is now derived: it gains
 * the plural, because the vendored table spells the inflection canon spells and the parser
 * does not fold plurals. The naive singulariser already folds that plural onto its stem, so
 * the extra member changes no verdict — said out loud rather than left for a reader to
 * discover the sets are no longer identical.
 *
 * The word-order inside each set is not cosmetic — it is the order the
 * rulings arrived in, and the tagged comment blocks are the audit trail for those
 * rulings (why `observe` / `running` are allowlisted; why `declared` / `observed` /
 * `anomaly` were REMOVED). Moving a word without its reason destroys the record,
 * so the reasons travel with the words. Do not "tidy" these lists.
 *
 * SELF-EXEMPT. This file literally enumerates the banned vocabulary, so it is
 * listed in `vocabAuditCli.ts`'s `SELF_EXEMPT_PATHS` alongside `vocabAudit.ts` —
 * the same meta-mention exemption (operator ruling 2026-07-02). Auditing it for
 * the very words it exists to name is a guaranteed false positive.
 *
 * @SCN-VOC-001 / @SCN-VOC-002 / @SCN-VOC-003 / @SCN-VOC-004 / @SCN-VOC-006 /
 * @SCN-VOC-007 / @SCN-VOC-010 — features/vocabulary-audit.feature.
 */

import { BLOCKED_VOCABULARY_ROWS, bannedWordsOf } from "./blockedVocabulary.js";
import { renameTargets } from "./renameTargets.js";

/** Manifesto domain vocabulary — the mapping-table terms, decomposed to words. */
export const DOMAIN_WORDS: ReadonlySet<string> = new Set([
  "scenario", "evidence", "attribution", "ledger", "kind", "sub",
  "balancing", "off", "balance", "summary", "balanced",
  "out", "reconciling", "reconciled", "reconciliation", "reconcile", "application",
  "watermelon", "static", "verdict", "posting", "debit", "credit",
  "journal", "provenance",
  // The outcome/verdict rationalisation (locked 2026-07-02): `state` → `outcome`.
  "outcome",
  // The three-grain Reconciliation re-term: `quality-check` replaces the retired `(kind,
  // level)` grid; `phantom`/`suspense` kinds; and the `cites-*` outcomes join the
  // reconciler. `trial`, `account` and `level` retire with the container re-term (Evidence/Scenario/Quality-Check
  // Reconciliation replace trial-balance / account / sub-account). `kind` and `sub`
  // are KEPT (legitimate reuse: `ScenarioKind`; `qualityCheckReconciliations` / the sub-issue-gate).
  //
  // The retired outcome handle WAS HERE, kept by @SCN-VOC-004 as the canon credit-side one.
  // 3F-2300 renamed that handle to `no-evidence-obligation` and @SCN-VOC-004 now asserts the
  // old word FLAGGED, so its vendored row is `adopted` and the derivation bans it. The entry
  // is removed rather than left: `BANNED_WORDS` is consulted ahead of `isApproved`, so it was
  // already unreachable — a word listed as approved that can never be reached is a false
  // record of a ruling this scenario reversed. The canon handle needs no entry of its own; it
  // decomposes to `no` / `evidence` / `obligation` and stays green by the adjacency
  // @SCN-VOC-012 pins.
  "quality", "check", "phantom", "suspense", "cites",
]);

/** The endorsed generic-technical allowlist (starter set, 2026-07-02). */
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
  "dev", "dependencies", "declaration", "compiler", "resolution", "indexed", "unchecked",
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
  // NB: `declared` / `observed` / `anomaly` were REMOVED from this allowlist.
  // They are non-canon side-adjectives / an invented synonym, not generics: the sides
  // are DEBIT / CREDIT (never "declared side" / "observed side"), and a non-`satisfied`
  // credit-side Quality Check Reconciliation is a RECONCILING ITEM, not an "anomaly".
  // They were swept from every identifier surface, so they now reach an HONEST zero
  // (not an allowlisted one). `declared` may still appear as a plain VERB in prose —
  // that is fine; the audit only flags identifier-shaped / composite tokens.
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
  // Residual generics surfaced by the slice-5 sweep (2026-07-02).
  "zero", "based", "undeclared",
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

/** Ruled allowed OUTRIGHT (2026-07-02): report, spec, feature. */
export const RULED_ALLOWED: ReadonlySet<string> = new Set(["report", "spec", "feature"]);

/**
 * The rejected aliases canon records under its GLOSSARY entries — a different section
 * from the blocked-vocabulary appendix, and deliberately so: the appendix says it holds
 * "the repeat offenders — the verbs and coinages that regrow", while "the rarer,
 * context-specific bans" stay with the term they belong to. So these are not a second
 * copy of the vendored table; they are the other half of canon, which has no table to
 * vendor. Adding one here is still a ruling that belongs in this file.
 */
const GLOSSARY_ALIAS_BANS: readonly string[] = [
  "supply", "execution", "executions", "state",
  // `unattributed` is a FULLY banned word (operator, 2026-07-24 — treated like
  // `state`, not a bespoke NAME-only home). It flags in every context, name AND
  // prose, closing the prose regression hole the runtime-axis slice purged. No
  // single canonical: the word split by meaning across the axes (`uncited` static /
  // `suspense` account / `cites-no-scenario` outcome), so the rename target is
  // by-meaning — the `banned`/`rename` verdict carries no `new` column.
  "unattributed",
  // Rejected aliases: `requirement(s)` → evidence obligation;
  // `oob` → out-of-balance (opaque abbreviation of the verdict value).
  "requirement", "oob",
];

/**
 * Banned shortenings + rejected aliases that ALWAYS flag (both modes).
 *
 * DERIVED, NOT WRITTEN (@SCN-VOC-010, 3F-2330). The canon-appendix half of this set is
 * PARSED OUT OF `blockedVocabulary.md`, the vendored copy of canon's table, so there is no
 * code-side list of retired words for canon to disagree with. Retiring a plain word is an
 * edit to that table and nothing else — not a promise this file keeps, a fact it cannot
 * break. Only rows the operator marked `adopted` enter the set, which is what lets this
 * repository ship green while the deferred rows' 2,272 occurrences are paid off by their
 * own tickets.
 *
 * THE MATCHERS ARE NOT DERIVED, and must not become so. The table names the arm each row
 * takes; `bannedWordsOf` feeds only the `whole-word` rows, so the phrase-adjacency arms of
 * @SCN-VOC-005 / @SCN-VOC-006 and the qualifier-gated `guard` arm below keep judging their
 * own terms in `vocabAudit.ts`, in their existing order. Canon owns which words are
 * retired; this code owns how each one matches.
 */
export const BANNED_WORDS: ReadonlySet<string> = new Set([
  ...GLOSSARY_ALIAS_BANS,
  ...bannedWordsOf(BLOCKED_VOCABULARY_ROWS),
]);

/**
 * The VOCABULARY-AUDIT SUBSYSTEM's own vocabulary (@SCN-VOC-016, 3F-2378).
 *
 * A NAMED SET OF ITS OWN, deliberately not folded into `DOMAIN_WORDS` — that set is the
 * RECONCILIATION domain (Evidence Obligation, Ledger, Scenario), while these are the words
 * the vocabulary CHECKER reasons about: adoption statuses, matchers, corpora, the vendored
 * table. An allowlist holding both stops answering "why is this word allowed?", the only
 * question it exists to answer (operator ruling, 2026-08-04).
 *
 * They needed ruling because the files using them stopped being exempt: until 3F-2378 the
 * subsystem was invisible to the audit, so its own vocabulary was never judged.
 */
export const VOCAB_AUDIT_WORDS: ReadonlySet<string> = new Set([
  // the vendored canon table and its triage
  "blocked", "vendored", "glossary", "bans", "adopted", "adoption", "adopt",
  "deferred", "deferral", "triage", "triaged", "retired", "applicable",
  // the matchers, the grammar they judge, and the corpora/surfaces read
  "matcher", "matchers", "qualifier", "qualifiers", "qualified", "grammar",
  "adjacency", "anaphora", "compounds", "plural", "noun", "decoration",
  "corpus", "authored", "structural", "trimmed", "blanked", "tier",
]);

/**
 * EVERY word this repository approves, from all four sources at once (@SCN-VOC-016). One
 * named thing rather than an OR-chain at the call site: the engine asks "is this approved?"
 * and WHICH list says so is this module's business. A fifth source is an edit here alone.
 */
export const APPROVED_WORDS: ReadonlySet<string> = new Set([
  ...DOMAIN_WORDS, ...GENERIC_ALLOWLIST, ...RULED_ALLOWED, ...VOCAB_AUDIT_WORDS,
]);

/** Words approved only inside their full manifesto term; bare → flag. */
export const FULL_TERM_ONLY: ReadonlySet<string> = new Set([
  "obligation", "observation", "ghost",
  // `guard` is BOTH canon's different word (L5 — a check protecting an invariant)
  // and its banned shortening (L129 — of `static guard`). So it is approved only
  // when a ruled qualifier co-occurs; see GUARD_QUALIFIERS + fullTermSatisfied.
  "guard",
]);

/**
 * The ruled qualifiers that make `guard` the DIFFERENT WORD rather than the banned
 * shortening (Steven, 2026-07-19). Each entry is the set of words that must all
 * co-occur — `both-missing` decomposes to two tokens, so it needs both.
 *
 * Single-sourced with 3F-1930's prose skip-list: change one, change the other.
 */
export const GUARD_QUALIFIERS: readonly (readonly string[])[] = [
  ["static"],
  ["both", "missing"],
  ["exhaustiveness"],
  ["regression"],
  ["existence"],
  ["readability"],
];

/**
 * ECMAScript / TypeScript reserved words + language-level globals. These are
 * grammar, not author-chosen names — the extractor does not treat them as
 * vocabulary (the same class of scanning-scope exclusion as punctuation, file
 * extensions, and structural feature-tags). NOT an allowlist of domain-adjacent
 * or stdlib semantic words — those still flag as operator allowlist-candidates.
 */
export const RESERVED_WORDS: ReadonlySet<string> = new Set([
  "const", "let", "var", "function", "return", "export", "import", "as", "default",
  "type", "interface", "class", "extends", "implements", "new", "this", "super",
  "void", "null", "undefined", "true", "false", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "throw", "try", "catch", "finally",
  "typeof", "instanceof", "in", "await", "async", "yield", "public", "private",
  "protected", "abstract", "enum", "namespace", "declare", "module", "exports",
  "require", "delete", "keyof", "infer", "satisfies", "readonly", "string",
  "number", "boolean", "object", "any", "unknown", "never", "symbol", "bigint",
  "console", "process", "nan", "globalthis", "constructor", "prototype", "arguments",
  // structural: the scenario-ID scheme abbreviation + source file extensions (not vocabulary)
  "scn", "ts", "js", "tsx", "jsx", "mjs", "cjs", "yml",
  // Ruled generic-technical (@SCN-VOC-016, 3F-2378), surfaced when the vocabulary
  // subsystem's files stopped being exempt. Each is a word any codebase would use for the
  // same thing — which is what "generic" means here, not "we could not classify it".
  "inside", "work", "select", "selected", "exported", "form", "shape", "answer", "end", "clean", "following", "concat", "placeholder", "summarise", "machinery", "disk", "always", "plain", "whole", "derived", "replaced", "named", "scanned", "failed", "why", "refuses", "reordered", "splice", "control", "complexity", "exceptions", "artefact", "probe", "sole", "said", "leaked", "blessed", "historical", "synthetic", "violating", "ignored", "fault", "faults", "self",
]);

/** Domain words whose presence in a name makes a co-occurring `entry` a domain use. */
export const ENTRY_DOMAIN_COMPANIONS: ReadonlySet<string> = new Set([
  "evidence", "debit", "credit", "obligation", "observation", "supply",
]);

/**
 * Rejected-alias → canonical (the manifest `new` column), PARSED FROM `renameTargets.md`.
 *
 * The map used to be written here as an object literal whose KEYS were the retired words —
 * inlined data in a code file, which is what kept this module on the audit's exempt list.
 * A whole-file exemption over a mixed file hides a USE behind a MENTION, and that is what
 * let 3F-2300's renamed handle survive unseen. Relocating the data to a pure-data table is
 * what lets this file be audited like any other (@SCN-VOC-016, 3F-2378).
 *
 * Not the canon table: `blockedVocabulary.md` is a vendored copy stating one replacement per
 * row, while these targets are per-inflection. `blockedVocabulary.ts` records the division —
 * canon owns which words are retired, this repository owns what each one becomes.
 */
export const REJECTED_ALIAS_TO_CANONICAL: Readonly<Record<string, string>> = renameTargets();
