import { SCN_ID_SOURCE, featureCodeOf } from "./featureCode.js";

export interface ScnSighting {
  readonly text: string;
  readonly path: string;
  readonly line: number;
  readonly commit?: string;
}

export interface AllocationRequest {
  readonly part: string;
  readonly headerCodes: readonly string[];
  readonly isNew?: boolean;
}

export interface UnknownPart {
  readonly kind: "unknown-part";
  readonly part: string;
  readonly headerCodes: readonly string[];
}

export interface Allocation {
  readonly kind: "allocated";
  readonly code: string;
  readonly highest: { readonly code: string; readonly sighting: ScnSighting } | null;
  readonly alreadyHeaded?: boolean;
}

const NUMBER_WIDTH = 3;

const SCN_CODES = new RegExp(SCN_ID_SOURCE, "g");

function numberOf(code: string): number {
  return Number(code.slice(code.lastIndexOf("-") + 1));
}

function outranks(code: string, sighting: ScnSighting, highest: NonNullable<Allocation["highest"]>): boolean {
  const difference = numberOf(code) - numberOf(highest.code);
  return difference > 0 || (difference === 0 && sighting.commit === undefined && highest.sighting.commit !== undefined);
}

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
