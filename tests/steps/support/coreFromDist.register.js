import { registerHooks } from "node:module";

import { resolve } from "./coreFromDist.hook.js";

registerHooks({ resolve });
