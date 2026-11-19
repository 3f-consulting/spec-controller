import type { ReportLocation } from "../domain/configuration.js";
import runnersVariants from "./runners.variants.json" with { type: "json" };

const PATH = "<path>";

// Each runner's way of naming its report: the options it needs beside it, the option the path is written after, and the format it writes.
const REPORT_OPTIONS = runnersVariants["report-options"].variants.map(({ runner, options, format }) => {
  const words = options.split(" ");
  return { runner, format, beside: words.filter((word) => !word.endsWith(PATH)), before: words.find((word) => word.endsWith(PATH))!.slice(0, -PATH.length) };
});

// A path holding a variable or an expression is not one balance can read, since it cannot know its value.
const readable = (path: string): boolean => path !== "" && !path.includes("$");

// The reports a runner's arguments name, each path as written.
export const reportsIn = (runner: string, args: readonly string[]): ReportLocation[] =>
  REPORT_OPTIONS.filter((options) => options.runner === runner && options.beside.every((word) => args.includes(word))).flatMap(({ before, format }) =>
    args.flatMap((word) => (word.startsWith(before) ? [word.slice(before.length)] : [])).flatMap((path) => (readable(path) ? [{ path, format }] : [])),
  );
