import pytest


@pytest.mark.clm("CLM-PYF-001")
def test_passing_cited():
    assert True


@pytest.mark.clm("CLM-PYF-002")
def test_failing_cited():
    assert 1 == 2


@pytest.mark.clm("CLM-PYF-003")
@pytest.mark.skip(reason="the behaviour is not built yet")
def test_skipped_cited():
    assert True


@pytest.mark.clm("CLM-PYF-099")
def test_unknown_code():
    assert True


def test_uncited():
    assert True


@pytest.mark.clm("CLM-PYF-004", "CLM-PYF-005")
def test_two_codes():
    assert True


@pytest.fixture
def broken_resource():
    raise RuntimeError("the resource could not be set up")


@pytest.mark.clm("CLM-PYF-006")
def test_setup_error(broken_resource):
    assert broken_resource
