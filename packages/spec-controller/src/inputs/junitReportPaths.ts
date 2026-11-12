import { join } from "node:path";
import { NODE_CI_PATH_READER, type CiPathReader } from "./ciSourcePaths.js";

// Maven Surefire writes one TEST-<class>.xml per test class, beside a .txt summary of each.
const SUREFIRE_REPORT_FILE = /^TEST-.*\.xml$/;

export function junitReportPathsOf(path: string, reader: CiPathReader = NODE_CI_PATH_READER): string[] {
  return reader
    .readDir(path)
    .filter((name) => SUREFIRE_REPORT_FILE.test(name))
    .sort()
    .map((name) => join(path, name));
}
