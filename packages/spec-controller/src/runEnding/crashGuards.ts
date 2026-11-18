import { UNEXPECTED_ERROR, type ExitCode } from "./codes.js";
import { complaintOf } from "./complaint.js";

export type Complain = (error: unknown) => void;

// A run complains of its first unexpected error only, however many it meets.
export function complainerTo(write: (text: string) => void): Complain {
  let complained = false;
  return (error) => {
    if (complained) return;
    complained = true;
    write(complaintOf(error));
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
