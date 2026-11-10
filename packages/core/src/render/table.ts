const row = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;

export function table(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return [row(header), row(header.map(() => "---")), ...rows.map(row)].join("\n");
}
