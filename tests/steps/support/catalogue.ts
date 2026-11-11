import { IntlMessageFormat } from "intl-messageformat";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const DATA_FILES = [
  join(repoRoot, "packages", "spec-controller", "src", "messages", "messages.en.json"),
  join(repoRoot, "packages", "core", "src", "messages", "messages.en.json"),
];

type Values = Readonly<Record<string, string>>;

type Slot = { readonly slot: string };

let catalogues: readonly Readonly<Record<string, string>>[] | undefined;

// An entry is looked up in the app's data file and in core's; a code both hold is refused, not picked.
function messageOf(code: string): string {
  catalogues ??= DATA_FILES.map((file) => JSON.parse(readFileSync(file, "utf8")) as Record<string, string>);
  const found = catalogues.filter((catalogue) => Object.hasOwn(catalogue, code)).map((catalogue) => catalogue[code]);
  if (found.length !== 1) throw new Error(`${found.length} data files have an entry ${code}`);
  return found[0] as string;
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

export function shownAmong(text: string, codes: readonly string[], known: Values = {}): Values | undefined {
  return codes.map((code) => shownEntry(text, code, known)).find((values) => values !== undefined);
}

export function firstShown(text: string, codes: readonly string[]): string | undefined {
  return codes.find((code) => showsEntry(text, code));
}
