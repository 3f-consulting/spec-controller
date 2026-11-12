import { join } from "node:path";
import type { InputReadFault } from "./inputReading.js";

export function corpusDirOf(args: Record<string, string>, defaultCorpus: string): string | InputReadFault {
  const given = args["features"];
  if (given !== undefined) return given;
  try {
    return join(process.cwd(), defaultCorpus);
  } catch (err) {
    return { path: defaultCorpus, reason: (err as Error).message };
  }
}
