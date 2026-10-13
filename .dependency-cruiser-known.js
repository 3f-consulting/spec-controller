// The boundary breaks the tree still holds, each naming the work that removes it. dependency-cruiser's own
// known-violations entries refuse any extra field, so the list lives here and the config maps it in.
export default [
  { from: "packages/core/src/census/evidenceObligations.ts", to: "packages/core/src/parse/scenarios.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4527"] },
  { from: "packages/core/src/render/behaviouralRunners.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/configurationNotRead.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/discoveryScope.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/excludedSteps.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/fitnessFunctions.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/json.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/json.ts", to: "packages/core/src/census/evidenceObligations.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/json.ts", to: "packages/core/src/provenance/provenance.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/markdown.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/markdown.ts", to: "packages/core/src/census/evidenceObligations.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499", "3F-4501"] },
  { from: "packages/core/src/render/markdown.ts", to: "packages/core/src/provenance/provenance.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/provenanceSection.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/provenanceSection.ts", to: "packages/core/src/provenance/provenance.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/reconcilerSteps.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/runVerdict.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/runVerdict.ts", to: "packages/core/src/provenance/provenance.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/scenarioCodeErrorsSection.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/stepAccounting.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
  { from: "packages/core/src/render/testVolume.ts", to: "packages/core/src/assemble/renderInput.ts", rule: "adapter-imports-adapter", removedBy: ["3F-4499"] },
];
