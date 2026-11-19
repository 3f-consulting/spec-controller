import type { Layer, Runner, TargetConfiguration } from "./configuration.js";

// Each layer's runners, with an empty list for each layer not named.
export const runnersOf = (named: Readonly<Partial<Record<Layer, readonly Runner[]>>> = {}): TargetConfiguration["runners"] => ({
  unit: [],
  integration: [],
  e2e: [],
  performance: [],
  ...named,
});
