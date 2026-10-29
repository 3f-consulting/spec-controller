export type BundledManifest = {
  readonly directory: string;
  readonly installed: boolean;
  readonly name: unknown;
  readonly version: unknown;
  readonly license: unknown;
};

type NoticeField = "name" | "version" | "license";

export type NoticeHeader =
  | { readonly kind: "header"; readonly header: string }
  | { readonly kind: "refused"; readonly directory: string; readonly field: NoticeField };

const isText = (value: unknown): value is string => typeof value === "string";

// A workspace package's version is stamped at release, after the build, so the tree's version would misname it.
export const noticeHeader = ({ directory, installed, name, version, license }: BundledManifest): NoticeHeader => {
  const refused = (field: NoticeField): NoticeHeader => ({ kind: "refused", directory, field });
  if (!isText(name)) return refused("name");
  if (!isText(license)) return refused("license");
  if (!installed) return { kind: "header", header: `${name} (${license})` };
  if (!isText(version)) return refused("version");
  return { kind: "header", header: `${name}@${version} (${license})` };
};

export type BundledEngine =
  | { readonly kind: "bundled" }
  | { readonly kind: "refused"; readonly engine: string };

const engine = "@3f-consulting/spec-controller-core";

// Inside the repository the workspace resolves the engine at run time, so a bundle without it passes every test and
// breaks only the published command.
export const engineBundled = (names: readonly unknown[]): BundledEngine =>
  names.includes(engine) ? { kind: "bundled" } : { kind: "refused", engine };
