export interface LineWriter {
  write(chunk: string): unknown;
}

// A refusal gives its own lines for the command it refuses, so printing one needs no formatter.
export interface RefusalLines {
  lines(command?: string): string;
}

declare const coded: unique symbol;

// A line that already carries its error code. Only the crash guards build one, from an error's handle, so a bare string
// is not an error the printer takes.
export type CodedLine = string & { readonly [coded]: true };

// A coded line is printed as it is.
export function errorText(error: RefusalLines | CodedLine, command?: string): string {
  return typeof error === "string" ? error : error.lines(command);
}

export interface StandardError {
  error(error: RefusalLines | CodedLine): void;
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
