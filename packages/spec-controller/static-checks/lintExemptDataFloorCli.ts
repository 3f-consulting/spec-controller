/**
 * The DATA-FLOOR gate — `lint:exempt-data-floor` (@SCN-VOC-016 / @SCN-VOC-017, 3F-2378).
 *
 * An entry in `SELF_EXEMPT_PATHS` makes a file wholly invisible to the vocabulary audit.
 * That is honest for a PURE-DATA file — the vendored canon table, the rename-target table,
 * the fixture corpus, the feature file and its step definitions — where every banned word
 * is a MENTION, the definition of what is banned. It is dishonest for a MIXED file, code
 * with data inlined, because there the same exemption hides a USE behind a mention. That is
 * what hid 3F-2300: the renamed handle survived as an identifier in files nobody could see
 * into, and the rename read complete because the audit reported nothing.
 *
 * So the exemption is not scoped per file (the deprecated 3F-2345 approach, which made the
 * symptom safe); the REASON for it is removed, by relocating the data out of the code. What
 * this gate then enforces is that the list stays at that floor.
 *
 * TWO BEHAVIOURS, ONE SCRIPT:
 *
 *   @SCN-VOC-016 — every entry is a pure-data path. A code file on the list reds.
 *   @SCN-VOC-017 — an entry covering no banned-word mention reds as STALE, so the list can
 *                  only shrink. Without it an exemption emptied by a relocation or a rename
 *                  sits on as licence for the next file that matches the path, and nothing
 *                  notices, because an exemption covering nothing reds nothing.
 *
 * A FILTER, NOT A SECOND ENGINE. The classification is `vocabAudit`'s and the exempt list is
 * `vocabAuditCli`'s; this module reads both and judges the pairing.
 *
 * Parent: 3F-2378.
 */

import { readFileSync } from "node:fs";

import { auditFiles } from "./vocabAudit.js";
import { adoptedTriggerWords } from "./blockedVocabulary.js";
import { SELF_EXEMPT, SELF_EXEMPT_PREFIX, type ExemptionKind } from "./selfExempt.js";
import { gitWorkTreeAnswer, insideWorkTree, notAWorkTreeMessage, scanFiles } from "./vocabAuditCli.js";

/** What is wrong with one exemption entry. */
export interface ExemptionFault {
  path: string;
  kind: "code-file-exempt" | "stale-entry";
  message: string;
}

/**
 * Is this path a pure-data file — one whose banned words can only be mentions?
 *
 * Pure by EXTENSION and location, not by inspection: a `.md` table, a `.feature`
 * specification, a file under the fixture corpus, or a step-definition file binding that
 * specification. Anything else is code, and code can hold a use.
 *
 * Deliberately a rule over the path rather than a judgement over the content: "is this file
 * mostly data?" is exactly the question a reader cannot check and a reviewer cannot enforce,
 * and the answer drifts as the file grows. The path is checkable.
 */
export function isPureDataPath(path: string): boolean {
  if (path.startsWith(SELF_EXEMPT_PREFIX)) return true;
  return path.endsWith(".md") || path.endsWith(".feature") || path.endsWith(".steps.ts");
}

/**
 * The faults in the exempt list, given the list and the banned-word occurrences the audit
 * finds in each path.
 *
 * Pure over injected inputs, because neither arm is observable on a healthy tree: once the
 * relocation lands there is no code file on the list to red on, and no stale entry either.
 * A green run is therefore consistent with both checks being broken, so both are proven
 * against constructed input rather than inferred from a passing build.
 */
export function exemptionFaults(
  entries: ReadonlyMap<string, ExemptionKind>,
  mentionsByPath: ReadonlyMap<string, number>,
): ExemptionFault[] {
  const faults: ExemptionFault[] = [];
  for (const [path, why] of entries) {
    // @SCN-VOC-016 — a code file may be exempt ONLY as a `residual` naming the
    // ticket that frees it. `pure-data` over a code path is the blanket exemption the
    // floor exists to remove.
    if (why.kind === "pure-data" && !isPureDataPath(path)) {
      faults.push({
        path,
        kind: "code-file-exempt",
        message:
          `${path} is a CODE file claiming a pure-data exemption. A code file can hold a ` +
          `USE behind a MENTION, which is what hid 3F-2300. Relocate its data, or carry it ` +
          `as a residual naming the ticket that frees it.`,
      });
      continue;
    }
    // @SCN-VOC-017 — an entry covering nothing is stale. It reds nothing by construction,
    // so it sits on as licence for the next file that matches the path.
    if ((mentionsByPath.get(path) ?? 0) === 0) {
      const owed = why.kind === "residual" ? ` (residual pending ${why.pending})` : "";
      faults.push({
        path,
        kind: "stale-entry",
        message:
          `${path}${owed} holds no banned word, so its exemption covers nothing and is ` +
          `stale. Delete the entry — the floor only ratchets if it carries the improvement.`,
      });
    }
  }
  return faults;
}

/** Every banned word each exempt path still holds, read with the audit's own classifier. */
export function mentionsByPath(root: string, paths: readonly string[]): Map<string, number> {
  const files = paths.map((path) => ({ path, content: readFileSync(`${root}/${path}`, "utf8") }));
  const counts = new Map<string, number>(paths.map((path) => [path, 0]));
  const triggers = adoptedTriggerWords();
  for (const row of auditFiles(files).manifest) {
    // A MENTION is any banned word the audit would have flagged: the adopted tier plus the
    // rename rows the other tiers produce. An exemption covering only `review` noise is not
    // covering a ban, and the ratchet should say so.
    const banned = row.action === "rename" || triggers.has(row.current.toLowerCase());
    if (banned) counts.set(row.file, (counts.get(row.file) ?? 0) + 1);
  }
  return counts;
}

/** Read a `--flag value` pair from argv, or undefined when absent. */
function flag(argv: string[], name: string): string | undefined {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return undefined;
  const value = argv[at + 1];
  return value !== undefined && !value.startsWith("--") ? value : undefined;
}

/** The gate. */
export function runExemptDataFloorLint(argv: string[]): void {
  const root = flag(argv, "root") ?? ".";
  if (!insideWorkTree(gitWorkTreeAnswer(root))) {
    console.error(notAWorkTreeMessage(root));
    process.exitCode = 2;
    return;
  }
  // The fixture PREFIX is not a path entry, so it is judged by the prefix rule alone —
  // scanFiles already applies it, and an empty corpus would surface as the audit finding
  // nothing rather than as a stale entry here.
  const paths = [...SELF_EXEMPT.keys()];
  const faults = exemptionFaults(SELF_EXEMPT, mentionsByPath(root, paths));

  if (faults.length === 0) {
    const residuals = [...SELF_EXEMPT.values()].filter((w) => w.kind === "residual").length;
    console.log(
      `exempt-data-floor lint: OK — ${SELF_EXEMPT.size} exemption(s), ` +
        `${SELF_EXEMPT.size - residuals} pure-data and ${residuals} named residual(s), ` +
        `each covering at least one banned-word mention.`,
    );
    return;
  }

  console.error(`exempt-data-floor lint: FAILED — ${faults.length} faulty exemption(s):`);
  for (const fault of faults) console.error(`  [${fault.kind}] ${fault.message}`);
  process.exitCode = 1;
}

// Run only when invoked as the script, so the @unit arm can import the pure helpers above.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) runExemptDataFloorLint(process.argv.slice(2));
