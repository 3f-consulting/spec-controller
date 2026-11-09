import { describe, it, expect } from "vitest";
import { parseHostInvocation } from "./host.js";
import { AppError, AppMessage } from "./messages.js";
import { message } from "./appText.js";
import { withShownRefusal } from "./shownText.test-utils.js";

const HOST_SCOPE = "spec-controller";

const equalsForm = (written: string, spelling: string): string =>
  `${message(AppError.EqualsForm, { token: written, scope: HOST_SCOPE, spelling })}\n${message(AppMessage.SeeFlags, { scope: HOST_SCOPE })}`;

describe("[CLM-CLI-065] a flag written --flag=value is refused naming the form and the spelling that is read, with no pin advice", () => {
  it("refuses --format=json before the command at the host's scope, giving '--format json', and takes no command", () => {
    expect(withShownRefusal(parseHostInvocation(["--format=json", "balance"]))).toEqual({
      commandArgs: [],
      refusal: equalsForm("--format=json", "--format json"),
    });
  });
});
