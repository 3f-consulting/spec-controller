import type { FileIdentity, IdentifiedOutput, PlannedOutput } from "./format.js";

export const toFile = (fmt: "md" | "json", path: string): PlannedOutput => ({ fmt, dest: { kind: "file", path } });
export const toStdout = (fmt: "md" | "json"): PlannedOutput => ({ fmt, dest: { kind: "stdout" } });
export const fileIdentity = (dev: bigint, ino: bigint): FileIdentity => ({ dev, ino });
export const identifiedAs = (output: PlannedOutput, identity: FileIdentity | undefined): IdentifiedOutput => ({ output, identity });
