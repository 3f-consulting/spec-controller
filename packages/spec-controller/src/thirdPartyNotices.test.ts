import { describe, it, expect } from "vitest";
import { thirdPartyNotices } from "./thirdPartyNotices.js";

const wording = {
  field: (directory: string, field: string) => `refused: ${field} of ${directory}`,
  engine: (engine: string) => `refused: no ${engine}`,
};

const installedPackage = {
  directory: "/repo/node_modules/yaml",
  installed: true,
  name: "yaml",
  version: "2.9.0",
  license: "ISC",
  texts: ["ISC License\n\nCopyright Eemeli Aro"],
};

const workspacePackage = {
  directory: "/repo/packages/core",
  installed: false,
  name: "@3f-consulting/spec-controller-core",
  version: "0.1.0",
  license: "MIT",
  texts: ["MIT License", "Copyright 3F Consulting"],
};

describe("[SCN-TPN-001] building the command fails, naming the package and the field, when a bundled package's manifest gives an empty or missing name or version, or a licence that is empty or not text", () => {
  it("writes each package's notice in directory order, an installed package headed with its version and a workspace package without", () => {
    expect(thirdPartyNotices([workspacePackage, installedPackage], wording)).toBe(
      [
        "yaml@2.9.0 (ISC)",
        "",
        "ISC License",
        "",
        "Copyright Eemeli Aro",
        "",
        "-".repeat(72),
        "",
        "@3f-consulting/spec-controller-core (MIT)",
        "",
        "MIT License",
        "",
        "Copyright 3F Consulting",
        "",
      ].join("\n"),
    );
  });

  it("writes a workspace package that gives no version", () => {
    expect(thirdPartyNotices([{ ...workspacePackage, version: undefined }], wording)).toBe(
      "@3f-consulting/spec-controller-core (MIT)\n\nMIT License\n\nCopyright 3F Consulting\n",
    );
  });

  it.each([
    { field: "name", value: "" },
    { field: "name", value: "  " },
    { field: "name", value: undefined },
    { field: "name", value: 7 },
    { field: "version", value: "" },
    { field: "version", value: "\t" },
    { field: "version", value: undefined },
    { field: "version", value: null },
    { field: "version", value: 2 },
    { field: "license", value: "" },
    { field: "license", value: " " },
    { field: "license", value: null },
    { field: "license", value: { type: "MIT" } },
  ])("refuses an installed package whose $field is $value, naming its directory and the field", ({ field, value }) => {
    expect(() => thirdPartyNotices([workspacePackage, { ...installedPackage, [field]: value }], wording)).toThrow(
      new Error("refused: " + field + " of /repo/node_modules/yaml"),
    );
  });

  it.each([
    { field: "name", value: "" },
    { field: "name", value: null },
    { field: "license", value: "" },
    { field: "license", value: { type: "MIT" } },
  ])("refuses a workspace package whose $field is $value, naming its directory and the field", ({ field, value }) => {
    expect(() => thirdPartyNotices([installedPackage, { ...workspacePackage, [field]: value }], wording)).toThrow(
      new Error("refused: " + field + " of /repo/packages/core"),
    );
  });
});

describe("[SCN-TPN-002] building the command fails when the engine is not among the packages its bundle carries", () => {
  it("refuses a bundled-package list without the engine, naming the engine", () => {
    expect(() => thirdPartyNotices([installedPackage], wording)).toThrow(
      new Error("refused: no @3f-consulting/spec-controller-core"),
    );
  });

  it("refuses an empty bundled-package list", () => {
    expect(() => thirdPartyNotices([], wording)).toThrow(new Error("refused: no @3f-consulting/spec-controller-core"));
  });

  it("writes the notices for the same list with the engine among its packages", () => {
    expect(thirdPartyNotices([installedPackage, workspacePackage], wording)).toMatch(
      /^yaml@2\.9\.0 \(ISC\)\n[^]*\n@3f-consulting\/spec-controller-core \(MIT\)\n[^]*\n$/,
    );
  });
});
