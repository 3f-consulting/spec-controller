# Gradle's own JUnit reports

The reports here are ones Gradle's JUnit XML writer wrote, lifted out of Gradle's own test of that writer. The JUnit reader's tests read each as a well-formed JUnit report.

| | |
|---|---|
| Tool | Gradle |
| Version | 9.10.0, the version in [`version.txt`](https://github.com/gradle/gradle/blob/8266407daf48f09f4b2d103929b2debfc3b8cbad/version.txt) at the commit |
| Repository | [gradle/gradle](https://github.com/gradle/gradle) |
| Commit | [`8266407daf48f09f4b2d103929b2debfc3b8cbad`](https://github.com/gradle/gradle/tree/8266407daf48f09f4b2d103929b2debfc3b8cbad) |
| Licence | Apache-2.0, its text in [LICENSE](LICENSE), copied from the same commit. The repository has no `NOTICE` file at the commit. |

## What was copied

Each report is lifted out of [`JUnitXmlResultWriterSpec.groovy`](https://github.com/gradle/gradle/blob/8266407daf48f09f4b2d103929b2debfc3b8cbad/platforms/software/testing-base/src/test/groovy/org/gradle/api/internal/tasks/testing/junit/result/JUnitXmlResultWriterSpec.groovy) at the commit. Each test named below runs Gradle's `JUnitXmlResultWriter` and requires what it writes to equal a whole report, written in the test as a Groovy string. Every such report in the file is copied, thirteen in all.

| File here | Lifted out of the test |
|---|---|
| [can-generate-with-output-per-test.xml](can-generate-with-output-per-test.xml) | `can generate with output per test` |
| [class-display-name-com-foo-footest.xml](class-display-name-com-foo-footest.xml) | `writes #writtenName as class display name when #displayName is specified`, its row `FooTest` |
| [class-display-name-custom-display-name.xml](class-display-name-custom-display-name.xml) | `writes #writtenName as class display name when #displayName is specified`, its row `custom display name` |
| [omit-system-err-and-system-out-sections.xml](omit-system-err-and-system-out-sections.xml) | `omit system-err and system-out sections` |
| [omit-system-err-section.xml](omit-system-err-section.xml) | `omit system-err section` |
| [omit-system-out-section.xml](omit-system-out-section.xml) | `omit system-out section` |
| [show-system-err-and-system-out-sections.xml](show-system-err-and-system-out-sections.xml) | `show system-err and system-out sections` |
| [writes-file-attachments-into-xml-when-sysout-is-disabled.xml](writes-file-attachments-into-xml-when-sysout-is-disabled.xml) | `writes file attachments into XML when sysout is disabled` |
| [writes-file-attachments-into-xml.xml](writes-file-attachments-into-xml.xml) | `writes file attachments into XML` |
| [writes-properties-into-xml.xml](writes-properties-into-xml.xml) | `writes properties into XML` |
| [writes-results-with-empty-outputs.xml](writes-results-with-empty-outputs.xml) | `writes results with empty outputs` |
| [writes-results-with-no-tests.xml](writes-results-with-no-tests.xml) | `writes results with no tests` |
| [writes-xml-junit-result.xml](writes-xml-junit-result.xml) | `writes xml JUnit result` |

Two tests in the file hold no whole report, so nothing is copied from them: `encodes xml` checks that what the writer wrote contains three fragments, and `can generate report with failed tests with no exception` reads the report without stating it.

## How each report was lifted out

Each report is the text of a triple-quoted Groovy string, from its opening `<?xml` to the line break before its closing quotes. None of the strings holds a backslash, so the text is copied byte for byte. One string holds `$writtenName`, which Groovy fills from the test's `where:` table: that test has two rows, and each row's report is copied with `$writtenName` replaced by the row's value, `com.foo.FooTest` or `custom display name`.
