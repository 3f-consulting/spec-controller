// The published bin is one file: a spawn that resolved and loaded the ~290 modules of an unbundled build spent most of its
// start-up there. Core is taken from its own build, the code its published package carries, through the condition core's
// exports name for it.
import { build } from "esbuild";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { engineBundled, noticeHeader } from "./src/thirdPartyNotices.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");

const bundleTheCommand = async () => {
  rmSync(dist, { recursive: true, force: true });
  const { metafile } = await build({
    entryPoints: [join(here, "src", "cli.ts")],
    outfile: join(dist, "cli.js"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    metafile: true,
    legalComments: "none",
    conditions: ["spec-controller-build"],
    // A bundled CommonJS dependency that requires a Node built-in needs a require in an ES module.
    banner: { js: 'import { createRequire as __bundleRequire } from "node:module";\nconst require = __bundleRequire(import.meta.url);' },
    logLevel: "warning",
  });

  // Each bundled package's licence ships beside the bundle, as its licence asks of a copy.
  const repoRoot = resolve(here, "../..");
  const manifestOf = (dir) => JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  // A package may carry a nameless package.json deeper in, setting only the module type of a build directory.
  const packageOf = (file) => {
    for (let dir = dirname(file); dir !== dirname(dir); dir = dirname(dir)) {
      if (existsSync(join(dir, "package.json")) && manifestOf(dir).name !== undefined) return dir;
    }
    return undefined;
  };
  const licenceFiles = (dir) => readdirSync(dir).filter((f) => /^(licen[cs]e|notice|copyright)/i.test(f)).sort().map((f) => join(dir, f));
  const installed = (dir) => dir.split(sep).includes("node_modules");
  // A workspace package can leave its licence to the repository's. An installed package's tarball is its directory, so a
  // licence above it belongs to someone else.
  const inheritedLicence = (dir) => {
    if (installed(dir)) return [];
    for (let at = dirname(dir); at.startsWith(repoRoot); at = dirname(at)) {
      if (existsSync(join(at, "LICENSE"))) return [join(at, "LICENSE")];
    }
    return [];
  };
  const packageDirs = new Set();
  for (const input of Object.keys(metafile.inputs)) {
    const dir = packageOf(resolve(input));
    if (dir !== undefined && dir !== here) packageDirs.add(dir);
  }
  const carried = engineBundled([...packageDirs].map((dir) => manifestOf(dir).name));
  if (carried.kind === "refused") {
    throw new Error(`The engine, ${carried.engine}, is not among the packages the command's bundle carries, so the command would ship without it and without its licence notice.`);
  }
  const notices = [...packageDirs].sort().map((dir) => {
    const { name, version, license, author } = manifestOf(dir);
    const declared = license ?? "no licence declared";
    const files = licenceFiles(dir).length > 0 ? licenceFiles(dir) : inheritedLicence(dir);
    const authorName = typeof author === "string" ? author : author?.name;
    const texts = files.length > 0 ? files.map((f) => readFileSync(f, "utf8").trim()) : [authorName === undefined ? declared : `${declared}, by ${authorName}`];
    const header = noticeHeader({ directory: dir, installed: installed(dir), name, version, license: declared });
    if (header.kind === "refused") {
      throw new Error(`The bundled package at ${header.directory} has no ${header.field} as text in its package.json, so its licence notice cannot be written.`);
    }
    return [header.header, ...texts].join("\n\n");
  });
  // Not named like a licence: pnpm pack takes a LICENSE* or NOTICE* file for the package's own licence, and leaves the
  // repository's LICENSE out.
  writeFileSync(join(dist, "THIRD-PARTY-NOTICES.txt"), notices.join("\n\n" + "-".repeat(72) + "\n\n") + "\n");
};

await bundleTheCommand();
