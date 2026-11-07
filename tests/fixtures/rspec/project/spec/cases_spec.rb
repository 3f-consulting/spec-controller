RSpec.describe "An RSpec fixture suite" do
  it("[CLM-RSF-001] a passing example cites its scenario") { expect(1 + 1).to eq(2) }

  it("[CLM-RSF-002] a failing example cites its scenario") { expect(1).to eq(2) }

  describe "[CLM-RSF-004] a group that cites a scenario" do
    it("[CLM-RSF-003] an example whose own description cites a scenario") { expect(true).to be(true) }

    it("an example whose own description cites nothing") { expect(true).to be(true) }
  end

  it("[CLM-RSF-005] [CLM-RSF-006] an example that cites two scenarios") { expect(true).to be(true) }

  it("[CLM-RSF-007] a skipped example cites its scenario") { skip "not yet" }

  xit("[CLM-RSF-008] an xit example cites its scenario") { expect(true).to be(true) }

  it("[CLM-RSF-009] a pending example that fails cites its scenario") do
    pending "not yet"
    expect(1).to eq(2)
  end

  it("[CLM-RSF-010] a pending example that passes cites its scenario") do
    pending "not yet"
    expect(1).to eq(1)
  end

  context "with a before hook that fails" do
    before { raise "the resource could not be set up" }

    it("[CLM-RSF-011] an example after a failing before hook cites its scenario") { expect(true).to be(true) }
  end

  context "with a before(:context) hook that fails" do
    before(:context) { raise "the shared resource could not be set up" }

    it("[CLM-RSF-012] an example after a failing before(:context) hook cites its scenario") { expect(true).to be(true) }
  end
end
