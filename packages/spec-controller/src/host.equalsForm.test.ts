import { describe, it, expect } from "vitest";
import { cliRegistry } from "./cli-registry.js";
import { parseHostInvocation } from "./host.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";

const HOST_SCOPE = "spec-controller";

const equalsForm = (written: string, spelling: string): string =>
  `${APP_MESSAGES[AppMessage.EqualsForm](written, HOST_SCOPE, spelling)}\n${APP_MESSAGES[AppMessage.SeeFlags](HOST_SCOPE)}`;

describe("[SCN-CLI-065] a flag written --flag=value is refused naming the form and the spelling that is read, with no pin advice", () => {
  for (const modifier of cliRegistry.global.map((flag) => flag.name)) {
    it(`refuses ${modifier}=v before the command at the host's scope, giving '${modifier} v', and takes no command`, () => {
      expect(parseHostInvocation([`${modifier}=v`, "balance"])).toEqual({
        commandArgs: [],
        refusal: equalsForm(`${modifier}=v`, `${modifier} v`),
      });
    });
  }

  it("refuses --store=x balance at the host's scope, giving '--store x'", () => {
    expect(parseHostInvocation(["--store=x", "balance"])).toEqual({
      commandArgs: [],
      refusal: equalsForm("--store=x", "--store x"),
    });
  });

  it("gives the modifier's value placeholder for a form written with no value", () => {
    expect(parseHostInvocation(["--store=", "balance"])).toEqual({
      commandArgs: [],
      refusal: equalsForm("--store=", "--store <root>"),
    });
  });

  it("refuses the form after another modifier, reading nothing", () => {
    expect(parseHostInvocation(["--store", "s", "--run-id=r", "balance"])).toEqual({
      commandArgs: [],
      refusal: equalsForm("--run-id=r", "--run-id r"),
    });
  });
});
