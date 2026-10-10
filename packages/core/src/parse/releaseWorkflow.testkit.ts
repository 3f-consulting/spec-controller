export const RELEASE_YML =
  "jobs:\n" +
  "  publish:\n" +
  "    steps:\n" +
  "      - name: Build\n" +
  "        run: pnpm build\n" +
  "      - name: Publish\n" +
  "        run: pnpm publish --access public";
