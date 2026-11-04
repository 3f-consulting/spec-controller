import type { ProvenanceObject, RunInputName } from "../domain/runProvenance.js";

export interface ProvenanceInput {
  readonly flag: string;
  readonly value: string;
}

export type ProvenanceInputsView =
  | { readonly kind: "none" }
  | { readonly kind: "given"; readonly inputs: readonly [ProvenanceInput, ...(readonly ProvenanceInput[])] };

export interface ProvenanceFacts {
  readonly target: string;
  readonly targetOrigin?: string;
  readonly inputs: readonly ProvenanceInput[];
  readonly runStartUtc: string;
  readonly sourceSha: string | null;
  readonly toolSha: string | null;
  readonly toolVersion: string;
  readonly absentInputs: readonly string[];
}

export function projectProvenanceObject(obj: ProvenanceObject, inputNames: readonly RunInputName[]): ProvenanceFacts {
  const inputs: ProvenanceInput[] = [];
  const absentInputs: string[] = [];
  for (const { name, flag } of inputNames) {
    const value = obj.inputs[name];
    if (typeof value === "string") {
      inputs.push({ flag, value });
    } else {
      absentInputs.push(flag);
    }
  }
  return {
    target: obj.target,
    ...(obj.targetOrigin !== undefined ? { targetOrigin: obj.targetOrigin } : {}),
    inputs,
    absentInputs,
    runStartUtc: obj.runTimestamp,
    sourceSha: obj.sourceSha,
    toolSha: obj.toolSha,
    toolVersion: obj.toolVersion,
  };
}

export function provenanceInputsView(inputs: readonly ProvenanceInput[]): ProvenanceInputsView {
  const [first, ...rest] = inputs;
  return first === undefined ? { kind: "none" } : { kind: "given", inputs: [first, ...rest] };
}
