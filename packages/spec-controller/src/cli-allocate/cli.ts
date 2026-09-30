import { join } from "node:path";
import { nextScnCode, type ScnSighting } from "@3f-consulting/spec-controller-core";
import { cliRegistry, renderCommandHelp } from "../cli-registry.js";
import { resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { readHeaderCodes } from "./readParts.js";
import { readRequest, type AllocateRequest } from "./request.js";
import { readOrRefuse, refusalLine, UnreadableInput } from "./unreadable.js";
import { historyBoundaryOf, readHistory, repositoryTop } from "./readHistory.js";
import { readTree, walkTree } from "./readTree.js";
import { alreadyHeadedNote, highestSeenLine, historyBoundaryLine, unknownPartRefusal } from "./stderr.js";

export function runAllocate(argv: string[]): void {
  if (asksForHelp(argv)) {
    process.stdout.write(renderCommandHelp(cliRegistry, "allocate") + "\n");
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
    if (!(err instanceof UnreadableInput)) throw err;
    refuseUsage(refusalLine(err));
  }
}

function refuseUsage(line: string): void {
  process.stderr.write(line + "\n");
  process.exitCode = 2;
}

function answerRequest({ part, isNew }: AllocateRequest): void {
  const cwd = readOrRefuse("the working directory", "", () => process.cwd());
  const top = repositoryTop(cwd);
  const headerCodes = readHeaderCodes(join(top ?? cwd, "features"));
  const answer = nextScnCode({ part, headerCodes, isNew }, sightingsFrom(cwd, part, top));
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

function sightingsFrom(cwd: string, part: string, top: string | null): ScnSighting[] {
  return top !== null ? [...readTree(top, part), ...readHistory(cwd, part)] : walkTree(cwd, part);
}
