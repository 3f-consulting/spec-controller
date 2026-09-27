/**
 * The shape each JSON input `balance` reads must have before its reader is handed it: the fields
 * that reader goes on to read, and nothing more. A report is its producer's document, so a field
 * the reader never touches is never checked, and a well-formed empty report is still a report.
 *
 * A document that is not this shape is an input the tool cannot read. Read anyway, it either
 * throws part-way or is read as nothing and reaches a verdict about evidence it discarded, and
 * both of those end on the out-of-balance code.
 */

/** A leaf kind, a list of one shape, a record of named fields, or a map whose entries share one. */
export type Shape =
  | "string"
  | "number"
  | "boolean"
  | "anything"
  | { readonly list: Shape }
  | { readonly fields: Readonly<Record<string, Shape>>; readonly required?: readonly string[] }
  | { readonly entries: Shape; readonly keys?: RegExp };

type Fields = Extract<Shape, { fields: unknown }>;
type Entries = Extract<Shape, { entries: unknown }>;

/** What the Vitest JSON reporter writes, as far as the Vitest reader reads it. */
export const VITEST_REPORT: Shape = {
  fields: {
    testResults: {
      list: {
        fields: {
          name: "string",
          status: "string",
          message: "string",
          assertionResults: { list: { fields: { fullName: "string", title: "string", status: "string" } } },
        },
      },
    },
  },
  required: ["testResults"],
};

/** What the Cucumber JSON formatter writes, as far as the Cucumber reader reads it. */
export const CUCUMBER_REPORT: Shape = {
  list: {
    fields: {
      uri: "string",
      name: "string",
      elements: {
        list: {
          fields: {
            tags: { list: { fields: { name: "string" } } },
            steps: { list: { fields: { keyword: "string", name: "string", result: { fields: { status: "string" } } } } },
          },
        },
      },
    },
  },
};

/**
 * A CI run's step record, as far as the step-record reader reads it: an object of steps keyed by
 * step id, of which it credits only those keyed by a scenario code, reading each one's `outcome`.
 * The key grammar is the reader's own, so a step it never credits is never checked.
 */
export const CI_STEP_RECORD: Shape = {
  entries: { fields: { outcome: "string" } },
  keys: /^SCN-[A-Z0-9]{2,5}-\d+$/,
};

/**
 * A package.json, as far as the run reads it outside the `specController` block: an object whose
 * `scripts` are a map of commands. The `specController` block is left to its own resolvers, which
 * read a value they cannot use as absent rather than refuse the run over it.
 */
export const PACKAGE_MANIFEST: Shape = { fields: { scripts: { entries: "string" } } };

/**
 * A reconciliation this tool saved, at its top: the sections every one carries, and the optional
 * ones in their kind. Below the top the renderer is the reader, and a document it cannot render
 * is refused where it renders.
 */
export const SAVED_RECONCILIATION: Shape = {
  fields: {
    runProvenance: { fields: {} },
    summary: { fields: {} },
    ledger: { fields: { scenarioReconciliations: { list: "anything" } }, required: ["scenarioReconciliations"] },
    scenarioCodeErrors: { list: "anything" },
    scenarioCodePopulation: { fields: {} },
    evidenceObligations: { fields: {} },
    metadata: { fields: {} },
  },
  required: ["runProvenance", "summary", "ledger"],
};

function kindOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "a list";
  if (typeof value === "object") return "an object";
  return `a ${typeof value}`;
}

function expectedKindOf(shape: Shape): string {
  if (typeof shape === "string") return `a ${shape}`;
  return "list" in shape ? "a list" : "an object";
}

function pathOf(where: string, key: string): string {
  return where === "" ? key : `${where}.${key}`;
}

/**
 * The first place `value` is not `shape`, said as the path to it and what was found there, or null
 * when the whole value is that shape. `where` is the path so far; the top level has none.
 */
export function shapeFaultIn(value: unknown, shape: Shape, where = ""): string | null {
  if (shape === "anything") return null;
  const found = kindOf(value);
  const expected = expectedKindOf(shape);
  if (found !== expected) return `${where === "" ? "the top level" : where} is ${found}, not ${expected}`;
  if (typeof shape === "string") return null;
  if ("list" in shape) return listFault(value as readonly unknown[], shape.list, where);
  if ("entries" in shape) return entriesFault(value as Record<string, unknown>, shape, where);
  return fieldsFault(value as Record<string, unknown>, shape, where);
}

function listFault(items: readonly unknown[], item: Shape, where: string): string | null {
  for (const [index, value] of items.entries()) {
    const fault = shapeFaultIn(value, item, `${where}[${index}]`);
    if (fault !== null) return fault;
  }
  return null;
}

function fieldsFault(record: Record<string, unknown>, shape: Fields, where: string): string | null {
  for (const [key, field] of Object.entries(shape.fields)) {
    const path = pathOf(where, key);
    if (record[key] === undefined) {
      if (shape.required?.includes(key) === true) return `${path} is missing`;
      continue;
    }
    const fault = shapeFaultIn(record[key], field, path);
    if (fault !== null) return fault;
  }
  return null;
}

function entriesFault(record: Record<string, unknown>, shape: Entries, where: string): string | null {
  for (const [key, value] of Object.entries(record)) {
    if (shape.keys !== undefined && !shape.keys.test(key)) continue;
    const fault = shapeFaultIn(value, shape.entries, pathOf(where, key));
    if (fault !== null) return fault;
  }
  return null;
}
