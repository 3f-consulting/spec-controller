import { coreText } from "../messages/catalogue.js";

const row = (cells: readonly (string | number)[]): string => `| ${cells.join(" | ")} |`;

// The table under its key: a line saying what each column, then each note, means. Each code's meaning is its `-key` text.
export const tableOf = (columns: readonly string[], rows: readonly (readonly (string | number)[])[], notes: readonly string[] = []): string[] => [
  `${coreText("key")}:`,
  ...[...columns, ...notes].map((code) => `- ${coreText(code)}: ${coreText(`${code}-key`)}`),
  "",
  row(columns.map(coreText)),
  row(columns.map(() => "---")),
  ...rows.map(row),
];
