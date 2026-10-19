import { join } from "node:path";
import { DEFAULT_FEATURES_DIR } from "../defaultCorpus.js";
import type { InputReadFault } from "../ingest/ingestQualityChecks.js";

export function corpusDirOf(args: Record<string, string>): string | InputReadFault {
  const given = args["features"];
  if (given !== undefined) return given;
  try {
    return join(process.cwd(), DEFAULT_FEATURES_DIR);
  } catch (err) {
    return { path: DEFAULT_FEATURES_DIR, reason: err instanceof Error ? err.message : String(err) };
  }
}
