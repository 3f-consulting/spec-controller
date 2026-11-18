// The published bin is one file: a spawn that resolved and loaded the ~290 modules of an unbundled build spent most of its
// start-up there. Core is taken from its own build, the code its published package carries, through the condition core's
// exports name for it.
import { build } from "esbuild";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createGenerator } from "ts-json-schema-generator";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");

const bundleTheCommand = async () => {
  rmSync(dist, { recursive: true, force: true });
  const { metafile } = await build({
    entryPoints: [join(here, "src", "commands", "cli.ts")],
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
  const packages = [...packageDirs].map((dir) => {
    const { name, version, license, author } = manifestOf(dir);
    const declared = license ?? "no licence declared";
    const files = licenceFiles(dir).length > 0 ? licenceFiles(dir) : inheritedLicence(dir);
    const authorName = typeof author === "string" ? author : author?.name;
    const texts = files.length > 0 ? files.map((f) => readFileSync(f, "utf8").trim()) : [authorName === undefined ? declared : `${declared}, by ${authorName}`];
    // A workspace package's version is stamped at release, after the build, so the tree's version would misname it.
    const header = installed(dir) ? `${name}@${version} (${declared})` : `${name} (${declared})`;
    return { directory: dir, notice: [header, ...texts].join("\n\n") };
  });
  // Inside the repository the workspace resolves the engine at run time, so a bundle without it passes every test and
  // breaks only the published command.
  const engine = "@3f-consulting/spec-controller-core";
  if (!packages.some(({ directory }) => manifestOf(directory).name === engine)) {
    throw new Error(`The engine, ${engine}, is not among the packages the command's bundle carries, so the command would ship without it.`);
  }
  const notices = packages.sort((a, b) => (a.directory < b.directory ? -1 : 1)).map(({ notice }) => notice);
  writeFileSync(join(dist, "THIRD-PARTY-NOTICES.txt"), notices.join("\n\n" + "-".repeat(72) + "\n\n") + "\n");
};

// The JSON report is its own type serialised as it is, so its schema is generated from that type and never written by hand.
const writeTheReportSchema = () => {
  const core = resolve(here, "../core");
  const schema = createGenerator({
    path: join(core, "src", "reports", "json.ts"),
    tsconfig: join(core, "tsconfig.build.json"),
    type: "JsonReport",
    additionalProperties: false,
    skipTypeCheck: true,
  }).createSchema("JsonReport");
  writeFileSync(join(dist, "spec-reconciliation.schema.json"), `${JSON.stringify(schema, null, 2)}\n`);
};

await bundleTheCommand();
writeTheReportSchema();
