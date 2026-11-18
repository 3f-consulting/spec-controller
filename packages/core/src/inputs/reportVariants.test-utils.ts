// One edit to a report its runner could write: the value at a path set, or the field there taken out when no value is given.
interface ReportEdit {
  readonly given: string;
  readonly at: string;
  readonly set?: unknown;
}

interface ReportVariants {
  readonly report: unknown;
  readonly variants: readonly ReportEdit[];
}

type Container = Record<string | number, unknown>;

const stepsOf = (at: string): (string | number)[] => [...at.matchAll(/\.(\w+)|\[(\d+)\]/g)].map(([, name, index]) => name ?? Number(index));

function edited(report: unknown, edit: ReportEdit): unknown {
  if (edit.at === "$") return edit.set;
  const copy = structuredClone(report);
  const steps = stepsOf(edit.at);
  const last = steps.pop()!;
  const parent = steps.reduce<Container>((value, step) => value[step] as Container, copy as Container);
  if ("set" in edit) parent[last] = edit.set;
  else delete parent[last];
  return copy;
}

// Where the reader finds each edited report breaks, beside the path each edit broke, each named by what it was given.
export const breaksFound = ({ report, variants }: ReportVariants, whereItBreaks: (report: unknown) => string | undefined) => ({
  found: variants.map((edit) => ({ given: edit.given, breaks: whereItBreaks(edited(report, edit)) })),
  listed: variants.map(({ given, at }) => ({ given, breaks: at })),
});
