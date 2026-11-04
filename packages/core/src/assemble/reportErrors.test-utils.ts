import type { ErrorsSection, RenderInput } from "../domain/renderInput.js";

const errorsInTheInputsKey = "errorsInTheInputs" satisfies keyof RenderInput;

export const scenarioCodeErrorsKey = "scenarioCodeErrors" satisfies keyof ErrorsSection;

export const configurationFaultsKey = "configurationNotRead" satisfies keyof ErrorsSection;

export function errorsInTheInputsOf(report: object): ErrorsSection | undefined {
  return (report as Pick<RenderInput, typeof errorsInTheInputsKey>)[errorsInTheInputsKey];
}

export function scenarioCodeErrorsOnReport(report: object): ErrorsSection[typeof scenarioCodeErrorsKey] {
  return errorsInTheInputsOf(report)?.[scenarioCodeErrorsKey];
}

export function configurationFaultsOf(errors: ErrorsSection | undefined): ErrorsSection[typeof configurationFaultsKey] {
  return errors?.[configurationFaultsKey];
}
