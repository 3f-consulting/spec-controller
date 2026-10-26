# One rule's findings in the report `semgrep scan --json` writes; run with jq -e -r --arg rule <rule id>.
# A finding fails it, as --error does. A report with no results, or an error semgrep could not
# tie to another rule, fails it too. A report scripts/semgrep-report.sh wrote one scan per rule file
# is read at this rule's own scan, and a rule with no scan of its own fails.

def ours: (. // "" | split(".") | last) == $rule;

(if has("byRule") then (.byRule[$rule] // error("the report has no scan of \($rule)")) else . end)
| ([.errors[]? | select(.level == "error" and ((.rule_id == null) or (.rule_id | ours)))]) as $fatal
| if $fatal != [] then error("the scan did not check \($rule): \($fatal | map((.long_msg // .message // .type) + ([.spans[]?.file] | unique | map(" in \(.)") | join(""))) | join("; "))") else . end
| (.results // error("the report has no results")) as $results
| [ $results[] | select(.check_id | ours) | "\(.path):\(.start.line):\(.start.col) \(.extra.message | gsub("\\s+"; " "))" ] as $found
| if $found == [] then "\($rule): no findings"
  else ($found | join("\n")) + "\n\($rule): \($found | length) finding(s)\n" | halt_error(1)
  end
