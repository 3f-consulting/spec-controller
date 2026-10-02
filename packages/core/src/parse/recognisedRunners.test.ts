import { describe, it, expect } from "vitest";
import { recognisedRunners } from "./runningStaticChecks.js";
import { resolveRunners } from "./targetManifest.js";

describe("[SCN-USG-011] recognisedRunners — a runner recognised at the step invoking it through a manifest script", () => {
  const ciWith = (...steps: string[]): string =>
    ["jobs:", "  ci:", "    steps:", ...steps].join("\n");

  const aliasCi = ciWith(
    "      - run: pnpm install --frozen-lockfile",
    "      - name: Unit tests",
    "        run: pnpm test"
  );

  it("recognises the runner a step reaches through the manifest script it invokes", () => {
    expect(
      recognisedRunners([aliasCi], { scripts: { test: "vitest run" } }, { unit: "vitest" })
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });

  it("recognises nothing from the workflow alone — the measurement that makes the hop the rule", () => {
    expect(aliasCi.includes("vitest")).toBe(false);
    expect(recognisedRunners([aliasCi], { scripts: {} }, { unit: "vitest" })).toEqual([]);
  });

  it("recognises a runner the step's own command names, with no script in the way", () => {
    const directCi = ciWith("      - name: Unit tests", "        run: pnpm exec vitest run --coverage");
    expect(
      recognisedRunners([directCi], { scripts: {} }, { unit: "vitest" })
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });

  it("follows a script that invokes another script", () => {
    expect(
      recognisedRunners(
        [aliasCi],
        { scripts: { test: "pnpm test:unit", "test:unit": "vitest run" } },
        { unit: "vitest" }
      )
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });

  it("stops following at three hops", () => {
    const scripts = { test: "pnpm a", a: "pnpm b", b: "vitest run" };
    expect(recognisedRunners([aliasCi], { scripts }, { unit: "vitest" })).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
    expect(
      recognisedRunners(
        [aliasCi],
        { scripts: { test: "pnpm a", a: "pnpm b", b: "pnpm c", c: "vitest run" } },
        { unit: "vitest" }
      )
    ).toEqual([]);
  });

  it("terminates on a script chain that loops back on itself", () => {
    expect(
      recognisedRunners(
        [aliasCi],
        { scripts: { test: "pnpm other", other: "pnpm test" } },
        { unit: "vitest" }
      )
    ).toEqual([]);
  });

  it("recognises nothing for a tier whose runner no step reaches", () => {
    expect(
      recognisedRunners([aliasCi], { scripts: { test: "vitest run" } }, { integration: "cucumber-js" })
    ).toEqual([]);
  });

  it("names every tier a step is the runner for — two tiers, one runner, one step", () => {
    const cukeCi = ciWith("      - name: Cucumber", "        run: pnpm cucumber");
    expect(
      recognisedRunners(
        [cukeCi],
        { scripts: { cucumber: "cucumber-js" } },
        { integration: "cucumber-js", e2e: "cucumber-js" }
      )
    ).toEqual([
      { tier: "integration", runner: "cucumber-js", step: "Cucumber" },
      { tier: "e2e", runner: "cucumber-js", step: "Cucumber" },
    ]);
  });

  it("recognises nothing when the manifest names no runners", () => {
    expect(recognisedRunners([aliasCi], { scripts: { test: "vitest run" } }, {})).toEqual([]);
  });
});

describe("[SCN-USG-011] resolveRunners — the target's specController.runners block", () => {
  it("reads the tier-to-runner entries the target wrote", () => {
    expect(
      resolveRunners({ specController: { runners: { unit: "vitest", e2e: "playwright" } } }).tiers
    ).toEqual({ unit: "vitest", e2e: "playwright" });
  });

  it("resolves empty for a manifest that names no runners", () => {
    expect(resolveRunners({}).tiers).toEqual({});
    expect(resolveRunners({ specController: {} }).tiers).toEqual({});
  });

  it("drops an entry that is not a runner's name", () => {
    expect(
      resolveRunners({ specController: { runners: { unit: "vitest", e2e: 7 } } }).tiers
    ).toEqual({ unit: "vitest" });
  });

  it("resolves empty for a runners config that is not a block of named fields", () => {
    expect(resolveRunners({ specController: { runners: ["vitest"] } }).tiers).toEqual({});
    expect(resolveRunners({ specController: { runners: "vitest" } }).tiers).toEqual({});
  });
});

describe("[SCN-USG-012] recognisedRunners — a runner's name out of command position leaves the step a candidate", () => {
  const checkStep = (command: string): string =>
    ["jobs:", "  ci:", "    steps:", "      - name: Rule check", `        run: ${command}`].join("\n");

  const unit = { unit: "vitest" };
  const eslintScripts = { scripts: { "lint:rules": "eslint . --format json" } };

  it("leaves a check writing its report to a file named after the runner a candidate", () => {
    expect(
      recognisedRunners([checkStep("pnpm lint:rules --output-file reports/vitest.json")], eslintScripts, unit)
    ).toEqual([]);
  });

  it("leaves a check whose =-joined argument names the runner a candidate", () => {
    expect(
      recognisedRunners(
        [checkStep('pnpm lint:rules --outputFile.json="$EVIDENCE_DIR/vitest.json"')],
        eslintScripts,
        unit
      )
    ).toEqual([]);
  });

  it("leaves a check whose flag is spelled like the runner a candidate", () => {
    expect(
      recognisedRunners(
        [checkStep('pnpm lint:rules --vitest "$EVIDENCE_DIR/vitest.json"')],
        eslintScripts,
        unit
      )
    ).toEqual([]);
  });

  it("leaves a step running a different binary whose name contains the runner's a candidate", () => {
    expect(recognisedRunners([checkStep("pnpm exec vitest-bench run")], { scripts: {} }, unit)).toEqual([]);
  });

  it("leaves a check whose manifest script writes a file named after the runner a candidate", () => {
    expect(
      recognisedRunners(
        [checkStep("pnpm lint:rules")],
        { scripts: { "lint:rules": "eslint . --output-file reports/vitest.json" } },
        unit
      )
    ).toEqual([]);
  });

  it("recognises the runner beside every one of them — the control", () => {
    const both = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Unit tests",
      "        run: pnpm test",
      "      - name: Rule check",
      '        run: pnpm lint:rules --outputFile.json="$EVIDENCE_DIR/vitest.json"',
    ].join("\n");
    expect(
      recognisedRunners(
        [both],
        { scripts: { test: "vitest run", "lint:rules": "eslint . --format json" } },
        unit
      )
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });
});

describe("[SCN-USG-029] recognisedRunners — a runner whose output another command reads leaves the step a candidate", () => {
  const stepRunning = (...lines: string[]): string =>
    [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Gate",
      "        run: |",
      ...lines.map((line) => `          ${line}`),
    ].join("\n");

  const integration = { integration: "cucumber-js" };
  const noScripts = { scripts: {} };
  const asTheRunner = [{ tier: "integration", runner: "cucumber-js", step: "Gate" }];

  it("leaves a check piping the runner's output into another command a candidate", () => {
    expect(
      recognisedRunners(
        [stepRunning("pnpm exec cucumber-js --dry-run --format usage-json | jq -r '.[]' | awk '{ print }'")],
        noScripts,
        integration
      )
    ).toEqual([]);
  });

  it("leaves a check piping the runner's output and its errors into another command a candidate", () => {
    expect(
      recognisedRunners([stepRunning("cucumber-js --dry-run |& tee dry-run.log")], noScripts, integration)
    ).toEqual([]);
  });

  it("leaves a check whose pipe follows a line continuation a candidate", () => {
    expect(
      recognisedRunners(
        [stepRunning("cucumber-js --dry-run --format usage-json \\", "  | jq -r '.[]'")],
        noScripts,
        integration
      )
    ).toEqual([]);
  });

  it("leaves a check whose manifest script pipes the runner's output a candidate", () => {
    expect(
      recognisedRunners(
        [stepRunning("pnpm lint:steps")],
        { scripts: { "lint:steps": "cucumber-js --dry-run --format usage-json | jq -r '.[]'" } },
        integration
      )
    ).toEqual([]);
  });

  it("still recognises the runner where its failure falls through to another command — the || control", () => {
    expect(
      recognisedRunners([stepRunning("cucumber-js || echo the suite failed")], noScripts, integration)
    ).toEqual(asTheRunner);
  });

  it("still recognises the runner in a pipeline's last stage, where nothing reads its output", () => {
    expect(
      recognisedRunners([stepRunning("echo start | cucumber-js")], noScripts, integration)
    ).toEqual(asTheRunner);
  });

  it("still recognises the runner on an unpiped line of a step whose other line pipes", () => {
    expect(
      recognisedRunners(
        [stepRunning("git ls-files features | wc -l", "pnpm cucumber")],
        { scripts: { cucumber: "cucumber-js" } },
        integration
      )
    ).toEqual(asTheRunner);
  });
});

describe("[SCN-USG-016] resolveRunners — a null runner, a named one, and a tier the block omits", () => {
  it("keeps a null runner as the target's own statement, and reads an omitted tier as no entry", () => {
    const resolved = resolveRunners({
      specController: { runners: { unit: "vitest", performance: null } },
    }).tiers;
    expect(resolved).toStrictEqual({ unit: "vitest", performance: null });
    expect(resolved.unit).toBe("vitest");
    expect(resolved.performance).toBeNull();
    expect(Object.hasOwn(resolved, "performance")).toBe(true);
    expect(Object.hasOwn(resolved, "e2e")).toBe(false);
  });

  it("keeps a tier the target says has no runner even when it names no other", () => {
    const resolved = resolveRunners({ specController: { runners: { performance: null } } }).tiers;
    expect(resolved).toStrictEqual({ performance: null });
    expect(Object.keys(resolved)).toEqual(["performance"]);
  });

  it("still drops a value that is neither a runner's name nor a stated absence", () => {
    expect(
      resolveRunners({ specController: { runners: { unit: "vitest", e2e: 7, integration: [] } } })
        .tiers
    ).toStrictEqual({ unit: "vitest" });
  });

  it("recognises no step for a tier the target says has no runner", () => {
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Unit tests",
      "        run: pnpm test",
    ].join("\n");
    expect(
      recognisedRunners([ci], { scripts: { test: "vitest run" } }, { unit: "vitest", performance: null })
    ).toEqual([{ tier: "unit", runner: "vitest", step: "Unit tests" }]);
  });
});

describe("[SCN-USG-019] resolveRunners — the four canon tiers, and the keys that are not one of them", () => {
  const CANON_TIERS = ["unit", "integration", "e2e", "performance"] as const;

  it("keeps every one of the four canon tiers and treats none of them as unrecognised", () => {
    const resolved = resolveRunners({
      specController: {
        runners: {
          unit: "vitest",
          integration: "cucumber-js",
          e2e: "cucumber-js",
          performance: null,
        },
      },
    });
    expect(resolved.tiers).toStrictEqual({
      unit: "vitest",
      integration: "cucumber-js",
      e2e: "cucumber-js",
      performance: null,
    });
    expect(Object.keys(resolved.tiers)).toEqual([...CANON_TIERS]);
    expect(resolved.unrecognisedKeys).toEqual([]);
  });

  it("partitions a key outside the four tiers out of the runners and names it", () => {
    const resolved = resolveRunners({
      specController: { runners: { unit: "vitest", lint: "eslint" } },
    });
    expect(resolved.tiers).toStrictEqual({ unit: "vitest" });
    expect(resolved.unrecognisedKeys).toEqual(["lint"]);
  });

  it("names an unrecognised key whatever its value, because the consumer still wrote it", () => {
    const resolved = resolveRunners({
      specController: { runners: { lint: 7, "test:contract": null, deploy: ["sh"] } },
    });
    expect(resolved.tiers).toStrictEqual({});
    expect(resolved.unrecognisedKeys).toEqual(["lint", "test:contract", "deploy"]);
  });

  it("still drops a canon tier whose value is neither a runner's name nor a stated absence", () => {
    const resolved = resolveRunners({
      specController: { runners: { unit: "vitest", e2e: 7 } },
    });
    expect(resolved.tiers).toStrictEqual({ unit: "vitest" });
    expect(resolved.unrecognisedKeys).toEqual([]);
  });

  it("resolves both halves empty for a manifest that names no runners", () => {
    expect(resolveRunners({})).toStrictEqual({ tiers: {}, unrecognisedKeys: [] });
    expect(resolveRunners({ specController: { runners: ["vitest"] } })).toStrictEqual({
      tiers: {},
      unrecognisedKeys: [],
    });
  });

  it("recognises no step for a key that is not a tier, however reachable its command is", () => {
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Unit tests",
      "        run: pnpm test",
      "      - name: Rule check",
      "        run: pnpm lint:rules",
    ].join("\n");
    const scripts = { test: "vitest run", "lint:rules": "eslint . --format json" };
    const { tiers } = resolveRunners({
      specController: { runners: { unit: "vitest", lint: "eslint" } },
    });
    expect(recognisedRunners([ci], { scripts }, tiers)).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
  });
});
