/**
 * Config-key extraction — a JSON key's segment is its KEY PATH (@SCN-VOC-018, 3F-2329).
 *
 * Split from `vocabAudit.ts` because that module sits at a `max-lines` exception and an
 * exception buys no headroom (`complexity-threshold.feature`).
 *
 * The path, not the last segment, is what a key MEANS — and without the parent in the judged
 * sequence, no co-occurrence qualifier can see it at all, which is what left a compiler
 * option indistinguishable from the retired word that spells it.
 */

import type { Segment, Surface } from "./vocabAudit.js";

export function configKeySegments(
  lines: readonly string[],
  relPath: string,
  surface: Surface,
): Segment[] {
  const segs: Segment[] = [];
  const keyPath: string[] = [];
  lines.forEach((text, idx) => {
    const keyMatch = /^\s*"([^"]+)"\s*:/.exec(text);
    if (keyMatch) {
      const qualified = [...keyPath, keyMatch[1]!].join(".");
      segs.push({ surface, file: relPath, line: idx + 1, mode: "name", text: qualified });
      if (/\{\s*$/.test(text)) keyPath.push(keyMatch[1]!);
    } else if (/^\s*[}\]],?\s*$/.test(text)) keyPath.pop();
    const rest = keyMatch ? text.slice(keyMatch[0].length) : text;
    const valMatch = /:\s*"([^"]*)"/.exec(text) ?? /"([^"]*)"/.exec(rest);
    if (valMatch && valMatch[1]!.trim() !== "") {
      segs.push({ surface, file: relPath, line: idx + 1, mode: "prose", text: valMatch[1]! });
    }
  });
  return segs;
}
