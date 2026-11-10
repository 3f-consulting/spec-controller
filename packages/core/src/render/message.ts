import { IntlMessageFormat } from "intl-messageformat";

export type MessageValues = Readonly<Record<string, string | number>>;

export type Message<Code extends string, Values extends { readonly [C in Code]?: MessageValues }> = <C extends Code>(
  code: C,
  ...values: C extends keyof Values ? [values: Values[C]] : []
) => string;

// The locale is fixed, so the words a message prints never depend on the machine's own. A message is
// written as text, so an angle bracket in it, such as <path>, is text and not a tag.
export function messagesFrom<Code extends string, Values extends { readonly [C in Code]?: MessageValues }>(
  texts: Readonly<Record<Code, string>>,
): Message<Code, Values> {
  return (code, ...values) =>
    new IntlMessageFormat(texts[code], "en", undefined, { ignoreTag: true })
      .formatToParts<never>(values[0])
      .map((part) => part.value)
      .join("");
}
