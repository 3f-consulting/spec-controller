import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import type { ExitCode } from "./codes.js";

export type Complain = (error: unknown) => void;

export function complainerTo(write: (text: string) => void): Complain {
  return (error) => write(`${appCatalogue["unexpected-error"]}: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}\n`);
}

export async function loadGuarded<Program>(load: () => Promise<Program>, _complain: Complain, _end: (exitCode: ExitCode) => void): Promise<Program | undefined> {
  return load();
}
