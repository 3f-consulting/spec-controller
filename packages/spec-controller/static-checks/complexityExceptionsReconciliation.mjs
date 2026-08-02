/**
 * The exception-list reconciliation — THE RATCHET (@SCN-CPX-003, 3F-2318, under 3F-2286).
 *
 * `complexityExceptions.mjs` is a list of CLAIMS about this tree: each entry says "this file's worst
 * offender for this rule measured exactly this much, on this date". @SCN-CPX-002 turned each claim
 * into a frozen ceiling, which stops the debt GROWING. It does nothing about a claim going stale
 * downward: a file improves, nobody edits the entry, and the recorded number silently becomes
 * headroom again. This module reconciles the list against the tree so every disagreement reds, in
 * BOTH directions — which is what makes the list a ratchet rather than a ceiling that quietly stops
 * descending.
 *
 * ═══ WHY THIS IS NOT MORE eslint ═══
 *
 * eslint can only red on `value > max`. The load-bearing case here is `value < recorded` — an
 * improvement nobody banked — which eslint cannot express at all. So this is a SECOND named CI check
 * (`lint:complexity-exceptions`), and the two reds stay distinct: an eslint red says "this code is
 * too complex", this one says "this list is lying".
 *
 * ═══ eslint IS STILL THE MEASUREMENT ENGINE ═══
 *
 * The values are read out of eslint's own messages, run at the BARE standard — `BARE_STANDARD_CONFIG`
 * imported FROM `eslint.config.mjs`, which is the same thresholds, the same scope split and the same
 * globs the check itself applies, with only the exception blocks left off. A hand-rolled line or
 * complexity counter would agree with eslint by coincidence and drift the moment either changed; so
 * would a second copy of the scope globs, which is a second counter wearing different clothes.
 *
 * THE PARSE IS PER RULE, AND THAT IS NOT FUSSINESS. The three rules do not report uniformly:
 *
 *   max-lines               File has too many lines (575). Maximum allowed is 400.
 *   max-lines-per-function  Function 'reconcile' has too many lines (230). Maximum allowed is 40.
 *   complexity              Function 'reconcile' has a complexity of 21. Maximum allowed is 10.
 *
 * The third carries NO parenthesised number. One parenthesis regex for all three yields null on every
 * complexity message, silently, and a third of the list then reconciles against nothing and passes —
 * a green check measuring air. So every extraction is asserted non-null and THROWS when it fails: a
 * check that cannot measure must red, never shrug.
 *
 * ONE ENTRY PER FILE PER RULE, at that file's WORST offender, because that is the shape
 * @SCN-CPX-002 froze — eslint holds these rules per FILE, so "the value this file is frozen at" is
 * only well defined per file per rule. The reconciliation therefore compares like with like.
 *
 * WHAT IT DELIBERATELY DOES NOT RED ON. A file measuring over the standard with NO entry at all is
 * not this check's finding — that is an ordinary standard violation and `lint:complexity` reds it by
 * name (@SCN-CPX-001). Reding it here too would give one fault two authors and blur which check owns
 * which sentence, which is the non-negotiable 3F-2286 exists to protect.
 *
 * Parent: @SCN-CPX-003 (3F-2318) — the exception-list reconciliation (3F-2286).
 */

import { relative, sep } from "node:path";

/**
 * The per-rule extraction patterns. Keyed by rule id precisely BECAUSE the shapes differ: the two
 * line rules parenthesise their count, `complexity` states it in prose. This object is also the set
 * of rules the reconciliation understands — a finding outside it throws rather than being skipped.
 */
const VALUE_PATTERNS = {
  "max-lines": /too many lines \((\d+)\)/,
  "max-lines-per-function": /too many lines \((\d+)\)/,
  complexity: /has a complexity of (\d+)/,
};

/** The join key. One entry per file per rule, so the pair is the identity. */
const keyOf = (path, rule) => `${path} ${rule}`;

/** eslint reports absolute paths; the debt list records repo-relative ones, in POSIX form. */
const relativise = (filePath, root) => relative(root, filePath).split(sep).join("/");

/** @type {typeof import("./complexityExceptionsReconciliation.d.mts").measuredValueFrom} */
export const measuredValueFrom = (rule, message) => {
  const pattern = Object.hasOwn(VALUE_PATTERNS, rule) ? VALUE_PATTERNS[rule] : undefined;
  if (pattern === undefined) {
    throw new Error(`@SCN-CPX-003: no extraction pattern for eslint rule \`${rule}\`.`);
  }
  const found = pattern.exec(message);
  if (found === null) {
    throw new Error(
      `@SCN-CPX-003: could not read a \`${rule}\` value out of eslint's message ` +
        `${JSON.stringify(message)}. The message shape has changed — fix the per-rule pattern. ` +
        `Returning nothing here would reconcile every \`${rule}\` entry against air and pass.`,
    );
  }
  return Number(found[1]);
};

/** The rule a message belongs to, or a throw naming what could not be attributed. */
const ruleOf = (message, path) => {
  const rule = message.ruleId;
  if (rule !== null && Object.hasOwn(VALUE_PATTERNS, rule)) return rule;
  throw new Error(
    `@SCN-CPX-003: cannot attribute an eslint finding in ${path} to one of the three rules ` +
      `(ruleId ${String(rule)}): ${message.message}. The bare-standard config declares only ` +
      `complexity / max-lines / max-lines-per-function, so this means the config or the parse moved.`,
  );
};

/** @type {typeof import("./complexityExceptionsReconciliation.d.mts").worstMeasuredValues} */
export const worstMeasuredValues = (results, root) => {
  /** @type {Map<string, { path: string, rule: string, value: number }>} */
  const worst = new Map();
  for (const result of results) {
    const path = relativise(result.filePath, root);
    for (const message of result.messages) {
      const rule = ruleOf(message, path);
      const value = measuredValueFrom(rule, message.message);
      const previous = worst.get(keyOf(path, rule));
      if (previous === undefined || value > previous.value) {
        worst.set(keyOf(path, rule), { path, rule, value });
      }
    }
  }
  return [...worst.values()].sort((a, b) => keyOf(a.path, a.rule).localeCompare(keyOf(b.path, b.rule)));
};

/**
 * One sentence per fault. THREE different sentences, deliberately: the three are different faults
 * with different fixes, and a red whose stated cause is not its actual cause is the failure 3F-2286
 * exists to remove. Each names the file, the rule, the recorded value and the measured value.
 */
const SENTENCES = {
  regression: (entry, measured) =>
    `${entry.path}: \`${entry.rule}\` measures ${measured}, ABOVE the ${entry.value} recorded on ` +
    `${entry.since} — REGRESSION: this file has grown past its recorded value. Refactor it back to ` +
    `${entry.value} or below. Never edit the entry up; an exception buys no headroom.`,
  "improvement-not-banked": (entry, measured) =>
    `${entry.path}: \`${entry.rule}\` measures ${measured}, BELOW the ${entry.value} recorded on ` +
    `${entry.since} — IMPROVEMENT NOT BANKED: edit the entry down to ${measured} and re-date it. ` +
    `The list only ratchets if it carries the improvement; left alone, ${entry.value} is headroom again.`,
  "stale-entry": (entry) =>
    `${entry.path}: \`${entry.rule}\` measures UNDER the standard — eslint reports nothing against ` +
    `it — while the list still records ${entry.value} from ${entry.since} — STALE ENTRY: delete the ` +
    `entry, and the list shrinks.`,
};

/** One disagreement, carrying both numbers and the sentence that names them. */
const disagreementOf = (entry, measured, kind) => ({
  path: entry.path,
  rule: entry.rule,
  recorded: entry.value,
  measured,
  kind,
  message: SENTENCES[kind](entry, measured),
});

/** @type {typeof import("./complexityExceptionsReconciliation.d.mts").reconcileExceptions} */
export const reconcileExceptions = (recorded, measured) => {
  const byKey = new Map(measured.map((found) => [keyOf(found.path, found.rule), found.value]));
  const disagreements = [];
  for (const entry of recorded) {
    const value = byKey.get(keyOf(entry.path, entry.rule));
    // Absence is the measurement's verdict, not a gap: eslint emits nothing under the standard.
    if (value === undefined) disagreements.push(disagreementOf(entry, null, "stale-entry"));
    else if (value > entry.value) disagreements.push(disagreementOf(entry, value, "regression"));
    else if (value < entry.value) disagreements.push(disagreementOf(entry, value, "improvement-not-banked"));
  }
  return disagreements;
};

/**
 * @type {typeof import("./complexityExceptionsReconciliation.d.mts").measureTreeAtBareStandard}
 *
 * `overrideConfigFile: true` stops eslint searching for `eslint.config.mjs` on disk, so the ONLY
 * config in play is the bare standard imported from it — the exception blocks are absent by
 * construction rather than by being filtered out afterwards. Both imports are lazy so importing this
 * module for its pure functions (the @unit evidence) costs nothing.
 */
export const measureTreeAtBareStandard = async (root) => {
  const { ESLint } = await import("eslint");
  const { BARE_STANDARD_CONFIG, MEASURED_GLOBS } = await import("../../../eslint.config.mjs");
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: BARE_STANDARD_CONFIG,
  });
  return worstMeasuredValues(await eslint.lintFiles([...MEASURED_GLOBS]), root);
};
