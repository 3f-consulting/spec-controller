package example;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class BeforeAllFailsTest {

  @BeforeAll
  static void setUpAll() {
    throw new IllegalStateException("the shared resource could not be set up");
  }

  @Test
  @DisplayName("[CLM-JVF-012] a test in a class whose setup before all its tests fails cites its scenario")
  void underAFailingClassSetUp() {
    assertEquals(2, 1 + 1);
  }
}
