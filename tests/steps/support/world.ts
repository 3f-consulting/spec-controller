/**
 * Minimal reusable Cucumber World for the tool's step-definition suite.
 *
 * Kept minimal: a typed World base. The World instance is constructed fresh per
 * scenario by Cucumber, so any mutable scenario outcome placed in step modules is
 * isolated between scenarios. spec-controller is a pure-transform reconciler with no
 * external-boundary lifecycle (no DB), so there are no support/hooks beyond this.
 */

import { setWorldConstructor, World } from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";

export class SpecControllerWorld extends World {
  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(SpecControllerWorld);
