/**
 * The one-time closed-vocabulary audit engine (slice 4 of the
 * [spec-controller] Outputs & vocabulary increment). REPORT-ONLY — this module
 * is NOT wired into CI and files no standing gate (operator ruling 2026-07-02:
 * the audit is a completeness instrument, re-run once at slice 5 to prove zero).
 *
 * It scans every file by default (the only exclusions — node_modules, .git,
 * lockfiles — live in the CLI's file walk), decomposes every name into words
 * (camelCase / kebab / snake / dotted / path → words) and checks each word
 * against the approved word-set. Burden flips: a word in neither the manifesto
 * domain vocabulary nor the endorsed generic-technical allowlist FLAGS.
 *
 * Two scanning modes keep the audit useful without flooding on ordinary English:
 * NAME mode (identifiers / keys / tags / filenames) applies the full closed
 * vocabulary; PROSE mode (comments / docs / strings / titles) examines only the
 * controlled domain vocabulary, leaving ordinary English alone — but any
 * COMPOSITE token embedded in prose is escalated to NAME mode. Banned words,
 * bare-shortenings and rejected-aliases flag in BOTH modes; unknown words flag
 * only in NAME mode.
 *
 * Design: the closed-vocabulary audit tool. Word-set authority: the double-entry
 * manifesto's mapping table.
 *
 * @SCN-VOC-001 / @SCN-VOC-002 / @SCN-VOC-003 / @SCN-VOC-004 / @SCN-VOC-006 /
 * @SCN-VOC-007 — features/vocabulary-audit.feature.
 */

// ---------------------------------------------------------------------------
// Word-sets (the approved vocabulary + the banned shortenings)
//
// The sets THEMSELVES live in `vocabWordSets.ts` (3F-2311, @SCN-VOC-001 Read).
// The split is along the seam that actually moves: the vocabulary is a RULING
// RECORD that grows every time the operator rules a word in or out, while this
// file is the ENGINE and changes only when a MATCHER changes. Both are re-exported
// here unchanged, so every call site still imports them from `vocabAudit.js` —
// the move is invisible from the outside, which is what makes it a Read.
// ---------------------------------------------------------------------------

import {
  BANNED_WORDS,
  DOMAIN_WORDS,
  ENTRY_DOMAIN_COMPANIONS,
  FULL_TERM_ONLY,
  GENERIC_ALLOWLIST,
  GUARD_QUALIFIERS,
  REJECTED_ALIAS_TO_CANONICAL,
  RESERVED_WORDS,
  RULED_ALLOWED,
} from "./vocabWordSets.js";

export {
  BANNED_WORDS,
  DOMAIN_WORDS,
  ENTRY_DOMAIN_COMPANIONS,
  FULL_TERM_ONLY,
  GENERIC_ALLOWLIST,
  GUARD_QUALIFIERS,
  REJECTED_ALIAS_TO_CANONICAL,
  RESERVED_WORDS,
  RULED_ALLOWED,
};

/** Naive singulariser — plural of an approved/domain word is the same vocabulary. */
function singularise(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (/(ses|xes|zes|ches|shes)$/.test(word) && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

// ---------------------------------------------------------------------------
// Surfaces (coverage-matrix rows — always all present)
// ---------------------------------------------------------------------------

export type Surface =
  | "code-identifiers"
  | "comments"
  | "code-strings"
  | "markdown-output-strings"
  | "json-keys"
  | "feature"
  | "step-defs"
  | "filenames"
  | "docs"
  | "ci.yml"
  | "fixtures-goldens";

/** The canonical, ordered surface list — every one appears in the matrix. */
export const SURFACES: readonly Surface[] = [
  "code-identifiers",
  "comments",
  "code-strings",
  "markdown-output-strings",
  "json-keys",
  "feature",
  "step-defs",
  "filenames",
  "docs",
  "ci.yml",
  "fixtures-goldens",
];

export type Mode = "name" | "prose";
export type FlagReason =
  | "banned"
  | "bare-shortening"
  | "unknown"
  | "entry-domain"
  // A word that is canon's DIFFERENT WORD used bare, so it may be legitimate rather
  // than a shortening — a human decides. Dispositioned `review`, never `rename`.
  | "bare-different-word"
  // @SCN-VOC-003 — the forbidden kind-label PHRASE: whole-word `declared` immediately
  // before `scenario`. Renamed to the bare canon `scenario`.
  | "declared-scenario"
  // @SCN-VOC-006 — the retired tag PHRASE: whole-word `ci` immediately before
  // `performance`. Renamed to the canon `ci-run-time`.
  | "ci-performance";

// ---------------------------------------------------------------------------
// Core classification
// ---------------------------------------------------------------------------

/** Decompose a name into lowercase words (camelCase / kebab / snake / dotted / path). */
export function decomposeName(name: string): string[] {
  const words: string[] = [];
  for (const part of name.split(/[^A-Za-z0-9]+/)) {
    if (part === "") continue;
    const spaced = part
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/([A-Za-z])([0-9])/g, "$1 $2")
      .replace(/([0-9])([A-Za-z])/g, "$1 $2");
    for (const w of spaced.split(/\s+/)) {
      if (w === "" || /^[0-9]+$/.test(w)) continue;
      words.push(w.toLowerCase());
    }
  }
  return words;
}

/** True when the token is a deliberate multi-word / delimited name. */
export function isCompositeToken(token: string): boolean {
  if (/[._\-/]/.test(token)) return true;
  return decomposeName(token).length > 1;
}

export interface WordVerdict {
  word: string;
  flagged: boolean;
  reason?: FlagReason;
  canonical?: string | null;
}

function isApproved(word: string): boolean {
  return DOMAIN_WORDS.has(word) || GENERIC_ALLOWLIST.has(word) || RULED_ALLOWED.has(word);
}

function fullTermSatisfied(word: string, words: string[], i: number, present: Set<string>): boolean {
  switch (word) {
    case "obligation":
    case "observation":
      return singularise(words[i - 1] ?? "") === "evidence";
    case "guard":
      // CO-OCCURRENCE, not adjacency (like the `ghost` arm below — a `present.has`
      // set-membership test over the whole sequence, not a `words[i - 1]` neighbour).
      // Anaphora — "the static guard ... the guard" — is the same referent, so the
      // second, unqualified mention passes; only a genuinely standalone bare `guard`
      // flags. Its action is `review`, not `rename` (see FlagReason below): bare, it
      // may be the different word used alone rather than a shortening.
      return GUARD_QUALIFIERS.some((qualifier) => qualifier.every((w) => present.has(w)));
    case "ghost":
      return present.has("evidence") && present.has("observation");
    default:
      return false;
  }
}

/**
 * Classify a decomposed word sequence. `modes` is one mode for the whole
 * sequence, or a per-word array. Full-term words (obligation/observation/…) are
 * judged by adjacency within the sequence; `entry` domain-use by co-occurrence.
 */
export function classifyWords(words: string[], modes: Mode | Mode[]): WordVerdict[] {
  const modeAt = (i: number): Mode => (Array.isArray(modes) ? (modes[i] ?? "prose") : modes);
  const present = new Set(words.map(singularise));
  const companionAt = (j: number): boolean =>
    ENTRY_DOMAIN_COMPANIONS.has(singularise(words[j] ?? ""));

  return words.map((word, i): WordVerdict => {
    const stem = singularise(word);
    const canonical = REJECTED_ALIAS_TO_CANONICAL[word] ?? REJECTED_ALIAS_TO_CANONICAL[stem] ?? null;
    if (word.length < 2) return { word, flagged: false };
    if (RESERVED_WORDS.has(word) || RESERVED_WORDS.has(stem)) return { word, flagged: false };

    if (BANNED_WORDS.has(word) || BANNED_WORDS.has(stem)) {
      return { word, flagged: true, reason: "banned", canonical };
    }

    // @SCN-VOC-003 — the forbidden kind-label PHRASE "declared scenario": whole-word
    // `declared` IMMEDIATELY followed by `scenario` (singular or plural). It fires in
    // BOTH modes (like a banned phrase), so the label reds wherever it hides — a comment,
    // a Gherkin line, a doc, a string — not only in an identifier. Whole-word by
    // construction: `undeclared` decomposes to the single token "undeclared" (≠ "declared"),
    // so canon "undeclared scenario" stays green. The rename target is the bare canon
    // `scenario` (which already means the real, declared kind). Precedes the isApproved /
    // mode gates below so the phrase reds even though bare `scenario` is an approved word
    // and bare `declared` passes in prose.
    if (word === "declared" && singularise(words[i + 1] ?? "") === "scenario") {
      return { word, flagged: true, reason: "declared-scenario", canonical: "scenario" };
    }

    // @SCN-VOC-006 — the retired tag PHRASE "ci-performance": whole-word `ci`
    // IMMEDIATELY followed by `performance`. A REGROWTH guard — the tree carries zero
    // occurrences, so this rule exists to keep the retired tag out, not to purge it.
    // It must be the PHRASE, never a banned word: `ci` and `performance` are BOTH
    // individually allowlisted, and banning either would red the canon — bare
    // `@performance` is the runtime quality check, and `ci.yml` / `ciRun` are ordinary.
    // Fires in BOTH modes (a retired tag hides in a comment, a doc, an identifier, a
    // string, a filename or a config key alike; a bare Gherkin TAG LINE is out of reach
    // because scanFile skips tag lines wholesale as structural — an all-rules
    // segmentation decision `declared-scenario` shares). The rename target is `ci-run-time`,
    // which decomposes to `ci` / `run` / `time` — all approved, and `run` is not
    // `performance`, so canon stays green by construction. Sits beside the
    // `declared-scenario` arm, AHEAD of the isApproved / mode gates below: that
    // ordering is exactly what lets a phrase of two approved words red at all.
    if (word === "ci" && singularise(words[i + 1] ?? "") === "performance") {
      return { word, flagged: true, reason: "ci-performance", canonical: "ci-run-time" };
    }

    if (FULL_TERM_ONLY.has(stem)) {
      if (fullTermSatisfied(stem, words, i, present)) return { word, flagged: false };
      // `guard` gets its own disposition — it does NOT inherit obligation/observation's
      // bare-shortening → rename, because bare it may be the different word standing alone.
      const reason: FlagReason = stem === "guard" ? "bare-different-word" : "bare-shortening";
      return { word, flagged: true, reason, canonical };
    }

    // Entry domain-use flags only when a debit/credit/evidence companion is
    // IMMEDIATELY adjacent — a genuine ledger-posting entry. Line-level
    // co-occurrence ("double-entry" prose near "debit") is the
    // metaphor name, not an identifier, and stays allowed (2026-07-02).
    if (word === "entry" && (companionAt(i - 1) || companionAt(i + 1))) {
      return { word, flagged: true, reason: "entry-domain", canonical: null };
    }

    if (isApproved(word) || isApproved(stem)) return { word, flagged: false };

    if (modeAt(i) === "name") return { word, flagged: true, reason: "unknown", canonical: null };
    return { word, flagged: false };
  });
}

// ---------------------------------------------------------------------------
// Extraction (file → segments)
// ---------------------------------------------------------------------------

export interface Segment {
  surface: Surface;
  file: string;
  line: number;
  mode: Mode;
  /** The raw name (name mode) or prose text (prose mode) of this segment. */
  text: string;
}

interface TsRegion {
  kind: "code" | "comment" | "string";
  line: number;
  text: string;
}

/** Split TypeScript source into code / comment / string regions (line-tracked). */
export function splitTsRegions(content: string): TsRegion[] {
  const regions: TsRegion[] = [];
  let i = 0;
  let line = 1;
  let buf = "";
  let bufLine = 1;
  let state: "code" | "line-comment" | "block-comment" | "string" | "template" = "code";
  let quote = "";

  const flush = (kind: TsRegion["kind"]): void => {
    if (buf !== "") regions.push({ kind, line: bufLine, text: buf });
    buf = "";
    bufLine = line;
  };

  while (i < content.length) {
    const c = content[i]!;
    const next = content[i + 1] ?? "";
    if (c === "\n") line++;

    if (state === "code") {
      if (c === "/" && next === "/") {
        flush("code");
        state = "line-comment";
        buf = "//";
        bufLine = line;
        i += 2;
        continue;
      }
      if (c === "/" && next === "*") {
        flush("code");
        state = "block-comment";
        buf = "/*";
        bufLine = line;
        i += 2;
        continue;
      }
      if (c === '"' || c === "'") {
        flush("code");
        state = "string";
        quote = c;
        buf = c;
        bufLine = line;
        i++;
        continue;
      }
      if (c === "`") {
        flush("code");
        state = "template";
        buf = c;
        bufLine = line;
        i++;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    if (state === "line-comment") {
      if (c === "\n") {
        flush("comment");
        state = "code";
        i++;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    if (state === "block-comment") {
      buf += c;
      if (c === "*" && next === "/") {
        buf += "/";
        i += 2;
        flush("comment");
        state = "code";
        continue;
      }
      i++;
      continue;
    }

    if (state === "string") {
      buf += c;
      if (c === "\\") {
        buf += next;
        i += 2;
        continue;
      }
      if (c === quote) {
        flush("string");
        state = "code";
      }
      i++;
      continue;
    }

    // template
    buf += c;
    if (c === "\\") {
      buf += next;
      i += 2;
      continue;
    }
    if (c === "`") {
      flush("string");
      state = "code";
    }
    i++;
  }
  flush(state === "code" ? "code" : state === "line-comment" || state === "block-comment" ? "comment" : "string");
  return regions;
}

const IDENT_RE = /[A-Za-z_$][A-Za-z0-9_$]*/g;

/** Emit a name segment per identifier in a code region. */
function identSegments(region: TsRegion, file: string, surface: Surface): Segment[] {
  const segs: Segment[] = [];
  const lines = region.text.split("\n");
  lines.forEach((text, idx) => {
    let m: RegExpExecArray | null;
    IDENT_RE.lastIndex = 0;
    while ((m = IDENT_RE.exec(text)) !== null) {
      segs.push({ surface, file, line: region.line + idx, mode: "name", text: m[0] });
    }
  });
  return segs;
}

/** Emit a prose segment per non-blank line of a comment/string/prose region. */
function proseSegments(region: TsRegion | { text: string; line: number }, file: string, surface: Surface): Segment[] {
  const segs: Segment[] = [];
  region.text.split("\n").forEach((text, idx) => {
    if (text.trim() === "") return;
    segs.push({ surface, file, line: region.line + idx, mode: "prose", text });
  });
  return segs;
}

function classifyPath(relPath: string): {
  kind: "feature" | "steps" | "render-ts" | "ts" | "json" | "yaml" | "docs" | "other";
  fixture: boolean;
} {
  const p = relPath.replace(/\\/g, "/");
  const base = p.split("/").pop() ?? p;
  const fixture =
    p.includes("tests/fixtures/") || p.startsWith("runs/") || /golden|snapshot/i.test(p);
  let kind: ReturnType<typeof classifyPath>["kind"] = "other";
  if (p.endsWith(".feature")) kind = "feature";
  else if (p.includes("tests/steps/") && p.endsWith(".ts")) kind = "steps";
  else if ((p.includes("src/render/") || p.includes("src/output/")) && p.endsWith(".ts")) kind = "render-ts";
  else if (p.endsWith(".ts")) kind = "ts";
  else if (base === "package.json") kind = "docs";
  else if (p.endsWith(".json")) kind = "json";
  else if (p.endsWith(".yml") || p.endsWith(".yaml")) kind = "yaml";
  else if (p.endsWith(".md") || base === "README.md" || p.startsWith("doc/")) kind = "docs";
  return { kind, fixture };
}

/** Filename segment(s): the path minus its final extension, name-mode. */
function filenameSegment(relPath: string): Segment {
  const withoutExt = relPath.replace(/\.[A-Za-z0-9]+$/, "");
  return { surface: "filenames", file: relPath, line: 0, mode: "name", text: withoutExt };
}

/** Structural scenario-ID tokens (@SCN-FFF-NNN) — an ID scheme, not vocabulary. */
const SCN_TOKEN_RE = /@?SCN-[A-Z0-9]{2,5}-\d+/g;

/**
 * The HISTORICAL-RECORD exemption (operator ruling 2026-07-02)
 * — the SECOND scoped meta-mention exemption, a doc-scale sibling of the whole-file
 * `SELF_EXEMPT_PATHS` in vocabAuditCli.ts.
 *
 * A decision log is an append-only historical record. Some
 * of its rows exist *to name superseded vocabulary*: the rename-mapping / rejected-
 * alias tables (`supply → evidence observation`, `state → outcome`, `requirement →
 * evidence obligation`, …) and the design entries that record now-renamed
 * identifiers (`DeclaredCorpus`, `declaredCorpusSection`, …). Auditing those rows
 * for the very old terms they document is a guaranteed false positive — and no
 * future vocabulary sweep should flatten them (that is what mangled the mapping
 * tables into tautologies and destroyed the record they carry).
 *
 * So an author brackets exactly those rows with a paired HTML-comment marker; the
 * scanner skips the bracketed lines. The scope is deliberately narrow — ONLY the
 * bracketed historical rows are exempt, so every other line of the decision log
 * (and every new entry) is still audited for vocabulary drift. Nothing is exempt
 * without an explicit marker.
 */
const HISTORICAL_EXEMPT_START = /<!--\s*vocab-audit-exempt:start/;
const HISTORICAL_EXEMPT_END = /vocab-audit-exempt:end\s*-->/;

/** Line indices (0-based) inside a `vocab-audit-exempt` bracket — skipped by the scan. */
function historicalExemptLines(lines: string[]): Set<number> {
  const exempt = new Set<number>();
  let inside = false;
  lines.forEach((text, idx) => {
    if (!inside && HISTORICAL_EXEMPT_START.test(text)) {
      inside = true;
      exempt.add(idx);
      return;
    }
    if (inside) {
      exempt.add(idx);
      if (HISTORICAL_EXEMPT_END.test(text)) inside = false;
    }
  });
  return exempt;
}

/** Scan one file's content into classifiable segments (surface + mode aware). */
export function scanFile(relPath: string, rawContent: string): Segment[] {
  const content = rawContent.replace(SCN_TOKEN_RE, " ");
  const { kind, fixture } = classifyPath(relPath);
  const segs: Segment[] = [filenameSegment(relPath)];
  const override = (s: Surface): Surface => (fixture ? "fixtures-goldens" : s);
  const lines = content.split("\n");

  if (kind === "feature") {
    lines.forEach((text, idx) => {
      if (text.trim() === "") return;
      if (text.trim().startsWith("@")) return; // structural tags — not vocabulary
      segs.push({ surface: override("feature"), file: relPath, line: idx + 1, mode: "prose", text });
    });
    return segs;
  }

  if (kind === "steps" || kind === "render-ts" || kind === "ts") {
    const identSurface: Surface = kind === "steps" ? "step-defs" : "code-identifiers";
    const commentSurface: Surface = kind === "steps" ? "step-defs" : "comments";
    const stringSurface: Surface = kind === "steps" ? "step-defs" : kind === "render-ts" ? "markdown-output-strings" : "code-strings";
    for (const region of splitTsRegions(content)) {
      if (region.kind === "code") segs.push(...identSegments(region, relPath, override(identSurface)));
      else if (region.kind === "comment") segs.push(...proseSegments(region, relPath, override(commentSurface)));
      else segs.push(...proseSegments(region, relPath, override(stringSurface)));
    }
    return segs;
  }

  if (kind === "json" || kind === "docs" && (relPath.split("/").pop() === "package.json")) {
    const surface: Surface = kind === "json" ? "json-keys" : "docs";
    lines.forEach((text, idx) => {
      const keyMatch = /^\s*"([^"]+)"\s*:/.exec(text);
      if (keyMatch) segs.push({ surface: override(surface), file: relPath, line: idx + 1, mode: "name", text: keyMatch[1]! });
      // string values on the line → prose
      const rest = keyMatch ? text.slice(keyMatch[0].length) : text;
      const valMatch = /:\s*"([^"]*)"/.exec(text) ?? /"([^"]*)"/.exec(rest);
      if (valMatch && valMatch[1]!.trim() !== "") {
        segs.push({ surface: override(surface), file: relPath, line: idx + 1, mode: "prose", text: valMatch[1]! });
      }
    });
    return segs;
  }

  if (kind === "yaml") {
    const surface: Surface = relPath.includes(".github/") ? "ci.yml" : "docs";
    lines.forEach((text, idx) => {
      const keyMatch = /^\s*-?\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*:/.exec(text);
      if (keyMatch) segs.push({ surface: override(surface), file: relPath, line: idx + 1, mode: "name", text: keyMatch[1]! });
      const value = keyMatch ? text.slice(keyMatch[0].length) : text.replace(/^\s*#/, "");
      if (value.trim() !== "") segs.push({ surface: override(surface), file: relPath, line: idx + 1, mode: "prose", text: value });
    });
    return segs;
  }

  // docs (markdown / README) and everything else → prose per line.
  // Historical-record rows bracketed by a `vocab-audit-exempt` marker (the decision
  // log's rename-mapping / rejected-alias documentation) are skipped — see
  // HISTORICAL_EXEMPT_START above.
  const surface: Surface = kind === "docs" ? "docs" : "docs";
  const exempt = historicalExemptLines(lines);
  lines.forEach((text, idx) => {
    if (text.trim() === "") return;
    if (exempt.has(idx)) return;
    segs.push({ surface: override(surface), file: relPath, line: idx + 1, mode: "prose", text });
  });
  return segs;
}

// ---------------------------------------------------------------------------
// Audit (segments → manifest + coverage matrix)
// ---------------------------------------------------------------------------

export interface ManifestRow {
  surface: Surface;
  file: string;
  line: number;
  /** The containing name/token the flagged word came from. */
  symbol: string;
  /** The flagged word. */
  current: string;
  /** The canonical replacement (rejected-alias → canonical), or "". */
  new: string;
  /** rename | review. */
  action: string;
  /** Pre-marked operator ruling for exceptions/ambiguities. */
  decision: string;
}

export interface SurfaceCoverage {
  surface: Surface;
  total: number;
  words: { word: string; count: number }[];
}

export interface CoverageMatrix {
  surfaces: SurfaceCoverage[];
  distinctWords: string[];
}

export interface AuditResult {
  manifest: ManifestRow[];
  matrix: CoverageMatrix;
}

function actionFor(reason: FlagReason): string {
  return reason === "banned" ||
    reason === "bare-shortening" ||
    reason === "declared-scenario" ||
    reason === "ci-performance"
    ? "rename"
    : "review";
}

function decisionFor(reason: FlagReason): string {
  switch (reason) {
    case "unknown":
      return "allowlist-candidate? (generic-technical vs non-conforming — operator ruling)";
    case "entry-domain":
      return "entry: domain-use (debit/credit) vs generic map-entry — operator ruling";
    default:
      return "";
  }
}

/**
 * A code-shaped token embedded in prose (mixed-case, or a `_` / `.` / `/`
 * delimiter) — a deliberate identifier being discussed, escalated to NAME mode.
 * A pure-kebab token is NOT escalated: `read-only` / `present-but-failing` are
 * English or sanctioned kebab values, not identifiers (a banned/domain word
 * inside them still flags, because those flag in prose mode too).
 */
function isCodeShapedToken(token: string): boolean {
  // Disposition D (operator ruling 2, 2026-07-02): ONLY a genuine snake_case /
  // camelCase / ACRONYMWord token escalates to NAME scanning — a `.` / `/`
  // path / URL / dotted-accessor does NOT (it is prose punctuation, not an
  // author-chosen identifier). NOT a mere leading capital (sentence-case
  // "The", "Given"). Banned / rejected-alias words still flag in prose mode.
  return /_/.test(token) || /[a-z][A-Z]/.test(token) || /[A-Z]{2,}[a-z]/.test(token);
}

/** Split a prose line into per-word modes, tracking the token each word came from. */
function proseWordSequence(text: string): { words: string[]; modes: Mode[]; origins: string[] } {
  const words: string[] = [];
  const modes: Mode[] = [];
  const origins: string[] = [];
  for (const tok of text.split(/[^A-Za-z0-9_$./-]+/)) {
    if (tok === "") continue;
    const composite = isCodeShapedToken(tok);
    for (const w of decomposeName(tok)) {
      words.push(w);
      modes.push(composite ? "name" : "prose");
      origins.push(tok);
    }
  }
  return { words, modes, origins };
}

/** Audit a set of segments into the manifest + coverage matrix. */
export function auditSegments(segments: Segment[]): AuditResult {
  const manifest: ManifestRow[] = [];

  for (const seg of segments) {
    if (seg.mode === "name") {
      const words = decomposeName(seg.text);
      classifyWords(words, "name").forEach((v) => {
        if (!v.flagged) return;
        manifest.push({
          surface: seg.surface,
          file: seg.file,
          line: seg.line,
          symbol: seg.text,
          current: v.word,
          new: v.canonical ?? "",
          action: actionFor(v.reason!),
          decision: decisionFor(v.reason!),
        });
      });
    } else {
      const { words, modes, origins } = proseWordSequence(seg.text);
      classifyWords(words, modes).forEach((v, i) => {
        if (!v.flagged) return;
        manifest.push({
          surface: seg.surface,
          file: seg.file,
          line: seg.line,
          symbol: origins[i] ?? v.word,
          current: v.word,
          new: v.canonical ?? "",
          action: actionFor(v.reason!),
          decision: decisionFor(v.reason!),
        });
      });
    }
  }

  return { manifest, matrix: buildCoverageMatrix(manifest) };
}

/** Build the coverage matrix — EVERY surface appears, even with a zero count. */
export function buildCoverageMatrix(manifest: ManifestRow[]): CoverageMatrix {
  const perSurface = new Map<Surface, Map<string, number>>();
  for (const s of SURFACES) perSurface.set(s, new Map());
  const distinct = new Set<string>();

  for (const row of manifest) {
    const wordMap = perSurface.get(row.surface)!;
    wordMap.set(row.current, (wordMap.get(row.current) ?? 0) + 1);
    distinct.add(row.current);
  }

  const surfaces: SurfaceCoverage[] = SURFACES.map((surface) => {
    const wordMap = perSurface.get(surface)!;
    const words = [...wordMap.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
    const total = words.reduce((n, w) => n + w.count, 0);
    return { surface, total, words };
  });

  return { surfaces, distinctWords: [...distinct].sort() };
}

/** Convenience: scan a set of files and audit the resulting segments. */
export function auditFiles(files: { path: string; content: string }[]): AuditResult {
  const segments: Segment[] = [];
  for (const f of files) segments.push(...scanFile(f.path, f.content));
  return auditSegments(segments);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Render the per-name manifest as CSV. */
export function renderManifestCsv(rows: ManifestRow[]): string {
  const header = "surface,file,line,symbol,current,new,action,decision";
  const body = rows.map((r) =>
    [r.surface, r.file, r.line, r.symbol, r.current, r.new, r.action, r.decision].map(csvCell).join(",")
  );
  return [header, ...body].join("\n") + "\n";
}

/** Render the coverage matrix as markdown (every surface as a row). */
export function renderCoverageMatrixMarkdown(matrix: CoverageMatrix): string {
  const lines: string[] = [];
  lines.push("# Vocabulary audit — coverage matrix (surfaces × flagged words)");
  lines.push("");
  lines.push(`Distinct flagged words: ${matrix.distinctWords.length}. Every scanned surface is listed (a zero-count row catches a scan miss).`);
  lines.push("");
  lines.push("| Surface | Flags | Distinct words | Words (count) |");
  lines.push("|---|---:|---:|---|");
  for (const s of matrix.surfaces) {
    const breakdown = s.words.map((w) => `${w.word} (${w.count})`).join(", ") || "—";
    lines.push(`| ${s.surface} | ${s.total} | ${s.words.length} | ${breakdown} |`);
  }
  lines.push("");
  const grand = matrix.surfaces.reduce((n, s) => n + s.total, 0);
  lines.push(`**Total flagged names: ${grand}.**`);
  lines.push("");
  return lines.join("\n");
}
