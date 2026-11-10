import { IntlMessageFormat } from "intl-messageformat";

export type MessageValues = Readonly<Record<string, string | number | null>>;

export type Message<Code extends string, Values extends { readonly [C in Code]?: MessageValues }> = <C extends Code>(
  code: C,
  ...values: C extends keyof Values ? [values: Values[C]] : []
) => string;

// A value goes in as text, so a number is written as it was given and never grouped.
const asText = (values: MessageValues | undefined): Record<string, string> | undefined =>
  values === undefined ? undefined : Object.fromEntries(Object.entries(values).map(([name, value]) => [name, String(value)]));

// A catalogue mistake is a development mistake, so the reader gets the code and its values rather than a stopped run.
function withValues(code: string, values: MessageValues | undefined): string {
  const named = Object.entries(values ?? {}).map(([name, value]) => `${name}: ${String(value)}`);
  return named.length === 0 ? code : `${code} (${named.join(", ")})`;
}

// The locale is fixed, so the words a message prints never depend on the machine's own. A message is
// written as text, so an angle bracket in it, such as <path>, is text and not a tag.
export function messagesFrom<Code extends string, Values extends { readonly [C in Code]?: MessageValues }>(
  texts: Readonly<Record<Code, string>>,
): Message<Code, Values> {
  return (code, ...values) => {
    const text = texts[code] as string | undefined;
    const given = values[0];
    if (text === undefined || text.trim() === "" || Object.values(given ?? {}).includes(null)) return withValues(code, given);
    try {
      return new IntlMessageFormat(text, "en", undefined, { ignoreTag: true })
        .formatToParts<never>(asText(given))
        .map((part) => part.value)
        .join("");
    } catch {
      return withValues(code, given);
    }
  };
}
