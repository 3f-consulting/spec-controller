// The formats are the request's; the plan only compares where each output goes.
export type Destination =
  | { readonly to: "standard-output" }
  | { readonly to: "standard-error" }
  | { readonly to: "file"; readonly path: string };

export interface OutputRequest<Format extends string> {
  readonly format: Format;
  readonly destination: Destination;
}

// The Output port probes each place and reports what it is: a regular file's device and inode, something that is not a
// regular file, one of the run's own standard streams, or nothing there yet.
export type FileIdentity =
  | { readonly is: "regular-file"; readonly device: bigint; readonly inode: bigint }
  | { readonly is: "not-a-regular-file" }
  | { readonly is: "standard-output" | "standard-error" }
  | { readonly is: "absent" };

export interface IdentifiedOutput<Format extends string> {
  readonly output: OutputRequest<Format>;
  readonly identity: FileIdentity;
}

export interface IdentifiedInput {
  readonly name: string;
  readonly path: string;
  readonly identity: FileIdentity;
}

export type OutputRefusal<Format extends string> =
  | { readonly kind: "more-than-one-to-standard-output"; readonly outputs: readonly OutputRequest<Format>[] }
  | { readonly kind: "outputs-share-a-file"; readonly first: OutputRequest<Format>; readonly second: OutputRequest<Format> }
  | { readonly kind: "output-overwrites-an-input"; readonly output: OutputRequest<Format>; readonly input: IdentifiedInput };

export type OutputPlan<Format extends string> =
  | { readonly ok: true; readonly outputs: readonly OutputRequest<Format>[] }
  | { readonly ok: false; readonly refusal: OutputRefusal<Format> };
