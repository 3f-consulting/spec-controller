export interface Attribution {
  readonly scnId: string | null;
  readonly severalCodes?: readonly string[];
}

export function attributionOf(codes: readonly string[]): Attribution {
  const distinct = [...new Set(codes)];
  if (distinct.length > 1) return { scnId: null, severalCodes: distinct };
  return { scnId: distinct[0] ?? null };
}
