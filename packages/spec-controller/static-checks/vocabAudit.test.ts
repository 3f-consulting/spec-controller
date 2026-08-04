/**
 * Unit coverage for the closed-vocabulary audit engine — the @unit arm of
 * @SCN-VOC-001 (features/vocabulary-audit.feature). Proves word-decomposition,
 * classification (banned / approved / bare-vs-full-term / entry-domain /
 * unknown name-vs-prose), and the manifest/coverage assembly in isolation.
 */

import { describe, it, expect } from "vitest";
import { RETIRED, CANONICAL, RETIRED_COMPOSITE } from "../../../tests/fixtures/vocab/retiredTerms.js";
import {
  decomposeName, isCompositeToken, classifyWords, auditFiles, renderManifestCsv,
  renderCoverageMatrixMarkdown, scanFile, SURFACES,
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
    // blessings — "unattributed static check" and "unattributed evidence
    // observation" — are removed, so a future `unattributed` reds either way.
    // No single canonical (the word split by meaning across the axes), so the
    // banned verdict carries no `new` target.
    expect(classifyWords(["unattributed"], "name")[0]!.flagged).toBe(true);

    // Formerly blessed in the qualified-guard context — now flags (banned); the
    // co-occurring `both`/`missing`/`guard` still pass via `guard`'s own qualifier rule.
    // The qualifier here was `static` until @SCN-VOC-005 retired "static guard" as a
    // phrase; `both-missing` is the surviving ruled qualifier whose own words are BOTH
    // allowlisted, so the probe still proves exactly what it did in NAME mode — a banned
    // word reds while every other word beside it, the qualified `guard` included, does not.
    const qualifiedGuard = classifyWords(["unattributed", "both", "missing", "guard"], "name");
    const sgUnattr = qualifiedGuard.find((v) => v.word === "unattributed")!;
    expect(sgUnattr.flagged).toBe(true);
    expect(sgUnattr.reason).toBe("banned");
    expect(sgUnattr.canonical).toBeNull();
    expect(qualifiedGuard.filter((v) => v.word !== "unattributed").every((v) => !v.flagged)).toBe(
      true
    );

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
    // piece of evidence") so the surface name `runningStaticChecks` no longer
    // flags. The bare noun `observation` is NOT blessed and still flags.
    expect(classifyWords(["observe"], "name")[0]!.flagged).toBe(false);
    // Build the word list from the identifier itself, never a hand approximation: the
    // real `runningStaticChecks` decomposes to ["running","static","checks"], and an
    // earlier hand-written list omitted `static` — so it passed for the wrong reason
    // (a 3F-1897-family lying fixture). Tracking the identifier through 3F-2294's
    // rename to `runningStaticChecks` is that same rule applied.
    const surface = classifyWords(decomposeName("observeRunningStaticChecks"), "name");
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

describe("[SCN-VOC-007] the retired metric word", () => {
  // The second regrowth guard, and the first that also purges. Unlike @SCN-VOC-003 /
  // @SCN-VOC-006 this is NOT a phrase rule: the term has no canon homograph anywhere in this
  // vocabulary, so it is a plain BANNED WORD — the strongest matcher available. It reds in
  // BOTH modes, and the naive singulariser folds its plural onto the same stem.

  it("[SCN-VOC-007] reds the retired metric word in PROSE, renaming to the canon threshold", () => {
    const v = classifyWords([RETIRED.metric], "prose").find((w) => w.word === RETIRED.metric)!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe(CANONICAL.metric);
  });

  it("[SCN-VOC-007] reds in NAME mode too, inside a composite identifier", () => {
    const composite = decomposeName(RETIRED_COMPOSITE.metricIdentifier);
    const v = classifyWords(composite, "name").find((w) => w.word === RETIRED.metric)!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe(CANONICAL.metric);
  });

  it("[SCN-VOC-007] the plural folds onto the same stem — no second entry needed", () => {
    // The singulariser is what makes one BANNED_WORDS entry cover the inflection, so the
    // plural is proven rather than assumed: `complexityBudgets.mjs` was the real filename.
    const v = classifyWords([RETIRED.metricPlural], "prose").find((w) => w.word === RETIRED.metricPlural)!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe(CANONICAL.metric);
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

  it("[SCN-VOC-007] flags the retired metric word in real prose with action rename, and passes threshold", () => {
    const { manifest } = auditFiles([
      { path: "src/notes.ts", content: `// the complexity ${RETIRED.metric} is retired here\n` },
      { path: "src/ok.ts", content: "// the complexity threshold is the canon replacement\n" },
    ]);
    const red = manifest.find((r) => r.current === RETIRED.metric && r.new === CANONICAL.metric);
    expect(red).toBeDefined();
    expect(red!.action).toBe("rename");
    expect(red!.file).toBe("src/notes.ts");
    // `threshold` produced no row of any kind.
    expect(manifest.some((r) => r.file === "src/ok.ts")).toBe(false);
  });
});

describe("[SCN-VOC-004] the retired evidence-obligation word", () => {
  // The third regrowth guard, and the largest purge. Like @SCN-VOC-007 this is a plain
  // BANNED WORD, not a phrase rule: the noun has no canon homograph, so the strongest
  // matcher is also the correct one, and it reds in BOTH modes. The singulariser folds only
  // the two plurals onto their stems, so the remaining inflections each need their own
  // entry — asserted below rather than assumed.
  //
  // WHICH WORD IS CANON IS WHAT MOVED (3F-2300, superseding 3F-2281). This block used to
  // close on "the old handle must stay green"; 3F-2300 renamed that handle to
  // `no-evidence-obligation`, so the retired word is now asserted FLAGGED and the NEW canon
  // word is asserted GREEN — both, because either alone is green by erosion.

  it("[SCN-VOC-004] reds the retired past participle in PROSE, renaming to the canon term", () => {
    const v = classifyWords([RETIRED.obligationPast], "prose").find((w) => w.word === RETIRED.obligationPast)!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe(CANONICAL.obligation);
  });

  it("[SCN-VOC-004] reds in NAME mode too, inside a composite identifier", () => {
    const composite = decomposeName(RETIRED_COMPOSITE.obligationPastIdentifier);
    const v = classifyWords(composite, "name").find((w) => w.word === RETIRED.obligationPast)!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("banned");
    expect(v.canonical).toBe(CANONICAL.obligation);
  });

  it("[SCN-VOC-004] reds the bare noun, and its plural folds onto the same stem", () => {
    // The plural is the ONE inflection the singulariser folds onto the noun; every assertion
    // in this block is what tells the entries apart from the folds.
    for (const word of [RETIRED.obligationNoun, RETIRED.obligationNounPlural]) {
      const v = classifyWords([word], "prose").find((w) => w.word === word)!;
      expect(v.flagged, word).toBe(true);
      expect(v.reason, word).toBe("banned");
      expect(v.canonical, word).toBe(CANONICAL.obligation);
    }
  });

  it("[SCN-VOC-004] the past, present and agent forms do NOT fold — each needs its own entry", () => {
    // Proven, not read: the singulariser strips a trailing `s` and nothing else, so
    // the past and present participles reach classifyWords as their own stems, and the agent
    // plural folds to its stem — which must itself be banned, or it lands on a stem in no
    // word-set and flags the wrong reason (`unknown`, action `review`).
    const forms = [RETIRED.obligationPast, RETIRED.obligationVerb,
      RETIRED.obligationAgent, RETIRED.obligationAgentPlural];
    for (const word of forms) {
      const v = classifyWords([word], "prose").find((w) => w.word === word)!;
      expect(v.flagged, word).toBe(true);
      expect(v.reason, word).toBe("banned");
    }
  });

  it("[SCN-VOC-004] REDS the retired outcome handle, renaming to the canon handle", () => {
    // THE HALF THAT MOVED. The handle was canon until 3F-2300 and this assertion held it
    // GREEN; the handle for a credit with no matching obligation is `no-evidence-obligation`
    // now, so the vendored row is ADOPTED and @SCN-VOC-010's derivation makes the old word
    // banned with no edit to any word-list. Whole-word by construction: decomposeName yields
    // a single token, so the ban cannot be a substring hit on the past participle.
    expect(decomposeName(RETIRED.outcomeHandle)).toEqual([RETIRED.outcomeHandle]);
    // BOTH MODES — a retired word hides in an identifier and in a comment alike.
    for (const mode of ["name", "prose"] as const) {
      const v = classifyWords([RETIRED.outcomeHandle], mode).find((w) => w.word === RETIRED.outcomeHandle)!;
      expect(v.flagged, mode).toBe(true);
      expect(v.reason, mode).toBe("banned");
      expect(v.canonical, mode).toBe(CANONICAL.outcomeHandle);
    }
    // …and inside the real composites it used to live in, each of which the sweep removed.
    const composites = [`${RETIRED.outcomeHandle}Guards`, `${RETIRED.outcomeHandle}Balance`,
      `byOutcome.${RETIRED.outcomeHandle}`, `${RETIRED.outcomeHandle}-static-check`];
    for (const name of composites) {
      const v = classifyWords(decomposeName(name), "name").find((w) => w.word === RETIRED.outcomeHandle)!;
      expect(v.flagged, name).toBe(true);
      expect(v.reason, name).toBe("banned");
    }
  });

  it("[SCN-VOC-004] STAYS GREEN on the canon outcome `no-evidence-obligation`, in both its forms", () => {
    // THE OTHER HALF — and NOT the interesting one alone. "The canon word is not flagged" is
    // equally true of a tree with the whole matcher deleted, which is the green-by-
    // erosion shape a one-sided swap of this scenario would have produced. It earns its place
    // only PAIRED with the flagged assertions above.
    expect(decomposeName("no-evidence-obligation")).toEqual(["no", "evidence", "obligation"]);
    // NAME mode is the discriminating one — an unapproved word flags `unknown` there.
    for (const name of ["no-evidence-obligation", "noEvidenceObligation"]) {
      expect(classifyWords(decomposeName(name), "name").every((v) => !v.flagged), name).toBe(true);
    }
  });

  it("[SCN-VOC-004] over a corpus: the past participle AND the outcome handle both rename; the canon handle yields no row", () => {
    const { manifest } = auditFiles([
      { path: "src/notes.ts", content: `// the ${RETIRED.obligationPast} static check is retired here\n` },
      { path: "src/retired.ts", content: `// the ${RETIRED.outcomeHandle} outcome was renamed away\n` },
      { path: "src/ok.ts", content: "// the no-evidence-obligation outcome is canon and stays\n" },
    ]);
    const red = manifest.find((r) => r.current === RETIRED.obligationPast && r.new === CANONICAL.obligation);
    expect(red).toBeDefined();
    expect(red!.action).toBe("rename");
    expect(red!.file).toBe("src/notes.ts");
    // The retired handle names its replacement — a `rename` row, not a bare `review`.
    const retired = manifest.find((r) => r.current === RETIRED.outcomeHandle);
    expect(retired).toBeDefined();
    expect(retired!.new).toBe("no-evidence-obligation");
    expect(retired!.action).toBe("rename");
    expect(retired!.file).toBe("src/retired.ts");
    // The canon handle produced no row of any kind, on any surface.
    expect(manifest.some((r) => r.file === "src/ok.ts")).toBe(false);
  });
});

describe("[SCN-VOC-005] the retired class name `static guard`", () => {
  // The fourth regrowth guard, and the one that closes the retired-term slice. A PHRASE
  // rule like @SCN-VOC-003 / @SCN-VOC-006 and unlike the banned words @SCN-VOC-004 /
  // @SCN-VOC-007: NEITHER half can be banned. `static` is a manifesto DOMAIN word (the
  // static axis) and `guard` is canon's DIFFERENT WORD, kept deliberately by the Rule at
  // the top of features/vocabulary-audit.feature.
  //
  // The ORDERING is the rule. `static` is APPROVED, so an arm placed after the
  // FULL_TERM_ONLY / isApproved gates would never be reached and the whole class would
  // stay green by accident. The last three assertions are the negatives that make the
  // arm honest: canon `static check`, bare `guard` under its REMAINING qualifiers, and a
  // `guard:`-prefixed CI script NAME (a value, not vocabulary — 3F-1852's scope).

  it("[SCN-VOC-005] reds `static guard` in PROSE, renaming to the canon `static check`", () => {
    const v = classifyWords(["static", "guard"], "prose").find((w) => w.word === "static")!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("static-guard");
    expect(v.canonical).toBe("static check");
  });

  it("[SCN-VOC-005] reds the plural `static guards` too (the phrase, not the inflection)", () => {
    const v = classifyWords(["static", "guards"], "prose").find((w) => w.word === "static")!;
    expect(v.flagged).toBe(true);
    expect(v.reason).toBe("static-guard");
    expect(v.canonical).toBe("static check");
  });

  it("[SCN-VOC-005] reds in NAME mode too — a `staticGuard` composite identifier", () => {
    for (const name of ["staticGuard", "staticGuards", "static-guards", "StaticGuardTotals"]) {
      const v = classifyWords(decomposeName(name), "name").find((w) => w.word === "static")!;
      expect(v.flagged, name).toBe(true);
      expect(v.reason, name).toBe("static-guard");
      expect(v.canonical, name).toBe("static check");
    }
  });

  it("[SCN-VOC-005] ORDERING: the arm fires even though `static` is an APPROVED domain word", () => {
    // The teeth of the placement. `static` is in DOMAIN_WORDS, so bare it is green — which
    // is precisely why an arm sitting after the FULL_TERM_ONLY / isApproved gates would
    // never be reached and the whole class would stay green by accident. Bare-green plus
    // phrase-red is the pair that can only hold if the arm precedes those gates.
    expect(classifyWords(["static"], "name").every((v) => !v.flagged)).toBe(true);
    expect(classifyWords(["static", "guard"], "name")[0]!.flagged).toBe(true);
  });

  it("[SCN-VOC-005] leaves the following `guard` GREEN — one occurrence, one row", () => {
    // The arm flags the `static` token and returns, so `guard` is judged by the unchanged
    // full-term machinery, where `["static"]` still co-occurs as a GUARD_QUALIFIERS entry.
    // Removing that entry would produce a SECOND row per occurrence, dispositioned
    // `review` — the accidental double-report this assertion forecloses.
    const verdicts = classifyWords(["static", "guard"], "prose");
    expect(verdicts.find((v) => v.word === "guard")!.flagged).toBe(false);
    expect(verdicts.filter((v) => v.flagged)).toHaveLength(1);
  });

  it("[SCN-VOC-005] STAYS GREEN on the canon `static check` — both words already approved", () => {
    // NAME mode is the discriminating one: an unapproved word flags `unknown` there, so
    // this green can only come from `static` and `check` both being in the word-sets.
    expect(classifyWords(["static", "check"], "name").every((v) => !v.flagged)).toBe(true);
    expect(classifyWords(["static", "checks"], "name").every((v) => !v.flagged)).toBe(true);
    expect(
      classifyWords(decomposeName("staticCheckEvidenceObligations"), "name").every(
        (v) => v.reason !== "static-guard"
      )
    ).toBe(true);
  });

  it("[SCN-VOC-005] STAYS GREEN on bare `guard` under EVERY remaining ruled qualifier", () => {
    // The rule reds the CLASS NAME, never the word. Canon's different sense — a check
    // protecting an invariant — survives under the five qualifiers that are not `static`.
    for (const qualified of [
      ["both", "missing", "guard"],
      ["exhaustiveness", "guard"],
      ["regression", "guard"],
      ["existence", "guard"],
      ["readability", "guard"],
    ]) {
      const v = classifyWords(qualified, "prose").find((w) => w.word === "guard")!;
      expect(v.flagged, qualified.join("-")).toBe(false);
    }
  });

  it("[SCN-VOC-005] does NOT touch a `guard:`-prefixed CI script NAME — a value, not vocabulary", () => {
    // `guard:domain-purity` is a script name (3F-1852's scope). This rule must not reach
    // it: no `static` precedes the `guard`, so no phrase matches and the word keeps its
    // PRE-EXISTING disposition — flagged for `review`, never escalated to a `rename`.
    const verdicts = classifyWords(decomposeName("guard:domain-purity"), "name");
    expect(verdicts.every((v) => v.reason !== "static-guard")).toBe(true);
    const guard = verdicts.find((v) => v.word === "guard")!;
    expect(guard.reason).toBe("bare-different-word");
  });

  it("[SCN-VOC-005] does NOT over-guard: bare `static` NOT before `guard` earns no flag", () => {
    // `staticObservationTally`, "the static axis", `{ kind: 'static' }` must all stay
    // green — adjacency to `guard` is the whole trigger.
    for (const name of ["staticObservationTally", "static-evidence-obligation"]) {
      expect(
        classifyWords(decomposeName(name), "name").every((v) => v.reason !== "static-guard"),
        name
      ).toBe(true);
    }
    expect(
      classifyWords(["the", "static", "axis"], "prose").every((v) => v.reason !== "static-guard")
    ).toBe(true);
  });

  it("[SCN-VOC-005] flags a real prose `static guard` with action rename, and passes `static check`", () => {
    const { manifest } = auditFiles([
      { path: "src/notes.ts", content: "// the static guard is the retired class name\n" },
      { path: "src/ok.ts", content: "// the static check is the canon replacement\n" },
    ]);
    const red = manifest.find((r) => r.current === "static" && r.new === "static check");
    expect(red).toBeDefined();
    expect(red!.action).toBe("rename");
    expect(red!.file).toBe("src/notes.ts");
    // `static check` produced no row of any kind, and neither did the trailing `guard`.
    expect(manifest.some((r) => r.file === "src/ok.ts")).toBe(false);
    expect(manifest.some((r) => r.current === "guard")).toBe(false);
  });
});

describe("[SCN-VOC-012] the canon handle `no-evidence-obligation`", () => {
  // 3F-2300 renamed the credit-side outcome handle to `no-evidence-obligation`. The new
  // handle decomposes to `no` / `evidence` / `obligation`, and bare `obligation` is a
  // FULL_TERM_ONLY word — so the handle is green for exactly ONE reason: `fullTermSatisfied`
  // reads `words[i - 1]` and finds `evidence`. It is in no word-set of its own.
  //
  // BOTH HALVES ARE THE POINT, in every assertion below. "the handle is not flagged" alone
  // stays true in a world where `obligation` had been dropped from FULL_TERM_ONLY or
  // allowlisted — the green-by-erosion shape @SCN-VOC-004 exists to prevent. It is therefore
  // paired throughout with a bare `obligation` that must STILL flag `bare-shortening`.
  //
  // The last two assertions are the honest scope: adjacency, not mere co-presence, and one
  // SCANNED UNIT, not the file.

  it("[SCN-VOC-012] is GREEN in both modes — hyphenated and camelCase decompose identically", () => {
    for (const form of ["no-evidence-obligation", "noEvidenceObligation"]) {
      expect(decomposeName(form), form).toEqual(["no", "evidence", "obligation"]);
      // NAME mode is the discriminating one: an unapproved word flags `unknown` there.
      expect(classifyWords(decomposeName(form), "name").every((v) => !v.flagged), form).toBe(true);
      expect(classifyWords(decomposeName(form), "prose").every((v) => !v.flagged), form).toBe(true);
    }
  });

  it("[SCN-VOC-012] THE OTHER HALF: a bare `obligation` still flags as a bare shortening", () => {
    // Without this, the green above would be indistinguishable from `obligation` having been
    // quietly retired out of FULL_TERM_ONLY. It reds in BOTH modes, renamed to the full term.
    for (const mode of ["name", "prose"] as const) {
      const v = classifyWords(["obligation"], mode)[0]!;
      expect(v.flagged, mode).toBe(true);
      expect(v.reason, mode).toBe("bare-shortening");
      expect(v.canonical, mode).toBe("evidence obligation");
    }
  });

  it("[SCN-VOC-012] it is the ADJACENCY, not co-presence: the reordered handle flags", () => {
    // `obligation-with-no-evidence` carries every word the canon handle carries and says the
    // same thing in English. It flags, because `words[i - 1]` is `no`, not `evidence` — which
    // is what "one word-order away from reddening" means, asserted rather than described.
    const reordered = classifyWords(decomposeName("obligation-with-no-evidence"), "name");
    expect(reordered.find((v) => v.word === "obligation")!.flagged).toBe(true);
    expect(reordered.find((v) => v.word === "obligation")!.reason).toBe("bare-shortening");
    // And it must be `evidence` SPECIFICALLY that satisfies it — any other neighbour fails.
    expect(classifyWords(["no", "obligation"], "name").find((v) => v.word === "obligation")!.flagged).toBe(true);
    expect(classifyWords(["evidence", "obligation"], "name").every((v) => !v.flagged)).toBe(true);
  });

  it("[SCN-VOC-012] over a real corpus: the handle produces no row, a bare `obligation` does", () => {
    const { manifest } = auditFiles([
      { path: "src/notes.ts", content: "// a bare obligation stands alone on this line\n" },
      { path: "src/ok.ts", content: "// the no-evidence-obligation outcome is canon here\n" },
    ]);
    const red = manifest.find((r) => r.current === "obligation");
    expect(red).toBeDefined();
    expect(red!.file).toBe("src/notes.ts");
    expect(red!.action).toBe("rename");
    expect(red!.new).toBe("evidence obligation");
    // The handle produced NO row of any kind, on any surface.
    expect(manifest.some((r) => r.file === "src/ok.ts")).toBe(false);
  });

  it("[SCN-VOC-012] the exemption reaches ONE SCANNED UNIT — a regex literal splits it and reds", () => {
    // The honest scope, and narrower than "the phrase is exempt". Adjacency is judged inside
    // the sequence `classifyWords` is handed: one identifier in NAME mode, one line in PROSE
    // mode. A REGEX LITERAL is code rather than a string, so `identSegments` emits one
    // single-word NAME segment per identifier run — `no`, `evidence` and `obligation` never
    // meet and `words[i - 1]` is empty. LIVE IN THIS TREE at tests/steps/report.steps.ts,
    // where the handle sits inside two `Then(/…/)` patterns and each flags its `obligation`.
    // The STRING control carries the identical words on ONE prose segment and stays green,
    // which is what proves the SEGMENTATION is the cause rather than anything about steps
    // files. Widening the matcher across segments is a different behaviour, not this one's.
    const path = "tests/steps/probe.steps.ts";
    const inRegex = "Then(/^a no-evidence-obligation observation$/, () => {});\n";
    const inString = 'Then("a no-evidence-obligation observation", () => {});\n';

    const nameSegments = scanFile(path, inRegex).filter((s) => s.mode === "name").map((s) => s.text);
    expect(nameSegments).toEqual(expect.arrayContaining(["no", "evidence", "obligation"]));

    expect(
      auditFiles([{ path, content: inRegex }]).manifest.some((r) => r.current === "obligation")
    ).toBe(true);
    expect(
      auditFiles([{ path, content: inString }]).manifest.some((r) => r.current === "obligation")
    ).toBe(false);
  });
});
