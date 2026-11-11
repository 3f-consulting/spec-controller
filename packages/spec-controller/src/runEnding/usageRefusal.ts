import { endRunOn, USAGE_EXIT_CODE, USAGE_REFUSAL } from "./exitCode.js";
import { errorText, standardError, type RefusalLines } from "./standardError.js";

class UsageRefusal extends Error {
  readonly exitCode = USAGE_EXIT_CODE;
}

// Only balance refuses through here; allocate and the host print their own refusals.
const REFUSING_COMMAND = "balance";

export function refuse(error: RefusalLines): never {
  standardError(process.stderr, REFUSING_COMMAND).error(error);
  throw new UsageRefusal(errorText(error, REFUSING_COMMAND));
}

export function settlingRefusal<T>(run: () => T, refused: T): T {
  try {
    return run();
  } catch (err) {
    if (!(err instanceof UsageRefusal)) throw err;
    endRunOn(USAGE_REFUSAL);
    return refused;
  }
}
