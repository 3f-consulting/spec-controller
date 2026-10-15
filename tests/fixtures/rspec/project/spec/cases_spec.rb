RSpec.describe "An RSpec fixture suite" do
  it("[SCN-RSF-001] a passing example cites its scenario") { expect(1 + 1).to eq(2) }

  it("[SCN-RSF-002] a failing example cites its scenario") { expect(1).to eq(2) }

  describe "[SCN-RSF-004] a group that cites a scenario" do
    it("[SCN-RSF-003] an example whose own description cites a scenario") { expect(true).to be(true) }

    it("an example whose own description cites nothing") { expect(true).to be(true) }
  end

  it("[SCN-RSF-005] [SCN-RSF-006] an example that cites two scenarios") { expect(true).to be(true) }

  it("[SCN-RSF-007] a skipped example cites its scenario") { skip "not yet" }

  xit("[SCN-RSF-008] an xit example cites its scenario") { expect(true).to be(true) }

  it("[SCN-RSF-009] a pending example that fails cites its scenario") do
    pending "not yet"
    expect(1).to eq(2)
  end

  it("[SCN-RSF-010] a pending example that passes cites its scenario") do
    pending "not yet"
    expect(1).to eq(1)
  end

  context "with a before hook that fails" do
    before { raise "the resource could not be set up" }

    it("[SCN-RSF-011] an example after a failing before hook cites its scenario") { expect(true).to be(true) }
  end

  context "with a before(:context) hook that fails" do
    before(:context) { raise "the shared resource could not be set up" }

    it("[SCN-RSF-012] an example after a failing before(:context) hook cites its scenario") { expect(true).to be(true) }
  end
end
