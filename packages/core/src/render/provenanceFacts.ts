import { INPUT_KEYS, type ProvenanceObject } from "../domain/runProvenance.js";

export interface ProvenanceInput {
  readonly flag: string;
  readonly value: string;
}

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

function flagOf(key: string): string {
  return `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

export function projectProvenanceObject(obj: ProvenanceObject): ProvenanceFacts {
  const inputs: ProvenanceInput[] = [];
  const absentInputs: string[] = [];
  for (const key of INPUT_KEYS) {
    const flag = flagOf(key);
    const value = obj.inputs[key];
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
