/**
 * Unit tests for the compatibility-page check (@SCN-CMP-001, the @unit arm under @SCN-FIT-015 — 3F-3175).
 *
 * Bidirectional evidence: the describe strings carry the @SCN-CMP-001 id matching features/compatibility-commitment.feature, whose check is run over the real page by the generated
 * scenario in features/fitness-checks.feature, whose row in `specController.fitnessChecks` names
 * the command `packages/spec-controller/static-checks/compatibilityExamplesCli.ts` runs.
 *
 * EVERY FIXTURE HERE IS A PLANTED PAGE, never `doc/compatibility.md` itself. The real page is what
 * the fitness scenario runs against; asserting against it here would make these tests re-red every
 * time the page legitimately changed, and would prove the check works only on the one input it
 * already had.
 *
 * Parent: 3F-3154.
 */

import { describe, it, expect } from "vitest";

import {
  citedCodes,
  compatibilityFindings,
  configOf,
  manifestBlocksOf,
} from "./compatibilityExamples.js";

/** A markdown page carrying one fenced block with the given fence language and body. */
function page(language: string, body: string): string {
  return ["# A page", "", "Some prose.", "", "```" + language, body, "```", "", "More prose."].join(
    "\n"
  );
}

/** This repository, as the check sees it, holding exactly the codes a fixture needs. */
function tree(...scenarioCodes: string[]) {
  return {
    featureCodes: new Set(["CPX", "CIP", "MUT", "FIT"]),
    scenarioCodes: new Set(scenarioCodes),
  };
}

/** A tree holding no scenario at all — for fixtures that cite none of ours. */
const NO_CORPUS = tree();

describe("[SCN-CMP-001] a fenced block is a configuration block by naming specController, never by its fence", () => {
  it("recognises a configuration block under a json fence, not only under jsonc", () => {
    const blocks = manifestBlocksOf(page("json", '"specController": { "staticChecks": ["a"] }'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.line).toBe(5);
  });

  it("ignores a fenced block that names no specController key — the --measurements shape", () => {
    const measurements = page(
      "json",
      '{ "measurements": [ { "scnId": "SCN-CIP-001", "checkTag": "ci-run-time", "measured": 42.1 } ] }'
    );
    expect(manifestBlocksOf(measurements)).toHaveLength(0);
  });
});

describe("[SCN-CMP-001] the jsonc reading is narrow, and what it cannot read it reports", () => {
  it("reads a block whose comments sit on their own lines", () => {
    const source = ['"specController": {', "  // a whole-line comment", '  "staticChecks": ["a"]', "}"].join(
      "\n"
    );
    expect(configOf(source)).toEqual({ specController: { staticChecks: ["a"] } });
  });

  it("reads a block carrying a trailing comma before a closing brace", () => {
    expect(configOf('"specController": { "staticChecks": ["a"], }')).toEqual({
      specController: { staticChecks: ["a"] },
    });
  });

  it("reports a same-line comment as a violation naming the block's line, rather than guessing", () => {
    const sameLine = page("jsonc", '"specController": { "staticChecks": ["a"] } // trailing');
    const findings = compatibilityFindings(sameLine, NO_CORPUS);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(5);
    expect(findings[0]?.message).toContain("does not parse");
  });
});

describe("[SCN-CMP-001] every entry a documented block writes must survive its own reader", () => {
  it("accepts both checkRegistry spellings the page states are supported", () => {
    const both = page(
      "jsonc",
      [
        '"specController": {',
        '  "checkRegistry": {',
        '    "lint:complexity-exceptions": { "check": "complexity", "scn": "SCN-CPX-006" },',
        '    "typecheck": "typecheck"',
        "  }",
        "}",
      ].join("\n")
    );
    expect(compatibilityFindings(both, tree("SCN-CPX-006"))).toEqual([]);
  });

  it("names the entry a reader drops, rather than passing the block for being non-empty", () => {
    const oneDropped = page(
      "jsonc",
      '"specController": { "checkRegistry": { "kept": "complexity", "dropped": 42 } }'
    );
    const findings = compatibilityFindings(oneDropped, NO_CORPUS);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('"dropped"');
  });

  it("accepts a thresholds entry whose bar names a mutation gate no record can source", () => {
    const gate = page(
      "jsonc",
      '"specController": { "thresholds": { "SCN-MUT-011": { "mutation": { "atLeast": { "mutationGate": "domain" } } } } }'
    );
    expect(compatibilityFindings(gate, tree("SCN-MUT-011"))).toEqual([]);
  });

  it("accepts a fitnessChecks row in either bar direction", () => {
    const rows = page(
      "jsonc",
      [
        '"specController": {',
        '  "fitnessChecks": [',
        '    { "scn": "SCN-FIT-012", "characteristic": "ci-run-time", "command": "x", "atMost": 75 },',
        '    { "scn": "SCN-FIT-002", "characteristic": "mutation", "command": "y", "atLeast": { "mutationGate": "domain" } }',
        "  ]",
        "}",
      ].join("\n")
    );
    expect(compatibilityFindings(rows, tree("SCN-FIT-012", "SCN-FIT-002"))).toEqual([]);
  });

  it("reds on a row whose own key the reader cannot read — the hole a filtered authored list left", () => {
    const unaddressable = page(
      "jsonc",
      '"specController": { "fitnessChecks": [ { "scn": 21, "characteristic": "vocab", "command": "x" } ] }'
    );
    const findings = compatibilityFindings(unaddressable, NO_CORPUS);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("cannot address");
  });

  it("reds on an array entry that is not a string, rather than quietly agreeing it was never written", () => {
    const notAString = page("jsonc", '"specController": { "staticChecks": ["typecheck", 42] }');
    const findings = compatibilityFindings(notAString, NO_CORPUS);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("cannot address");
  });

  it("reports a documented specController key it knows no reader for", () => {
    const unknown = page("jsonc", '"specController": { "somethingNew": { "a": 1 } }');
    const findings = compatibilityFindings(unknown, NO_CORPUS);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("knows no reader");
  });
});

describe("[SCN-CMP-001] every scenario a worked example names must be one this repository still has", () => {
  it("finds a code wherever a block writes it — as a key and as a scn field", () => {
    expect(
      citedCodes('"thresholds": { "SCN-CIP-013": { "ci-run-time": 75 } }, "scn": "@SCN-CPX-006"')
    ).toEqual(["SCN-CIP-013", "SCN-CPX-006"]);
  });

  it("reds on an example naming a scenario the corpus has lost — the drift this check was built for", () => {
    const stale = page(
      "jsonc",
      '"specController": { "thresholds": { "SCN-MUT-011": { "mutation": 60 } } }'
    );
    const findings = compatibilityFindings(stale, tree("SCN-FIT-002"));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("SCN-MUT-011");
    expect(findings[0]?.message).toContain("no scenario in features/ carries it");
  });

  it("leaves a code under a feature code this repository never allocated alone — it is the reader's", () => {
    const readers = page(
      "jsonc",
      '"specController": { "thresholds": { "SCN-CHK-004": { "ci-run-time": { "atMost": 75 } } } }'
    );
    expect(compatibilityFindings(readers, NO_CORPUS)).toEqual([]);
  });

  it("reds on a citation in PROSE, not only one inside a fence", () => {
    const prose = "# A page\n\nThe measurement cites SCN-CIP-013, which we deleted.\n";
    const findings = compatibilityFindings(prose, tree("SCN-CIP-001"));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(3);
  });

  it("greens the same example once the corpus carries the code — the shape never changed", () => {
    const stale = page(
      "jsonc",
      '"specController": { "thresholds": { "SCN-MUT-011": { "mutation": 60 } } }'
    );
    expect(compatibilityFindings(stale, tree("SCN-MUT-011"))).toEqual([]);
  });
});
