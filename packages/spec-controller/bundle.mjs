// The published bin is one file: a spawn that resolved and loaded the ~290 modules of an unbundled build spent most of its
// start-up there. Core is taken from its own build, the code its published package carries.
import { build } from "esbuild";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");
const coreDist = resolve(here, "../core/dist");

const CORE_BUILD = new Map([
  ["@3f-consulting/spec-controller-core", join(coreDist, "index.js")],
  ["@3f-consulting/spec-controller-core/internal", join(coreDist, "internal.js")],
]);

const coreFromItsBuild = {
  name: "core-from-its-build",
  setup(bundler) {
    bundler.onResolve({ filter: /^@3f-consulting\/spec-controller-core(\/internal)?$/ }, (args) => ({ path: CORE_BUILD.get(args.path) }));
  },
};

rmSync(dist, { recursive: true, force: true });
const { metafile } = await build({
  entryPoints: [join(here, "src", "cli.ts")],
  outfile: join(dist, "cli.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  metafile: true,
  legalComments: "eof",
  plugins: [coreFromItsBuild],
  // A bundled CommonJS dependency that requires a Node built-in needs a require in an ES module.
  banner: { js: 'import { createRequire as __bundleRequire } from "node:module";\nconst require = __bundleRequire(import.meta.url);' },
  logLevel: "warning",
});

// Each bundled package's licence ships beside the bundle, as its licence asks of a copy.
const packageDirs = new Set();
for (const input of Object.keys(metafile.inputs)) {
  const at = input.lastIndexOf("node_modules/");
  if (at === -1) continue;
  const rest = input.slice(at + "node_modules/".length).split("/");
  packageDirs.add(input.slice(0, at) + "node_modules/" + rest.slice(0, rest[0].startsWith("@") ? 2 : 1).join("/"));
}
const notices = [...packageDirs].sort().map((dir) => {
  const { name, version, license, author } = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const files = readdirSync(dir).filter((f) => /^(licen[cs]e|notice|copyright)/i.test(f)).sort();
  // A package that ships no licence file is named by the licence and author its manifest declares.
  const texts = files.length > 0 ? files.map((f) => readFileSync(join(dir, f), "utf8").trim()) : [`${license}, by ${typeof author === "string" ? author : author?.name}`];
  return [`${name}@${version} (${license})`, ...texts].join("\n\n");
});
writeFileSync(join(dist, "THIRD-PARTY-LICENSES.txt"), notices.join("\n\n" + "-".repeat(72) + "\n\n") + "\n");
if (!existsSync(join(dist, "cli.js"))) throw new Error("the bundle wrote no dist/cli.js");
