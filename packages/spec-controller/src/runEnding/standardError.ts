export function writeToStandardError(text: string): void {
  process.stderr.write(text);
}
