import { AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";

export type Shape =
  | "string"
  | "number"
  | "boolean"
  | { readonly list: Shape }
  | {
      readonly fields: Readonly<Record<string, Shape>>;
      readonly required?: readonly string[];
    }
  | { readonly entries: Shape };

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

export const JUNIT_REPORT: Shape = {
  fields: {
    testsuites: {
      fields: {
        testsuite: { list: { fields: { testcase: { list: { fields: { classname: "string", name: "string" } } } } } },
      },
    },
  },
  required: ["testsuites"],
};

export const RSPEC_REPORT: Shape = {
  fields: {
    examples: {
      list: { fields: { description: "string", full_description: "string", status: "string", file_path: "string" } },
    },
    summary: { fields: { errors_outside_of_examples_count: "number" } },
    messages: { list: "string" },
  },
  required: ["examples", "summary"],
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

export const CI_STEP_RECORD: Shape = { entries: { fields: { outcome: "string" } } };

export const PACKAGE_MANIFEST: Shape = { fields: { scripts: { entries: "string" } } };

// Kinds are compared unworded, so a well-shaped report formats no message.
function kindOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "list";
  return typeof value;
}

function expectedKindOf(shape: Shape): string {
  if (typeof shape === "string") return shape;
  return "list" in shape ? "list" : "object";
}

function wordedKind(kind: string): string {
  if (kind === "null") return kind;
  if (kind === "list") return message(AppMessage.ShapeKindList);
  if (kind === "object") return message(AppMessage.ShapeKindObject);
  return message(AppMessage.ShapeKindOfType, { type: kind });
}

// A position is the path to a value inside the input; the top level has none.
type Position = string | undefined;

function nameOf(position: Position): string {
  return position ?? message(AppMessage.ShapeTopLevel);
}

function fieldOf(position: Position, key: string): string {
  return position === undefined ? key : `${position}.${key}`;
}

function itemOf(position: Position, index: number): string {
  return `${position ?? ""}[${index}]`;
}

export function shapeFaultIn(value: unknown, shape: Shape): string | null {
  return faultAt(value, shape, undefined);
}

function faultAt(value: unknown, shape: Shape, where: Position): string | null {
  const found = kindOf(value);
  const expected = expectedKindOf(shape);
  if (found !== expected)
    return message(AppMessage.ShapeWrongKind, { where: nameOf(where), found: wordedKind(found), expected: wordedKind(expected) });
  if (typeof shape === "string") return null;
  if ("list" in shape) return listFault(value as readonly unknown[], shape.list, where);
  if ("entries" in shape) return entriesFault(value as Record<string, unknown>, shape, where);
  return fieldsFault(value as Record<string, unknown>, shape, where);
}

function listFault(items: readonly unknown[], item: Shape, where: Position): string | null {
  for (const [index, value] of items.entries()) {
    const fault = faultAt(value, item, itemOf(where, index));
    if (fault !== null) return fault;
  }
  return null;
}

function fieldsFault(record: Record<string, unknown>, shape: Fields, where: Position): string | null {
  for (const [key, field] of Object.entries(shape.fields)) {
    const position = fieldOf(where, key);
    if (record[key] === undefined) {
      if (shape.required?.includes(key) === true) return message(AppMessage.ShapeFieldMissing, { path: position });
      continue;
    }
    const fault = faultAt(record[key], field, position);
    if (fault !== null) return fault;
  }
  return null;
}

function entriesFault(record: Record<string, unknown>, shape: Entries, where: Position): string | null {
  for (const [key, value] of Object.entries(record)) {
    const fault = faultAt(value, shape.entries, fieldOf(where, key));
    if (fault !== null) return fault;
  }
  return null;
}
