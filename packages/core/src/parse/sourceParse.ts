export interface Source {
  readonly file: string;
  readonly source: string;
}

export interface SourceFault {
  readonly file: string;
  readonly message: string;
}

export type Parsed<T> = T & { readonly file: string };

export type SourcesParse<T> =
  | { readonly kind: "parsed"; readonly parsed: readonly Parsed<T>[] }
  | { readonly kind: "unparseable"; readonly faults: readonly SourceFault[] };

export function parseSources<T extends object>(sources: readonly Source[], parseOne: (source: string) => T): SourcesParse<T> {
  const parsed: Parsed<T>[] = [];
  const faults: SourceFault[] = [];
  for (const { file, source } of sources) {
    try {
      parsed.push({ ...parseOne(source), file });
    } catch (err) {
      faults.push({ file, message: err instanceof Error ? err.message : String(err) });
    }
  }
  return faults.length > 0 ? { kind: "unparseable", faults } : { kind: "parsed", parsed };
}
