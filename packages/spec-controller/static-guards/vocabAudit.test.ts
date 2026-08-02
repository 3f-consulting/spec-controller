/**
 * Unit coverage for the closed-vocabulary audit engine — the @unit arm of
 * @SCN-VOC-001 (features/vocabulary-audit.feature). Proves word-decomposition,
 * classification (banned / approved / bare-vs-full-term / entry-domain /
 * unknown name-vs-prose), and the manifest/coverage assembly in isolation.
 */

import { describe, it, expect } from "vitest";
import {
  decomposeName,
  isCompositeToken,
  classifyWords,
  auditFiles,
  renderManifestCsv,
  renderCoverageMatrixMarkdown,
  SURFACES,
} from "./vocabAudit.js";

describe("[SCN-VOC-001] decomposeName", () => {
  it("splits camelCase into lowercase words", () => {
    expect(decomposeName("rootProgramme")).toEqual(["root", "programme"]);
  });
  it("splits PascalCase and acronym runs", () => {
    expect(decomposeName("ObligationState")).toEqual(["obligation", "state"]);
    expect(decomposeName("JSONKey")).toEqual(["json", "key"]);
  });
  it("splits kebab, snake, dotted and path delimiters", () => {
    expect(decomposeName("spec-reconciliation")).toEqual(["spec", "reconciliation"]);
    expect(decomposeName("build_supply")).toEqual(["build", "supply"]);
    expect(decomposeName("src/supply.test")).toEqual(["src", "supply", "test"]);
  });
  it("drops digit-only and single-character tokens", () => {
    expect(decomposeName("v2")).toEqual(["v"]); // digits dropped; single letter kept as a raw word
    expect(decomposeName("scenario1")).toEqual(["scenario"]);
  });
});

describe("[SCN-VOC-001] isCompositeToken", () => {
  it("is true for multi-word or delimited tokens", () => {
    expect(isCompositeToken("evidenceObligation")).toBe(true);
    expect(isCompositeToken("build-supply")).toBe(true);
  });
  it("is false for a bare single word", () => {
    expect(isCompositeToken("supply")).toBe(false);
    expect(isCompositeToken("scenario")).toBe(false);
  });
});

describe("[SCN-VOC-001] classifyWords — banned + approved", () => {
  it("flags a banned shortening in name mode with its canonical", () => {
    const [v] = classifyWords(["supply"], "name");
    expect(v!.flagged).toBe(true);
    expect(v!.reason).toBe("banned");
    expect(v!.canonical).toBe("evidence observation");
  });
  it("flags `state` as banned even in prose", () => {
    const v = classifyWords(["the", "state"], "prose").find((w) => w.word === "state");
    expect(v!.flagged).toBe(true);
    expect(v!.canonical).toBe("outcome");
  });
  it("does not flag an approved domain word", () => {
    expect(classifyWords(["scenario"], "name")[0]!.flagged).toBe(false);
    expect(classifyWords(["ledger"], "name")[0]!.flagged).toBe(false);
  });
  it("does not flag an approved generic-technical word", () => {
    expect(classifyWords(["render"], "name")[0]!.flagged).toBe(false);
    expect(classifyWords(["config"], "name")[0]!.flagged).toBe(false);
  });
  it("does not flag the ruled-allowed-outright words", () => {
    for (const w of ["report", "spec", "feature"]) {
      expect(classifyWords([w], "name")[0]!.flagged).toBe(false);
    }
  });
});

describe("[SCN-VOC-001] classifyWords — bare vs full-term shortenings", () => {
  it("flags a bare `obligation` but not `evidence obligation`", () => {
    expect(classifyWords(["obligation"], "name")[0]!.flagged).toBe(true);
    const full = classifyWords(["evidence", "obligation"], "name");
    expect(full.every((v) => !v.flagged)).toBe(true);
  });
  it("flags a bare `ghost` but not `ghost evidence observation`", () => {
    expect(classifyWords(["ghost"], "name")[0]!.flagged).toBe(true);
    const full = classifyWords(["ghost", "evidence", "observation"], "name");
    expect(full.every((v) => !v.flagged)).toBe(true);
  });
  it("flags `unattributed` as a banned word in every context — name and prose", () => {
    // `unattributed` is now a FULLY banned word (operator, 2026-07-24 — treated
    // like `state`): it flags in every context, name and prose. The two former
    // blessings — "unattributed static-guard" and "unattributed evidence
    // observation" — are removed, so a future `unattributed` reds either way.
    // No single canonical (the word split by meaning across the axes), so the
    // banned verdict carries no `new` target.
    expect(classifyWords(["unattributed"], "name")[0]!.flagged).toBe(true);

    // Formerly blessed in the static-guard context — now flags (banned); the
    // co-occurring `static`/`guard` still pass via `guard`'s own qualifier rule.
    const staticGuard = classifyWords(["unattributed", "static", "guard"], "name");
    const sgUnattr = staticGuard.find((v) => v.word === "unattributed")!;
    expect(sgUnattr.flagged).toBe(true);
    expect(sgUnattr.reason).toBe("banned");
    expect(sgUnattr.canonical).toBeNull();
    expect(staticGuard.filter((v) => v.word !== "unattributed").every((v) => !v.flagged)).toBe(true);

    // Formerly blessed in the evidence-observation context — now flags (banned);
    // `evidence`/`observation` still pass (the evidence-observation full term).
    const evObs = classifyWords(["unattributed", "evidence", "observation"], "name");
    const eoUnattr = evObs.find((v) => v.word === "unattributed")!;
    expect(eoUnattr.flagged).toBe(true);
    expect(eoUnattr.reason).toBe("banned");
    expect(evObs.filter((v) => v.word !== "unattributed").every((v) => !v.flagged)).toBe(true);

    // Banned words flag in PROSE too (both modes), like `state` — closing the
    // prose regression hole (a future `unattributed` comment/Gherkin reds).
    const prose = classifyWords(["the", "unattributed", "observation"], "prose").find(
      (v) => v.word === "unattributed"
    )!;
    expect(prose.flagged).toBe(true);
    expect(prose.reason).toBe("banned");
  });
});

describe("[SCN-VOC-001] classifyWords — blessed canon verbs", () => {
  it("does not flag `observe` (the running-guard observer verb)", () => {
    // `observe` is blessed as a verb (manifesto line 25, "an observed
    // piece of evidence") so the surface name `runningStaticGuards` no longer
    // flags. The bare noun `observation` is NOT blessed and still flags.
    expect(classifyWords(["observe"], "name")[0]!.flagged).toBe(false);
    // Build the word list from the identifier itself, never a hand approximation: the
    // real `runningStaticGuards` decomposes to ["running","static","guards"], and an
    // earlier hand-written list omitted `static` — so it passed for the wrong reason
    // (a 3F-1897-family lying fixture). It now passes because `static` co-occurs.
    const surface = classifyWords(decomposeName("observeRunningStaticGuards"), "name");
    expect(surface.every((v) => !v.flagged)).toBe(true);
    expect(classifyWords(["observation"], "name")[0]!.flagged).toBe(true);
    expect(classifyWords(["observations"], "name")[0]!.flagged).toBe(true);
  });
});

describe("[SCN-VOC-001] classifyWords — `guard`: the different word vs the banned shortening", () => {
  // Canon rules BOTH halves, so the audit discriminates rather than blanket-banning:
  // L5 — `guard` "is a different word" (a check protecting an invariant), so its
  // qualified compounds keep it; L129 — bare `guard` is the banned shortening of
  // `static guard`. The six qualifiers below are the ruled set (Steven, 2026-07-19),
  // single-sourced with 3F-1930's prose skip-list.
  const BLESSED_COMPOUNDS: [string, string[]][] = [
    ["static guard", ["static", "guard"]],
    ["both-missing guard", ["both", "missing", "guard"]],
    ["exhaustiveness guard", ["exhaustiveness", "guard"]],
    ["regression guard", ["regression", "guard"]],
    ["existence guard", ["existence", "guard"]],
    ["readability guard", ["readability", "guard"]],
  ];

  it.each(BLESSED_COMPOUNDS)("passes the different-word compound `%s`", (_label, words) => {
    const guardVerdicts = classifyWords(words, "name").filter((v) => v.word.startsWith("guard"));
    expect(guardVerdicts.length).toBeGreaterThan(0);
    expect(guardVerdicts.every((v) => !v.flagged)).toBe(true);
  });

  it("flags a bare `guard` — and for REVIEW, not rename", () => {
    // Bare, `guard` may be the different word standing alone rather than a shortening,
    // so a human looks. It must NOT inherit obligation/observation's rename disposition.
    const bare = classifyWords(["guard"], "name")[0]!;
    expect(bare.flagged).toBe(true);
    expect(bare.reason).toBe("bare-different-word");
    expect(bare.reason).not.toBe("bare-shortening");
  });

  it("flags the plural `guards` too — the shortening is not escaped by inflection", () => {
    const plural = classifyWords(["guards"], "name")[0]!;
    expect(plural.flagged).toBe(true);
    expect(plural.reason).toBe("bare-different-word");
  });

  it("passes anaphora by CO-OCCURRENCE, not strict adjacency", () => {
    // "the static guard ... the guard" — the second, unqualified mention is the same
    // referent. Adjacency would red it; `guard`'s own co-occurrence rule (a qualifier
    // anywhere on the line) passes it, so only a genuinely standalone bare `guard` flags.
    const anaphora = classifyWords(["static", "guard", "the", "guard"], "prose");
    expect(anaphora.filter((v) => v.word === "guard").every((v) => !v.flagged)).toBe(true);
  });

  it("does not change obligation/observation's rename disposition", () => {
    // The new reason is `guard`-only; its siblings keep bare-shortening → rename.
    expect(classifyWords(["obligation"], "name")[0]!.reason).toBe("bare-shortening");
    expect(classifyWords(["observation"], "name")[0]!.reason).toBe("bare-shortening");
  });
});

describe("[SCN-VOC-001] classifyWords — entry domain-use + unknown modes", () => {
  it("does not flag a generic `entry` (map entry)", () => {
    expect(classifyWords(["map", "entry"], "name").find((v) => v.word === "entry")!.flagged).toBe(
      false
    );
  });
  it("flags `entry` where it co-occurs with a domain credit/debit word", () => {
    const v = classifyWords(["evidence", "entry"], "name").find((w) => w.word === "entry");
    expect(v!.flagged).toBe(true);
    expect(v!.reason).toBe("entry-domain");
  });
  it("flags an unknown word in NAME mode but not in PROSE mode", () => {
    // `frobnicate` is in no word-set (domain / allowlist / banned) — a stable
    // non-conforming sentinel (`programme` is now allowlisted).
    expect(classifyWords(["frobnicate"], "name")[0]!.flagged).toBe(true);
    expect(classifyWords(["frobnicate"], "prose")[0]!.flagged).toBe(false);
  });
});

describe("[SCN-VOC-001] auditFiles — the teeth over a fixture corpus", () => {
  const files = [
    { path: "src/buildSupply.ts", content: "export function buildSupply() { return 1; }\n" },
    { path: "src/render/scenarioRenderer.ts", content: "export function renderScenario() {}\n" },
  ];

  it("flags the banned name with its canonical replacement", () => {
    const { manifest } = auditFiles(files);
    const supplyRow = manifest.find((r) => r.current === "supply");
    expect(supplyRow).toBeDefined();
    expect(supplyRow!.new).toBe("evidence observation");
    expect(supplyRow!.action).toBe("rename");
    expect(supplyRow!.symbol).toContain("buildSupply");
  });

  it("does not flag the all-approved name", () => {
    const { manifest } = auditFiles(files);
    const approved = manifest.filter((r) => r.symbol === "renderScenario");
    expect(approved).toEqual([]);
  });
});

describe("[SCN-VOC-001] historical-record exemption — bracketed decision-log rows", () => {
  const doc =
    "# Decisions\n\n" +
    "A live row naming supply must flag.\n\n" +
    "<!-- vocab-audit-exempt:start — historical rename-record -->\n" +
    "The `supply -> evidence observation` rename (state -> outcome) is history.\n\n" +
    "The old `DeclaredCorpus` sibling named the census.\n" +
    "<!-- vocab-audit-exempt:end -->\n\n" +
    "Another live row naming state must flag.\n";
  const files = [{ path: "docs/notes.md", content: doc }];

  it("skips the banned/rejected terms inside a vocab-audit-exempt bracket", () => {
    const { manifest } = auditFiles(files);
    const exemptLines = new Set([5, 6, 8]); // the bracketed rows (1-based)
    const leaked = manifest.filter((r) => exemptLines.has(r.line));
    expect(leaked).toEqual([]);
  });

  it("still flags the same terms on rows OUTSIDE the bracket (conservative scope)", () => {
    const { manifest } = auditFiles(files);
    const flaggedWords = manifest.map((r) => r.current);
    expect(flaggedWords).toContain("supply");
    expect(flaggedWords).toContain("state");
  });
});

describe("[SCN-VOC-001] coverage matrix + rendering", () => {
  it("lists every canonical surface as a matrix row", () => {
    const { matrix } = auditFiles([
      { path: "src/buildSupply.ts", content: "const supply = 1;\n" },
    ]);
    expect(matrix.surfaces.map((s) => s.surface).sort()).toEqual([...SURFACES].sort());
  });

  it("renders a non-empty CSV with the header and a markdown matrix", () => {
    const { manifest, matrix } = auditFiles([
      { path: "src/buildSupply.ts", content: "const supply = 1;\n" },
    ]);
    const csv = renderManifestCsv(manifest);
    expect(csv.split("\n")[0]).toBe("surface,file,line,symbol,current,new,action,decision");
    expect(renderCoverageMatrixMarkdown(matrix)).toContain("code-identifiers");
  });
});

describe("[SCN-VOC-002] coverage-matrix completeness", () => {
  // A corpus that flags on code/identifier surfaces only — no JSON, feature, ci.yml.
  const { matrix } = auditFiles([
    { path: "src/buildSupply.ts", content: "const supply = 1;\n" },
  ]);

  it("includes EVERY canonical surface as a row, in canonical order", () => {
    expect(matrix.surfaces.map((s) => s.surface)).toEqual([...SURFACES]);
  });

  it("keeps a zero-flag surface present with a zero total", () => {
    const jsonKeys = matrix.surfaces.find((s) => s.surface === "json-keys");
    expect(jsonKeys).toBeDefined();
    expect(jsonKeys!.total).toBe(0);
    expect(jsonKeys!.words).toEqual([]);
  });

  it("renders the zero-flag surface as a row in the markdown matrix", () => {
    const md = renderCoverageMatrixMarkdown(matrix);
    expect(md).toMatch(/\| json-keys \| 0 \|/);
  });
});

describe("[SCN-VOC-003] the forbidden kind-label phrase `declared scenario`", () => {
  // The phrase rule: whole-word `declared` immediately before `scenario` reds, so the
  // purged kind-label cannot reappear green. Whole-word — `undeclared` is one token — so
  // canon "undeclared scenario" stays green.

  it("reds on `declared scenario`, renaming to the bare canon `scenario`", () => {
    const v = classifyWords(["declared", "scenario"], "prose").find((w) => w.word === "declared")!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("declared-scenario");
    expect(v.canonical).toBe("scenario");
  });

  it("reds on the plural `declared scenarios` too (the phrase, not the inflection)", () => {
    const v = classifyWords(["declared", "scenarios"], "prose").find((w) => w.word === "declared")!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("declared-scenario");
  });

  it("reds in NAME mode too — a `declaredScenario` composite identifier", () => {
    const v = classifyWords(decomposeName("declaredScenario"), "name").find(
      (w) => w.word === "declared"
    )!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("declared-scenario");
  });

  it("STAYS GREEN on canon `undeclared scenario` — whole-word, not a substring", () => {
    // `undeclared` decomposes to the single token "undeclared" (≠ "declared"), and it is
    // an allowlisted domain-adjacent word, so nothing on the phrase flags.
    const verdicts = classifyWords(decomposeName("undeclared"), "prose").concat(
      classifyWords(["undeclared", "scenario"], "prose")
    );
    expect(verdicts.every((v) => v.reason !== "declared-scenario")).toBe(true);
    expect(verdicts.every((v) => !v.flagged)).toBe(true);
  });

  it("does NOT over-guard: bare `declared` NOT before `scenario` earns no declared-scenario flag", () => {
    // The deferred obligation-side uses ("declared evidence obligation",
    // "declared-vs-observed") must not be swept by this phrase rule — adjacency to
    // `scenario` is the whole trigger.
    const v = classifyWords(["declared", "evidence", "obligation"], "prose").find(
      (w) => w.word === "declared"
    )!;
    expect(v.reason).not.toBe("declared-scenario");
  });

  it("flags a real prose `declared scenario` with action rename, and passes `undeclared scenario`", () => {
    const { manifest } = auditFiles([
      { path: "src/notes.ts", content: "// a declared scenario reconciles here\n" },
      { path: "src/ok.ts", content: "// an undeclared scenario is a phantom\n" },
    ]);
    const red = manifest.find((r) => r.current === "declared" && r.new === "scenario");
    expect(red).toBeDefined();
    expect(red!.action).toBe("rename");
    expect(red!.file).toBe("src/notes.ts");
    // "undeclared scenario" produced no declared-scenario rename row anywhere.
    expect(manifest.some((r) => r.file === "src/ok.ts" && r.new === "scenario")).toBe(false);
  });
});

describe("[SCN-VOC-006] the retired tag `ci-performance`", () => {
  // The regrowth guard: whole-word `ci` immediately before `performance` reds, so the
  // retired tag cannot appear in a tree that today carries zero occurrences of it. It
  // MUST be the phrase, not a banned word — `ci` and `performance` are both approved
  // words, and the canon `ci-run-time` decomposes entirely into approved words.

  it("reds on `ci-performance`, renaming to the canon `ci-run-time`", () => {
    const v = classifyWords(["ci", "performance"], "prose").find((w) => w.word === "ci")!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("ci-performance");
    expect(v.canonical).toBe("ci-run-time");
  });

  it("reds in NAME mode too — a `ciPerformance` composite identifier", () => {
    const v = classifyWords(decomposeName("ciPerformance"), "name").find((w) => w.word === "ci")!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("ci-performance");
    expect(v.canonical).toBe("ci-run-time");
  });

  it("STAYS GREEN on the canon `ci-run-time` — every word approved, no phrase match", () => {
    // `ci` / `run` / `time` are each allowlisted, and `run` is not `performance`, so the
    // canon tag earns no flag of any kind.
    const verdicts = classifyWords(decomposeName("ci-run-time"), "name");
    expect(verdicts.map((v) => v.word)).toEqual(["ci", "run", "time"]);
    expect(verdicts.every((v) => !v.flagged)).toBe(true);
  });

  it("STAYS GREEN on the bare canon quality check `performance`", () => {
    // Bare `@performance` is the canon runtime quality check — the rule is the PHRASE,
    // so `performance` standing alone (or preceded by anything but `ci`) is untouched.
    expect(classifyWords(["performance"], "name").every((v) => !v.flagged)).toBe(true);
    expect(
      classifyWords(decomposeName("performance-threshold-check"), "name").every(
        (v) => v.reason !== "ci-performance"
      )
    ).toBe(true);
  });

  it("does NOT over-guard: bare `ci` NOT before `performance` earns no ci-performance flag", () => {
    // `ci.yml`, `ciRun`, "the CI workflow" must all stay green — adjacency to
    // `performance` is the whole trigger.
    const verdicts = classifyWords(decomposeName("ci.yml"), "name").concat(
      classifyWords(["the", "ci", "workflow"], "prose")
    );
    expect(verdicts.every((v) => v.reason !== "ci-performance")).toBe(true);
  });

  it("flags a real prose `ci-performance` with action rename, and passes `ci-run-time`", () => {
    const { manifest } = auditFiles([
      { path: "src/notes.ts", content: "// the ci-performance tag is retired here\n" },
      { path: "src/ok.ts", content: "// the ci-run-time tag is the canon replacement\n" },
    ]);
    const red = manifest.find((r) => r.current === "ci" && r.new === "ci-run-time");
    expect(red).toBeDefined();
    expect(red!.action).toBe("rename");
    expect(red!.file).toBe("src/notes.ts");
    // `ci-run-time` produced no rename row anywhere.
    expect(manifest.some((r) => r.file === "src/ok.ts")).toBe(false);
  });
});

describe("[SCN-VOC-007] the retired metric word `budget`", () => {
  // The second regrowth guard, and the first that also purges. Unlike @SCN-VOC-003 /
  // @SCN-VOC-006 this is NOT a phrase rule: `budget` has no canon homograph anywhere in
  // this vocabulary, so it is a plain BANNED WORD — the strongest matcher available. It
  // reds in BOTH modes, and the naive singulariser folds `budgets` onto the same stem.

  it("[SCN-VOC-007] reds a bare `budget` in PROSE, renaming to the canon `threshold`", () => {
    const v = classifyWords(["budget"], "prose").find((w) => w.word === "budget")!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe("threshold");
  });

  it("[SCN-VOC-007] reds in NAME mode too — a `complexityBudget` composite identifier", () => {
    const v = classifyWords(decomposeName("complexityBudget"), "name").find(
      (w) => w.word === "budget"
    )!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe("threshold");
  });

  it("[SCN-VOC-007] the plural `budgets` folds onto the same stem — no second entry needed", () => {
    // The singulariser is what makes one BANNED_WORDS entry cover the inflection, so the
    // plural is proven rather than assumed: `complexityBudgets.mjs` was the real filename.
    const v = classifyWords(["budgets"], "prose").find((w) => w.word === "budgets")!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe("threshold");
  });

  it("[SCN-VOC-007] STAYS GREEN on the canon `threshold` — APPROVED, not merely un-flagged", () => {
    // NAME mode is the discriminating one: an unapproved word flags `unknown` there, so a
    // green in NAME mode can only come from `threshold` actually being in the allowlist.
    // Before this rule it flagged `unknown` on stryker.config.json's `thresholds` key.
    expect(classifyWords(["threshold"], "name").every((v) => !v.flagged)).toBe(true);
    expect(classifyWords(["thresholds"], "name").every((v) => !v.flagged)).toBe(true);
    // …and inside the real renamed filename. Scoped to the `thresholds` word rather than
    // asserted over the whole composite: `complexity` is its own, pre-existing `unknown`
    // and is not this rule's business.
    const inFilename = classifyWords(decomposeName("complexityThresholds.mjs"), "name").find(
      (v) => v.word === "thresholds"
    )!;
    expect(inFilename.flagged).toBe(false);
  });

  it("[SCN-VOC-007] flags a real prose `budget` with action rename, and passes `threshold`", () => {
    const { manifest } = auditFiles([
      { path: "src/notes.ts", content: "// the complexity budget is retired here\n" },
      { path: "src/ok.ts", content: "// the complexity threshold is the canon replacement\n" },
    ]);
    const red = manifest.find((r) => r.current === "budget" && r.new === "threshold");
    expect(red).toBeDefined();
    expect(red!.action).toBe("rename");
    expect(red!.file).toBe("src/notes.ts");
    // `threshold` produced no row of any kind.
    expect(manifest.some((r) => r.file === "src/ok.ts")).toBe(false);
  });
});

describe("[SCN-VOC-004] the retired evidence-obligation word `demand`", () => {
  // The third regrowth guard, and the largest purge. Like @SCN-VOC-007 this is a plain
  // BANNED WORD, not a phrase rule: `demand` has no canon homograph, so the strongest
  // matcher is also the correct one, and it reds in BOTH modes. The singulariser folds
  // only `demands` → `demand` and `demanders` → `demander`, so the remaining inflections
  // each need their own entry — asserted below rather than assumed.
  //
  // The LOAD-BEARING assertion is the last one: canon `undemanded` must stay green.

  it("[SCN-VOC-004] reds a bare `demanded` in PROSE, renaming to `evidence obligation`", () => {
    const v = classifyWords(["demanded"], "prose").find((w) => w.word === "demanded")!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe("evidence obligation");
  });

  it("[SCN-VOC-004] reds in NAME mode too — a `demandedStaticGuards` composite identifier", () => {
    const v = classifyWords(decomposeName("demandedStaticGuards"), "name").find(
      (w) => w.word === "demanded"
    )!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe("evidence obligation");
  });

  it("[SCN-VOC-004] reds the bare noun `demand`, and the plural `demands` folds onto its stem", () => {
    // `demands` is the ONE inflection the naive singulariser folds onto `demand`; every
    // assertion in this block is what tells the entries apart from the folds.
    for (const word of ["demand", "demands"]) {
      const v = classifyWords([word], "prose").find((w) => w.word === word)!;
      expect(v.flagged, word).toBe(true);
      expect(v.reason, word).toBe("banned");
      expect(v.canonical, word).toBe("evidence obligation");
    }
  });

  it("[SCN-VOC-004] `demanded` / `demanding` / `demander` do NOT fold — each needs its own entry", () => {
    // Proven, not read: the singulariser strips a trailing `s` and nothing else, so
    // `demanded` and `demanding` reach classifyWords as their own stems, and `demanders`
    // folds to `demander` — which must itself be banned, or the plural lands on a stem
    // that is in no word-set and flags the wrong reason (`unknown`, action `review`).
    for (const word of ["demanded", "demanding", "demander", "demanders"]) {
      const v = classifyWords([word], "prose").find((w) => w.word === word)!;
      expect(v.flagged, word).toBe(true);
      expect(v.reason, word).toBe("banned");
    }
  });

  it("[SCN-VOC-004] STAYS GREEN on the canon outcome `undemanded` — whole-word, not a substring", () => {
    // THE load-bearing assertion. `undemanded` is canon (double-entry-manifesto.md line
    // 42 — the outcome handle for a credit with no matching obligation) and occurs
    // hundreds of times in this tree; a rule that reds it is the exact failure this
    // scenario exists to prevent. It survives by construction, exactly as `undeclared`
    // survives @SCN-VOC-003: decomposeName yields the single token "undemanded", which is
    // neither "demanded" nor any banned stem.
    expect(decomposeName("undemanded")).toEqual(["undemanded"]);
    // NAME mode is the discriminating one — an unapproved word flags `unknown` there, so
    // this green can only come from `undemanded` still being a DOMAIN word.
    expect(classifyWords(["undemanded"], "name").every((v) => !v.flagged)).toBe(true);
    expect(classifyWords(["undemanded"], "prose").every((v) => !v.flagged)).toBe(true);
    // …and inside the real composites it lives in.
    for (const name of ["undemandedGuards", "undemandedBalance", "byOutcome.undemanded", "undemanded-static-guard"]) {
      const v = classifyWords(decomposeName(name), "name").find((w) => w.word === "undemanded")!;
      expect(v.flagged, name).toBe(false);
    }
  });

  it("[SCN-VOC-004] flags a real prose `demanded` with action rename, and passes `undemanded`", () => {
    const { manifest } = auditFiles([
      { path: "src/notes.ts", content: "// the demanded static guard is retired here\n" },
      { path: "src/ok.ts", content: "// the undemanded outcome is canon and stays\n" },
    ]);
    const red = manifest.find((r) => r.current === "demanded" && r.new === "evidence obligation");
    expect(red).toBeDefined();
    expect(red!.action).toBe("rename");
    expect(red!.file).toBe("src/notes.ts");
    // `undemanded` produced no row of any kind, on any surface.
    expect(manifest.some((r) => r.current === "undemanded")).toBe(false);
  });
});
