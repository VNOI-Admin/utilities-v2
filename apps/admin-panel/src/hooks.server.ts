import type { HandleServerError } from "@sveltejs/kit";

export const handleError: HandleServerError = ({ error }) => {
	return {
		message: (error as any)?.message || "Whoops! An unexpected internal server error occurred.",
		code: (error as any)?.code ?? "UNKNOWN_ERROR",
	};
};
