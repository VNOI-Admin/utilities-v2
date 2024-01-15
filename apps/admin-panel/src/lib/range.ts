export function* range(startOrLength: number, end?: number, step = 1): Generator<number> {
	const start = end ? startOrLength : 0;
	const final = end ?? startOrLength;
	for (let i = start; i <= final; i += step) {
		yield i;
		if (i + step > final) break;
	}
}
