// An input its reader cannot take: one its parser refuses, or one written in a way the reader refuses by name. Anything
// else a reader throws is a fault in the reader, not in the input.
export class InputDoesNotParse extends Error {}
