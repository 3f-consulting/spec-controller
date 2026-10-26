# One check's findings in the report scripts/eslint-report.mjs writes; run with jq -e -r --arg check <name>.
# An error fails it, as eslint's own exit code does. With --rawfile warnIn <NUL-separated paths>,
# a warning in one of those files fails it too, as --max-warnings 0 over those files does.
# A check missing from the report, or one that did not run, fails it.

($ARGS.named.warnIn // "" | split("\u0000") | map(select(. != ""))) as $warnIn
| (.[$check] // error("the report has no entry for \($check)")) as $entry
| if $entry.fatal then error("\($check) did not run: \($entry.fatal)") else . end
| [ $entry.results[]
    | .filePath as $file
    | .messages[]
    | select(.severity == 2 or ($warnIn | index([$file])))
    | "\($file):\(.line):\(.column) \(if .severity == 2 then "error" else "warning" end) \(.message) \(.ruleId // "")"
  ] as $found
| if $found == [] then "\($check): no findings"
  else ($found | join("\n")) + "\n\($check): \($found | length) finding(s)\n" | halt_error(1)
  end
