import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { renderJson } from "./composers.js";
import { parseFeatureCorpus } from "../parse/scenarios.js";
import { parseWorkflows } from "../parse/checkScriptsRunInCI.js";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "../parse/vitest.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../parse/cucumber.js";
import type { Parsed, SourcesParse } from "../parse/sourceParse.js";
import { sampleReportCtx } from "../render/runContext.test-utils.js";
import { BUILT_IN_DEFERRAL_TAGS } from "../domain/pendingItems.js";

function corpusRoot(): string {
  return fileURLToPath(new URL("../../../../tests/fixtures/every-outcome-corpus/", import.meta.url));
}

function corpusFile(name: string): { file: string; source: string } {
  return { file: name, source: readFileSync(`${corpusRoot()}${name}`, "utf8") };
}

function parsedOrThrow<T>(parse: SourcesParse<T>): readonly Parsed<T>[] {
  if (parse.kind === "unparseable") throw new Error(JSON.stringify(parse.faults));
  return parse.parsed;
}

/** The JSON report the every-outcome corpus emits, as the serialiser writes it. */
export function everyOutcomeCorpusJson(): string {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedOrThrow(parseFeatureCorpus([corpusFile("features/target.feature")])),
    packageJson: JSON.parse(corpusFile("package.json").source),
    ciWorkflows: parsedOrThrow(parseWorkflows([corpusFile("ci.yml")])),
    behaviouralObservations: [
      ...parseVitestEvidenceObservations(JSON.parse(corpusFile("vitest.json").source) as VitestJsonReport, corpusRoot()),
      ...parseCucumberEvidenceObservations(JSON.parse(corpusFile("cucumber.json").source) as CucumberJsonReport, corpusRoot()),
    ],
    deferralTags: BUILT_IN_DEFERRAL_TAGS,
  });
  return renderJson(reconciliation, sampleReportCtx);
}
