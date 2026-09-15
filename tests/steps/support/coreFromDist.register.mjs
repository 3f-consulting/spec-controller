/**
 * The `--import` entry that installs `coreFromDist.hook.mjs` (3F-3424).
 *
 * `registerHooks`, NOT `register`, AND THE SUITE IS WHAT SAYS SO. `register()` puts the hook on
 * Node's loader thread; it is also deprecated as of DEP0205, and on a Node that says so it prints
 * that deprecation TO stderr OF EVERY SPAWNED CLI. @SCN-USG-018 asserts a reconciliation's stderr
 * is empty, so the first run of this arrangement redded there — a warning from the harness read as
 * output from the product. `registerHooks` is the synchronous in-thread replacement: no loader
 * thread, no warning, and one less process boundary per spawn.
 */

import { registerHooks } from "node:module";

import { resolve } from "./coreFromDist.hook.mjs";

registerHooks({ resolve });
