import { writtenClaimCode } from "../domain/claimCodes.js";
import { evidenceGroupsOf, type ClaimReconciliation, type QualityCheckReconciliation } from "../domain/claimReconciliation.js";
import { QUALITY_CHECK_KINDS, type QualityCheckKind } from "../domain/postEvidenceObligation.js";
import { coreText } from "../messages/catalogue.js";
import { inCell } from "./quoted.js";
import { tableOf } from "./table.js";

type Claim = ClaimReconciliation["claim"];

const isExecutable = (claim: Claim): claim is Extract<Claim, { readonly obligations: unknown }> => "obligations" in claim;

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

// A claim is named by its code; by its code and file when another claim shares it; by its file and title when it has none.
function nameOf(claim: Claim, sharedCodes: ReadonlySet<string>): string {
  if (!isExecutable(claim)) return claim.claimCode === undefined ? coreText("unnamed-claim") : writtenClaimCode(claim.claimCode);
  if (claim.claimCode === undefined) return `${inCell(claim.file)} : ${inCell(claim.title)}`;
  const code = writtenClaimCode(claim.claimCode);
  return sharedCodes.has(code) ? `${code} (${inCell(claim.file)})` : code;
}

const whereToLook = ({ observation }: QualityCheckReconciliation): string =>
  observation === undefined ? "" : ` (${[observation.place, ...(observation.name === undefined ? [] : [observation.name])].map(inCell).join(": ")})`;

// What the evidence said: its message's first line, then every note balance added.
const saidBy = ({ observation }: QualityCheckReconciliation): string => {
  const said = [...(observation?.message === undefined ? [] : [observation.message.split("\n")[0]!]), ...(observation?.notes ?? [])];
  return said.length === 0 ? "" : ` — ${said.map(inCell).join(", ")}`;
};

const itemOf = (reconciliation: QualityCheckReconciliation): string =>
  `${reconciliation.kind === undefined ? "" : `${reconciliation.kind}: `}${reconciliation.outcome}${whereToLook(reconciliation)}${saidBy(reconciliation)}`;

// The unnamed claim's evidence, in groups by kind, file and shared code, each with how many ran, passed and failed.
function groupItemsOf(claimReconciliation: ClaimReconciliation): string[] {
  return evidenceGroupsOf(claimReconciliation).map(
    ({ kind, file, qualityCheckReconciliations, ran, passed, failed, failures }) =>
      `${kind}: ${qualityCheckReconciliations[0]!.outcome}${file === undefined ? "" : ` (${inCell(file)})`} — ${coreText("group-counts", { ran, passed, failed })}${failures.length === 0 ? "" : `: ${failures.map(inCell).join(", ")}`}`,
  );
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
  const claimsWith = new Map<string, number>();
  for (const { claim } of claimReconciliations) if (isExecutable(claim) && claim.claimCode !== undefined) claimsWith.set(writtenClaimCode(claim.claimCode), (claimsWith.get(writtenClaimCode(claim.claimCode)) ?? 0) + 1);
  const sharedCodes = new Set([...claimsWith].filter(([, count]) => count > 1).map(([code]) => code));
  return [
    ...heading,
    ...tableOf(
      ["claim-column", ...kinds.map((kind) => `kind-column-${kind}`), "verdict-column", "items-column"],
      claimReconciliations.map((claimReconciliation) => [
        nameOf(claimReconciliation.claim, sharedCodes),
        ...kinds.map((kind) => cellOf(claimReconciliation, kind)),
        claimReconciliation.verdict,
        itemsOf(claimReconciliation),
      ]),
      ["claims-blank-cell", "claims-dash", "claims-unnamed-row"],
    ),
  ];
}
