import { isRecord, whereShapeBreaks } from "./shape.js";

// A manifest is a record of fields; what each field holds is its own reader's to say.
export const whereManifestBreaks = (manifest: unknown): string | undefined => whereShapeBreaks(manifest, { fields: {} });

export function scriptsFrom(manifest: unknown): Readonly<Record<string, string>> {
  const scripts = isRecord(manifest) ? manifest.scripts : undefined;
  return isRecord(scripts) ? Object.fromEntries(Object.entries(scripts).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
}
