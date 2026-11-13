#!/usr/bin/env node
import { processStreams } from "../output/streams.js";
import { endRunOn } from "../runEnding/exitCode.js";
import { main } from "./main.js";

endRunOn(main(process.argv.slice(2), process.cwd(), processStreams));
