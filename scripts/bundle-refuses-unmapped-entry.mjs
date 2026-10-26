// Builds a stub that imports an entry point a stand-in engine exports and the command's bundle does not map, with the bundle's
// own resolve plugin, and fails unless the build fails with the plugin's message naming that import.
// Usage: node scripts/bundle-refuses-unmapped-entry.mjs
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { coreFromItsBuild } from "../packages/spec-controller/bundle.mjs";

const { build } = createRequire(import.meta.resolve("../packages/spec-controller/bundle.mjs"))("esbuild");
const unmapped = "@3f-consulting/spec-controller-core/extra";
const refusal = `${unmapped} is not an entry the bundle maps to core's build; it maps `;

const failures = [];
const at = mkdtempSync(join(tmpdir(), "bundle-unmapped-entry-"));
try {
  const engine = join(at, "node_modules", "@3f-consulting", "spec-controller-core");
  mkdirSync(engine, { recursive: true });
  writeFileSync(
    join(engine, "package.json"),
    JSON.stringify({ name: "@3f-consulting/spec-controller-core", type: "module", exports: { ".": "./index.js", "./extra": "./extra.js" } }),
  );
  writeFileSync(join(engine, "index.js"), "export const engine = 1;\n");
  writeFileSync(join(engine, "extra.js"), "export const extra = 1;\n");
  writeFileSync(join(at, "stub.js"), `import { extra } from "${unmapped}";\nconsole.log(extra);\n`);
  const bundle = (plugins) =>
    build({ entryPoints: [join(at, "stub.js")], absWorkingDir: at, bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent", plugins });

  // The stand-in must build without the plugin, or a refusal would not show that the plugin refuses an exported entry.
  await bundle([]).catch((error) => failures.push(`the stand-in engine does not build without the plugin: ${error.message}`));
  const messages = await bundle([coreFromItsBuild]).then(
    () => undefined,
    (error) => (error.errors ?? []).map((e) => e.text),
  );
  if (messages === undefined) failures.push(`the build succeeded, so ${unmapped} reached a second copy of the engine`);
  else if (!messages.some((text) => text.startsWith(refusal))) failures.push(`the build failed with another message: ${messages.join("; ")}`);
  else console.log(`the build refuses ${unmapped}: ${messages.find((text) => text.startsWith(refusal))}`);
} finally {
  rmSync(at, { recursive: true, force: true });
}
for (const failure of failures) console.log(failure);
process.exit(failures.length > 0 ? 1 : 0);
