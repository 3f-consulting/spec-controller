import coreCatalogue from "./messages.en.json" with { type: "json" };

export type Catalogue = Readonly<Record<string, string>>;

export function textFor(catalogue: Catalogue, code: string): string {
  return String(catalogue[code]);
}

export const coreText = (code: string): string => textFor(coreCatalogue, code);
