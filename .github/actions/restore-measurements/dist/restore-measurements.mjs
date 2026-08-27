#!/usr/bin/env node
import { createRequire as __actionBundleCreateRequire } from "node:module";
const require = __actionBundleCreateRequire(import.meta.url);

// packages/spec-controller/src/measurements/restoreCli.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// packages/spec-controller/src/measurements/artefact.ts
var MEASUREMENT_ARTEFACT_PATH = "runs/self-balance/measurements.json";
function isTheSameRowAs(row, measurement) {
  const bare = (term) => term.replace(/^@/, "").trim();
  return bare(row.scnId) === bare(measurement.scnId) && bare(row.checkTag) === bare(measurement.checkTag);
}
function isMeasurement(row) {
  if (typeof row !== "object" || row === null) return false;
  const { scnId, checkTag, measured } = row;
  return typeof scnId === "string" && typeof checkTag === "string" && typeof measured === "number";
}
function measurementsOf(rows) {
  return Array.isArray(rows) ? rows.filter(isMeasurement) : [];
}
function alreadyPostedIn(source) {
  if (source === void 0) return [];
  let posted;
  try {
    posted = JSON.parse(source);
  } catch {
    return [];
  }
  return measurementsOf(posted?.measurements);
}
function measurementArtefactWithAll(measurements, alreadyPosted) {
  const others = alreadyPostedIn(alreadyPosted).filter(
    (row) => !measurements.some((measurement) => isTheSameRowAs(row, measurement))
  );
  return { measurements: [...others, ...measurements] };
}

// packages/spec-controller/src/measurements/freshness.ts
var MILLISECONDS_PER_SECOND = 1e3;
function measuredAtIn(artefact) {
  const measuredAt = artefact?.measuredAt;
  if (typeof measuredAt !== "string") return null;
  const at = Date.parse(measuredAt);
  return Number.isNaN(at) ? null : at;
}
function freshMeasurementsOf(persisted, now, maxAgeSeconds) {
  if (persisted === void 0) return [];
  let artefact;
  try {
    artefact = JSON.parse(persisted);
  } catch {
    return [];
  }
  const measuredAt = measuredAtIn(artefact);
  if (measuredAt === null) return [];
  if (now.getTime() - measuredAt > maxAgeSeconds * MILLISECONDS_PER_SECOND) return [];
  return measurementsOf(artefact.measurements);
}

// packages/spec-controller/src/measurements/restoreCli.ts
function usage(problem) {
  console.error(`restore measurements: ${problem}`);
  console.error(
    "restore measurements: usage \u2014 --from <path> --max-age <seconds> [--root <dir>] [--now <iso>]"
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
function windowIn(flags) {
  const written = flagValue(flags, "--max-age") ?? usage("--max-age names the window, in seconds");
  const seconds = Number(written);
  if (!Number.isFinite(seconds) || seconds < 0) {
    usage(`--max-age must be a number of seconds; it was given ${JSON.stringify(written)}`);
  }
  return seconds;
}
function clockIn(flags) {
  const written = flagValue(flags, "--now");
  if (written === void 0) return /* @__PURE__ */ new Date();
  const now = new Date(written);
  if (Number.isNaN(now.getTime())) usage(`--now must be a moment; it was given ${written}`);
  return now;
}
function restoreOf(argv) {
  return {
    from: flagValue(argv, "--from") ?? usage("--from names the artefact to restore"),
    maxAgeSeconds: windowIn(argv),
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
var restore = restoreOf(process.argv.slice(2));
var persistedPath = path.resolve(restore.root, restore.from);
var fresh = freshMeasurementsOf(
  sourceAt(persistedPath),
  restore.now,
  restore.maxAgeSeconds
);
if (fresh.length === 0) {
  console.error(
    `restore measurements: nothing fresh at ${persistedPath} within ${restore.maxAgeSeconds}s, so nothing is posted. The rows it would have settled read missing, which is the true sentence: no measurement arrived.`
  );
  process.exit(0);
}
var artefactPath = path.join(restore.root, MEASUREMENT_ARTEFACT_PATH);
mkdirSync(path.dirname(artefactPath), { recursive: true });
writeFileSync(
  artefactPath,
  `${JSON.stringify(
    measurementArtefactWithAll(fresh, sourceAt(artefactPath)),
    null,
    2
  )}
`,
  "utf8"
);
for (const row of fresh) {
  console.log(
    `restore measurements: ${row.scnId} ${row.checkTag} \u2014 restored ${row.measured}, measured inside its window. The verdict on that is the ledger's.`
  );
}
