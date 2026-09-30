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

export const CI_STEP_RECORD: Shape = {
  entries: { fields: { outcome: "string" } },
  keys: /^SCN-[A-Z0-9]{2,5}-\d+$/,
};

export const PACKAGE_MANIFEST: Shape = { fields: { scripts: { entries: "string" } } };

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
