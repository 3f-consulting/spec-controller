#!/usr/bin/env node
import { installCrashGuards, main } from "./main.js";
installCrashGuards(process, process.stdout, process.stderr);
main(process.argv.slice(2));
