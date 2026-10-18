import type { RunContext } from "../domain/runProvenance.js";

export const reportCtx: RunContext = {
  target: "an-adopters-repository",
  inputs: { features: "../an-adopters-repository/features" },
  corpus: "../an-adopters-repository/features",
  runStart: new Date("2026-07-02T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
};
