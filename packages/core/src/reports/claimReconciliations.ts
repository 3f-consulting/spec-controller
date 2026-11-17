import { writtenClaimCode } from "../domain/claimCodes.js";
import { evidenceGroupsOf, isExecutable, type ClaimReconciliation, type QualityCheckReconciliation } from "../domain/claimReconciliation.js";
import { QUALITY_CHECK_KINDS, type QualityCheckKind } from "../domain/postEvidenceObligation.js";
import { coreText } from "../messages/catalogue.js";
import { firstLineOf, inCell } from "./quoted.js";
import { tableOf } from "./table.js";

// A column for each kind some claim raises or some evidence answers: each gives a Quality Check Reconciliation of its kind.
const kindsIn = (claimReconciliations: readonly ClaimReconciliation[]): QualityCheckKind[] =>
  QUALITY_CHECK_KINDS.filter((kind) => claimReconciliations.some(({ qualityCheckReconciliations }) => qualityCheckReconciliations.some((reconciliation) => reconciliation.kind === kind)));

// Whether the claim asks for the kind, by its letter or -, then how many of its tests of that kind ran, or -.
function cellOf({ claim, qualityCheckReconciliations }: ClaimReconciliation, kind: QualityCheckKind): string {
  if (!isExecutable(claim)) return "—";
  const asked = claim.obligations.some((obligation) => obligation.kind === kind);
  const observed = qualityCheckReconciliations.flatMap(({ observation }) => (observation?.kind === kind ? [observation] : []));
  if (!asked && observed.length === 0) return "";
  const ran = observed.filter(({ result }) => result !== "never-ran").length;
  return `${asked ? kind[0]!.toUpperCase() : "-"}/${ran > 0 ? ran : "-"}`;
}

// The codes more than one executable claim carries.
function sharedCodesIn(claimReconciliations: readonly ClaimReconciliation[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const { claim } of claimReconciliations) {
    if (!isExecutable(claim) || claim.claimCode === undefined) continue;
    const code = writtenClaimCode(claim.claimCode);
    (seen.has(code) ? shared : seen).add(code);
  }
  return shared;
}

// A claim is named by its code; by its code and file when another claim shares it; by its file and title when it has none.
function nameOf({ claim }: ClaimReconciliation, sharedCodes: ReadonlySet<string>): string {
  if (!isExecutable(claim)) return claim.claimCode === undefined ? coreText("unnamed-claim") : writtenClaimCode(claim.claimCode);
  if (claim.claimCode === undefined) return `${inCell(claim.file)} : ${inCell(claim.title)}`;
  const code = writtenClaimCode(claim.claimCode);
  return sharedCodes.has(code) ? `${code} (${inCell(claim.file)})` : code;
}

const whereToLook = ({ observation }: QualityCheckReconciliation): string =>
  observation === undefined ? "" : ` (${[observation.place, ...(observation.name === undefined ? [] : [observation.name])].map(inCell).join(": ")})`;

// What the evidence said: its message's first line, then every note balance added.
const saidBy = ({ observation }: QualityCheckReconciliation): string => {
  const said = [...(observation?.message === undefined ? [] : [firstLineOf(observation.message)]), ...(observation?.notes ?? [])];
  return said.length === 0 ? "" : ` — ${said.map(inCell).join(", ")}`;
};

const itemOf = (reconciliation: QualityCheckReconciliation): string =>
  `${reconciliation.kind === undefined ? "" : `${reconciliation.kind}: `}${reconciliation.outcome}${whereToLook(reconciliation)}${saidBy(reconciliation)}`;

// The unnamed claim's evidence, in groups by kind, file and shared code, each with its file and code where it has them,
// then how many ran, passed and failed, and how many were not recorded where any were.
function groupItemsOf(claimReconciliation: ClaimReconciliation): string[] {
  return evidenceGroupsOf(claimReconciliation).map(({ kind, file, claimCode, qualityCheckReconciliations, ran, passed, failed, notRecorded, failures }) => {
    const where = [...(file === undefined ? [] : [inCell(file)]), ...(claimCode === undefined ? [] : [writtenClaimCode(claimCode)])];
    return `${kind}: ${qualityCheckReconciliations[0]!.outcome}${where.length === 0 ? "" : ` (${where.join(", ")})`} — ${notRecorded === 0 ? coreText("group-counts", { ran, passed, failed }) : coreText("group-counts-not-recorded", { ran, passed, failed, notRecorded })}${failures.length === 0 ? "" : `: ${failures.map(inCell).join(", ")}`}`;
  });
}

function itemsOf(claimReconciliation: ClaimReconciliation): string {
  const { claim, qualityCheckReconciliations } = claimReconciliation;
  const items = !isExecutable(claim) && claim.claimCode === undefined ? groupItemsOf(claimReconciliation) : qualityCheckReconciliations.filter(({ outcome }) => outcome !== "satisfied").map(itemOf);
  return items.length === 0 ? "—" : items.join("; ");
}

export function claimReconciliationsSection(claimReconciliations: readonly ClaimReconciliation[]): string[] {
  const heading = [`## ${coreText("claim-reconciliations-heading")}`, ""];
  if (claimReconciliations.length === 0) return [...heading, coreText("claim-reconciliations-none")];
  const kinds = kindsIn(claimReconciliations);
  const sharedCodes = sharedCodesIn(claimReconciliations);
  return [
    ...heading,
    ...tableOf(
      ["claim-column", ...kinds.map((kind) => `kind-column-${kind}`), "verdict-column", "items-column"],
      claimReconciliations.map((claimReconciliation) => [
        nameOf(claimReconciliation, sharedCodes),
        ...kinds.map((kind) => cellOf(claimReconciliation, kind)),
        claimReconciliation.verdict,
        itemsOf(claimReconciliation),
      ]),
    ),
  ];
}
