import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeatureCorpus, parseVitestEvidenceObservations, scenariosOf } from "../packages/core/dist/index.js";

// Our own code: no maintained tool tells a test of a domain rule from a test of an adapter's translation.
// A proxy: it holds where a rule's tests live, not where the rule's code lives, so review still reads the code.
// It reads only tests the run observed; a skipped test or a file that fails to import is not seen here.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const domain = "packages/core/src/domain";
const report = process.argv[2];
if (!report) {
  console.error("usage: node scripts/domain-tests-in-domain.mjs <vitest.json>");
  process.exit(2);
}

const camelCase = (slug) => slug.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());

const conceptCodes = new Set();
let concepts = 0;
for (const file of readdirSync(join(root, "features")).filter((name) => name.endsWith(".feature"))) {
  if (!existsSync(join(root, domain, `${camelCase(basename(file, ".feature"))}.ts`))) continue;
  concepts += 1;
  const parse = parseFeatureCorpus([{ file, source: readFileSync(join(root, "features", file), "utf8") }]);
  if (parse.kind === "unparseable") throw new Error(parse.faults[0].message);
  for (const { scnId } of parse.parsed.flatMap((feature) => scenariosOf(feature))) {
    conceptCodes.add(scnId.split("-")[1]);
  }
}

const observations = parseVitestEvidenceObservations(JSON.parse(readFileSync(report, "utf8")), "unit", root);
const offences = new Set();
for (const { locator, scnId, notes = [] } of observations) {
  if (!locator || locator.startsWith(`${domain}/`)) continue;
  const cited = [scnId, ...notes.flatMap((note) => (note.kind === "several-scn-codes" ? note.codes : []))];
  for (const code of cited) {
    if (code && conceptCodes.has(code.split("-")[1])) offences.add(`${locator}: ${code}`);
  }
}

if (offences.size > 0) {
  console.log([...offences].sort().join("\n"));
  console.log(`${offences.size} citation(s) of a domain concept's scenario outside ${domain}/`);
  process.exit(1);
}
console.log(`${concepts} domain concept(s), ${observations.length} observation(s): no citation of a concept's scenario outside ${domain}/`);
