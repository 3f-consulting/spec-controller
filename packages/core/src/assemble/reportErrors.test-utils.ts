import type { ErrorsSection } from "../domain/renderInput.js";

export const configurationFaultsKey = "configurationNotRead" satisfies keyof ErrorsSection;

export function configurationFaultsOf(errors: ErrorsSection | undefined): ErrorsSection[typeof configurationFaultsKey] {
  return errors?.[configurationFaultsKey];
}
