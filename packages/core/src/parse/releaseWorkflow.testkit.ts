export const RELEASE_YML = [
  "jobs:",
  "  publish:",
  "    steps:",
  "      - name: Build",
  "        run: pnpm build",
  "      - name: Publish",
  "        run: pnpm publish --access public",
].join("\n");
