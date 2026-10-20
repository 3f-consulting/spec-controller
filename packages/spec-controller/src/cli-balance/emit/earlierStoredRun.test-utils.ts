import { earlierStoredRunDirOf } from "../../run-management/keptRun.js";

export const noOwnRun = (path: string): string | undefined => earlierStoredRunDirOf(path, undefined);
