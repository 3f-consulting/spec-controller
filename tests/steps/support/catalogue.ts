import { IntlMessageFormat } from "intl-messageformat";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const APP_CATALOGUE = join(repoRoot, "packages", "spec-controller", "src", "messages.en.json");

type Values = Readonly<Record<string, string>>;

type Slot = { readonly slot: string };

let appCatalogue: Readonly<Record<string, string>> | undefined;

function messageOf(code: string): string {
  appCatalogue ??= JSON.parse(readFileSync(APP_CATALOGUE, "utf8")) as Record<string, string>;
  const message = appCatalogue[code];
  if (message === undefined) throw new Error(`the app's data file has no entry ${code}`);
  return message;
}

function formatterOf(code: string): IntlMessageFormat {
  return new IntlMessageFormat(messageOf(code), "en", undefined, { ignoreTag: true });
}

export function entryText(code: string, values: Values = {}): string {
  return String(formatterOf(code).format(values));
}

// A value the step does not know is left a slot: the formatter is asked for every name the entry
// uses, and a name with no value comes back as a slot of its own, not as words.
function partsOf(code: string, known: Values): (string | Slot)[] {
  const values = new Proxy(known, {
    has: () => true,
    get: (target, name) => (typeof name === "string" && name in target ? target[name] : { slot: String(name) }),
  });
  return formatterOf(code)
    .formatToParts<Slot>(values)
    .map((part) => part.value);
}

const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function patternOf(code: string, known: Values): { pattern: RegExp; slots: string[] } {
  const parts = partsOf(code, known);
  const slots: string[] = [];
  const source = parts
    .map((part, at) => {
      if (typeof part === "string") return escaped(part);
      const seen = slots.indexOf(part.slot);
      if (seen >= 0) return `\\${seen + 1}`;
      slots.push(part.slot);
      return at === parts.length - 1 ? "([^\\n]*)" : "([^\\n]*?)";
    })
    .join("");
  return { pattern: new RegExp(source), slots };
}

export function shownEntry(text: string, code: string, known: Values = {}): Values | undefined {
  const { pattern, slots } = patternOf(code, known);
  const match = pattern.exec(text);
  if (match === null) return undefined;
  return Object.fromEntries(slots.map((slot, at) => [slot, match[at + 1] ?? ""]));
}

export function showsEntry(text: string, code: string, known: Values = {}): boolean {
  return shownEntry(text, code, known) !== undefined;
}

export function firstShown(text: string, codes: readonly string[]): string | undefined {
  return codes.find((code) => showsEntry(text, code));
}
