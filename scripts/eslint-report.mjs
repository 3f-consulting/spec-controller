import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

// One process lints every ESLint check, so Node and the plugins start once; each check keeps its own config and files.
// A check's config cannot merge into another's: they give one rule different selectors over overlapping files.
// Each check's step reads its own entry with scripts/eslint-findings.jq. A check that throws is recorded as fatal,
// so it reds its own step and no other.

const CHECKS = [
  { check: "complexity", config: "eslint.config.js", patterns: ["."] },
  { check: "boundaries", config: "config/eslint.boundaries.js", rules: { "no-restricted-imports": "off" }, patterns: ["."] },
  { check: "seam", config: "config/eslint.boundaries.js", rules: { "no-restricted-syntax": "off" }, patterns: ["tests/steps"] },
  { check: "mutation", config: "config/eslint.mutation.js", patterns: ["packages"] },
  { check: "messages", config: "config/eslint.messages.js", patterns: ["packages"] },
  { check: "collection", config: "config/eslint.collection.js", patterns: ["packages"] },
  { check: "domain", config: "config/eslint.domain.js", patterns: ["packages/core/src/domain"] },
  { check: "domainLiterals", config: "config/eslint.domainLiterals.js", patterns: ["packages/core/src/domain"] },
  { check: "domainProse", config: "config/eslint.domainProse.js", patterns: ["packages/core/src/domain"] },
  { check: "domainNumbers", config: "config/eslint.domainNumbers.js", patterns: ["packages/core/src/domain"] },
  { check: "exitCode", config: "config/eslint.exitCode.js", patterns: ["packages/core/src", "packages/spec-controller/src"] },
];

const [out, cacheDir] = process.argv.slice(2);
if (!out) {
  console.error("usage: node scripts/eslint-report.mjs <report.json> [cache directory]");
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const cacheOf = (check) =>
  cacheDir ? { cache: true, cacheStrategy: "content", cacheLocation: join(cacheDir, `${check}.json`) } : {};

async function lint({ check, config, rules, patterns }) {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: config,
    ...(rules ? { overrideConfig: { rules } } : {}),
    ...cacheOf(check),
  });
  const results = await eslint.lintFiles(patterns);
  return {
    results: results
      .filter((result) => result.messages.length > 0)
      .map((result) => ({
        filePath: relative(root, result.filePath),
        messages: result.messages.map(({ ruleId, severity, line, column, message }) => ({ ruleId, severity, line, column, message })),
      })),
  };
}

if (cacheDir) mkdirSync(cacheDir, { recursive: true });
const report = {};
for (const entry of CHECKS) {
  try {
    report[entry.check] = await lint(entry);
  } catch (error) {
    report[entry.check] = { fatal: String(error?.stack ?? error) };
  }
  const { results = [], fatal } = report[entry.check];
  console.log(`${entry.check}: ${fatal ? "did not run" : `${results.length} file(s) with findings`}`);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 1));
