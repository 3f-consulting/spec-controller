import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type FeatureChild, type GherkinDocument } from "@cucumber/messages";
import { bareTerm } from "../lib/bareTerm.js";
import { SCN_ID_SOURCE } from "../domain/featureCode.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import type { Scenario, EvidenceObligation, QualityCheck, RuntimeQualityCheck } from "../model.js";

export const SCN_CODE = new RegExp(`^${SCN_ID_SOURCE}$`);

const PENDING_TAG_TO_QUALITY_CHECK: Record<string, QualityCheck> = {
  fitnesspending: "fitness",
  unitpending: "unit",
  integrationpending: "integration",
  e2epending: "e2e",
  performancepending: "performance",
};

export function pendingQualityCheck(tag: string): QualityCheck | null {
  return PENDING_TAG_TO_QUALITY_CHECK[tag] ?? null;
}

const TAG_TO_QUALITY_CHECK: Record<string, RuntimeQualityCheck> = {
  unit: "unit",
  integration: "integration",
  e2e: "e2e",
  performance: "performance",
};

function tagLineTags(line: string): string[] | null {
  const tokens = line.split(/\s+/);
  if (!tokens.every((t) => t.startsWith("@"))) return null;
  return tokens.map((t) => t.slice(1));
}

const SCN_OCCURRENCE = new RegExp(`@${SCN_ID_SOURCE}`, "g");

export function countScnOccurrences(source: string): number {
  return (source.match(SCN_OCCURRENCE) ?? []).length;
}

const SCENARIO_HEADER =
  /^(?:Scenario Outline|Scenario Template|Scenario|Example):\s*(.*)$/;

export function parseUntaggedScenarios(source: string): string[] {
  const untagged: string[] = [];
  let blockTags: string[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const tags = tagLineTags(line);
    if (tags) {
      blockTags.push(...tags);
      continue;
    }
    const header = SCENARIO_HEADER.exec(line);
    if (header && !blockTags.some((t) => SCN_CODE.test(t))) {
      untagged.push(header[1]!);
    }
    blockTags = [];
  }
  return untagged;
}

export const FITNESS_AXIS_TAG = "fitness";

function convertedFitnessObligationsOf(tags: readonly string[]): EvidenceObligation[] {
  if (!tags.includes(FITNESS_AXIS_TAG)) return [];
  return [{ qualityCheck: "fitness" }];
}

function obligationsFromTags(
  tags: readonly string[],
  deferralTags: readonly string[]
): EvidenceObligation[] {
  const evidenceObligations: EvidenceObligation[] = [];
  const seenQualityChecks = new Set<RuntimeQualityCheck>();
  const seenPending = new Set<QualityCheck>();
  for (const t of tags) {
    const pendingCheck = pendingQualityCheck(t);
    if (pendingCheck && !seenPending.has(pendingCheck)) {
      seenPending.add(pendingCheck);
      evidenceObligations.push({ qualityCheck: pendingCheck, pending: true });
      continue;
    }
    const qualityCheck = TAG_TO_QUALITY_CHECK[t];
    if (qualityCheck && !seenQualityChecks.has(qualityCheck)) {
      seenQualityChecks.add(qualityCheck);
      evidenceObligations.push({ qualityCheck });
      continue;
    }
  }
  evidenceObligations.push(...convertedFitnessObligationsOf(tags));
  if (!tags.some((t) => deferralTags.includes(t))) return evidenceObligations;
  if (evidenceObligations.length === 0) return [{ pending: true }];
  return evidenceObligations.map((obligation) => ({ ...obligation, pending: true }));
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
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(CORE_MESSAGES[CoreMessage.FeatureSourceNotGherkin](message));
  }
}

export function parseTaggedScenarios(source: string): TaggedScenario[] {
  const { feature } = parseFeatureDocument(source);
  if (feature === undefined) return [];

  const tagged: TaggedScenario[] = [];
  const bare = (tags: readonly { name: string }[]): string[] => tags.map((t) => bareTerm(t.name));

  const featureTags = bare(feature.tags);

  const collect = (children: readonly FeatureChild[], inherited: string[]): void => {
    for (const child of children) {
      if (child.rule) {
        collect(child.rule.children as FeatureChild[], [...inherited, ...bare(child.rule.tags)]);
        continue;
      }
      if (!child.scenario) continue;

      const effective = [...bare(child.scenario.tags), ...inherited];
      const scnTag = effective.find((t) => SCN_CODE.test(t));
      if (scnTag === undefined) continue;

      tagged.push({ scnId: scnTag, tags: effective, name: child.scenario.name });
    }
  };

  collect(feature.children as FeatureChild[], featureTags);

  return tagged;
}

export function parseScenarios(
  source: string,
  deferralTags: readonly string[] = []
): Scenario[] {
  return parseTaggedScenarios(source).map((scenario) => ({
    scnId: scenario.scnId,
    evidenceObligations: obligationsFromTags(scenario.tags, deferralTags),
  }));
}
