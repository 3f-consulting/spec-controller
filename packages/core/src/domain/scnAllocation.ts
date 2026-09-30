/**
 * THE NEXT SCENARIO CODE FOR A FEATURE PART — one past the highest the repository has ever carried.
 *
 * The edge reads lines of text (the tree, and the diff lines of history) and hands them here raw;
 * which of their words are scenario codes is the one shared grammar's question, answered here, so
 * the grammar is never restated in another dialect at the edge.
 */
import { SCN_ID_SOURCE, featureCodeOf } from "./featureCode.js";

/** A line of text the edge read, and where it read it: the commit, when only history carries it. */
export interface ScnSighting {
  readonly text: string;
  readonly path: string;
  readonly line: number;
  readonly commit?: string;
}

/** What the author asked for: the feature part, and the parts the corpus's feature-file headers carry. */
export interface AllocationRequest {
  readonly part: string;
  readonly headerCodes: readonly string[];
  /** The author opts in to a part no header carries yet: the only way to a first code in an annotated tree. */
  readonly isNew?: boolean;
}

/** The refusal: no feature file's header carries the part, and the parts the headers do carry. */
export interface UnknownPart {
  readonly kind: "unknown-part";
  readonly part: string;
  readonly headerCodes: readonly string[];
}

/** The answer: the next code, and the sighting that carried the highest code, if any did. */
export interface Allocation {
  readonly kind: "allocated";
  readonly code: string;
  readonly highest: { readonly code: string; readonly sighting: ScnSighting } | null;
  /** The author asked for the part as new, and a header already carries it. */
  readonly alreadyHeaded?: boolean;
}

/** Canon's form pads the number to three digits and lets it grow past them. */
const NUMBER_WIDTH = 3;

const SCN_CODES = new RegExp(SCN_ID_SOURCE, "g");

/** The number a code carries, read as a number, so `SCN-ONE-012` and `SCN-ONE-12` are one. */
function numberOf(code: string): number {
  return Number(code.slice(code.lastIndexOf("-") + 1));
}

/** A higher number wins; at an equal number the tree is named before history, where a reader can check it. */
function outranks(code: string, sighting: ScnSighting, highest: NonNullable<Allocation["highest"]>): boolean {
  const difference = numberOf(code) - numberOf(highest.code);
  return difference > 0 || (difference === 0 && sighting.commit === undefined && highest.sighting.commit !== undefined);
}

/** The highest code of `part` among the sightings, and the sighting that carried it. */
function highestOf(part: string, sightings: readonly ScnSighting[]): Allocation["highest"] {
  let highest: Allocation["highest"] = null;
  for (const sighting of sightings) {
    for (const [code] of sighting.text.matchAll(SCN_CODES)) {
      if (featureCodeOf(code) !== part) continue;
      if (highest === null || outranks(code, sighting, highest)) highest = { code, sighting };
    }
  }
  return highest;
}

/**
 * The next code for the part, or the refusal when no feature file's header carries it. Parts come from
 * the headers; numbers come from every sighting, so history and fixtures never make a part known.
 */
export function nextScnCode(request: AllocationRequest, sightings: readonly ScnSighting[]): Allocation | UnknownPart {
  const headed = request.headerCodes.includes(request.part);
  if (!headed && request.isNew !== true) {
    return { kind: "unknown-part", part: request.part, headerCodes: [...new Set(request.headerCodes)].sort() };
  }
  const highest = highestOf(request.part, sightings);
  const next = (highest === null ? 0 : numberOf(highest.code)) + 1;
  const code = `SCN-${request.part}-${String(next).padStart(NUMBER_WIDTH, "0")}`;
  return headed && request.isNew === true ? { kind: "allocated", code, highest, alreadyHeaded: true } : { kind: "allocated", code, highest };
}
