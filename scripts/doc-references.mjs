import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { minimatch } from "minimatch";
import { remark } from "remark";
import remarkFeatureProse from "./remark-feature-prose.mjs";

// Our own code, for the three references in a current-state document that no maintained tool reads:
// 1. a `file` → *Heading* citation: the file must be tracked and carry that heading;
// 2. a backticked path whose first segment is a tracked top-level entry: it must name a tracked file or
//    folder, and a glob must match at least one tracked file;
// 3. a relative link: its target must be inside the repository and tracked. remark-validate-links checks
//    a link against the file system, so a sibling checkout or a built file satisfies it; it alone checks anchors.
// With --list it prints the documents it reads, NUL-separated, for remark to read the same set.

const root = posix.join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);

const tracked = new Set(git("ls-files", "-z"));
const prefixes = (file) => file.split("/").slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join("/"));
const folders = new Set([...tracked].flatMap(prefixes));
const topLevel = new Set([...tracked].map((file) => file.split("/")[0]));

const isLog = (file) => /(^|\/)(decisions|work-item)\//.test(file) || /(^|\/)(CHANGELOG|STATUS)\.md$/.test(file);
const documents = git("ls-files", "-z", "--", "*.md", "features/*.feature").filter((file) => !isLog(file));

if (process.argv[2] === "--list") {
  process.stdout.write(documents.map((file) => `${file}\0`).join(""));
  process.exit(0);
}

const parser = remark().use(remarkFeatureProse);
const parse = (file) => parser.parse({ value: readFileSync(posix.join(root, file), "utf8"), path: file });
const textOf = (node) => ("value" in node ? node.value : (node.children ?? []).map(textOf).join(""));
const squash = (text) => text.replace(/\s+/g, " ").trim();

const headingsOf = new Map();
const headings = (file) => {
  if (!headingsOf.has(file)) {
    const found = new Set();
    walk(parse(file), (node) => node.type === "heading" && found.add(squash(textOf(node))));
    headingsOf.set(file, found);
  }
  return headingsOf.get(file);
};

function walk(node, visit, parent) {
  visit(node, parent);
  for (const child of node.children ?? []) walk(child, visit, node);
}

const resolves = (path) => {
  const bare = path.replace(/\/$/, "");
  if (/[*?[{]/.test(bare)) return [...tracked].some((file) => minimatch(file, bare, { dot: true }));
  return tracked.has(bare) || folders.has(bare);
};

const citationAt = (siblings, index) => {
  const [code, arrow, heading] = siblings.slice(index, index + 3);
  const isArrow = arrow?.type === "text" && /^\s*→\s*$/.test(arrow.value);
  return code.type === "inlineCode" && isArrow && heading?.type === "emphasis"
    ? { file: code.value, heading: squash(textOf(heading)) }
    : undefined;
};

const checkCitation = ({ file, heading }) => {
  if (!tracked.has(file)) return `cites ${file}, which is not a tracked file`;
  if (!headings(file).has(heading)) return `cites heading "${heading}", which ${file} does not carry`;
};

const checkPath = (token) => {
  if (/\s/.test(token) || !topLevel.has(token.split("/")[0])) return null;
  return resolves(token) ? undefined : `names ${token}, which matches no tracked file or folder`;
};

const checkLink = (from, url) => {
  if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(url)) return null;
  const path = decodeURI(url.replace(/[?#].*$/, ""));
  const target = posix.normalize(path.startsWith("/") ? `.${path}` : posix.join(posix.dirname(from), path));
  if (target === ".." || target.startsWith("../")) return `links to ${url}, outside the repository`;
  return target === "." || resolves(target) ? undefined : `links to ${url}, which is not tracked`;
};

const counts = { citation: 0, path: 0, link: 0 };
const failures = [];
const record = (kind, file, node, verdict) => {
  if (verdict === null) return;
  counts[kind] += 1;
  if (verdict) failures.push(`${file}:${node.position.start.line}: ${verdict}`);
};

for (const file of documents) {
  walk(parse(file), (node, parent) => {
    if (node.type === "inlineCode" && parent) {
      const citation = citationAt(parent.children, parent.children.indexOf(node));
      if (citation) record("citation", file, node, checkCitation(citation));
      else record("path", file, node, checkPath(node.value));
    }
    if (node.type === "link" || node.type === "definition") record("link", file, node, checkLink(file, node.url));
  });
}

console.log(
  `Read ${documents.length} documents: ${counts.citation} citations, ${counts.path} backticked paths, ${counts.link} relative links.`,
);
for (const failure of failures) console.error(failure);
if (failures.length > 0) {
  console.error(`${failures.length} references do not resolve inside the repository.`);
  process.exit(1);
}
