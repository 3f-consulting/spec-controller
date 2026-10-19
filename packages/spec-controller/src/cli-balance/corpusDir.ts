import { join } from "node:path";
import { DEFAULT_FEATURES_DIR } from "../defaultCorpus.js";

export function corpusDirOf(args: Record<string, string>): string {
  return args["features"] ?? join(process.cwd(), DEFAULT_FEATURES_DIR);
}
