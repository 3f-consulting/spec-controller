# go-junit-report's own JUnit reports

The reports here are ones go-junit-report wrote, copied from go-junit-report's own repository. The JUnit reader's tests read each as a well-formed JUnit report.

| | |
|---|---|
| Tool | go-junit-report |
| Version | the default branch at the commit, whose newest release tag is `v2.1.0` |
| Repository | [jstemmer/go-junit-report](https://github.com/jstemmer/go-junit-report) |
| Commit | [`19aa27c9da9b7afb843c86ff3999af98d2c7b1f1`](https://github.com/jstemmer/go-junit-report/tree/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1) |
| Licence | MIT, its text in [LICENSE](LICENSE), copied from the same commit |

## What was copied

Each file is copied byte for byte from [`testdata/`](https://github.com/jstemmer/go-junit-report/tree/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata) at the commit: every `NNN-report.xml` there, 48 in all. Each is the report go-junit-report writes for the `go test` output in the file of the same number beside it: [`generate-golden-reports.go`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/generate-golden-reports.go) writes it by running go-junit-report over that output.

| File here | Copied from |
|---|---|
| [001-report.xml](001-report.xml) | [`testdata/001-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/001-report.xml) |
| [005-report.xml](005-report.xml) | [`testdata/005-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/005-report.xml) |
| [007-report.xml](007-report.xml) | [`testdata/007-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/007-report.xml) |
| [008-report.xml](008-report.xml) | [`testdata/008-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/008-report.xml) |
| [009-report.xml](009-report.xml) | [`testdata/009-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/009-report.xml) |
| [010-report.xml](010-report.xml) | [`testdata/010-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/010-report.xml) |
| [011-report.xml](011-report.xml) | [`testdata/011-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/011-report.xml) |
| [012-report.xml](012-report.xml) | [`testdata/012-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/012-report.xml) |
| [013-report.xml](013-report.xml) | [`testdata/013-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/013-report.xml) |
| [014-report.xml](014-report.xml) | [`testdata/014-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/014-report.xml) |
| [015-report.xml](015-report.xml) | [`testdata/015-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/015-report.xml) |
| [016-report.xml](016-report.xml) | [`testdata/016-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/016-report.xml) |
| [017-report.xml](017-report.xml) | [`testdata/017-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/017-report.xml) |
| [018-report.xml](018-report.xml) | [`testdata/018-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/018-report.xml) |
| [019-report.xml](019-report.xml) | [`testdata/019-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/019-report.xml) |
| [021-report.xml](021-report.xml) | [`testdata/021-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/021-report.xml) |
| [022-report.xml](022-report.xml) | [`testdata/022-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/022-report.xml) |
| [023-report.xml](023-report.xml) | [`testdata/023-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/023-report.xml) |
| [024-report.xml](024-report.xml) | [`testdata/024-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/024-report.xml) |
| [025-report.xml](025-report.xml) | [`testdata/025-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/025-report.xml) |
| [026-report.xml](026-report.xml) | [`testdata/026-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/026-report.xml) |
| [027-report.xml](027-report.xml) | [`testdata/027-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/027-report.xml) |
| [028-report.xml](028-report.xml) | [`testdata/028-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/028-report.xml) |
| [029-report.xml](029-report.xml) | [`testdata/029-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/029-report.xml) |
| [030-report.xml](030-report.xml) | [`testdata/030-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/030-report.xml) |
| [031-report.xml](031-report.xml) | [`testdata/031-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/031-report.xml) |
| [032-report.xml](032-report.xml) | [`testdata/032-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/032-report.xml) |
| [033-report.xml](033-report.xml) | [`testdata/033-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/033-report.xml) |
| [034-report.xml](034-report.xml) | [`testdata/034-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/034-report.xml) |
| [035-report.xml](035-report.xml) | [`testdata/035-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/035-report.xml) |
| [036-report.xml](036-report.xml) | [`testdata/036-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/036-report.xml) |
| [037-report.xml](037-report.xml) | [`testdata/037-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/037-report.xml) |
| [038-report.xml](038-report.xml) | [`testdata/038-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/038-report.xml) |
| [039-report.xml](039-report.xml) | [`testdata/039-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/039-report.xml) |
| [100-report.xml](100-report.xml) | [`testdata/100-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/100-report.xml) |
| [101-report.xml](101-report.xml) | [`testdata/101-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/101-report.xml) |
| [102-report.xml](102-report.xml) | [`testdata/102-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/102-report.xml) |
| [103-report.xml](103-report.xml) | [`testdata/103-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/103-report.xml) |
| [104-report.xml](104-report.xml) | [`testdata/104-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/104-report.xml) |
| [105-report.xml](105-report.xml) | [`testdata/105-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/105-report.xml) |
| [106-report.xml](106-report.xml) | [`testdata/106-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/106-report.xml) |
| [107-report.xml](107-report.xml) | [`testdata/107-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/107-report.xml) |
| [108-report.xml](108-report.xml) | [`testdata/108-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/108-report.xml) |
| [109-report.xml](109-report.xml) | [`testdata/109-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/109-report.xml) |
| [110-report.xml](110-report.xml) | [`testdata/110-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/110-report.xml) |
| [111-report.xml](111-report.xml) | [`testdata/111-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/111-report.xml) |
| [112-report.xml](112-report.xml) | [`testdata/112-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/112-report.xml) |
| [113-report.xml](113-report.xml) | [`testdata/113-report.xml`](https://github.com/jstemmer/go-junit-report/blob/19aa27c9da9b7afb843c86ff3999af98d2c7b1f1/testdata/113-report.xml) |
