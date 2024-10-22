import { type Safe } from '@aoi.db/typings/type.js';

/**
 * Safely resolves a promise.
 * @param promise - The promise to resolve.
 * @returns - Returns a tuple with the error and the data.
 */
export async function safeAsync<T>(promise: Promise<T>): Promise<Safe<T>> {
	return promise
		.then((data) => [undefined, data])
		.catch((error) => [error, undefined]) as Promise<Safe<T>>;
}

/**
 * Safely executes a function.
 * @param fn - The function to execute.
 * @returns - Returns a tuple with the error and the data.
 */
export function safeSync<T>(fn: () => T): Safe<T> {
	try {
		return [undefined, fn()];
	} catch (error) {
		return [error as Error, undefined];
	}
}

/**
 * Safely executes a function or a promise.
 * @param promise - The promise to resolve.
 * @returns - Returns a tuple with the error and the data.
 */
export function safe<T>(promise: Promise<T>): Promise<Safe<T>>;
export function safe<T>(fn: () => T): Safe<T>;
// eslint-disable-next-line @typescript-eslint/promise-function-async
export function safe<T>(
	funcOrPromise: Promise<T> | (() => T),
): Safe<T> | Promise<Safe<T>> {
	if (funcOrPromise instanceof Promise) return safeAsync(funcOrPromise);
	else return safeSync(funcOrPromise);
}

/**
 * Gets the cell count and hash function count for a given keys count and error rate.
 * @param keysCount	- The number of keys.
 * @param errorRate	- The error rate.
 * @returns - Returns a tuple with the cell count and the hash function count.
 * 
 * @example
 * ```ts
 * getCellAndHashCount(100, 0.01); // [958, 7]
 * ```
 */
export function getCellAndHashCount(
	keysCount: number,
	errorRate: number,
): [number, number] {
	//ceil((n * log(p)) / log(1 / pow(2, log(2))));
	const bitCount = Math.ceil(
		(keysCount * Math.log(errorRate)) / Math.log(1 / Math.pow(2, Math.log(2))),
	);
	const hashFunctionCount = Math.round((bitCount / keysCount) * Math.LN2);

	return [bitCount, hashFunctionCount];
}
