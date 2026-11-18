// What a report holds where its reader reads it: text, a word of a set, a list of one shape, a record of one, or fields.
export type Shape =
  | "text"
  | { readonly eachOf: Shape }
  | { readonly oneOf: readonly string[] }
  | { readonly entriesOf: Shape }
  | { readonly fields: Readonly<Record<string, Shape>>; readonly optional?: readonly string[] };

export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

const firstOf = (breaks: readonly (string | undefined)[]): string | undefined => breaks.find((at) => at !== undefined);

export const TOP = "$";

const holdsText = (value: unknown, shape: "text" | { readonly oneOf: readonly string[] }): boolean => typeof value === "string" && (shape === "text" || shape.oneOf.includes(value));

// Where the value first breaks its shape, as a path from the report's top with each list entry's index; nothing when it holds.
export function whereShapeBreaks(value: unknown, shape: Shape, at = TOP): string | undefined {
  if (shape === "text" || "oneOf" in shape) return holdsText(value, shape) ? undefined : at;
  if ("eachOf" in shape) return Array.isArray(value) ? firstOf(value.map((entry: unknown, index) => whereShapeBreaks(entry, shape.eachOf, `${at}[${index}]`))) : at;
  if (!isRecord(value)) return at;
  if ("entriesOf" in shape) return firstOf(Object.entries(value).map(([key, entry]) => whereShapeBreaks(entry, shape.entriesOf, `${at}.${key}`)));
  return firstOf(
    Object.entries(shape.fields).map(([name, field]) =>
      value[name] === undefined && shape.optional?.includes(name) === true ? undefined : whereShapeBreaks(value[name], field, `${at}.${name}`),
    ),
  );
}
