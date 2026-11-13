import coreCatalogue from "./messages.en.json" with { type: "json" };

export type Catalogue = Readonly<Record<string, string>>;

export type MessageValues = Readonly<Record<string, string | number | null>>;

export function textFor(catalogue: Catalogue, code: string, _values: MessageValues = {}): string {
  return String(catalogue[code]);
}

export const coreText = (code: string): string => textFor(coreCatalogue, code);
