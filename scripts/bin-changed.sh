#!/usr/bin/env bash
set -uo pipefail

usage() {
  echo "usage: bin-changed.sh <built cli.js> <version>" >&2
  echo "       exits 0 when the built bin differs from spec-controller@<version>'s dist/cli.js," >&2
  echo "       1 when they are identical, and 2 when either cannot be read" >&2
  exit 2
}

fail() {
  echo "$1" >&2
  exit 2
}

[ $# -eq 2 ] || usage
built=$1
version=$2
[ -f "$built" ] || fail "no built bin at $built"

dir=$(mktemp -d) || fail "cannot make a temporary directory"
trap 'rm -r "$dir"' EXIT

npm pack "spec-controller@$version" --ignore-scripts --pack-destination "$dir" > /dev/null 2> "$dir/npm.err" \
  || fail "cannot download spec-controller@$version: $(tail -n 3 "$dir/npm.err")"
tar -xzf "$dir"/spec-controller-*.tgz -C "$dir" package/dist/cli.js 2> /dev/null \
  || fail "spec-controller@$version has no dist/cli.js"

said=$(cmp "$dir/package/dist/cli.js" "$built" 2>&1)
case $? in
  0)
    echo "the built bin is identical to spec-controller@$version's dist/cli.js"
    exit 1
    ;;
  1)
    echo "the built bin differs from spec-controller@$version's dist/cli.js: $said"
    exit 0
    ;;
  *) fail "cannot compare with spec-controller@$version's dist/cli.js: $said" ;;
esac
