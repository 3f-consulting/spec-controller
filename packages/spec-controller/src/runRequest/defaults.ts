export const DEFAULT_FEATURES_DIR = "features";

export const DEFAULT_CI_PATH = ".github/workflows";

const DEFAULT_PACKAGE_JSON = "package.json";

// What balance reads when an input is not named.
export const INPUT_DEFAULTS = {
  features: DEFAULT_FEATURES_DIR,
  ci: DEFAULT_CI_PATH,
  packageJson: DEFAULT_PACKAGE_JSON,
} as const;
