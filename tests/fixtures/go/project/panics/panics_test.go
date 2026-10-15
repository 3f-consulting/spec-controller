package panics

import "testing"

func TestPanics(t *testing.T) {
	t.Run("[SCN-GOF-009] a panicking subtest cites its scenario", func(t *testing.T) {
		panic("the code under test panicked")
	})
}

func TestAfterThePanic(t *testing.T) {
	t.Run("[SCN-GOF-010] a subtest the panic stopped cites its scenario", func(t *testing.T) {})
}
