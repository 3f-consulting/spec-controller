import { IntlMessageFormat } from "intl-messageformat";
import coreCatalogue from "./messages.en.json" with { type: "json" };

export type Catalogue = Readonly<Record<string, string>>;

export type MessageValues = Readonly<Record<string, string | number | null>>;

// A mistake in the catalogue names the code and each of its values instead of stopping the run.
const codeAndValues = (code: string, values: MessageValues): string =>
  [code, ...Object.entries(values).map(([name, value]) => `(${name}: ${String(value)})`)].join(" ");

// Each text is parsed once, however often it is asked for; <angle brackets> in it are text.
const formats = new Map<string, IntlMessageFormat>();

function formatOf(text: string): IntlMessageFormat {
  const format = formats.get(text) ?? new IntlMessageFormat(text, "en", undefined, { ignoreTag: true });
  formats.set(text, format);
  return format;
}

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
