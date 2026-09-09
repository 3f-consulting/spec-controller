/**
 * The published-page path check (@SCN-FIT-016, 3F-3191) — run via `pnpm doc:paths` as the
 * command of a `specController.fitnessChecks` row, on the `doc-accuracy` characteristic beside
 * `doc:compatibility-examples`.
 *
 * It reads every page a consumer is sent to and refuses an absolute path under somebody's home
 * directory. `doc/how_to_use.md` shipped eight of them — two `cd`s into one person's projects
 * folder and six flags pointing into the same tree — so the first worked example a new reader met
 * was a transcript of one session on one machine rather than an invocation they could run. That is
 * the same class as 3F-3154: a public page whose content is true of OUR tree rather than true of
 * the product.
 *
 * ═══ THE SCOPE IS DERIVED, NEVER ENUMERATED ═══
 *
 * `doc/` is walked for `.md` and `README.md` is added, rather than the five page names being typed
 * out. A written-down list is a scope that narrows the day a sixth page is added, and it narrows
 * SILENTLY — the check stays green over the pages it still knows about and says nothing about the
 * one it has never read. `repositorySourceRoots()` met exactly that with the check tree in 3F-3118.
 * The walk is recursive for the same reason: `doc/` is flat today, and a page filed one directory
 * down tomorrow would otherwise be published unread.
 *
 * `CONTRIBUTING.md` is deliberately outside it. This rule is about what a CONSUMER is handed, and a
 * contributor is somebody who has already checked the repository out; widening to every markdown
 * file in the root would also reach files that are not published at all.
 *
 * ═══ A TILDE IS THE ANSWER, NOT THE FAULT ═══
 *
 * `~/spec-controller-runs/my-project/2026-07-09-ci/` is on the page and must stay green: it names a
 * location in the reader's own home rather than in the author's, which is precisely the repair. So
 * the rule discriminates a PERSONAL path from a portable one instead of refusing a character — and
 * the preceding-character test below is what makes that distinction hold, since `~/Users/x` and
 * `./Users/x` are relative and correct while a bare `/Users/x` is not.
 *
 * A placeholder is green for the same reason: `/Users/<name>/` names nobody, and a page explaining
 * this rule has to be able to write it down.
 *
 * ═══ AN EMPTY POPULATION IS A FAULT, NOT A PASS ═══
 *
 * A derived scope can come back empty — a moved directory, a walk that threw — and reporting that
 * as "no violations" is the vacuous green this repository is named for. The floor below sits well
 * under the real count so that ordinary deletion does not red it, and the pass line says how many
 * pages were read so the green states its own reach rather than asserting it.
 *
 * ═══ TWO EXIT CODES, AND THERE IS NO THIRD ═══
 *
 * `0` clean, `1` violations. These pages are in the tree on every run, so their absence is a fault
 * rather than the ordinary state, and it exits `1` like any other. A command whose subject IS
 * sometimes legitimately absent absorbs that in its own CI `run:` line rather than on its row —
 * the ledger reads a status with no exit code in it, so it can learn nothing about endings
 * (3F-3252).
 *
 * ═══ THE HANDLE CARRIES NO OBSERVED PREFIX, AND THAT IS THE RULE RATHER THAN A PREFERENCE ═══
 *
 * `runningStaticChecks` treats a script as a running static check when its name carries an observed
 * prefix (`lint:` / `guard:`) AND a CI `run:` step invokes it. A check BORN CONVERTED has no history
 * to preserve, so it takes a name discovery never looks at — `doc:compatibility-examples` next door
 * states that outright (3F-3113), and this row is the same shape.
 *
 * IT WAS MINTED `lint:doc-paths` AND RENAMED BEFORE MERGE (3F-3181). Under the old name the prefix
 * discovered nothing, because at the time the fitness pass ran this row and it had no CI step of
 * its own — so the fault was INERT, and an inert fault is the kind that ships. It has a step now,
 * and under the old name that step would have registered a check nobody cited and redded
 * `balance:self` for a reason that had nothing to do with whoever added it.
 *
 * NO UNIT TESTS, DELIBERATELY (operator ruling, 2026-09-06). This module asserts a property of the
 * repository and reports pass/fail, so it IS a test; it carries the generated characteristic claim
 * and nothing else. Its teeth were proven the only way that costs nothing: written first, it red on
 * the eight violations sitting in the tree, and greened when they were repaired.
 *
 * Parent: 3F-3181.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** The documentation directory walked for pages, relative to the tree being checked. */
const DOC_DIR = "doc";

/** The published page that does not live under `doc/`. */
const ROOT_PAGE = "README.md";

/**
 * How few pages the walk may find before a clean verdict stops counting as a reading at all.
 *
 * Five are published today. The floor sits three below that rather than one, for the reason the
 * source-walk floors do: a broken walk yields zero, so catching it needs no tight margin, while a
 * tight margin reds on ordinary deletion and blames the path rule for it.
 */
const MIN_PAGES_READ = 2;

/**
 * An absolute path under a user home, and the segment naming the user.
 *
 * THE PRECEDING CHARACTER IS WHAT MAKES THIS A PATH RATHER THAN A SUBSTRING. `/Users` reached after
 * a word character, a slash, a dot or a tilde is the tail of something else — `https://host/home/x`
 * is a URL, `~/Users/x` and `./Users/x` are relative and both correct — so the rule fires only where
 * the slash actually starts the token.
 *
 * THE USER SEGMENT MUST BE NON-EMPTY AND MUST NOT LOOK LIKE A PLACEHOLDER. `/Users/` alone names
 * nobody, and `<name>` is how a page writes down the shape of the fault it is warning about; both
 * stay green, so this rule can be documented on the very pages it holds.
 *
 * THE WHOLE PATH IS MATCHED, NOT JUST ITS HEAD, because the report is read by somebody about to
 * repair the page. Eight findings all reading `.` name the fault without naming any of
 * the eight places it has to be replaced, which is a report that sends its reader back to grep.
 */
const HOME_PATH = /(?<![\w/.~-])\/(?:Users|home)\/[^/\s"'`)\]<>]+[^\s"'`)\]<>]*/g;

/** One page's repository-relative path, paired with its text. */
interface Page {
  readonly page: string;
  readonly source: string;
}

/** One refusal: where it is, and the path that earned it. */
interface Finding {
  readonly page: string;
  readonly line: number;
  readonly absolutePath: string;
}

/** Every `.md` file under `dir`, at any depth, repository-relative and in a stable order. */
function markdownUnder(root: string, dir: string): string[] {
  const entries = readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return entries.flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownUnder(root, relative);
    return entry.name.endsWith(".md") ? [relative] : [];
  });
}

/** The pages a consumer is sent to, derived from the tree rather than listed. */
function publishedPages(root: string): Page[] {
  return [...markdownUnder(root, DOC_DIR), ROOT_PAGE].map((page) => ({
    page,
    source: readFileSync(path.join(root, page), "utf8"),
  }));
}

/** Every absolute home-directory path on a page, with the line it sits on. */
function findingsOn({ page, source }: Page): Finding[] {
  return source.split("\n").flatMap((text, index) =>
    [...text.matchAll(HOME_PATH)].map((match) => ({
      page,
      line: index + 1,
      absolutePath: match[0],
    }))
  );
}

function main(): void {
  const root = process.cwd();

  let pages: Page[];
  try {
    pages = publishedPages(root);
  } catch (error) {
    // A PAGE THAT COULD NOT BE READ IS A VIOLATION, never a quiet zero. A run that examined nothing
    // and said so as a pass is the silence this repository exists to refuse.
    console.error(`doc paths: the published pages could not be read — ${String(error)}`);
    process.exitCode = 1;
    return;
  }

  if (pages.length < MIN_PAGES_READ) {
    console.error(
      `doc paths: only ${pages.length} published page(s) found, below the floor of ${MIN_PAGES_READ} — the scope has narrowed, so a clean verdict would mean nothing`
    );
    process.exitCode = 1;
    return;
  }

  const findings = pages.flatMap(findingsOn);
  if (findings.length === 0) {
    console.log(
      `doc paths: ${pages.length} published pages carry no absolute path into a home directory`
    );
    return;
  }

  console.error(
    `doc paths: ${findings.length} absolute home-directory path(s) across ${pages.length} published page(s) — a reader who is not their author cannot run these:`
  );
  for (const finding of findings) {
    console.error(`  ${finding.page}:${finding.line} — ${finding.absolutePath}`);
  }
  process.exitCode = 1;
}

main();
