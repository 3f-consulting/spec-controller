import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import { UNEXPECTED_ERROR, type ExitCode } from "./codes.js";

export type Complain = (error: unknown) => void;

// The complaint's error code, shown before it as a refusal shows its own.
const UNEXPECTED = "unexpected-error";

// An error is shown by its name and message; one that cannot be shown says so.
function shown(error: unknown): string {
  try {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } catch {
    return appCatalogue["error-not-shown"];
  }
}

// A run complains of its first unexpected error only, however many it meets.
export function complainerTo(write: (text: string) => void): Complain {
  let complained = false;
  return (error) => {
    if (complained) return;
    complained = true;
    write(`[${UNEXPECTED}] ${appCatalogue[UNEXPECTED]}: ${shown(error)}\n`);
  };
}

// The program is loaded under the guards, so an error while it loads ends the run at 4 with a complaint.
export async function loadGuarded<Program>(load: () => Promise<Program>, complain: Complain, end: (exitCode: ExitCode) => void): Promise<Program | undefined> {
  try {
    return await load();
  } catch (error) {
    complain(error);
    end(UNEXPECTED_ERROR);
    return undefined;
  }
}
