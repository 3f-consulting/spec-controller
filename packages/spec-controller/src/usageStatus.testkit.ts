export function usageStatusOf(run: () => unknown): number | undefined {
  try {
    run();
    return undefined;
  } catch (err) {
    const code = (err as { exitCode?: unknown }).exitCode;
    if (typeof code !== "number") throw err;
    return code;
  }
}
