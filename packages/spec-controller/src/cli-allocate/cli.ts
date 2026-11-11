import { join } from "node:path";
import { claimCodeMarksFor, nextClaimCode, type ClaimCodeOccurrence } from "@3f-consulting/spec-controller-core";
import { asksForHelp } from "../cliArgs.js";
import { allocateCommand, cliRegistry, renderCommandHelp } from "../cliRegistry.js";
import { resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { readFeatureCodes } from "./readParts.js";
import { readRequest, type AllocateRequest } from "./request.js";
import { DEFAULT_FEATURES_DIR } from "../defaultCorpus.js";
import { AppMessage } from "../messages.js";
import { readOrRefuse, UnparseableFeatureFiles, UnreadableInput } from "./unreadable.js";
import { historyBoundaryOf, readHistory, repositoryTop } from "./readHistory.js";
import { readTree, walkTree } from "./readTree.js";
import { alreadyHeadedNote, highestSeenLine, historyBoundaryLine, unknownFeatureCodeRefusal } from "./stderr.js";
import { endRunOn, USAGE_REFUSAL } from "../exitCode.js";
import { standardError, type RefusalLines, type StandardError } from "../standardError.js";

function shown(): StandardError {
  return standardError(process.stderr, "allocate");
}

export function runAllocate(argv: string[]): void {
  if (asksForHelp(argv)) {
    process.stdout.write(renderCommandHelp(allocateCommand) + "\n");
    return;
  }
  answerOrRefuse(readRequest(argv, cliRegistry, resolveToolIdentity().toolVersion));
}

function answerOrRefuse(request: ReturnType<typeof readRequest>): void {
  if ("usageError" in request) {
    refuseUsage(request.usageError);
    return;
  }
  try {
    answerRequest(request);
  } catch (err) {
    if (!(err instanceof UnreadableInput || err instanceof UnparseableFeatureFiles)) throw err;
    refuseUsage(err.refusal);
  }
}

function refuseUsage(error: RefusalLines): void {
  shown().error(error);
  endRunOn(USAGE_REFUSAL);
}

function answerRequest({ featureCode, isNew }: AllocateRequest): void {
  const cwd = readOrRefuse(AppMessage.WorkingDirectory, "", () => process.cwd());
  const top = repositoryTop(cwd);
  const featureCodes = readFeatureCodes(join(top ?? cwd, DEFAULT_FEATURES_DIR));
  const answer = nextClaimCode({ featureCode, featureCodes, isNew }, occurrencesFrom(cwd, featureCode, top));
  if (answer.kind === "unknown-feature-code") {
    refuseUsage(unknownFeatureCodeRefusal(answer));
    return;
  }
  writeLineIfAny(historyBoundaryLine(historyBoundaryOf(cwd), answer));
  shown().note(highestSeenLine(answer));
  writeLineIfAny(alreadyHeadedNote(answer));
  process.stdout.write(answer.code + "\n");
}

function writeLineIfAny(line: string | null): void {
  if (line !== null) shown().note(line);
}

function occurrencesFrom(cwd: string, featureCode: string, top: string | null): ClaimCodeOccurrence[] {
  const marks = claimCodeMarksFor(featureCode);
  return top !== null ? [...readTree(top, marks), ...readHistory(cwd, marks)] : walkTree(cwd, marks);
}
