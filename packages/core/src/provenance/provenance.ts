import { relativizeToRoot } from "../lib/portablePath.js";

export interface RunInputs {
  features?: string;
  vitest?: string;
  cucumber?: string;
  ci?: string;
  packageJson?: string;
  ciSteps?: string;
}

export interface RunContext {
  target: string;
  inputs: RunInputs;
  runStart: Date;
  sourceSha: string | null;
  toolSha?: string | null;
  toolVersion?: string;
  root?: string;
  strict?: boolean;
}

const INPUT_FLAGS: readonly { key: keyof RunInputs; flag: string }[] = [
  { key: "features", flag: "--features" },
  { key: "vitest", flag: "--vitest" },
  { key: "cucumber", flag: "--cucumber" },
  { key: "ci", flag: "--ci" },
  { key: "packageJson", flag: "--package-json" },
  { key: "ciSteps", flag: "--ci-steps" },
];

export interface ProvenanceInput {
  flag: string;
  value: string;
}

export interface ProvenanceFacts {
  target: string;
  inputs: ProvenanceInput[];
  runStartUtc: string;
  sourceSha: string | null;
  toolSha: string | null;
  toolVersion: string;
  absentInputs: string[];
}

function formatUtc(instant: Date): string {
  return instant.toISOString().replace(/\.\d+Z/, "Z");
}

function presentInputs(inputs: RunInputs, root: string | undefined): RunInputs {
  const out: RunInputs = {};
  for (const { key } of INPUT_FLAGS) {
    const value = inputs[key];
    if (typeof value === "string" && value.trim() !== "") {
      out[key] = relativizeToRoot(value, root);
    }
  }
  return out;
}

export interface ProvenanceObject {
  target: string;
  sourceSha: string | null;
  toolSha: string | null;
  toolVersion: string;
  runTimestamp: string;
  inputs: RunInputs;
  strict?: boolean;
}

export function provenanceObject(ctx: RunContext): ProvenanceObject {
  return {
    target: ctx.target,
    sourceSha: ctx.sourceSha,
    toolSha: ctx.toolSha ?? null,
    toolVersion: ctx.toolVersion ?? "unknown",
    runTimestamp: formatUtc(ctx.runStart),
    inputs: presentInputs(ctx.inputs, ctx.root),
    strict: ctx.strict === true,
  };
}

export function projectProvenanceObject(obj: ProvenanceObject): ProvenanceFacts {
  const inputs: ProvenanceInput[] = [];
  const absentInputs: string[] = [];
  for (const { key, flag } of INPUT_FLAGS) {
    const value = obj.inputs[key];
    if (typeof value === "string") {
      inputs.push({ flag, value });
    } else {
      absentInputs.push(flag);
    }
  }
  return {
    target: obj.target,
    inputs,
    absentInputs,
    runStartUtc: obj.runTimestamp,
    sourceSha: obj.sourceSha,
    toolSha: obj.toolSha,
    toolVersion: obj.toolVersion,
  };
}

export function projectProvenance(ctx: RunContext): ProvenanceFacts {
  return projectProvenanceObject(provenanceObject(ctx));
}
