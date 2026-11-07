package example

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("[CLM-KOF-004] a class that cites a scenario")
class ClassCitesTest {

    @Test
    @DisplayName("a test whose own display name cites nothing")
    fun citesNothing() {
        assertEquals(2, 1 + 1)
    }
}
