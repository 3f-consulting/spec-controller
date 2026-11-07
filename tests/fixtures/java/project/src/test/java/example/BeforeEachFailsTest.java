package example;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class BeforeEachFailsTest {

  @BeforeEach
  void setUp() {
    throw new IllegalStateException("the fixture could not be set up");
  }

  @Test
  @DisplayName("[CLM-JVF-011] a test whose setup before each test throws cites its scenario")
  void underAFailingSetUp() {
    assertEquals(2, 1 + 1);
  }
}
