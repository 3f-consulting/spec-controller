import type { ClaimReconciliation } from "./claimReconciliation.js";
import { carriesNoScnCode, isOutOfBalance, isScenario } from "./claimReconciliation.js";
import { untaggedScenarioId, type UntaggedScenario } from "./corpusCounts.js";
import { featureCodeOf } from "./featureCode.js";

export interface FeatureOutOfBalance {
  readonly feature: string;
  readonly title?: string;
  readonly count: number;
  readonly claims: readonly string[];
  readonly scenariosWithNoScnCode?: number;
}

export function outOfBalanceByFeature(
  rows: readonly ClaimReconciliation[],
  untagged: readonly UntaggedScenario[],
  featureNames: Readonly<Record<string, string>>,
): FeatureOutOfBalance[] {
  const codeOfFile = new Map(Object.entries(featureNames).map(([code, slug]) => [`${slug}.feature`, code]));
  const featureOf = new Map(untagged.map((u) => [untaggedScenarioId(u), codeOfFile.get(u.feature) ?? u.feature]));
  const groups = new Map<string, { claims: string[]; noScnCode: number }>();
  for (const s of rows) {
    if (!isScenario(s) || !isOutOfBalance(s)) continue;
    const noScnCode = carriesNoScnCode(s);
    const key = (noScnCode ? featureOf.get(s.claim) : featureCodeOf(s.claim)) ?? s.claim;
    const group = groups.get(key) ?? { claims: [], noScnCode: 0 };
    if (noScnCode) group.noScnCode += 1;
    else group.claims.push(s.claim);
    groups.set(key, group);
  }
  return [...groups].map(([feature, { claims, noScnCode }]) => {
    const title = featureNames[feature];
    return {
      feature,
      ...(title ? { title } : {}),
      count: claims.length + noScnCode,
      claims,
      ...(noScnCode > 0 ? { scenariosWithNoScnCode: noScnCode } : {}),
    };
  });
}
