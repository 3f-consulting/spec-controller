import type { ReportLocation } from "../domain/configuration.js";
import runnersVariants from "./runners.variants.json" with { type: "json" };

const PATH = "<path>";

interface Variant {
  readonly runner: string;
  readonly options: string;
  readonly format: string;
  readonly environment?: string;
  readonly "applies-to"?: string;
}

// One way a runner names its report, and the format it writes there.
interface ReportOption {
  readonly runner: string;
  readonly format: string;
  // The words the runner needs beside the path's option to write this report.
  readonly beside: readonly string[];
  // The option the path is written after: joined to it, or, where separate, as the next word. With none, the path is
  // the value of the variable the step sets.
  readonly option?: string;
  readonly separate: boolean;
  readonly variable?: string;
  // The option whose last use before the path's option the words beside must follow, since the path applies to it alone.
  readonly appliesTo?: string;
}

function reportOptionOf({ runner, options, format, environment, "applies-to": appliesTo }: Variant): ReportOption {
  const words = options.split(" ");
  const at = words.findIndex((word) => word.endsWith(PATH));
  if (at === -1) return { runner, format, beside: words, separate: false, variable: environment };
  const separate = words[at] === PATH;
  const optionAt = separate ? at - 1 : at;
  const option = words[optionAt]!.replace(PATH, "");
  return { runner, format, beside: words.filter((_, index) => index !== at && index !== optionAt), option, separate, appliesTo };
}

const REPORT_OPTIONS = (runnersVariants["report-options"].variants as readonly Variant[]).map(reportOptionOf);

// A path holding a variable or an expression is not one balance can read, since it cannot know its value.
const readable = (path: string): boolean => path !== "" && !path.includes("$");

// Each path the option names in the arguments, with where its option is.
const pathsAfter = (args: readonly string[], option: string, separate: boolean): { readonly path: string; readonly at: number }[] =>
  args.flatMap((word, at) => {
    if (separate) return word === option && at + 1 < args.length ? [{ path: args[at + 1]!, at }] : [];
    return word.startsWith(option) ? [{ path: word.slice(option.length), at }] : [];
  });

// The words beside are among the arguments, or, for a path that applies to one option's last use, among those from it.
function besideMet(args: readonly string[], at: number, { beside, appliesTo }: ReportOption): boolean {
  const from = appliesTo === undefined ? 0 : args.lastIndexOf(appliesTo, at);
  const among = appliesTo === undefined ? args : args.slice(from, at);
  return from !== -1 && beside.every((word) => among.includes(word));
}

function pathsNamed(args: readonly string[], environment: Readonly<Record<string, string>>, report: ReportOption): readonly string[] {
  if (report.option !== undefined) return pathsAfter(args, report.option, report.separate).flatMap(({ path, at }) => (besideMet(args, at, report) ? [path] : []));
  const set = report.variable !== undefined && Object.hasOwn(environment, report.variable) ? environment[report.variable] : undefined;
  return set !== undefined && besideMet(args, args.length, report) ? [set] : [];
}

export const reportsIn = (runner: string, args: readonly string[], environment: Readonly<Record<string, string>>): ReportLocation[] =>
  REPORT_OPTIONS.filter((report) => report.runner === runner).flatMap(({ format, ...report }) =>
    pathsNamed(args, environment, { format, ...report }).flatMap((path) => (readable(path) ? [{ path, format }] : [])),
  );
