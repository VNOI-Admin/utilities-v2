// @ts-check
/** @type {import("npm-check-updates").RunOptions} */
module.exports = {
	target(dependencyName) {
		if (dependencyName === "svelte") {
			return "@next";
		}
		return "latest";
	},
};
