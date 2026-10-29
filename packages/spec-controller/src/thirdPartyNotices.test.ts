import { describe, it, expect } from "vitest";
import { engineBundled, noticeHeader } from "./thirdPartyNotices.js";

const installedPackage = {
  directory: "/repo/node_modules/yaml",
  installed: true,
  name: "yaml",
  version: "2.9.0",
  license: "ISC",
};

const workspacePackage = {
  directory: "/repo/packages/core",
  installed: false,
  name: "@3f-consulting/spec-controller-core",
  version: "0.1.0",
  license: "MIT",
};

describe("[SCN-TPN-001] building the command fails, naming the package and the field, when a bundled package's manifest gives no name, no version or a licence that is not text", () => {
  it("heads an installed package's notice with its name, version and licence", () => {
    expect(noticeHeader(installedPackage)).toStrictEqual({ kind: "header", header: "yaml@2.9.0 (ISC)" });
  });

  it("heads a workspace package's notice with its name and licence, and no version", () => {
    expect(noticeHeader(workspacePackage)).toStrictEqual({
      kind: "header",
      header: "@3f-consulting/spec-controller-core (MIT)",
    });
  });

  it("refuses a package whose manifest gives no name, naming its directory and the field", () => {
    expect(noticeHeader({ ...installedPackage, name: undefined })).toStrictEqual({
      kind: "refused",
      directory: "/repo/node_modules/yaml",
      field: "name",
    });
  });

  it("refuses a package whose name is not text", () => {
    expect(noticeHeader({ ...workspacePackage, name: 7 })).toStrictEqual({
      kind: "refused",
      directory: "/repo/packages/core",
      field: "name",
    });
  });

  it("refuses an installed package whose manifest gives no version, naming its directory and the field", () => {
    expect(noticeHeader({ ...installedPackage, version: undefined })).toStrictEqual({
      kind: "refused",
      directory: "/repo/node_modules/yaml",
      field: "version",
    });
  });

  it("refuses an installed package whose version is not text", () => {
    expect(noticeHeader({ ...installedPackage, version: 2 })).toStrictEqual({
      kind: "refused",
      directory: "/repo/node_modules/yaml",
      field: "version",
    });
  });

  it("does not refuse a workspace package that gives no version, since its notice carries none", () => {
    expect(noticeHeader({ ...workspacePackage, version: undefined })).toStrictEqual({
      kind: "header",
      header: "@3f-consulting/spec-controller-core (MIT)",
    });
  });

  it("refuses a package whose licence is an object rather than text, naming its directory and the field", () => {
    expect(noticeHeader({ ...installedPackage, license: { type: "MIT" } })).toStrictEqual({
      kind: "refused",
      directory: "/repo/node_modules/yaml",
      field: "license",
    });
  });

  it("refuses a workspace package whose licence is an object rather than text", () => {
    expect(noticeHeader({ ...workspacePackage, license: { type: "MIT" } })).toStrictEqual({
      kind: "refused",
      directory: "/repo/packages/core",
      field: "license",
    });
  });
});

describe("[SCN-TPN-002] building the command fails when the engine is not among the packages its bundle carries", () => {
  it("refuses a bundled-package list without the engine, naming the engine", () => {
    expect(engineBundled(["yaml", "@cucumber/gherkin"])).toStrictEqual({
      kind: "refused",
      engine: "@3f-consulting/spec-controller-core",
    });
  });

  it("refuses an empty bundled-package list", () => {
    expect(engineBundled([])).toStrictEqual({ kind: "refused", engine: "@3f-consulting/spec-controller-core" });
  });

  it("passes the same list with the engine among its packages", () => {
    expect(engineBundled(["yaml", "@3f-consulting/spec-controller-core", "@cucumber/gherkin"])).toStrictEqual({
      kind: "bundled",
    });
  });
});
