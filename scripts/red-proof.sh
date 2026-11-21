#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: red-proof.sh <unit | integration | e2e> <claim code, such as CLM-ABC-001>" >&2
  echo "       red-proof.sh judge <unit | integration | e2e> <the run's JSON report>" >&2
  exit 2
}

valid_layer() {
  case $1 in unit | integration | e2e) ;; *) usage ;; esac
}

# A test reported a result when it passed or failed. One that was skipped, or never collected, did not, so a run in which none did is not a red, whatever its exit.
# A report that cannot be read is a run that ended before writing one.
judge() {
  local layer=$1 report=$2 reported failed red passed
  if [ "$layer" = unit ]; then
    reported=$(jq '[.testResults[].assertionResults[] | select(.status == "passed" or .status == "failed")] | length' "$report" 2> /dev/null) || reported=0
    failed=$(jq '[.testResults[].assertionResults[] | select(.status == "failed")] | length' "$report" 2> /dev/null) || failed=0
    red=$(jq '.success | not' "$report" 2> /dev/null) || red=true
    passed='.testResults[].assertionResults[] | select(.status == "passed") | .fullName'
  else
    reported=$(jq '[.[].elements[] | select(any(.steps[] | select(.hidden != true); .result.status == "passed" or .result.status == "failed"))] | length' "$report" 2> /dev/null) || reported=0
    failed=$(jq '[.[].elements[] | select(any(.steps[]; .result.status != "passed"))] | length' "$report" 2> /dev/null) || failed=0
    if [ "$failed" -gt 0 ]; then red=true; else red=false; fi
    passed='.[].elements[] | select(all(.steps[]; .result.status == "passed") and any(.steps[] | select(.hidden != true); .result.status == "passed")) | .name'
  fi
  [ "$reported" -gt 0 ] || { echo "not a red: no selected test reported a result" >&2; return 4; }
  if [ "$red" = true ]; then
    echo "red: $failed of $reported selected failed"
    # Each test the red commit adds or changes should be among the failures, so a selected test that passed is one to explain.
    jq -r "$passed | \"passed: \" + ." "$report" 2> /dev/null || true
    return 1
  fi
  echo "green: $reported selected passed"
}

if [ "${1:-}" = judge ]; then
  [ "$#" -eq 3 ] || usage
  valid_layer "$2"
  verdict=0
  judge "$2" "$3" || verdict=$?
  exit "$verdict"
fi

[ "$#" -eq 2 ] || usage
layer=$1
code=$2
valid_layer "$layer"
[[ $code =~ ^CLM-[A-Z0-9]{2,5}-[0-9]+$ ]] || usage

refuse_empty() {
  [ "$1" -gt 0 ] || { echo "no test selected: $code at $layer" >&2; exit 3; }
}

# The ci job's env: in ci.yml is each suite limit's one home, and red-proof.yml cannot see it, so the script reads the file.
suite_limit() {
  local ci
  ci="$(git rev-parse --show-toplevel)/.github/workflows/ci.yml"
  node --input-type=module -e "import {readFileSync} from 'node:fs'; import {parse} from 'yaml'; const v = parse(readFileSync(process.argv[2], 'utf8')).jobs.ci.env[process.argv[1]]; if (v === undefined) process.exit(2); console.log(v)" "$1" "$ci"
}

out=${RED_PROOF_DIR:-$(mktemp -d)}
mkdir -p "$out"

# An it.each row writes its code in its table and gets the bracket only in its resolved title, so the files are found by the
# bare code and the filter picks the bracketed titles.
prove_unit() {
  local filter="\\[$code\\]" files=() file
  while IFS= read -r file; do
    files+=("$file")
  done < <(git grep -l -F "$code" -- ':(glob)packages/*/src/**/*.test.ts' || true)
  refuse_empty "${#files[@]}"

  limit="$(suite_limit UNIT_SUITE_TIMEOUT_S)"
  status=0
  timeout "$limit" pnpm test --reporter=default --reporter=json --outputFile.json="$out/vitest.json" --coverage.enabled --coverage.reportsDirectory="$out/coverage" -t "$filter" ${files[@]+"${files[@]}"} || status=$?
  report=$out/vitest.json
}

# Both layers run through Cucumber's one ci.yml step, under the default profile, so the profile's tag filter is ANDed with the code's.
prove_cucumber() {
  node_modules/.bin/cucumber-js --dry-run --tags "@$code" --format json:"$out/selection.json" > /dev/null
  selected=$(jq '[.[].elements[]] | length' "$out/selection.json")
  refuse_empty "$selected"

  limit="$(suite_limit CUCUMBER_SUITE_TIMEOUT_S)"
  status=0
  timeout "$limit" pnpm cucumber --format json:"$out/cucumber.json" --tags "@$code" || status=$?
  report=$out/cucumber.json
}

if [ "$layer" = unit ]; then prove_unit; else prove_cucumber; fi

verdict=0
said=$(judge "$layer" "$report") || verdict=$?
if [ "$verdict" -eq 0 ] && [ "$status" -ne 0 ]; then
  echo "red: the run exited $status with no selected test failing"
  exit "$status"
fi
[ -z "$said" ] || echo "$said"
exit "$verdict"
