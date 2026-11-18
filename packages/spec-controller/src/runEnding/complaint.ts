import appCatalogue from "../messages/messages.en.json" with { type: "json" };

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

// The line a run writes for its unexpected error.
export const complaintOf = (error: unknown): string => `[${UNEXPECTED}] ${appCatalogue[UNEXPECTED]}: ${shown(error)}\n`;
