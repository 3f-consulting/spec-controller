import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type Examples, type FeatureChild, type GherkinDocument, type Scenario as GherkinScenario } from "@cucumber/messages";
import { bareTerm } from "../lib/bareTerm.js";
import { headerFeatureCode, CLAIM_CODE, CLAIM_CODE_SOURCE } from "../domain/featureCode.js";
import { claimCodesOf, type ScenarioTags } from "../domain/claimCodes.js";
import { corpusCountsOf, type EvidenceObligations, type ParsedFeatureCounts } from "../domain/corpusCounts.js";
import { obligationsRaisedBy } from "../domain/scenarioObligations.js";
import type { Scenario } from "../model.js";
import { parseSources, type Parsed, type Source, type SourcesParse } from "./sourceParse.js";

const CLAIM_CODE_OCCURRENCE = new RegExp(`@${CLAIM_CODE_SOURCE}`, "g");

export function countClaimCodeOccurrences(source: string): number {
  return (source.match(CLAIM_CODE_OCCURRENCE) ?? []).length;
}

interface FeatureFileContent {
  readonly featureCode: string | null;
  readonly scenarios: readonly ScenarioTags[];
  readonly claimCodeOccurrences: number;
  readonly tagClaimCodeOccurrences: number;
}

export type ParsedFeatureFile = Parsed<FeatureFileContent>;

function gherkinDocumentOf(source: string): GherkinDocument {
  return new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher()).parse(source);
}

const CLAIM_COLUMN = "clm";

function claimColumnOf(examples: Examples): number {
  return examples.tableHeader?.cells.findIndex((cell) => cell.value === CLAIM_COLUMN) ?? -1;
}

function rowCodeOf(cell: string): string[] {
  return CLAIM_CODE.test(cell) ? [cell] : [];
}

function rowClaimsOf(outline: GherkinScenario, outlineTags: readonly string[]): ScenarioTags[] | null {
  if (!outline.examples.some((examples) => claimColumnOf(examples) >= 0)) return null;
  const tags = [...outlineTags, ...outline.examples.flatMap((examples) => examples.tags.map((tag) => bareTerm(tag.name)))];
  if (tags.some((tag) => CLAIM_CODE.test(tag))) return [{ name: outline.name, tags, clmColumn: true }];
  return outline.examples.flatMap((examples) => {
    const column = claimColumnOf(examples);
    const blockTags = examples.tags.map((tag) => bareTerm(tag.name));
    return examples.tableBody.map((row) => ({
      name: outline.name,
      tags: [...row.cells.filter((_, index) => index === column).flatMap((cell) => rowCodeOf(cell.value)), ...outlineTags, ...blockTags],
      line: row.location.line,
    }));
  });
}

function contentOf({ feature }: GherkinDocument, source: string): FeatureFileContent {
  const claimCodeOccurrences = countClaimCodeOccurrences(source);
  if (feature === undefined) return { featureCode: null, scenarios: [], claimCodeOccurrences, tagClaimCodeOccurrences: 0 };

  const scenarios: ScenarioTags[] = [];
  let tagClaimCodeOccurrences = 0;
  const countTags = (tags: readonly { name: string }[]): void => {
    tagClaimCodeOccurrences += countClaimCodeOccurrences(tags.map((t) => t.name).join(" "));
  };
  const bare = (tags: readonly { name: string }[]): string[] => tags.map((t) => bareTerm(t.name));

  const collect = (children: readonly FeatureChild[], inherited: string[]): void => {
    for (const child of children) {
      if (child.rule) {
        countTags(child.rule.tags);
        collect(child.rule.children as FeatureChild[], [...inherited, ...bare(child.rule.tags)]);
        continue;
      }
      if (!child.scenario) continue;
      countTags(child.scenario.tags);
      for (const examples of child.scenario.examples) countTags(examples.tags);
      const tags = [...bare(child.scenario.tags), ...inherited];
      const rows = rowClaimsOf(child.scenario, tags);
      if (rows === null) scenarios.push({ name: child.scenario.name, tags });
      else scenarios.push(...rows);
    }
  };

  countTags(feature.tags);
  const featureTags = bare(feature.tags);
  collect(feature.children as FeatureChild[], featureTags);

  return { featureCode: headerFeatureCode(featureTags), scenarios, claimCodeOccurrences, tagClaimCodeOccurrences };
}

export function parseFeatureCorpus(sources: readonly Source[]): SourcesParse<FeatureFileContent> {
  return parseSources(sources, gherkinDocumentOf, contentOf);
}

/** The claim codes of the row parsed at a line of the feature file a report names by a path ending in that file's path within the corpus. */
export type ClaimCodesAt = (path: string, line: number) => readonly string[];

const portable = (path: string): string => path.replaceAll("\\", "/");

export function claimCodesAtOf(features: readonly ParsedFeatureFile[]): ClaimCodesAt {
  const rows = features.flatMap(({ file, scenarios }) =>
    scenarios.map(({ line, tags }) => ({ file: `/${portable(file)}`, line, codes: tags.filter((tag) => CLAIM_CODE.test(tag)) }))
  );
  return (path, line) => {
    const reported = `/${portable(path)}`;
    const matching = rows.filter((row) => row.line === line && reported.endsWith(row.file));
    return matching.sort((a, b) => b.file.length - a.file.length)[0]?.codes ?? [];
  };
}

interface TaggedScenario {
  readonly claimCode: string;
  readonly tags: readonly string[];
  readonly name: string;
}

function scenariosByClaimCodeOf({ scenarios }: ParsedFeatureFile): {
  taggedScenarios: TaggedScenario[];
  untaggedScenarios: string[];
} {
  const taggedScenarios: TaggedScenario[] = [];
  const untaggedScenarios: string[] = [];
  for (const { name, tags, clmColumn } of scenarios) {
    const { claimCode, severalCodes } = claimCodesOf(tags);
    if (clmColumn === true || severalCodes !== undefined) continue;
    if (claimCode === null) untaggedScenarios.push(name);
    else taggedScenarios.push({ claimCode, tags, name });
  }
  return { taggedScenarios, untaggedScenarios };
}

export function untaggedScenariosOf(feature: ParsedFeatureFile): string[] {
  return scenariosByClaimCodeOf(feature).untaggedScenarios;
}

export function featureCountsOf(feature: ParsedFeatureFile): ParsedFeatureCounts {
  const { taggedScenarios, untaggedScenarios } = scenariosByClaimCodeOf(feature);
  return {
    rawClaimCodeOccurrences: feature.claimCodeOccurrences,
    tagClaimCodeOccurrences: feature.tagClaimCodeOccurrences,
    taggedScenarios,
    untaggedScenarios,
  };
}

export function corpusCountsOfFeatures(features: readonly ParsedFeatureFile[]): EvidenceObligations {
  return corpusCountsOf(features.map((parsed) => ({ feature: parsed.file, ...featureCountsOf(parsed) })));
}

export function scenariosOf(feature: ParsedFeatureFile, deferralTags: readonly string[] = []): Scenario[] {
  return namedScenariosOf(feature, deferralTags).map(({ claimCode, evidenceObligations }) => ({ claimCode, evidenceObligations }));
}

/** The corpus's scenarios, each naming its feature file and title. */
export function namedScenariosOf(feature: ParsedFeatureFile, deferralTags: readonly string[] = []): Scenario[] {
  return scenariosByClaimCodeOf(feature).taggedScenarios.map((scenario) => ({
    claimCode: scenario.claimCode,
    evidenceObligations: obligationsRaisedBy(scenario.tags, deferralTags),
    feature: feature.file,
    title: scenario.name,
  }));
}
