#!/usr/bin/env node
import { boot } from "../runEnding/crashGuards.js";
void boot(process, process.stdout, process.stderr, process.argv.slice(2), () => import("./main.js"));
