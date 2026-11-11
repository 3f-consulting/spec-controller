import { relativizeToRoot } from "./targetPath.js";

export interface Provenance {
  readonly target: string;
  readonly sourceSha: string;
  readonly toolSha?: string;
  readonly toolVersion: string;
  readonly inputs: readonly { readonly name: string; readonly path?: string }[];
}

export interface RunIdentity {
  readonly target?: string;
  readonly origin?: string;
  readonly sourceSha?: string;
  readonly toolSha?: string;
  readonly toolVersion: string;
}

// The parts of the target's origin, as written. A path git sends to no server; an address with a host, whose lead is
// what is written before its host and whose separator is what is written between its host and its path; or a form the
// run identity port does not read, or cannot tell where its user part ends.
export type OriginAsWritten =
  | { readonly form: "path"; readonly path: string; readonly carriesUser: boolean }
  | {
      readonly form: "address";
      readonly transport: string;
      readonly scheme: string | undefined;
      readonly lead: string;
      readonly carriesUser: boolean;
      readonly host: string;
      readonly separator: string;
      readonly path: string;
    }
  | { readonly form: "unread" };

// What the run identity port read, as written, beside what the run was given.
export interface RunIdentityAsRead {
  readonly target?: string | undefined;
  readonly origin?: OriginAsWritten | undefined;
  readonly givenSourceSha?: string | undefined;
  readonly head?: string | undefined;
  readonly toolFolder: string;
  readonly toolHead?: string | undefined;
  readonly toolVersion: unknown;
}

const UNKNOWN = "unknown";

const INSTALLED_PACKAGES = "node_modules";

// A source SHA the run was given wins over the commit the target has checked out. A tool installed as a package has no
// commit of its own, whatever checkout its folder sits in.
export function runIdentityOf(read: RunIdentityAsRead): RunIdentity {
  const installed = read.toolFolder.split("/").includes(INSTALLED_PACKAGES);
  return {
    target: read.target,
    origin: read.origin === undefined ? undefined : originNameOf(read.origin),
    sourceSha: read.givenSourceSha ?? read.head,
    toolSha: installed ? undefined : read.toolHead,
    toolVersion: toolVersionOf(read.toolVersion),
  };
}

const OWNER_REPO_SCHEMES: readonly string[] = ["https", "ssh"];

const REPOSITORY_SUFFIX = ".git";

// The target is named from the origin's host and path alone, so no user, password, query or fragment reaches it. An
// https or ssh address with no transport, and one with no scheme that carries a user, are named owner/repo, the path's
// last two parts, where it has two. A path with no user is named as written; an origin that was not read names nothing.
function originNameOf(origin: OriginAsWritten): string | undefined {
  if (origin.form === "unread") return undefined;
  if (origin.form === "path") return origin.carriesUser ? undefined : origin.path;
  const namedByOwnerRepo =
    origin.scheme === undefined ? origin.carriesUser : origin.transport === "" && OWNER_REPO_SCHEMES.includes(origin.scheme);
  return (namedByOwnerRepo ? ownerRepoOf(origin.path) : undefined) ?? `${origin.lead}${origin.host}${origin.separator}${origin.path}`;
}

function ownerRepoOf(path: string): string | undefined {
  const bare = path.replace(/^\//, "");
  const segments = (bare.endsWith(REPOSITORY_SUFFIX) ? bare.slice(0, -REPOSITORY_SUFFIX.length) : bare).split("/");
  return segments.length >= 2 ? segments.slice(-2).join("/") : undefined;
}

// A version that is no string, or an empty one, is unknown.
export function toolVersionOf(version: unknown): string {
  return typeof version === "string" && version !== "" ? version : UNKNOWN;
}

const UNKNOWN_TARGET = "unknown-target";

export function provenanceOf(identity: RunIdentity, inputs: Provenance["inputs"]): Provenance {
  return {
    target: identity.target ?? identity.origin ?? UNKNOWN_TARGET,
    sourceSha: identity.sourceSha ?? UNKNOWN,
    ...(identity.toolSha === undefined ? {} : { toolSha: identity.toolSha }),
    toolVersion: identity.toolVersion,
    inputs,
  };
}

export interface RunInput {
  readonly name: string;
  readonly path?: string;
}

export function provenanceFrom(identity: RunIdentity, inputs: readonly RunInput[], root: string): Provenance {
  return provenanceOf(
    identity,
    inputs.map(({ name, path }) => (path === undefined ? { name } : { name, path: relativizeToRoot(path, root) })),
  );
}
