# Changelog

Each line says what a change means for someone using spec-controller.

- This changelog starts: from now on, every change to spec-controller is told here in a line, except a dependency update.
- Each release's notes on GitHub are now the lines this changelog gained since the release before.
- balance posts a fitness function's CI step as passed only when the step record says it passed: a step the record does not name is posted as not recorded and credits no claim, and continue-on-error set to anything but false, an expression included, allows failure.
- balance posts a step-record entry that no workflow has with the result its record gives: a failure as failed, a skipped step as never ran, and a success as passed-on-error, since without the workflow it cannot read whether failure was allowed. A report now gives such a step its result alone, and the JSON report's Evidence Observations have no `notes` field.
- What balance does is unchanged: the specification's scenario on continue-on-error is now worded for a step in a workflow balance read, the only steps whose setting balance can read.
- Each published package names its source repository, 3f-consulting/spec-controller, on npm; the link opens once the repository is public.
- No change to the packages: the first release from spec-controller's new repository.
- spec-controller's repository is public, with every commit of its history, and from this release on each release carries its provenance on npm.
- What balance does is unchanged: two specification files read more plainly, one describing reconciliation in fewer words and one with its Rules in the order the report shows them.
- @3f-consulting/spec-controller-core exports `CreditJournal`, the Evidence Observations read from a run's reports that `claimReconciliationsOf` posts; nothing balance does changes.
- The JSON report names the version of its schema in `schemaVersion`, and the version rises whenever the report's structure changes; @3f-consulting/spec-controller-core exports the report's type, `JsonReport`, and `jsonReportFrom`, which builds it from a reconciliation.
- Every TypeScript example in the READMEs is written whole, with its imports and declarations, and CI type-checks each one against the package's own exports.
