import { isAxiosError } from "axios";

/**
 * This function is used to get the error message from the error object
 *
 * @returns {string} The error message, it can be undefined
 */
export function getErrorMessage(error: Error): string;
export function getErrorMessage(error: unknown): string | undefined;
export function getErrorMessage(error: unknown): string | undefined {
  if (isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}
