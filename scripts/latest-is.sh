#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: latest-is.sh <package> <version>" >&2
  echo "       waits up to LATEST_WAIT_S seconds for the package's latest dist-tag to be the version" >&2
  exit 2
}

[ $# -eq 2 ] || usage
package=$1
version=$2
wait_s="${LATEST_WAIT_S:?}"
interval_s="${LATEST_POLL_S:-30}"

# The registry can take many minutes to serve a publish it has acknowledged, so a first mismatch is not yet a failure.
deadline=$((SECONDS + wait_s))
while :; do
  latest=$(npm view "$package" dist-tags.latest 2> /dev/null || true)
  if [ "$latest" = "$version" ]; then
    echo "$package: latest is $version"
    exit 0
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "$package: latest is ${latest:-unreadable}, not $version, after ${wait_s}s" >&2
    exit 1
  fi
  sleep "$interval_s"
done
