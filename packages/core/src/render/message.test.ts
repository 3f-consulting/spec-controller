import { describe, expect, it } from "vitest";

import { messagesFrom } from "./message.js";

type Code = "plain" | "named" | "quoted" | "angled" | "counted";

type Values = {
  named: { flag: string; scope: string };
  quoted: { scope: string };
  angled: { flag: string };
  counted: { count: number };
};

const TEXTS: Readonly<Record<Code, string>> = {
  plain: "Do not pin an earlier version to get it back.",
  named: "The {flag} flag of {scope} was given more than once.",
  quoted: "Run ''{scope} --help'' to see the flags.",
  angled: "Use {flag} json:<path> instead.",
  counted: "{count, plural, one {# step ran} other {# steps ran}}; {count} in all.",
};

function message<C extends Code>(code: C, ...values: C extends keyof Values ? [values: Values[C]] : []): string {
  return messagesFrom<Code, Values>(TEXTS)(code, ...values);
}

describe("[CLM-MSG-002] core's formatter prints a catalogue entry's words, with the values its code is given", () => {
  it("prints an entry that takes no value as written", () => {
    expect(message("plain")).toBe("Do not pin an earlier version to get it back.");
  });

  it("puts each named value in its place", () => {
    expect(message("named", { flag: "--strict", scope: "spec-controller balance" })).toBe(
      "The --strict flag of spec-controller balance was given more than once.",
    );
  });

  it("prints a doubled apostrophe as one, so a value is quoted", () => {
    expect(message("quoted", { scope: "spec-controller allocate" })).toBe(
      "Run 'spec-controller allocate --help' to see the flags.",
    );
  });

  it("prints an angle bracket as text, not as a tag", () => {
    expect(message("angled", { flag: "--format" })).toBe("Use --format json:<path> instead.");
  });

  it("picks a count's plural form in English, and prints a plain count as its digits", () => {
    expect(message("counted", { count: 1 })).toBe("1 step ran; 1 in all.");
    expect(message("counted", { count: 0 })).toBe("0 steps ran; 0 in all.");
    expect(message("counted", { count: 1000 })).toBe("1,000 steps ran; 1000 in all.");
  });
});

describe("[CLM-MSG-015] a counted noun agrees with its count — the run-integrity stamp's proofs that never ran", () => {
  const PROOFS = { proofs: "{count, plural, one {{count} proof never ran} other {{count} proofs never ran}}." };

  it("1000 proofs", () => {
    const proofs = messagesFrom<"proofs", { proofs: { count: number } }>(PROOFS);
    expect(new Intl.NumberFormat("en").format(1000)).toBe("1,000");
    expect(proofs("proofs", { count: 1000 })).toBe("1000 proofs never ran.");
    expect(proofs("proofs", { count: 1 })).toBe("1 proof never ran.");
  });
});
