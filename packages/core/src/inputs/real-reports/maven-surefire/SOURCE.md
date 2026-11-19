# Maven Surefire's own JUnit reports

The reports here are ones Maven Surefire wrote, copied from Maven Surefire's own repository. The JUnit reader's tests read each as a well-formed JUnit report.

| | |
|---|---|
| Tool | Maven Surefire |
| Version | 3.6.2-SNAPSHOT, the version in [`pom.xml`](https://github.com/apache/maven-surefire/blob/69227a2e093fa04c254463c43b14ca11af72f99a/pom.xml) at the commit |
| Repository | [apache/maven-surefire](https://github.com/apache/maven-surefire) |
| Commit | [`69227a2e093fa04c254463c43b14ca11af72f99a`](https://github.com/apache/maven-surefire/tree/69227a2e093fa04c254463c43b14ca11af72f99a) |
| Licence | Apache-2.0, its text in [LICENSE](LICENSE), copied from the same commit. The repository has no `NOTICE` file at the commit. |

## What was copied

Each file is copied byte for byte from [`surefire-report-parser/src/test/resources/fixture/testsuitexmlparser/`](https://github.com/apache/maven-surefire/tree/69227a2e093fa04c254463c43b14ca11af72f99a/surefire-report-parser/src/test/resources/fixture/testsuitexmlparser) at the commit: every `TEST-*.xml` there, seven in all. Surefire's own parser test, [`TestSuiteXmlParserTest.java`](https://github.com/apache/maven-surefire/blob/69227a2e093fa04c254463c43b14ca11af72f99a/surefire-report-parser/src/test/java/org/apache/maven/plugins/surefire/report/TestSuiteXmlParserTest.java), parses each of the seven and finds it valid.

| File here | Copied from |
|---|---|
| [TEST-org.acme.FlakyTest.xml](TEST-org.acme.FlakyTest.xml) | [`TEST-org.acme.FlakyTest.xml`](https://github.com/apache/maven-surefire/blob/69227a2e093fa04c254463c43b14ca11af72f99a/surefire-report-parser/src/test/resources/fixture/testsuitexmlparser/TEST-org.acme.FlakyTest.xml) |
| [TEST-org.apache.maven.surefire.test.FailingTest.xml](TEST-org.apache.maven.surefire.test.FailingTest.xml) | [`TEST-org.apache.maven.surefire.test.FailingTest.xml`](https://github.com/apache/maven-surefire/blob/69227a2e093fa04c254463c43b14ca11af72f99a/surefire-report-parser/src/test/resources/fixture/testsuitexmlparser/TEST-org.apache.maven.surefire.test.FailingTest.xml) |
| [TEST-surefire.MyTest-enclosed-trimStackTrace.xml](TEST-surefire.MyTest-enclosed-trimStackTrace.xml) | [`TEST-surefire.MyTest-enclosed-trimStackTrace.xml`](https://github.com/apache/maven-surefire/blob/69227a2e093fa04c254463c43b14ca11af72f99a/surefire-report-parser/src/test/resources/fixture/testsuitexmlparser/TEST-surefire.MyTest-enclosed-trimStackTrace.xml) |
| [TEST-surefire.MyTest-enclosed.xml](TEST-surefire.MyTest-enclosed.xml) | [`TEST-surefire.MyTest-enclosed.xml`](https://github.com/apache/maven-surefire/blob/69227a2e093fa04c254463c43b14ca11af72f99a/surefire-report-parser/src/test/resources/fixture/testsuitexmlparser/TEST-surefire.MyTest-enclosed.xml) |
| [TEST-surefire.MyTest-nestedClass-trimStackTrace.xml](TEST-surefire.MyTest-nestedClass-trimStackTrace.xml) | [`TEST-surefire.MyTest-nestedClass-trimStackTrace.xml`](https://github.com/apache/maven-surefire/blob/69227a2e093fa04c254463c43b14ca11af72f99a/surefire-report-parser/src/test/resources/fixture/testsuitexmlparser/TEST-surefire.MyTest-nestedClass-trimStackTrace.xml) |
| [TEST-surefire.MyTest-nestedClass.xml](TEST-surefire.MyTest-nestedClass.xml) | [`TEST-surefire.MyTest-nestedClass.xml`](https://github.com/apache/maven-surefire/blob/69227a2e093fa04c254463c43b14ca11af72f99a/surefire-report-parser/src/test/resources/fixture/testsuitexmlparser/TEST-surefire.MyTest-nestedClass.xml) |
| [TEST-surefire.MyTest.xml](TEST-surefire.MyTest.xml) | [`TEST-surefire.MyTest.xml`](https://github.com/apache/maven-surefire/blob/69227a2e093fa04c254463c43b14ca11af72f99a/surefire-report-parser/src/test/resources/fixture/testsuitexmlparser/TEST-surefire.MyTest.xml) |

The folder's `failsafe-summary.xml` and `failsafe-summary-old.xml` are not copied: they are Failsafe's summary of a run, not a JUnit report, and Surefire's parser test finds `failsafe-summary.xml` not valid.
