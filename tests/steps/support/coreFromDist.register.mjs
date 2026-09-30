import { registerHooks } from "node:module";

import { resolve } from "./coreFromDist.hook.mjs";

registerHooks({ resolve });
