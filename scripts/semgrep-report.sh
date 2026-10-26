#!/usr/bin/env bash
# One scan runs every rule in .semgrep/ into semgrep's JSON report, which scripts/semgrep-findings.jq reads per rule.
# An invalid rule file stops that scan for every rule, so then each file is scanned on its own, keyed by its name,
# which is its rule's id. Findings never fail this step; a scan that errors does.
set -u
out="${1:?usage: bash scripts/semgrep-report.sh <report.json>}"
flags=(--json --metrics=off --disable-version-check)
rules=(.semgrep/*.yml)

configs=()
for rule in "${rules[@]}"; do configs+=(--config "$rule"); done
semgrep scan "${configs[@]}" "${flags[@]}" --output "$out" packages && exit 0

echo "the scan of every rule errored; scanning each rule file on its own"
by_rule="${out%.json}-by-rule"
mkdir -p "$by_rule"
status=0
for rule in "${rules[@]}"; do
  scan="$by_rule/$(basename "$rule" .yml).json"
  semgrep scan --config "$rule" "${flags[@]}" --output "$scan" packages && continue
  code=$?
  status=1
  [ -s "$scan" ] || printf '{"errors":[{"level":"error","message":"semgrep exited %s and wrote no report","spans":[{"file":"%s"}]}]}' "$code" "$rule" >"$scan"
done
jq -n '{byRule: (reduce inputs as $scan ({}; . + {(input_filename | split("/") | last | rtrimstr(".json")): $scan}))}' "$by_rule"/*.json >"$out"
exit "$status"
