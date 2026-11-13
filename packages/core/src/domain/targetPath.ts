export const shownFromTarget = (path: string, targetFolder: string): string => {
  const inside = targetFolder.endsWith("/") ? targetFolder : `${targetFolder}/`;
  return path.startsWith(inside) ? path.slice(inside.length) : path;
};
