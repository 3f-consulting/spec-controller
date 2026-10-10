import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fstatSync, mkdtempSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { probeDestination, settlingRefusal } from "./outputLocation.js";

let scratch: string;
let stderr: string[];

function descriptorsOpenOn(path: string): number {
  const file = statSync(path);
  let open = 0;
  for (const entry of readdirSync("/dev/fd")) {
    try {
      const fd = fstatSync(Number(entry));
      if (fd.dev === file.dev && fd.ino === file.ino) open++;
    } catch {
      continue;
    }
  }
  return open;
}

beforeEach(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-unwritable-")));
  stderr = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  rmSync(scratch, { recursive: true, force: true });
});

describe("[SCN-FMT-008] a file destination that cannot be written is refused on the usage code, naming the path and why", () => {

  it("lets an error that is not a refusal escape unchanged, with no stderr line and no exit code set", () => {
    const failure = new Error("not a refusal");

    let escaped: unknown;
    try {
      settlingRefusal(() => {
        throw failure;
      }, "refused");
    } catch (err) {
      escaped = err;
    }

    expect(escaped).toBe(failure);
    expect(stderr).toEqual([]);
    expect(process.exitCode).toBeUndefined();
  });

  it("leaves no descriptor open on a destination it probed, whether it was there already or the probe made it", () => {
    const existing = join(scratch, "existing.json");
    writeFileSync(existing, "earlier\n");
    const made = join(scratch, "made.json");

    probeDestination(existing);
    const probed = probeDestination(made);

    expect(probed.created).toBe(made);
    expect(descriptorsOpenOn(existing)).toBe(0);
    expect(descriptorsOpenOn(made)).toBe(0);
  });
});
