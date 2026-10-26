import { evidenceReconciliationFromSources } from "./assemble/evidenceReconciliationFromSources.js";
import { summaryOf } from "./domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "./domain/evidenceReconciliation.js";
import type { Ledger } from "./model.js";
import { parsedFeatures } from "./parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "./parse/parsedWorkflows.test-utils.js";

export const __er = (ledger: Ledger, wo = false, wg = false): EvidenceReconciliation => ({
  summary: summaryOf(ledger, wo, wg),
  ledger,
});

export const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

export const unitTestsCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
`;

export const unitTestsAndTypesCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
      - name: Types
        run: pnpm typecheck
`;

export const unitTestsAndLintCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
      - name: Lint
        run: pnpm lint
`;

export const reconcilerCi = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
      - name: Reconciliation
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
      - name: Sweep check
        run: pnpm lint:sweep
`;

export const ciWithoutReconciler = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Sweep check
        run: pnpm lint:sweep
`;

export const stepAccountingCi = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Checkout tools
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4
      - name: Setup Node
        uses: actions/setup-node@v4
      - name: Cache store
        uses: actions/cache/restore@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
      - name: Download build
        uses: actions/download-artifact@v4
      - name: Unit tests
        run: pnpm test
      - name: Sweep check
        run: pnpm lint:sweep
      - name: Types
        run: pnpm typecheck
      - name: Depth check
        run: pnpm lint:depth
      - name: Code scanning
        uses: github/codeql-action/analyze@v3
      - name: Upload report
        uses: actions/upload-artifact@v4
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
      - name: Reconciliation
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
`;

export const nightly = `name: fixture nightly
jobs:
  sweep:
    steps:
      - name: Circular check
        run: pnpm lint:circular
      - name: Depth check
        run: pnpm lint:depth
  audit:
    steps:
      - name: Audit
        run: pnpm audit --audit-level=high
`;

export const discoveryScopePackageJson = {
  scripts: {
    test: "vitest run",
    "lint:circular": "madge --circular",
    "lint:depth": "depcruise src",
  },
  specController: { runners: { unit: "vitest" } },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

export const reconcilerPackageJson = {
  scripts: { "lint:sweep": "madge --circular" },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

const stepAccountingPackageJson = {
  scripts: {
    test: "vitest run",
    build: "tsc -b",
    typecheck: "tsc --noEmit",
    "lint:sweep": "madge --circular",
    "lint:depth": "depcruise src",
  },
  specController: {
    runners: { unit: "vitest" },
    notChecks: ["ci.yml:ci:Checkout", "ci.yml:ci:Install", "ci.yml:ci:Build"],
  },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

export function reconcileStepAccounting(workflowSources: readonly string[]): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: stepAccountingPackageJson,
    ciWorkflows: parsedWorkflows(workflowSources, ["ci.yml"]),
    reconcilerInvocation: "spec-controller balance",
    behaviouralObservations: [],
    deferralTags: [],
  });
}
