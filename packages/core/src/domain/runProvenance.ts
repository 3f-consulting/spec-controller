/** Each input path the run read, keyed by the name of the flag that supplied it, in camelCase. */
export type RunInputs = Readonly<Partial<Record<string, string>>>;

export const INPUT_FLAGS: readonly { key: string; flag: string }[] = [
  { key: "features", flag: "--features" },
  { key: "vitest", flag: "--vitest" },
  { key: "pytest", flag: "--pytest" },
  { key: "cucumber", flag: "--cucumber" },
  { key: "ci", flag: "--ci" },
  { key: "packageJson", flag: "--package-json" },
  { key: "ciSteps", flag: "--ci-steps" },
];

const URL_REMOTE = /^(?:https|ssh):\/\/[^/]+\/(.+)$/;
const SCP_REMOTE = /^[^/@:]+@[^/:]+:(.+)$/;
const URL_USERINFO = /^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i;

/**
 * Names a remote URL by its last two path segments, owner/repo. A remote of any other
 * shape is named as given, less any user and password, which the report must not print.
 */
export function targetOriginName(remote: string): string {
  const path = (URL_REMOTE.exec(remote) ?? SCP_REMOTE.exec(remote))?.[1];
  const segments = path === undefined ? [] : (path.endsWith(".git") ? path.slice(0, -".git".length) : path).split("/");
  return segments.length >= 2 ? segments.slice(-2).join("/") : remote.replace(URL_USERINFO, "$1");
}

export interface RunContext {
  readonly target: string;
  readonly inputs: RunInputs;
  readonly runStart: Date;
  readonly sourceSha: string | null;
  /** The target's origin remote URL as git returns it, read only when no --target was given. */
  readonly targetOrigin?: string;
  readonly toolSha?: string | null;
  readonly toolVersion?: string;
  readonly root?: string;
  readonly strict?: boolean;
}

export interface ProvenanceObject {
  readonly target: string;
  readonly targetOrigin?: string;
  readonly sourceSha: string | null;
  readonly toolSha: string | null;
  readonly toolVersion: string;
  readonly runTimestamp: string;
  readonly inputs: RunInputs;
  readonly strict?: boolean;
}
