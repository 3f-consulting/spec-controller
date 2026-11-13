import { writeToStandardError } from "../runEnding/standardError.js";

// A standard stream: its descriptor, so its identity can be probed, and how to write to it.
export interface StandardStream {
  readonly fd: number;
  readonly write: (text: string) => void;
}

export interface StandardStreams {
  readonly output: StandardStream;
  readonly error: StandardStream;
}

export const processStreams: StandardStreams = {
  output: { fd: 1, write: (text) => process.stdout.write(text) },
  error: { fd: 2, write: writeToStandardError },
};
