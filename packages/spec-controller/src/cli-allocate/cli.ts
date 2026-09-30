/**
 * `spec-controller allocate <FFF>` — the next scenario code for a feature part, alone on stdout.
 */
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
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(renderCommandHelp(cliRegistry, "allocate") + "\n");
    return;
  }
  const request = readRequest(argv, cliRegistry, resolveToolIdentity().toolVersion);
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

/** A usage refusal: its line on stderr, and the usage status once everything written has drained. */
function refuseUsage(line: string): void {
  process.stderr.write(line + "\n");
  process.exitCode = 2;
}

/** Read the tree, its history and its parts, and write the answer to a well-formed request, or its refusal. */
function answerRequest({ part, isNew }: AllocateRequest): void {
  const cwd = readOrRefuse("the working directory", "", () => process.cwd());
  const top = repositoryTop(cwd);
  const headerCodes = readHeaderCodes(join(top ?? cwd, "features"));
  const answer = nextScnCode({ part, headerCodes, isNew }, sightingsFrom(cwd, part, top));
  if (answer.kind === "unknown-part") {
    refuseUsage(unknownPartRefusal(answer));
    return;
  }
  const boundaryLine = historyBoundaryLine(historyBoundaryOf(cwd), answer);
  if (boundaryLine !== null) process.stderr.write(boundaryLine + "\n");
  process.stderr.write(highestSeenLine(answer) + "\n");
  const note = alreadyHeadedNote(answer);
  if (note !== null) process.stderr.write(note + "\n");
  process.stdout.write(answer.code + "\n");
}

/** The tree and its history through git, or the tree alone by a walk where there is no repository. */
function sightingsFrom(cwd: string, part: string, top: string | null): ScnSighting[] {
  return top !== null ? [...readTree(top, part), ...readHistory(cwd, part)] : walkTree(cwd, part);
}
