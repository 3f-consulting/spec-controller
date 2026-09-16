/**
 * THE MODULE'S OWN SURFACE — curated symbol by symbol, never a re-export of the tree behind it
 * (3F-2804, 3F-3337).
 *
 * WHAT IS BEHIND THIS BARREL NOW IS TWO READERS, AND THE RATCHET THEY WERE BUILT FOR IS GONE
 * (3F-3337). `record.ts` reads a target's banked gate record and hands back the kill floor it
 * implies; `report.ts` counts a mutation report's own mutants into a measurement. What left with
 * the ratchet is everything that COMPARED the two — the verdicts, the up-only recorder, the
 * reconciliation entry and the command that ended on it — because this repository's gate is now a
 * per-mutant comparison the runner keeps, and nothing types a mutation count here any more.
 *
 * ITS TWO CONSUMERS ARE BOTH IN THIS TREE, AND THEY WANT DIFFERENT HALVES. `ingest/
 * ingestQualityChecks.ts` wants the RECORD half: the engine's `mutationGate` bar kind lets a target
 * author a fitness row naming a gate instead of a figure, which is a published capability decided
 * over a target's own record (@SCN-MUT-012, @SCN-MUT-013). `tests/checks/mutationScoreCli.ts` wants
 * the REPORT half: `pnpm mutation:score` takes the two counts out of a sweep's report and divides
 * them (@SCN-MUT-007, @SCN-MUT-008). Neither wants the other's, which is why both are named here
 * rather than the tree behind them being passed on wholesale.
 *
 * A BARREL THAT RE-EXPORTED EVERY MODULE WOULD BE A CONTRACT NOBODY WROTE. Each module below
 * exports what its own siblings need from it, and sibling-visibility is a much wider set than
 * consumer-visibility. Passing that set on wholesale would freeze every one of them as something a
 * caller may depend on, and the first refactor that moved one would be a breaking change nobody
 * meant to make. So this file names what a caller may hold and the omissions are decisions.
 *
 * THE KILL FLOOR IS THE BAR, AND IT IS NOT A SCORE (3F-2788). `killFloorOf` answers a ledger
 * holding a measured row to the figure a gate's own record implies, in mutants — a percentage would
 * fold the kill lost and the population grown into one number, which is the distinction a bar on
 * this axis exists to keep. A consumer that derived it instead would be the second place knowing
 * how an allowance is spent.
 *
 * THE TYPES ARE SPELLED FOR A CONSUMER'S NAMESPACE RATHER THAN FOR THIS MODULE'S. `GateRecord` is
 * unambiguous inside a directory about nothing else; imported into a repository that has gates of
 * several kinds it is not, so it crosses this line under the fuller name. The aliasing is
 * deliberate and one-directional: the internal spelling stays internal.
 *
 * AND NO DRIFT GUARD STANDS OVER IT, WHICH IS A DECISION RATHER THAN AN OPEN QUESTION. 3F-2859
 * stopped publishing this barrel: no manifest key resolves here, and no caller outside this
 * repository can spell the specifier at all. Freezing the list would make every refactor behind it
 * a change to a contract nobody holds.
 *
 * THE COMPARISON THIS PARAGRAPH USED TO DRAW IS GONE, AND SAYING SO IS THE POINT. It read: the
 * sibling core package's barrel IS reflected and compared against a frozen list in both directions,
 * so a symbol quietly added or dropped reds — that being what a PUBLISHED surface is owed, and this
 * one is not published. At 3F-3449 that arm was deleted with the rest of the packaging checks this
 * repository wrote for itself, so NEITHER barrel is guarded now and the contrast no longer carries
 * the argument. What still carries it is the second sentence above, which never depended on it.
 */

export {
  floorOf,
  gateRecordFor,
  killFloorOf,
  MalformedRecordError,
  parseGateRecords,
  RECORD_FILE,
  type GateRecord as MutationGateRecord,
} from "./record.js";

export {
  measurementFromReport,
  readMutationReport,
  type MutationMeasurement,
  type MutationReportRead,
} from "./report.js";
