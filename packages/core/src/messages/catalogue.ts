import { IntlMessageFormat } from "intl-messageformat";
import coreCatalogue from "./messages.en.json" with { type: "json" };

export type Catalogue = Readonly<Record<string, string>>;

export type MessageValues = Readonly<Record<string, string | number | null>>;

// A mistake in the catalogue names the code and its values instead of stopping the run.
function codeAndValues(code: string, values: MessageValues): string {
  const named = Object.entries(values).map(([name, value]) => `${name}: ${String(value)}`);
  return named.length === 0 ? code : `${code} (${named.join(", ")})`;
}

// <Angle brackets> in a text are text.
const formatOf = (text: string): IntlMessageFormat => new IntlMessageFormat(text, "en", undefined, { ignoreTag: true });

export function textFor(catalogue: Catalogue, code: string, values: MessageValues = {}): string {
  const text = catalogue[code];
  if (text === undefined || text.trim() === "" || Object.values(values).includes(null)) return codeAndValues(code, values);
  try {
    // Each value is filled in as written: a number is not grouped by the locale.
    const filled = formatOf(text).format(Object.fromEntries(Object.entries(values).map(([name, value]) => [name, String(value)])));
    return String(filled);
  } catch {
    return codeAndValues(code, values);
  }
}

export const coreText = (code: string, values: MessageValues = {}): string => textFor(coreCatalogue, code, values);
