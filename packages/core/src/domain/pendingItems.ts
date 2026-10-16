export const BUILT_IN_DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

export function deferralTagsExtendedBy(
  starterTags: readonly string[],
  configuredTags: readonly string[]
): readonly string[] {
  return [...new Set([...starterTags, ...configuredTags])];
}
