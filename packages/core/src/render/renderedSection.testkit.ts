import { expect } from "vitest";

export function sectionUnder(heading: string): (lines: readonly string[]) => string[] {
  return function section(lines: readonly string[]): string[] {
    const start = lines.indexOf(heading);
    expect(start).toBeGreaterThanOrEqual(0);
    const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
    return lines.slice(start, next === -1 ? lines.length : next);
  };
}

export const cells = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
