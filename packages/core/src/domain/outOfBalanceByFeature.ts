import type { ClaimReconciliation } from "./claimReconciliation.js";
import { carriesNoScnCode, isOutOfBalance, isScenario } from "./claimReconciliation.js";
import { untaggedScenarioId } from "./corpusCounts.js";
import type { ScenarioName } from "./qualityCheckReconciliation.js";
import { featureCodeOf } from "./featureCode.js";

export interface FeatureOutOfBalance {
  readonly feature: string;
  readonly featureFile?: string;
  readonly count: number;
  readonly claims: readonly string[];
  readonly scenariosWithNoScnCode?: number;
}

export function outOfBalanceByFeature(
  rows: readonly ClaimReconciliation[],
  untagged: readonly ScenarioName[],
  featureNames: Readonly<Record<string, string>>,
): FeatureOutOfBalance[] {
  const fileOfCode = new Map(Object.entries(featureNames).map(([code, slug]) => [code, `${slug}.feature`]));
  const codeOfFile = new Map([...fileOfCode].map(([code, file]) => [file, code]));
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
    const featureFile = fileOfCode.get(feature);
    return {
      feature,
      ...(featureFile ? { featureFile } : {}),
      count: claims.length + noScnCode,
      claims,
      ...(noScnCode > 0 ? { scenariosWithNoScnCode: noScnCode } : {}),
    };
  });
}
