import type { TargetConfiguration } from "./configuration.js";

// No runner for any layer, for a test to spread the layers it names over.
export const NO_RUNNERS: TargetConfiguration["runners"] = { unit: [], integration: [], e2e: [], performance: [] };
