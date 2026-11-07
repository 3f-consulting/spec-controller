package cited

import "testing"

func TestCited(t *testing.T) {
	t.Run("[CLM-GOF-001] a passing subtest cites its scenario", func(t *testing.T) {})

	t.Run("[CLM-GOF-002] a failing subtest cites its scenario", func(t *testing.T) {
		t.Fatal("the assertion failed")
	})

	t.Run("[CLM-GOF-004] a subtest that cites a scenario", func(t *testing.T) {
		t.Run("[CLM-GOF-003] a child whose own name cites a scenario", func(t *testing.T) {})
		t.Run("a child whose own name cites nothing", func(t *testing.T) {})
	})

	t.Run("[CLM-GOF-005] [CLM-GOF-006] a subtest that cites two scenarios", func(t *testing.T) {})

	t.Run("[CLM-GOF-007] a skipped subtest cites its scenario", func(t *testing.T) {
		t.Skip("not yet")
	})
}

func TestEnclosingFailsFirst(t *testing.T) {
	t.Fatal("the shared setup failed")
	t.Run("[CLM-GOF-008] a subtest its enclosing test never starts cites its scenario", func(t *testing.T) {})
}
