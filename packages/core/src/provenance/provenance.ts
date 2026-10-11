import { relativizeToRoot } from "../lib/portablePath.js";

export interface RunInputs {
  readonly features?: string;
  readonly vitest?: string;
  readonly cucumber?: string;
  readonly ci?: string;
  readonly packageJson?: string;
  readonly ciSteps?: string;
}

export interface RunContext {
  readonly target: string;
  readonly inputs: RunInputs;
  readonly runStart: Date;
  readonly sourceSha: string | null;
  readonly toolSha?: string | null;
  readonly toolVersion?: string;
  readonly root?: string;
  readonly strict?: boolean;
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
  readonly flag: string;
  readonly value: string;
}

export interface ProvenanceFacts {
  readonly target: string;
  readonly inputs: readonly ProvenanceInput[];
  readonly runStartUtc: string;
  readonly sourceSha: string | null;
  readonly toolSha: string | null;
  readonly toolVersion: string;
  readonly absentInputs: readonly string[];
}

function formatUtc(instant: Date): string {
  return instant.toISOString().replace(/\.\d+Z/, "Z");
}

function presentInputs(inputs: RunInputs, root: string | undefined): RunInputs {
  return Object.fromEntries(
    INPUT_FLAGS.flatMap(({ key }) => {
      const value = inputs[key];
      return typeof value === "string" && value.trim() !== "" ? [[key, relativizeToRoot(value, root)]] : [];
    })
  );
}

export interface ProvenanceObject {
  readonly target: string;
  readonly sourceSha: string | null;
  readonly toolSha: string | null;
  readonly toolVersion: string;
  readonly runTimestamp: string;
  readonly inputs: RunInputs;
  readonly strict?: boolean;
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
