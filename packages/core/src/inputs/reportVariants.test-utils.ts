interface ReportVariant {
  readonly given: string;
  readonly report: unknown;
  readonly breaks: string;
}

// Where the reader finds each variant breaks, beside where its list says it breaks, each named by what it was given.
export const breaksFound = (variants: readonly ReportVariant[], whereItBreaks: (report: unknown) => string | undefined) => ({
  found: variants.map(({ given, report }) => ({ given, breaks: whereItBreaks(report) })),
  listed: variants.map(({ given, breaks }) => ({ given, breaks })),
});
