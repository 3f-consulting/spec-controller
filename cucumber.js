const tags = "@integration or @e2e";

const common = {
  paths: ["features/**/*.feature"],
  require: ["tests/steps/**/*.ts"],
  requireModule: ["tsx/cjs"],
};

export default { ...common, tags, parallel: 2 };

export const outside = { ...common, tags: `not (${tags})` };
