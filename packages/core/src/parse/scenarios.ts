import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type FeatureChild, type GherkinDocument } from "@cucumber/messages";
import { bareTerm } from "../lib/bareTerm.js";
import { SCN_ID_SOURCE } from "../domain/featureCode.js";
import { attributionOf } from "../domain/attribution.js";
import { FeatureSourceNotGherkin } from "./featureSourceNotGherkin.js";
import type { ParsedFeatureCounts } from "../domain/corpusCounts.js";
import { evidenceObligationsOf } from "../domain/scenarioObligations.js";
import type { Scenario } from "../model.js";

export const SCN_CODE = new RegExp(`^${SCN_ID_SOURCE}$`);

const SCN_OCCURRENCE = new RegExp(`@${SCN_ID_SOURCE}`, "g");

export function countScnOccurrences(source: string): number {
  return (source.match(SCN_OCCURRENCE) ?? []).length;
}

export function parseUntaggedScenarios(source: string): string[] {
  return scenariosByScnCodeOf(source).untaggedScenarios;
}

export interface TaggedScenario {
  readonly scnId: string;
  readonly tags: readonly string[];
  readonly name: string;
}

function parseFeatureDocument(source: string): GherkinDocument {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());
  try {
    return parser.parse(source);
  } catch (err) {
    throw new FeatureSourceNotGherkin(err as Error);
  }
}

interface ScenarioWithItsTags {
  readonly name: string;
  readonly tags: readonly string[];
}

function scenariosOf(source: string): ScenarioWithItsTags[] {
  const { feature } = parseFeatureDocument(source);
  if (feature === undefined) return [];

  const scenarios: ScenarioWithItsTags[] = [];
  const bare = (tags: readonly { name: string }[]): string[] => tags.map((t) => bareTerm(t.name));

  const collect = (children: readonly FeatureChild[], inherited: string[]): void => {
    for (const child of children) {
      if (child.rule) {
        collect(child.rule.children as FeatureChild[], [...inherited, ...bare(child.rule.tags)]);
        continue;
      }
      if (!child.scenario) continue;
      scenarios.push({ name: child.scenario.name, tags: [...bare(child.scenario.tags), ...inherited] });
    }
  };

  collect(feature.children as FeatureChild[], bare(feature.tags));

  return scenarios;
}

export interface SeveralCodedScenario {
  readonly name: string;
  readonly codes: readonly string[];
}

function scenariosByScnCodeOf(source: string): {
  taggedScenarios: TaggedScenario[];
  untaggedScenarios: string[];
  severalCodedScenarios: SeveralCodedScenario[];
} {
  const taggedScenarios: TaggedScenario[] = [];
  const untaggedScenarios: string[] = [];
  const severalCodedScenarios: SeveralCodedScenario[] = [];
  for (const { name, tags } of scenariosOf(source)) {
    const { scnId, severalCodes } = attributionOf(tags.filter((t) => SCN_CODE.test(t)));
    if (severalCodes !== undefined) severalCodedScenarios.push({ name, codes: severalCodes });
    else if (scnId === null) untaggedScenarios.push(name);
    else taggedScenarios.push({ scnId, tags, name });
  }
  return { taggedScenarios, untaggedScenarios, severalCodedScenarios };
}

export function parseTaggedScenarios(source: string): TaggedScenario[] {
  return scenariosByScnCodeOf(source).taggedScenarios;
}

export function parseSeveralCodedScenarios(source: string): SeveralCodedScenario[] {
  return scenariosByScnCodeOf(source).severalCodedScenarios;
}

export function parseFeatureCounts(source: string): ParsedFeatureCounts {
  const { taggedScenarios, untaggedScenarios } = scenariosByScnCodeOf(source);
  return { rawScnOccurrences: countScnOccurrences(source), taggedScenarios, untaggedScenarios };
}

export function parseScenarios(
  source: string,
  deferralTags: readonly string[] = []
): Scenario[] {
  return parseTaggedScenarios(source).map((scenario) => ({
    scnId: scenario.scnId,
    evidenceObligations: evidenceObligationsOf(scenario.tags, deferralTags),
  }));
}
