import type { RunContext } from "../provenance/provenance.js";

export const reportCtx: RunContext = {
  target: "an-adopters-repository",
  inputs: { features: "../an-adopters-repository/features" },
  runStart: new Date("2026-07-02T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
};

export const fixtureCtx: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  runStart: new Date("2026-10-03T00:00:00.000Z"),
  sourceSha: null,
};
