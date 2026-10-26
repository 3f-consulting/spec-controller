#!/usr/bin/env bash
set -uo pipefail

usage() {
  echo "usage: release-changed.sh <built packages dir> <version>" >&2
  echo "       exits 0 when either package's built dist differs from its dist at <version>," >&2
  echo "       1 when neither differs, warning for each that could not be read, and 2 when its own input is missing" >&2
  exit 2
}

fail() {
  echo "$1" >&2
  exit 2
}

[ $# -eq 2 ] || usage
built=$1
version=$2
# An unset setting exits 2, never 1, which the release would read as "publish nothing".
[ -n "${RELEASE_COMPARE_TRIES:-}" ] || fail "RELEASE_COMPARE_TRIES is not set"
[ -n "${RELEASE_COMPARE_WAIT_S:-}" ] || fail "RELEASE_COMPARE_WAIT_S is not set"
tries=$RELEASE_COMPARE_TRIES
wait_s=$RELEASE_COMPARE_WAIT_S

packages=(core spec-controller)

name_of() {
  case $1 in
    core) echo "@3f-consulting/spec-controller-core" ;;
    *) echo "$1" ;;
  esac
}

for package in "${packages[@]}"; do
  [ -d "$built/$package/dist" ] || fail "no built dist at $built/$package/dist"
done
built=$(cd "$built" && pwd) || fail "cannot read $built"

dir=$(mktemp -d) || fail "cannot make a temporary directory"
trap 'rm -r "$dir"' EXIT

# npm's last lines are its log's path and proxy advice, so the reason is its error code and the first message after it.
reason_of() {
  awk '
    { sub(/^npm error ?/, "") }
    /^code / && code == "" { code = substr($0, 6); next }
    code != "" && $0 != "" && $0 !~ /^(syscall|errno) / { print code ": " $0; found = 1; exit }
    $0 != "" { last = $0 }
    END { if (!found) print (code != "" ? code : last) }
  ' "$1"
}

# A tarball that downloads but holds no dist counts as unread, so a truncated download is tried again.
fetch() {
  local package=$1 name=$2 into=$dir/$1
  [ ! -d "$into" ] || rm -r "$into"
  mkdir -p "$into"
  npm pack "$name@$version" --ignore-scripts --fetch-retries=0 --fetch-timeout=30000 \
    --pack-destination "$into" > /dev/null 2> "$dir/$package.err" || return 1
  local tarballs=("$into"/*.tgz)
  tar -xzf "${tarballs[0]}" -C "$into" package/dist 2>> "$dir/$package.err"
}

changed=1
unread=()
for package in "${packages[@]}"; do
  name=$(name_of "$package")
  try=1
  until fetch "$package" "$name"; do
    if [ "$try" -ge "$tries" ]; then
      reason=$(reason_of "$dir/$package.err")
      echo "$name: could not download $name@$version in $tries tries: $reason"
      unread+=("::warning::could not compare $name@$version: $reason; nothing publishes from this push")
      continue 2
    fi
    echo "$name: try $try of $tries could not download $name@$version"
    try=$((try + 1))
    sleep "$wait_s"
  done

  said=$(cd "$dir/$package/package" && diff -r -q dist "$built/$package/dist" 2>&1)
  case $? in
    0) echo "$name: the built dist is identical to $name@$version's" ;;
    1)
      echo "$name: the built dist differs from $name@$version's:"
      head -n 5 <<< "$said"
      changed=0
      ;;
    *) fail "cannot compare with $name@$version's dist: $said" ;;
  esac
done

if [ "$changed" -eq 1 ]; then
  for line in "${unread[@]+"${unread[@]}"}"; do echo "$line"; done
fi
exit "$changed"
