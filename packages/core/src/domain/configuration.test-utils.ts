import type { TargetConfiguration } from "./configuration.js";

export const NO_RUNNERS: TargetConfiguration["runners"] = { unit: [], integration: [], e2e: [], performance: [] };
