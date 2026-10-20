// What process.cwd() throws when its directory is gone: a plain Error with errno, code and syscall, and no path.
export function removedWorkingDirectory(): Error {
  return Object.assign(
    new Error(
      "ENOENT: process.cwd failed with error no such file or directory, the current working directory was likely removed without changing the working directory, uv_cwd",
    ),
    { errno: -2, code: "ENOENT", syscall: "uv_cwd" },
  );
}
