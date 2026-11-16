export type InputFault =
  | "absent"
  | "not-permitted"
  | "wrong-kind-of-path"
  | "does-not-parse"
  | "not-in-its-shape";

// Each input is read, or refused with what is wrong, before any work starts.
export type InputRead<Contents> =
  | { readonly ok: true; readonly contents: Contents }
  | { readonly ok: false; readonly path: string; readonly fault: InputFault; readonly detail: string };
