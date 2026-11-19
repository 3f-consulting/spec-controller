#!/usr/bin/env bash
set -euo pipefail

# Run from the repository's root. Reads VERSION, PREVIOUS and PREFIX (the counter's), HEAD_SHA, GITHUB_REPOSITORY, and
# GH_TOKEN when PREVIOUS is set; writes dist-tag, and on a release title and notes, to GITHUB_OUTPUT, scratch to RUNNER_TEMP.

# A prerelease publishes under its own identifier, and only a stable version releases.
case "$VERSION" in *-*) t="${VERSION#*-}"; echo "dist-tag=${t%%.*}" >> "$GITHUB_OUTPUT"; exit 0 ;; esac
# The commit the newest publish at or below the previous version was built from: its own ref, or else an older one.
since=""
if [ -n "$PREVIOUS" ]; then
  since="$(
    {
      gh api "repos/$GITHUB_REPOSITORY/git/matching-refs/published/" --jq '.[] | "\(.ref | ltrimstr("refs/published/")) \(.object.sha)"' &&
      gh api "repos/$GITHUB_REPOSITORY/git/matching-refs/tags/v" --jq '.[] | "\(.ref | ltrimstr("refs/tags/v")) \(.object.sha)"'
    } | awk -v p="$PREFIX" -v top="${PREVIOUS##*.}" 'index($1, p) == 1 { n = substr($1, length(p) + 1); if (n ~ /^[0-9]+$/ && n + 0 <= top + 0 && (sha == "" || n + 0 > best)) { best = n + 0; sha = $2 } } END { print sha }'
  )"
fi
since="${since:-$HEAD_SHA^}"
# A heading is a line of #s and a space, its edges trimmed; edits to a heading already there add none.
headings() { awk '{ sub(/^[[:space:]]+/, ""); sub(/[[:space:]]+$/, "") } /^#+[[:space:]]/'; }
git show "$since:CHANGELOG.md" | headings > "$RUNNER_TEMP/before.txt"
headings < CHANGELOG.md > "$RUNNER_TEMP/after.txt"
gained=$(( $(wc -l < "$RUNNER_TEMP/after.txt") - $(wc -l < "$RUNNER_TEMP/before.txt") ))
if [ "$gained" -le 0 ]; then
  echo "no version heading since $since: publishing $VERSION under next"
  echo "dist-tag=next" >> "$GITHUB_OUTPUT"
  exit 0
fi
awk 'NR == FNR { seen[$0] = 1; next } !($0 in seen)' "$RUNNER_TEMP/before.txt" "$RUNNER_TEMP/after.txt" > "$RUNNER_TEMP/new.txt"
if [ "$gained" -gt 1 ] || [ "$(wc -l < "$RUNNER_TEMP/new.txt")" -ne 1 ]; then
  printf 'the changelog gained %s heading(s) since %s, and one merge releases once:\n%s\npublishing, tagging and releasing nothing\n' "$gained" "$since" "$(cat "$RUNNER_TEMP/new.txt")" >&2
  exit 1
fi
heading="$(cat "$RUNNER_TEMP/new.txt")"
named="$(printf '%s' "$heading" | sed -nE 's/^## ([0-9]+\.[0-9]+\.[0-9]+) — [0-9]{4}-[0-9]{2}-[0-9]{2} — .+$/\1/p')"
if [ -z "$named" ]; then
  printf 'the changelog gained "%s", which is not a version heading "## <version> — <yyyy-mm-dd> — <title>": publishing, tagging and releasing nothing\n' "$heading" >&2
  exit 1
fi
if [ "$named" != "$VERSION" ]; then
  echo "the version heading names $named, but this merge publishes $VERSION: publishing, tagging and releasing nothing" >&2
  exit 1
fi
# The heading's section: its lines, up to the next heading or the file's end.
HEADING="$heading" awk '{ line = $0; sub(/^[[:space:]]+/, "", line); sub(/[[:space:]]+$/, "", line) } found && line ~ /^#+[[:space:]]/ { exit } found { print } line == ENVIRON["HEADING"] { found = 1 }' CHANGELOG.md \
  | awk 'NF { started = 1 } started' > "$RUNNER_TEMP/notes.md"
if ! grep -q '[^[:space:]]' "$RUNNER_TEMP/notes.md"; then
  echo "the version heading for $VERSION stands over no line: publishing, tagging and releasing nothing" >&2
  exit 1
fi
echo "the version heading names $VERSION: publishing it under latest and releasing it, with these notes:"
cat "$RUNNER_TEMP/notes.md"
{
  echo "dist-tag=latest"
  echo "title=${heading#\#\# }"
  delimiter="notes_$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
  echo "notes<<$delimiter"
  cat "$RUNNER_TEMP/notes.md"
  echo "$delimiter"
} >> "$GITHUB_OUTPUT"
