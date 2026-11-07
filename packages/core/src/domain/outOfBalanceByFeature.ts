import type { ClaimReconciliation } from "./claimReconciliation.js";
import { carriesNoClaimCode, isOutOfBalance, isScenario } from "./claimReconciliation.js";
import { untaggedScenarioId } from "./corpusCounts.js";
import type { ScenarioName } from "./qualityCheckReconciliation.js";
import { featureCodeOf } from "./featureCode.js";

export interface FeatureOutOfBalance {
  readonly feature: string;
  readonly featureFile?: string;
  readonly count: number;
  readonly claims: readonly string[];
  readonly scenariosWithNoClaimCode?: number;
}

export function outOfBalanceByFeature(
  rows: readonly ClaimReconciliation[],
  untagged: readonly ScenarioName[],
  featureNames: Readonly<Record<string, string>>,
): FeatureOutOfBalance[] {
  const fileOfCode = new Map(Object.entries(featureNames).map(([code, slug]) => [code, `${slug}.feature`]));
  const codeOfFile = new Map([...fileOfCode].map(([code, file]) => [file, code]));
  const featureOf = new Map(untagged.map((u) => [untaggedScenarioId(u), codeOfFile.get(u.feature) ?? u.feature]));
  const groups = new Map<string, { claims: string[]; noClaimCode: number }>();
  for (const s of rows) {
    if (!isScenario(s) || !isOutOfBalance(s)) continue;
    const noClaimCode = carriesNoClaimCode(s);
    const key = (noClaimCode ? featureOf.get(s.claim) : featureCodeOf(s.claim)) ?? s.claim;
    const group = groups.get(key) ?? { claims: [], noClaimCode: 0 };
    if (noClaimCode) group.noClaimCode += 1;
    else group.claims.push(s.claim);
    groups.set(key, group);
  }
  return [...groups].map(([feature, { claims, noClaimCode }]) => {
    const featureFile = fileOfCode.get(feature);
    return {
      feature,
      ...(featureFile ? { featureFile } : {}),
      count: claims.length + noClaimCode,
      claims,
      ...(noClaimCode > 0 ? { scenariosWithNoClaimCode: noClaimCode } : {}),
    };
  });
}
