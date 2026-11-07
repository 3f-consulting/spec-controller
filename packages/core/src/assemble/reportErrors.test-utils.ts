import type { ErrorsSection, RenderInput } from "../domain/renderInput.js";

const errorsInTheInputsKey = "errorsInTheInputs" satisfies keyof RenderInput;

export const claimCodeErrorsKey = "claimCodeErrors" satisfies keyof ErrorsSection;

export const configurationFaultsKey = "configurationNotRead" satisfies keyof ErrorsSection;

export function errorsInTheInputsOf(report: object): ErrorsSection | undefined {
  return (report as Pick<RenderInput, typeof errorsInTheInputsKey>)[errorsInTheInputsKey];
}

export function claimCodeErrorsOnReport(report: object): ErrorsSection[typeof claimCodeErrorsKey] {
  return errorsInTheInputsOf(report)?.[claimCodeErrorsKey];
}

export function configurationFaultsOf(errors: ErrorsSection | undefined): ErrorsSection[typeof configurationFaultsKey] {
  return errors?.[configurationFaultsKey];
}
