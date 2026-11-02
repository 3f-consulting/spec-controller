import { join } from "node:path";
import { nextScnCode, type ScnOccurrence } from "@3f-consulting/spec-controller-core";
import { allocateCommand, cliRegistry, renderCommandHelp } from "../cliRegistry.js";
import { resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { readHeaderCodes } from "./readParts.js";
import { readRequest, type AllocateRequest } from "./request.js";
import { AppMessage } from "../messages.js";
import { DEFAULT_FEATURES_DIR } from "../defaultCorpus.js";
import { readOrRefuse, refusalLine, UnparseableFeatureFiles, UnreadableInput } from "./unreadable.js";
import { historyBoundaryOf, readHistory, repositoryTop } from "./readHistory.js";
import { readTree, walkTree } from "./readTree.js";
import { alreadyHeadedNote, highestSeenLine, historyBoundaryLine, unknownPartRefusal } from "./stderr.js";
import { endRunOn, USAGE_REFUSAL } from "../exitCode.js";

export function runAllocate(argv: string[]): void {
  if (asksForHelp(argv)) {
    process.stdout.write(renderCommandHelp(allocateCommand) + "\n");
    return;
  }
  answerOrRefuse(readRequest(argv, cliRegistry, resolveToolIdentity().toolVersion));
}

function asksForHelp(argv: string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
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
    refuseUsage(refusalLine(err));
  }
}

function refuseUsage(line: string): void {
  process.stderr.write(line + "\n");
  endRunOn(USAGE_REFUSAL);
}

function answerRequest({ part, isNew }: AllocateRequest): void {
  const cwd = readOrRefuse(AppMessage.WorkingDirectory, "", () => process.cwd());
  const top = repositoryTop(cwd);
  const headerCodes = readHeaderCodes(join(top ?? cwd, DEFAULT_FEATURES_DIR));
  const answer = nextScnCode({ part, headerCodes, isNew }, occurrencesFrom(cwd, part, top));
  if (answer.kind === "unknown-part") {
    refuseUsage(unknownPartRefusal(answer));
    return;
  }
  writeLineIfAny(historyBoundaryLine(historyBoundaryOf(cwd), answer));
  process.stderr.write(highestSeenLine(answer) + "\n");
  writeLineIfAny(alreadyHeadedNote(answer));
  process.stdout.write(answer.code + "\n");
}

function writeLineIfAny(line: string | null): void {
  if (line !== null) process.stderr.write(line + "\n");
}

function occurrencesFrom(cwd: string, part: string, top: string | null): ScnOccurrence[] {
  return top !== null ? [...readTree(top, part), ...readHistory(cwd, part)] : walkTree(cwd, part);
}
