#!/usr/bin/env node
import { runRequestOf } from "../runRequest/runRequest.js";
import { balance } from "./balance.js";

const request = runRequestOf(process.argv.slice(2));
if (request.command === "balance") balance(request.inputs);
