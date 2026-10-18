import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

// Vale over the files git tracks or would track, as a CI checkout holds them; Vale skips its styles folder only on a folder walk.
const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\0")
  .filter((file) => file !== "" && existsSync(file));

const { status } = spawnSync("vale", ["--glob=!.vale/styles/**", ...process.argv.slice(2), ...files], { stdio: "inherit" });
process.exit(status ?? 2);
