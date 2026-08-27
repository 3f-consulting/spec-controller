#!/usr/bin/env node
import { createRequire as __actionBundleCreateRequire } from "node:module";
const require = __actionBundleCreateRequire(import.meta.url);

// packages/spec-controller/src/measurements/persistCli.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// packages/spec-controller/src/measurements/artefact.ts
var MEASUREMENT_ARTEFACT_PATH = "runs/self-balance/measurements.json";
function isMeasurement(row) {
  if (typeof row !== "object" || row === null) return false;
  const { scnId, checkTag, measured } = row;
  return typeof scnId === "string" && typeof checkTag === "string" && typeof measured === "number";
}
function measurementsOf(rows) {
  return Array.isArray(rows) ? rows.filter(isMeasurement) : [];
}

// packages/spec-controller/src/measurements/dating.ts
function measuredRowsIn(measured) {
  if (measured === void 0) return [];
  let artefact;
  try {
    artefact = JSON.parse(measured);
  } catch {
    return [];
  }
  return measurementsOf(artefact?.measurements);
}
function datedArtefactOf(measured, now) {
  const measurements = measuredRowsIn(measured);
  if (measurements.length === 0) return null;
  return { measuredAt: now.toISOString(), measurements };
}

// packages/spec-controller/src/measurements/persistCli.ts
function usage(problem) {
  console.error(`persist measurements: ${problem}`);
  console.error(
    "persist measurements: usage \u2014 --to <path> [--root <dir>] [--now <iso>]"
  );
  process.exit(2);
}
function flagValue(flags, name) {
  const at = flags.indexOf(name);
  if (at === -1) return void 0;
  const value = flags[at + 1];
  if (value === void 0 || value.startsWith("--")) usage(`${name} needs a value`);
  return value;
}
function clockIn(flags) {
  const written = flagValue(flags, "--now");
  if (written === void 0) return /* @__PURE__ */ new Date();
  const now = new Date(written);
  if (Number.isNaN(now.getTime())) usage(`--now must be a moment; it was given ${written}`);
  return now;
}
function persistOf(argv) {
  return {
    to: flagValue(argv, "--to") ?? usage("--to names where to leave what this run measured"),
    root: flagValue(argv, "--root") ?? process.cwd(),
    now: clockIn(argv)
  };
}
function sourceAt(at) {
  try {
    return readFileSync(at, "utf8");
  } catch {
    return void 0;
  }
}
var persist = persistOf(process.argv.slice(2));
var runArtefactPath = path.join(persist.root, MEASUREMENT_ARTEFACT_PATH);
var dated = datedArtefactOf(sourceAt(runArtefactPath), persist.now);
if (dated === null) {
  console.error(
    `persist measurements: nothing worth persisting at ${runArtefactPath}, so nothing is left for an upload to collect. The rows it would have settled read missing, which is the true sentence: this run measured nothing.`
  );
  process.exit(0);
}
var persistedPath = path.resolve(persist.root, persist.to);
mkdirSync(path.dirname(persistedPath), { recursive: true });
writeFileSync(persistedPath, `${JSON.stringify(dated, null, 2)}
`, "utf8");
for (const row of dated.measurements) {
  console.log(
    `persist measurements: ${row.scnId} ${row.checkTag} \u2014 persisted ${row.measured}, measured ${dated.measuredAt}. How long that stays worth posting is the borrower's.`
  );
}
