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

export function parseSources<D, T extends object>(
  sources: readonly Source[],
  parse: (source: string) => D,
  read: (document: D, source: string) => T
): SourcesParse<T> {
  const documents: { readonly file: string; readonly source: string; readonly document: D }[] = [];
  const faults: SourceFault[] = [];
  for (const { file, source } of sources) {
    try {
      documents.push({ file, source, document: parse(source) });
    } catch (err) {
      faults.push({ file, message: err instanceof Error ? err.message : String(err) });
    }
  }
  if (faults.length > 0) return { kind: "unparseable", faults };
  return { kind: "parsed", parsed: documents.map(({ file, source, document }) => ({ ...read(document, source), file })) };
}
