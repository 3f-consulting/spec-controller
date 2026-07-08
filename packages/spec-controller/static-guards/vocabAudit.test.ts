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
  it("flags a bare `unattributed` but not `unattributed static guard`", () => {
    // The static-guard context blesses `unattributedStaticGuardCount` (manifesto
    // line 42) — alongside the original "unattributed evidence
    // observation" context — while bare `unattributed` still flags.
    expect(classifyWords(["unattributed"], "name")[0]!.flagged).toBe(true);
    const staticGuard = classifyWords(["unattributed", "static", "guard"], "name");
    expect(staticGuard.every((v) => !v.flagged)).toBe(true);
    const evObs = classifyWords(["unattributed", "evidence", "observation"], "name");
    expect(evObs.every((v) => !v.flagged)).toBe(true);
  });
});

describe("[SCN-VOC-001] classifyWords — blessed canon verbs", () => {
  it("does not flag `observe` (the running-guard observer verb)", () => {
    // `observe` is blessed as a verb (manifesto line 25, "an observed
    // piece of evidence") so the surface name `runningStaticGuards` no longer
    // flags. The bare noun `observation` is NOT blessed and still flags.
    expect(classifyWords(["observe"], "name")[0]!.flagged).toBe(false);
    const surface = classifyWords(["observe", "running", "guards"], "name");
    expect(surface.every((v) => !v.flagged)).toBe(true);
    expect(classifyWords(["observation"], "name")[0]!.flagged).toBe(true);
    expect(classifyWords(["observations"], "name")[0]!.flagged).toBe(true);
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
