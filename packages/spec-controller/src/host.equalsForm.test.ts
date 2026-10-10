import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const HOST_SCOPE = "spec-controller";

const equalsForm = (written: string, spelling: string): string =>
  `${APP_MESSAGES[AppMessage.EqualsForm](written, HOST_SCOPE, spelling)}\n${APP_MESSAGES[AppMessage.SeeFlags](HOST_SCOPE)}`;

describe("[SCN-CLI-065] a flag written --flag=value is refused naming the form and the spelling that is read, with no pin advice", () => {
  for (const { name: modifier } of cliRegistry.global) {
    it(`refuses ${modifier}=v before the command at the host's scope, giving '${modifier} v', and takes no command`, () => {
      expect(parseHostInvocation([`${modifier}=v`, "balance"])).toEqual({
        commandArgs: [],
        refusal: equalsForm(`${modifier}=v`, `${modifier} v`),
      });
    });
  }
});
