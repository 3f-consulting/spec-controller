#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: dist-tag-is.sh <package> <dist-tag> <version>" >&2
  echo "       waits up to DIST_TAG_WAIT_S seconds for the package's dist-tag to be the version" >&2
  exit 2
}

[ $# -eq 3 ] || usage
package=$1
tag=$2
version=$3
wait_s="${DIST_TAG_WAIT_S:?}"
interval_s="${DIST_TAG_POLL_S:-30}"

# The registry can take many minutes to serve a publish it has acknowledged, so a first mismatch is not yet a failure.
deadline=$((SECONDS + wait_s))
while :; do
  served=$(npm view "$package" "dist-tags.$tag" 2> /dev/null || true)
  if [ "$served" = "$version" ]; then
    echo "$package: $tag is $version"
    exit 0
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "$package: $tag is ${served:-unreadable}, not $version, after ${wait_s}s" >&2
    exit 1
  fi
  sleep "$interval_s"
done
