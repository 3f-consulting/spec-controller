// What a report holds where its reader reads it: a string, a list, a record of one kind of entry, or named fields,
// some of them optional.
export type Shape =
  | "string"
  | { readonly listOf: Shape }
  | { readonly entriesOf: Shape }
  | { readonly fields: Readonly<Record<string, Shape>>; readonly optional?: readonly string[] };

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

const firstOf = (breaks: readonly (string | undefined)[]): string | undefined => breaks.find((at) => at !== undefined);

// Where the value first breaks its shape, as a path from the report's top ($); nothing when it holds.
export function whereShapeBreaks(value: unknown, shape: Shape, at = "$"): string | undefined {
  if (shape === "string") return typeof value === "string" ? undefined : at;
  if ("listOf" in shape) return Array.isArray(value) ? firstOf(value.map((item, index) => whereShapeBreaks(item, shape.listOf, `${at}[${index}]`))) : at;
  if (!isRecord(value)) return at;
  if ("entriesOf" in shape) return firstOf(Object.entries(value).map(([key, entry]) => whereShapeBreaks(entry, shape.entriesOf, `${at}.${key}`)));
  return firstOf(
    Object.entries(shape.fields).map(([name, field]) =>
      value[name] === undefined && shape.optional?.includes(name) === true ? undefined : whereShapeBreaks(value[name], field, `${at}.${name}`),
    ),
  );
}
