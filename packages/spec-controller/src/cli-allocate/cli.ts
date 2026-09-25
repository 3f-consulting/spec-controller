/**
 * `spec-controller allocate <FFF>` — the next scenario code for a feature part, alone on stdout.
 */
import { join } from "node:path";
import { nextScnCode, type ScnSighting } from "@3f-consulting/spec-controller-core";
import { cliRegistry, renderCommandHelp } from "../cli-registry.js";
import { resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { readHeaderCodes } from "./readParts.js";
import { readRequest } from "./request.js";
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
    process.stderr.write(request.usageError + "\n");
    process.exit(2);
  }
  const { part, isNew } = request;
  const cwd = process.cwd();
  const top = repositoryTop(cwd);
  const headerCodes = readHeaderCodes(join(top ?? cwd, "features"));
  const answer = nextScnCode({ part, headerCodes, isNew }, sightingsFrom(cwd, part, top !== null));
  if (answer.kind === "unknown-part") {
    process.stderr.write(unknownPartRefusal(answer) + "\n");
    process.exit(2);
  }
  const boundaryLine = historyBoundaryLine(historyBoundaryOf(cwd), answer);
  if (boundaryLine !== null) process.stderr.write(boundaryLine + "\n");
  process.stderr.write(highestSeenLine(answer) + "\n");
  const note = alreadyHeadedNote(answer);
  if (note !== null) process.stderr.write(note + "\n");
  process.stdout.write(answer.code + "\n");
}

/** The tree and its history through git, or the tree alone by a walk where there is no repository. */
function sightingsFrom(cwd: string, part: string, inRepository: boolean): ScnSighting[] {
  return inRepository ? [...readTree(cwd, part), ...readHistory(cwd, part)] : walkTree(cwd, part);
}
