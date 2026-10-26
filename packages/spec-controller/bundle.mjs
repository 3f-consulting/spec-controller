// The published bin is one file: a spawn that resolved and loaded the ~290 modules of an unbundled build spent most of its
// start-up there. Core is taken from its own build, the code its published package carries.
import { build } from "esbuild";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");
const coreDist = resolve(here, "../core/dist");

const CORE_BUILD = new Map([
  ["@3f-consulting/spec-controller-core", join(coreDist, "index.js")],
  ["@3f-consulting/spec-controller-core/internal", join(coreDist, "internal.js")],
]);

export const coreFromItsBuild = {
  name: "core-from-its-build",
  setup(bundler) {
    // An unmapped entry would otherwise resolve through core's exports to its source, and bundle a second core.
    bundler.onResolve({ filter: /^@3f-consulting\/spec-controller-core(\/.*)?$/ }, (args) =>
      CORE_BUILD.has(args.path)
        ? { path: CORE_BUILD.get(args.path) }
        : { errors: [{ text: `${args.path} is not an entry the bundle maps to core's build; it maps ${[...CORE_BUILD.keys()].join(", ")}` }] },
    );
  },
};

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
    plugins: [coreFromItsBuild],
    // A bundled CommonJS dependency that requires a Node built-in needs a require in an ES module.
    banner: { js: 'import { createRequire as __bundleRequire } from "node:module";\nconst require = __bundleRequire(import.meta.url);' },
    logLevel: "warning",
  });

  // Each bundled package's licence ships beside the bundle, as its licence asks of a copy. The file is not named as a licence,
  // or pnpm pack takes it for the package's own and leaves the repository's LICENSE out of the tarball.
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
  const notices = [...packageDirs].sort().map((dir) => {
    const { name, version, license, author } = manifestOf(dir);
    const declared = license ?? "no licence declared";
    const files = licenceFiles(dir).length > 0 ? licenceFiles(dir) : inheritedLicence(dir);
    const authorName = typeof author === "string" ? author : author?.name;
    const texts = files.length > 0 ? files.map((f) => readFileSync(f, "utf8").trim()) : [authorName === undefined ? declared : `${declared}, by ${authorName}`];
    // A workspace package's version is stamped at release, after this build, so the tree's version would misname it.
    return [`${installed(dir) ? `${name}@${version}` : name} (${declared})`, ...texts].join("\n\n");
  });
  writeFileSync(join(dist, "THIRD-PARTY-NOTICES.txt"), notices.join("\n\n" + "-".repeat(72) + "\n\n") + "\n");

  // The metafile names every input the bundle carries, so a check can tell which packages the notices owe. It is kept outside
  // dist, so the published package does not carry it.
  const buildMeta = join(here, "build-meta");
  mkdirSync(buildMeta, { recursive: true });
  writeFileSync(join(buildMeta, "metafile.json"), JSON.stringify(metafile));
};

const runAsTheBuild = process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (runAsTheBuild) await bundleTheCommand();
