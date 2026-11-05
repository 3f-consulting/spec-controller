import { featureCodeOf } from "@3f-consulting/spec-controller-core";

import { AppMessage } from "../messages.js";
import { message } from "../appText.js";

export type Shape =
  | "string"
  | "number"
  | "boolean"
  | "anything"
  | { readonly list: Shape }
  | {
      readonly fields: Readonly<Record<string, Shape>>;
      readonly required?: readonly string[];
      readonly retired?: Readonly<Record<string, string>>;
    }
  | { readonly entries: Shape; readonly keys?: (key: string) => boolean };

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

export const CI_STEP_RECORD: Shape = {
  entries: { fields: { outcome: "string" } },
  keys: (key) => featureCodeOf(key) !== null,
};

export const PACKAGE_MANIFEST: Shape = { fields: { scripts: { entries: "string" } } };

const SCENARIO_NAME: Shape = { fields: { title: "string" }, required: ["title"] };

export const SAVED_RECONCILIATION: Shape = {
  fields: {
    runProvenance: { fields: { corpus: "string" }, required: ["corpus"] },
    summary: {
      fields: {
        reconciliationTotals: {
          fields: {
            reconciliationLines: {
              fields: {
                missingByQualityCheckKind: { list: { fields: { qualityCheckKind: "string" }, required: ["qualityCheckKind"] } },
              },
            },
          },
        },
        evidenceObservations: { fields: {} },
        scenarioCodes: {
          fields: {
            untaggedScenarios: { list: SCENARIO_NAME },
            sharedScnCodes: { list: { fields: { scenarios: { list: SCENARIO_NAME } } } },
          },
        },
      },
      required: ["reconciliationTotals", "evidenceObservations", "scenarioCodes"],
    },
    claimReconciliations: {
      list: {
        fields: {
          qualityCheckReconciliations: {
            list: { fields: { evidenceObligation: { fields: { qualityCheckKind: "anything" }, required: ["qualityCheckKind"] } } },
          },
          pendingItems: { list: { fields: { qualityCheckKind: "anything" }, required: ["qualityCheckKind"] } },
        },
      },
    },
    errorsInTheInputs: {
      fields: {
        scenarioCodeErrors: { list: "anything" },
        configurationNotRead: {
          fields: {
            keysNotRead: { list: "anything" },
            ofWrongKind: { list: "anything" },
            runnerKeysNotALayer: { list: "anything" },
            nonChecksMatchingNoStep: { list: "anything" },
            nonChecksNotAStepName: { list: "anything" },
          },
        },
      },
      retired: { scenarioCodes: "scenarioCodeErrors", configuration: "configurationNotRead" },
    },
  },
  required: ["runProvenance", "summary", "claimReconciliations"],
  retired: { errors: "errorsInTheInputs" },
};

// Kinds are compared unworded, so a well-shaped report formats no message.
function kindOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "list";
  return typeof value;
}

function expectedKindOf(shape: Exclude<Shape, "anything">): string {
  if (typeof shape === "string") return shape;
  return "list" in shape ? "list" : "object";
}

function wordedKind(kind: string): string {
  if (kind === "null") return kind;
  if (kind === "list") return message(AppMessage.ShapeKindList);
  if (kind === "object") return message(AppMessage.ShapeKindObject);
  return message(AppMessage.ShapeKindOfType, { type: kind });
}

type At = { readonly kind: "at"; readonly path: string };
type Position = { readonly kind: "top" } | At;

const TOP: Position = { kind: "top" };

function at(path: string): At {
  return { kind: "at", path };
}

function nameOf(position: Position): string {
  return position.kind === "top" ? message(AppMessage.ShapeTopLevel) : position.path;
}

function fieldOf(position: Position, key: string): At {
  return at(position.kind === "top" ? key : `${position.path}.${key}`);
}

function itemOf(position: Position, index: number): At {
  return at(`${position.kind === "top" ? "" : position.path}[${index}]`);
}

export function shapeFaultIn(value: unknown, shape: Shape): string | null {
  return faultAt(value, shape, TOP);
}

function faultAt(value: unknown, shape: Shape, where: Position): string | null {
  if (shape === "anything") return null;
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
  for (const [old, replacement] of Object.entries(shape.retired ?? {}))
    if (record[old] !== undefined && record[replacement] === undefined)
      return message(AppMessage.ShapeFieldMissing, { path: fieldOf(where, replacement).path });
  for (const [key, field] of Object.entries(shape.fields)) {
    const position = fieldOf(where, key);
    if (record[key] === undefined) {
      if (shape.required?.includes(key) === true) return message(AppMessage.ShapeFieldMissing, { path: position.path });
      continue;
    }
    const fault = faultAt(record[key], field, position);
    if (fault !== null) return fault;
  }
  return null;
}

function entriesFault(record: Record<string, unknown>, shape: Entries, where: Position): string | null {
  for (const [key, value] of Object.entries(record)) {
    if (shape.keys !== undefined && !shape.keys(key)) continue;
    const fault = faultAt(value, shape.entries, fieldOf(where, key));
    if (fault !== null) return fault;
  }
  return null;
}
