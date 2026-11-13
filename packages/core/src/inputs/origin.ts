import type { RepositoryOfOrigin } from "../domain/provenance.js";

const segmentsOf = (path: string): string[] => path.split("/").filter((segment) => segment !== "");

const withoutGit = (name: string): string => name.replace(/\.git$/, "");

const ownerAndRepository = (path: string): string | undefined => {
  const [owner, repository] = segmentsOf(path).slice(-2);
  return repository === undefined ? undefined : `${owner}/${withoutGit(repository)}`;
};

const lastSegment = (path: string): string | undefined => {
  const last = segmentsOf(path).at(-1);
  return last === undefined ? undefined : withoutGit(last);
};

// A URL's scheme, then its path with no user, password, query or fragment.
const URL_FORM = /^([a-z][a-z0-9+.-]*):\/\/[^/?#]*([^?#]*)/;

// The scp form: a host, with or without a user, a colon, then the path.
const SCP_FORM = /^[^/:]+:(.+)$/;

// An origin as git's remote holds it. https and ssh, and the scp form, name owner/repo by their path's last two
// segments; a local path or a file URL names its last. A URL of any other scheme names none.
export const repositoryOfOrigin: RepositoryOfOrigin = (origin) => {
  const url = URL_FORM.exec(origin);
  if (url !== null) {
    const scheme = url[1]!;
    if (scheme === "https" || scheme === "ssh") return ownerAndRepository(url[2]!);
    return scheme === "file" ? lastSegment(url[2]!) : undefined;
  }
  if (origin.startsWith("/")) return lastSegment(origin);
  return ownerAndRepository(SCP_FORM.exec(origin)![1]!);
};
