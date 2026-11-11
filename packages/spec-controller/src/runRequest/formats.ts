type RequestedDestination =
  | { readonly kind: "stdout" }
  | { readonly kind: "file"; readonly path: string };

export interface RequestedOutput {
  readonly fmt: string;
  readonly dest: RequestedDestination;
}

export function collectFormatSpecs(argv: readonly string[]): string[] {
  // checkMissingValues has already refused a --format given no value.
  return argv.flatMap((token, i) => (token === "--format" ? [argv[i + 1]!] : []));
}

// Each --format names a format, and after a colon the file it goes to; with none, the Markdown report goes to standard output.
export function requestedOutputsOf(formatSpecs: readonly string[]): RequestedOutput[] {
  const specs = formatSpecs.length === 0 ? ["md"] : formatSpecs;
  return specs.map((spec) => {
    const colon = spec.indexOf(":");
    const fmt = colon === -1 ? spec : spec.slice(0, colon);
    const dest: RequestedDestination =
      colon === -1 ? { kind: "stdout" } : { kind: "file", path: spec.slice(colon + 1) };
    return { fmt, dest };
  });
}
