package example

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

class BeforeAllFailsTest {

    companion object {
        @BeforeAll
        @JvmStatic
        fun setUpAll() {
            throw IllegalStateException("the shared resource could not be set up")
        }
    }

    @Test
    @DisplayName("[SCN-KOF-005] a test in a class whose setup before all its tests fails cites its scenario")
    fun underAFailingClassSetUp() {
        assertEquals(2, 1 + 1)
    }
}
