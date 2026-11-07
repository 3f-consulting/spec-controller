package example;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("[CLM-JVF-013] an outer class that cites a scenario")
class ClassCitesTest {

  @Test
  @DisplayName("[CLM-JVF-003] a test whose own display name cites a scenario")
  void citesItsOwn() {
    assertEquals(2, 1 + 1);
  }

  @Test
  @DisplayName("a test in the outer class whose own display name cites nothing")
  void outerCitesNothing() {
    assertEquals(2, 1 + 1);
  }

  @Nested
  @DisplayName("[CLM-JVF-004] an inner class that cites a scenario")
  class Inner {

    @Test
    @DisplayName("a test in the inner class whose own display name cites nothing")
    void innerCitesNothing() {
      assertEquals(2, 1 + 1);
    }
  }
}
