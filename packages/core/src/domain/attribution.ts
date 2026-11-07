export interface Attribution {
  readonly claimCode: string | null;
  readonly severalCodes?: readonly string[];
}

export function attributionOf(codes: readonly string[]): Attribution {
  const distinct = [...new Set(codes)];
  if (distinct.length > 1) return { claimCode: null, severalCodes: distinct };
  return { claimCode: distinct[0] ?? null };
}
