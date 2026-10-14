test("[SCN-JSF-001] a passing test cites its scenario", () => {
  expect(1 + 1).toBe(2);
});

test("[SCN-JSF-002] a failing test cites its scenario", () => {
  expect(1).toBe(2);
});

describe("[SCN-JSF-004] a describe block that cites a scenario", () => {
  test("[SCN-JSF-003] a test whose own title cites a scenario", () => {
    expect(true).toBe(true);
  });

  test("a test whose own title cites nothing", () => {
    expect(true).toBe(true);
  });
});

test("[SCN-JSF-005] [SCN-JSF-006] a test that cites two scenarios", () => {
  expect(true).toBe(true);
});

test.todo("[SCN-JSF-007] a todo test cites its scenario");

test.skip("[SCN-JSF-008] a skipped test cites its scenario", () => {
  expect(true).toBe(true);
});

describe("a describe block whose beforeAll fails", () => {
  beforeAll(() => {
    throw new Error("the resource could not be set up");
  });

  test("[SCN-JSF-009] a test under a failing beforeAll cites its scenario", () => {
    expect(true).toBe(true);
  });
});
