import { targetConfigurationOf, type ConfigurationRead } from "../domain/configuration.js";
import type { PipelineStep } from "../domain/postEvidenceObservation.js";
import { bareTerm } from "../lib/bareTerm.js";

// A deferral tag may be written with its at-sign or spaces around it; the domain takes the bare term.
function withBareDeferralTags(block: unknown): unknown {
  if (typeof block !== "object" || block === null || !("deferralTags" in block) || !Array.isArray(block.deferralTags)) return block;
  return { ...block, deferralTags: block.deferralTags.map((tag: unknown) => (typeof tag === "string" ? bareTerm(tag) : tag)) };
}

export function targetConfigurationFrom(packageJson: { readonly specController?: unknown }, stepsRead: readonly PipelineStep[] = []): ConfigurationRead {
  return targetConfigurationOf(withBareDeferralTags(packageJson.specController), stepsRead);
}
