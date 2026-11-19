# gotestsum's own JUnit reports

The reports here are ones gotestsum's JUnit XML writer wrote, copied from gotestsum's own repository. The JUnit reader's tests read each as a well-formed JUnit report.

| | |
|---|---|
| Tool | gotestsum |
| Version | the default branch at the commit, whose newest release tag is `v1.13.0` |
| Repository | [gotestyourself/gotestsum](https://github.com/gotestyourself/gotestsum) |
| Commit | [`3cf14356a16c7931cfeacd7dfee585527618df3d`](https://github.com/gotestyourself/gotestsum/tree/3cf14356a16c7931cfeacd7dfee585527618df3d) |
| Licence | Apache-2.0, its text in [LICENSE](LICENSE) and its notice in [NOTICE](NOTICE), both copied from the same commit |

## What was copied

Each file is copied byte for byte from [`internal/junitxml/testdata/`](https://github.com/gotestyourself/gotestsum/tree/3cf14356a16c7931cfeacd7dfee585527618df3d/internal/junitxml/testdata) at the commit: every `.golden` file there, four in all, each saved here with the extension `.xml`. Each is the file gotestsum's test of its writer, [`report_test.go`](https://github.com/gotestyourself/gotestsum/blob/3cf14356a16c7931cfeacd7dfee585527618df3d/internal/junitxml/report_test.go), requires the writer's output to equal.

| File here | Copied from |
|---|---|
| [junitxml-report-hide-skipped-tests.xml](junitxml-report-hide-skipped-tests.xml) | [`junitxml-report-hide-skipped-tests.golden`](https://github.com/gotestyourself/gotestsum/blob/3cf14356a16c7931cfeacd7dfee585527618df3d/internal/junitxml/testdata/junitxml-report-hide-skipped-tests.golden) |
| [junitxml-report-skip-empty.xml](junitxml-report-skip-empty.xml) | [`junitxml-report-skip-empty.golden`](https://github.com/gotestyourself/gotestsum/blob/3cf14356a16c7931cfeacd7dfee585527618df3d/internal/junitxml/testdata/junitxml-report-skip-empty.golden) |
| [junitxml-report-tc-with-attributes.xml](junitxml-report-tc-with-attributes.xml) | [`junitxml-report-tc-with-attributes.golden`](https://github.com/gotestyourself/gotestsum/blob/3cf14356a16c7931cfeacd7dfee585527618df3d/internal/junitxml/testdata/junitxml-report-tc-with-attributes.golden) |
| [junitxml-report.xml](junitxml-report.xml) | [`junitxml-report.golden`](https://github.com/gotestyourself/gotestsum/blob/3cf14356a16c7931cfeacd7dfee585527618df3d/internal/junitxml/testdata/junitxml-report.golden) |

`junitxml-report.xml`, `junitxml-report-skip-empty.xml` and `junitxml-report-hide-skipped-tests.xml` each hold a test case with no class name, which gotestsum writes for a package whose test binary exited before any test ran.
