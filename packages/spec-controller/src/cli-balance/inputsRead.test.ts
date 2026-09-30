import { describe, expect, it } from "vitest";
import { inputsReadBy, type InputReader } from "./inputsRead.js";

const reader: InputReader = {
  exists: () => true,
  featureFiles: (dir) => [`${dir}/a.feature`],
  workflowFiles: (path) => (path.endsWith(".yml") ? [path] : [`${path}/ci.yml`, `${path}/nightly.yaml`]),
};

describe("[SCN-FMT-013] the files a run reads are named by how the run came to read them", () => {
  it("names each input the run was pointed at by its flag", () => {
    const args = { vitest: "v.json", cucumber: "c.json", "ci-steps": "s.json", "package-json": "p.json", features: "f", ci: "w.yml" };

    expect(inputsReadBy(args, reader)).toEqual([
      { subject: "the --vitest report", path: "v.json" },
      { subject: "the --cucumber report", path: "c.json" },
      { subject: "the --ci-steps record", path: "s.json" },
      { subject: "the --package-json manifest", path: "p.json" },
      { subject: "a feature file of the --features corpus", path: "f/a.feature" },
      { subject: "the --ci workflow", path: "w.yml" },
    ]);
  });

  it("names the inputs read by default, when the run was not pointed elsewhere", () => {
    expect(inputsReadBy({}, reader)).toEqual([
      { subject: "the package.json read by default", path: "package.json" },
      { subject: "a feature file of the corpus read by default", path: "features/a.feature" },
      { subject: "a CI workflow read by default", path: ".github/workflows/ci.yml" },
      { subject: "a CI workflow read by default", path: ".github/workflows/nightly.yaml" },
    ]);
  });

  it("names every workflow of a folder the run was pointed at", () => {
    expect(inputsReadBy({ ci: "workflows" }, reader).filter((i) => i.subject.includes("workflow"))).toEqual([
      { subject: "a workflow of the --ci folder", path: "workflows/ci.yml" },
      { subject: "a workflow of the --ci folder", path: "workflows/nightly.yaml" },
    ]);
  });

  it("leaves out the package.json the run does not read: one it was pointed away from, or one that is not there", () => {
    const pointedAway = inputsReadBy({ "package-json": "other.json" }, reader);
    const absent = inputsReadBy({}, { ...reader, exists: () => false });

    expect(pointedAway.map((i) => i.path)).not.toContain("package.json");
    expect(absent.map((i) => i.path)).not.toContain("package.json");
  });
});
