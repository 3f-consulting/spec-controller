import { readFileSync } from "node:fs";
import { PUBLISHED_SCHEMA } from "./builtCli.js";

const SECTION = "errorsInTheInputs";
const CLAIM_CODE_ERRORS = "claimCodeErrors";

export interface ErrorsInTheInputsSection {
  readonly [CLAIM_CODE_ERRORS]?: unknown[];
}

export interface WithErrorsInTheInputs {
  readonly [SECTION]?: ErrorsInTheInputsSection;
}

export function errorsInTheInputsOf(report: unknown): ErrorsInTheInputsSection | undefined {
  return (report as WithErrorsInTheInputs)[SECTION];
}

export function claimCodeErrorsOnReport(report: unknown): unknown[] | undefined {
  return errorsInTheInputsOf(report)?.[CLAIM_CODE_ERRORS];
}

interface SchemaNode {
  readonly $ref?: string;
  readonly properties?: Readonly<Record<string, SchemaNode>>;
}

// An absent section reads the same under any key, so a reader that finds none
// first shows the published schema names the place it looked.
export function publishedSchemaNamesClaimCodeErrors(): boolean {
  const schema = JSON.parse(readFileSync(PUBLISHED_SCHEMA, "utf8")) as SchemaNode & { readonly definitions: Record<string, SchemaNode> };
  const resolved = (node: SchemaNode | undefined): SchemaNode | undefined =>
    node?.$ref === undefined ? node : schema.definitions[node.$ref.replace("#/definitions/", "")];
  return resolved(resolved(resolved(schema)?.properties?.[SECTION])?.properties?.[CLAIM_CODE_ERRORS]) !== undefined;
}
