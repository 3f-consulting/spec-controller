test("[CLM-JSF-001] a passing test cites its scenario", () => {
  expect(1 + 1).toBe(2);
});

test("[CLM-JSF-002] a failing test cites its scenario", () => {
  expect(1).toBe(2);
});

describe("[CLM-JSF-004] a describe block that cites a scenario", () => {
  test("[CLM-JSF-003] a test whose own title cites a scenario", () => {
    expect(true).toBe(true);
  });

  test("a test whose own title cites nothing", () => {
    expect(true).toBe(true);
  });
});

test("[CLM-JSF-005] [CLM-JSF-006] a test that cites two scenarios", () => {
  expect(true).toBe(true);
});

test.todo("[CLM-JSF-007] a todo test cites its scenario");

test.skip("[CLM-JSF-008] a skipped test cites its scenario", () => {
  expect(true).toBe(true);
});

describe("a describe block whose beforeAll fails", () => {
  beforeAll(() => {
    throw new Error("the resource could not be set up");
  });

  test("[CLM-JSF-009] a test under a failing beforeAll cites its scenario", () => {
    expect(true).toBe(true);
  });
});
