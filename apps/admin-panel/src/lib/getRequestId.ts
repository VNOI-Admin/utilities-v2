import { v4 as uuidv4 } from "uuid";

/**
 * Simple wrapper around uuidv4() to ensure we doesn't throw
 * an error.
 * @returns
 */
export const getRequestId = () => {
  try {
    return uuidv4();
  } catch {
    return "unknown request";
  }
};
