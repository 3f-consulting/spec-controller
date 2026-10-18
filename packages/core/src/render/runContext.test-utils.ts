import type { RunContext } from "../domain/runProvenance.js";

export const sampleReportCtx: RunContext = {
  target: "an-adopters-repository",
  inputs: {
    features: "../an-adopters-repository/features",
    vitest: "../an-adopters-repository/vitest-report.json",
  },
  corpus: "../an-adopters-repository/features",
  runStart: new Date("2026-06-27T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

export const sectionCtx: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  corpus: "features",
  runStart: new Date("2026-10-04T12:00:00.000Z"),
  sourceSha: null,
  toolSha: null,
  toolVersion: "0.0.0",
};

export const sectionCtxNextDay: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  corpus: "features",
  runStart: new Date("2026-10-05T12:00:00.000Z"),
  sourceSha: null,
  toolSha: null,
  toolVersion: "0.0.0",
};
