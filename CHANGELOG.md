# Changelog

Each line says what a change means for someone using spec-controller.

- This changelog starts: from now on, every change to spec-controller is told here in a line, except a dependency update.
- Each release's notes on GitHub are now the lines this changelog gained since the release before.
- balance posts a fitness function's CI step as passed only when the step record says it passed: a step the record does not name is posted as not recorded and credits no claim, and continue-on-error set to anything but false, an expression included, allows failure.
- balance posts a step-record entry that no workflow has with the result its record gives: a failure as failed, a skipped step as never ran, and a success as passed-on-error, since without the workflow it cannot read whether failure was allowed. A report now gives such a step its result alone, and the JSON report's Evidence Observations have no `notes` field.
