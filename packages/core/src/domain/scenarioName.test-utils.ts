import type { ScenarioName } from "./qualityCheckReconciliation.js";

/** A scenario of the corpus census, named by its feature file and its title. */
export function scenarioName(feature: string, title: string): ScenarioName {
  return { feature, title };
}

export function scenarioTitleOf(name: ScenarioName): string {
  return name.title;
}
