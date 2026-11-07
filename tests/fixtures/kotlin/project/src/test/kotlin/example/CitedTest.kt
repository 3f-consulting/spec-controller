package example

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

class CitedTest {

    @Test
    @DisplayName("[CLM-KOF-001] a passing test cites its scenario")
    fun passes() {
        assertEquals(2, 1 + 1)
    }

    @Test
    @DisplayName("[CLM-KOF-002] a failing test cites its scenario")
    fun fails() {
        assertEquals(2, 1)
    }

    @Test
    @Disabled("not yet written")
    @DisplayName("[CLM-KOF-003] a disabled test cites its scenario")
    fun disabled() {
        assertEquals(2, 1 + 1)
    }
}
