/**
 * THE MODULE'S OWN SURFACE — curated symbol by symbol, never a re-export of the tree behind it
 * (@SCN-RAT-014, 3F-2804).
 *
 * A BARREL THAT RE-EXPORTED EVERY MODULE WOULD BE A CONTRACT NOBODY WROTE. Each module below
 * exports what its own siblings need from it, and sibling-visibility is a much wider set than
 * consumer-visibility: the gate-block span finder, the field rewriter, the per-verdict message
 * builders, the status sets and the loader's per-field readers are all exported so their
 * neighbours can reach them without a second copy. Passing that set on wholesale would freeze
 * every one of them as something a consumer may depend on, and the first refactor that moved one
 * would be a breaking change nobody meant to make. So this file names what a caller may hold and
 * the omissions are decisions.
 *
 * WHAT IS HERE IS THIS LIBRARY'S OWN ENTRY, AND WHAT ITS FIRST CONSUMER NEEDS. The entry is
 * `reconcileGate` — hand it the five terms a project owns and it answers with a verdict. Around it
 * sit the pieces a consumer that wants to compose its own way needs: the verdict over counts
 * already in hand, the two readers that turn a report into counts, the recorder, the loader, the
 * three score functions a consumer rendering its own view needs, the default record name, and both
 * error types the functions above raise — the record fault and the up-only refusal — because a
 * refusal a caller cannot name in a `catch` is a refusal that caller cannot handle.
 *
 * THE TYPES ARE SPELLED FOR A CONSUMER'S NAMESPACE RATHER THAN FOR THIS MODULE'S. `GateRecord` and
 * `GateAllowance` are unambiguous inside a directory about nothing else; imported into a repository
 * that has gates of several kinds they are not, so they cross this line under the fuller names.
 * The aliasing is deliberate and one-directional: the internal spellings stay internal.
 *
 * AND NO DRIFT GUARD STANDS OVER IT, WHICH IS A DECISION NOW RATHER THAN AN OPEN QUESTION. The
 * sibling core package's barrel is reflected and compared against a frozen list in both directions,
 * so a symbol quietly added or dropped reds. That guard is what a PUBLISHED surface is owed, and
 * 3F-2859 stopped publishing this one: no manifest key resolves here, and no caller outside this
 * repository can spell the specifier at all. Freezing the list would make every refactor behind
 * this barrel a change to a contract nobody holds. What the curation above is still for is the
 * reader of this repository's own gate, and @SCN-RAT-014 reads the list back beside it — so a
 * symbol added here is a symbol somebody wrote down twice, which is the guard this surface earns.
 */

export { RECORD_FILE, reconcileGate, type RatchetRequest } from "./reconcile.js";

export {
  floorOf,
  gateRecordFor,
  MalformedRecordError,
  parseGateRecords,
  recordedScoreOf,
  scoreOf,
  type GateAllowance as MutationGateAllowance,
  type GateRecord as MutationGateRecord,
} from "./record.js";

export { FallRefusedError, raisedRecordText } from "./ratchet.js";

export {
  measurementFromReport,
  readMutationReport,
  type MutationReportRead,
} from "./report.js";

export {
  verdictFor,
  type MutationMeasurement,
  type MutationVerdict,
  type MutationVerdictKind,
} from "./verdict.js";
