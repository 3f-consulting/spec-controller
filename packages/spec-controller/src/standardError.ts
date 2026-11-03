export interface LineWriter {
  write(chunk: string): unknown;
}

// A refusal gives its own lines for the command it refuses, so printing one needs no formatter.
export interface RefusalLines {
  lines(command?: string): string;
}

// An error given as its words is printed as it is.
export function errorText(error: RefusalLines | string, command?: string): string {
  return typeof error === "string" ? error : error.lines(command);
}

export interface StandardError {
  error(error: RefusalLines | string): void;
  note(line: string): void;
}

export function standardError(stream: LineWriter, command?: string): StandardError {
  return {
    error: (error) => {
      stream.write(errorText(error, command) + "\n");
    },
    note: (line) => {
      stream.write(line + "\n");
    },
  };
}
