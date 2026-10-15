package example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class CitedTest {

  @Test
  @DisplayName("[SCN-JVF-001] a passing test cites its scenario")
  void passes() {
    assertEquals(2, 1 + 1);
  }

  @Test
  @DisplayName("[SCN-JVF-002] a failing test cites its scenario")
  void fails() {
    assertEquals(2, 1);
  }

  @Test
  @DisplayName("[SCN-JVF-005] [SCN-JVF-006] a test that cites two scenarios")
  void citesTwo() {
    assertEquals(2, 1 + 1);
  }

  @ParameterizedTest(name = "[SCN-JVF-007] a parameterised test cites its scenario with {0}")
  @ValueSource(ints = {1, 2})
  void parameterised(int value) {
    assertEquals(value, value);
  }

  @Test
  @Disabled("not yet written")
  @DisplayName("[SCN-JVF-008] a disabled test cites its scenario")
  void disabled() {
    assertEquals(2, 1 + 1);
  }

  @Test
  @DisplayName("[SCN-JVF-009] a test whose assumption fails cites its scenario")
  void assumptionFails() {
    assumeTrue(false, "the environment is not ready");
  }

  @Test
  @DisplayName("[SCN-JVF-010] a test that throws cites its scenario")
  void throwsInItsBody() {
    throw new IllegalStateException("the resource could not be reached");
  }
}
