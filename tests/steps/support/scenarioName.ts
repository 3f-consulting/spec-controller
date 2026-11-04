/** A scenario of the report's census, named by its feature file and its title. */
export interface ScenarioName {
  readonly feature: string;
  readonly title: string;
}

export function scenarioName(feature: string, title: string): ScenarioName {
  return { feature, title };
}
