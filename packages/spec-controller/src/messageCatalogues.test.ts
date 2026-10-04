import { describe, it, expect } from "vitest";

import { QualityCheckFaultCode, type QualityCheckFault } from "../../core/src/domain/qualityCheckFault.js";
import { QUALITY_CHECK_FAULT_MESSAGES } from "../../core/src/domain/qualityCheckFaultMessages.js";
import { APP_MESSAGES, AppMessage, UNREADABLE_SUBJECTS, Unreadable, type AppMessages } from "./messages.js";

function codesOf(codes: object): number[] {
  return Object.values(codes)
    .filter((member): member is number => typeof member === "number")
    .sort((a, b) => a - b);
}

function keysOf(catalogue: object): number[] {
  return Object.keys(catalogue)
    .map(Number)
    .sort((a, b) => a - b);
}

const SAMPLE_FAULTS: {
  readonly [C in QualityCheckFaultCode]: Extract<QualityCheckFault, { code: C }>;
} = {
  [QualityCheckFaultCode.ObligationSideDivergesFromCanon]: {
    code: QualityCheckFaultCode.ObligationSideDivergesFromCanon,
    outcome: "watermelon",
    required: "Exists",
    actual: "None",
  },
  [QualityCheckFaultCode.ObservationSideDivergesFromCanon]: {
    code: QualityCheckFaultCode.ObservationSideDivergesFromCanon,
    outcome: "cites-unknown-scenario",
    required: "None",
    actual: "Exists",
  },
};

function renderedFault(fault: QualityCheckFault): string {
  return (QUALITY_CHECK_FAULT_MESSAGES[fault.code] as (f: QualityCheckFault) => string)(fault);
}

const SAMPLE_APP_PARAMS: { readonly [C in AppMessage]: Parameters<AppMessages[C]> } = {
  [AppMessage.History]: [],
  [AppMessage.Repository]: [],
  [AppMessage.Tree]: [],
  [AppMessage.TreeDirectory]: [],
  [AppMessage.TreeFile]: [],
  [AppMessage.FeatureFile]: [],
  [AppMessage.FeatureCorpus]: [],
  [AppMessage.WorkingDirectory]: [],
  [AppMessage.CouldNotBeRead]: ["the tree", "EACCES"],
  [AppMessage.CouldNotBeReadAt]: ["a file in the tree", "features/a.feature", "EISDIR"],
  [AppMessage.UsageError]: ["allocate", "too many arguments"],
  [AppMessage.GitExited]: [["log"], 128, "fatal: not a git repository"],
};

function renderedApp(code: AppMessage): string {
  return (APP_MESSAGES[code] as (...params: unknown[]) => string)(...SAMPLE_APP_PARAMS[code]);
}

describe("[SCN-MSG-002] every message catalogue is total over its codes, with no empty entry", () => {
  it("holds core's fault catalogue to every fault code and nothing else, and every rendered message to its own fault's parameters", () => {
    const codes = codesOf(QualityCheckFaultCode);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf(QUALITY_CHECK_FAULT_MESSAGES)).toEqual(codes);
    expect(keysOf(SAMPLE_FAULTS)).toEqual(codes);

    for (const fault of Object.values(SAMPLE_FAULTS)) {
      const message = renderedFault(fault);
      expect(message.trim()).not.toBe("");
      expect(message).toContain(fault.outcome);
      expect(message).toContain(fault.required);
      expect(message).toContain(fault.actual);
    }
  });

  it("holds the app's catalogue to every app message code and nothing else, with no entry rendering blank", () => {
    const codes = codesOf(AppMessage);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf(APP_MESSAGES)).toEqual(codes);

    for (const code of codes as AppMessage[]) expect(renderedApp(code).trim()).not.toBe("");
  });

  it("holds the app's unreadable subjects to every Unreadable member and nothing else, with no blank subject", () => {
    const members = codesOf(Unreadable) as Unreadable[];
    expect(members.length).toBeGreaterThan(0);
    expect(keysOf(UNREADABLE_SUBJECTS)).toEqual(members);

    for (const member of members) expect(UNREADABLE_SUBJECTS[member].trim()).not.toBe("");
  });
});
