import { join } from "node:path";
import { claimCodeMarksFor, nextClaimCode, type ClaimCodeOccurrence } from "@3f-consulting/spec-controller-core";
import { asksForHelp } from "../runRequest/cliArgs.js";
import { allocateCommand, cliRegistry, renderCommandHelp } from "../runRequest/cliRegistry.js";
import { readFeatureCodes } from "../repository/readFeatureCodes.js";
import { readRequest, type AllocateRequest } from "../runRequest/request.js";
import { DEFAULT_FEATURES_DIR } from "../runRequest/defaults.js";
import { refuse, UnparseableFeatureFiles, UnreadableInput } from "../repository/unreadable.js";
import { corpusFeatureFiles, MissingFeatureCorpusError, type CorpusFeatureFile } from "../inputs/ingestScenarios.js";
import { AppMessage } from "../messages/messages.js";
import { historyBoundaryOf, readHistory, repositoryTop } from "../repository/readHistory.js";
import { readTree, walkTree } from "../repository/readTree.js";
import { alreadyHeadedNote, highestSeenLine, historyBoundaryLine, unknownFeatureCodeRefusal } from "../output/allocateNotes.js";
import { endRunOn, USAGE_REFUSAL } from "../runEnding/exitCode.js";
import { standardError, type RefusalLines, type StandardError } from "../runEnding/standardError.js";

function shown(): StandardError {
  return standardError(process.stderr, "allocate");
}

export function runAllocate(argv: string[]): void {
  if (asksForHelp(argv)) {
    process.stdout.write(renderCommandHelp(allocateCommand) + "\n");
    return;
  }
  answerOrRefuse(readRequest(argv, cliRegistry));
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
  const cwd = process.cwd();
  const top = repositoryTop(cwd);
  const featureCodes = readFeatureCodes(featureFilesIn(join(top ?? cwd, DEFAULT_FEATURES_DIR)));
  const answer = nextClaimCode({ featureCode, featureCodes, isNew }, occurrencesFrom(cwd, featureCode, top));
  (ANSWERED[answer.kind] as (answer: Answer, cwd: string) => void)(answer, cwd);
}

type Answer = ReturnType<typeof nextClaimCode>;

const ANSWERED: { readonly [K in Answer["kind"]]: (answer: Extract<Answer, { kind: K }>, cwd: string) => void } = {
  allocated: (answer, cwd) => {
    writeLineIfAny(historyBoundaryLine(historyBoundaryOf(cwd), answer));
    shown().note(highestSeenLine(answer));
    writeLineIfAny(alreadyHeadedNote(answer));
    process.stdout.write(answer.code + "\n");
  },
  "unknown-feature-code": (answer) => refuseUsage(unknownFeatureCodeRefusal(answer)),
};

function featureFilesIn(dir: string): CorpusFeatureFile[] {
  try {
    return corpusFeatureFiles(dir);
  } catch (err) {
    if (err instanceof MissingFeatureCorpusError) return [];
    return refuse(AppMessage.FeatureCorpus, dir, err);
  }
}

function writeLineIfAny(line: string | null): void {
  if (line !== null) shown().note(line);
}

function occurrencesFrom(cwd: string, featureCode: string, top: string | null): ClaimCodeOccurrence[] {
  const marks = claimCodeMarksFor(featureCode);
  return top !== null ? [...readTree(top, marks), ...readHistory(cwd, marks)] : walkTree(cwd, marks);
}
