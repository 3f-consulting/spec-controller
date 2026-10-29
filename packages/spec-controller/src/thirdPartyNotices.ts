export type BundledPackage = {
  readonly directory: string;
  readonly installed: boolean;
  readonly name: unknown;
  readonly version: unknown;
  readonly license: unknown;
  readonly texts: readonly string[];
};

type NoticeField = "name" | "version" | "license";

export type NoticeWording = {
  readonly field: (directory: string, field: NoticeField) => string;
  readonly engine: (engine: string) => string;
};

const isText = (value: unknown): value is string => typeof value === "string" && /\S/.test(value);

// A workspace package's version is stamped at release, after the build, so the tree's version would misname it.
const noticeHeader = ({ directory, installed, name, version, license }: BundledPackage, wording: NoticeWording): string => {
  const refuse = (field: NoticeField): never => {
    throw new Error(wording.field(directory, field));
  };
  if (!isText(name)) return refuse("name");
  if (!isText(license)) return refuse("license");
  if (!installed) return `${name} (${license})`;
  if (!isText(version)) return refuse("version");
  return `${name}@${version} (${license})`;
};

const engine = "@3f-consulting/spec-controller-core";

// Inside the repository the workspace resolves the engine at run time, so a bundle without it passes every test and
// breaks only the published command.
export const thirdPartyNotices = (packages: readonly BundledPackage[], wording: NoticeWording): string => {
  const notices = [...packages]
    .sort((a, b) => (a.directory < b.directory ? -1 : 1))
    .map((bundled) => [noticeHeader(bundled, wording), ...bundled.texts].join("\n\n"));
  if (!packages.some(({ name }) => name === engine)) throw new Error(wording.engine(engine));
  return notices.join("\n\n" + "-".repeat(72) + "\n\n") + "\n";
};
