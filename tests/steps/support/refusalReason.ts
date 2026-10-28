export const REASON_CODE: Readonly<Record<string, string>> = {
  "permission was denied": "EACCES",
  "a parent is not a directory": "ENOTDIR",
  "the destination is a directory": "EISDIR",
  "the parent does not exist": "ENOENT",
  "the location already exists": "EEXIST",
};
