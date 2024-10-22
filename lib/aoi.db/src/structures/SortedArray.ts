// data is added in sorted order so we just need to add some algo that take advantage of this

import { type u32 } from '@aoi.db/typings/type.js';

/**
 * A class representing a sorted array
 * @typeParam K - The key type
 * @typeParam V - The value type
 */
export default class SortedArray<K, V> {
	/** The array of key value pairs */
	#array: Array<[K, V] | undefined>;
	/** The key index map */
	readonly #keyIdx: Map<K, number>;
	/** The size of the array */
	readonly #size: u32;
	#currentIdx: u32 = 0;

	/**
	 * Creates an instance of SortedArray.
	 * @param size - The size of the array
	 * @returns An instance of SortedArray
	 *
	 * @example
	 * ```ts
	 * const sortedArray = new SortedArray<number, number>(10);
	 *
	 * sortedArray.set(1, 10);
	 * sortedArray.get(1); // 10
	 * sortedArray.has(1); // true
	 * ```
	 */
	constructor(size: u32) {
		this.#array = new Array<[K, V]>(size);
		this.#size = size;
		this.#keyIdx = new Map();
	}

	/**
	 * Set the key value pair
	 * @param key - The key
	 * @param value - The value
	 *
	 * @example
	 * ```ts
	 * <SortedArray>.set(1, 10);
	 * ```
	 */
	set(key: K, value: V): void {
		let idx = this.#keyIdx.get(key);
		if (idx === undefined) {
			idx = this.#currentIdx++;
			this.#keyIdx.set(key, idx);
		}

		this.#array[idx] = [key, value];
	}

	/**
	 * Get the value of the key
	 * @param key - The key
	 * @returns The value of the key
	 *
	 * @example
	 * ```ts
	 * <SortedArray>.get(1); // 10
	 * ```
	 */
	get(key: K): V | undefined {
		const idx = this.#keyIdx.get(key);
		if (idx === undefined) return undefined;
		return this.#array[idx]?.[1];
	}

	/**
	 * Get the key value pair at the index
	 * @param idx - The index
	 * @returns The key value pair at the index
	 *
	 * @example
	 * ```ts
	 * <SortedArray>.at(1); // { key: 1, value: 10 }
	 * ```
	 */
	at(idx: u32): [K, V] | undefined {
		return this.#array.at(idx);
	}

	/**
	 * Check if the key exists
	 * @param key - The key
	 * @returns A boolean indicating if the key exists
	 *
	 * @example
	 * ```ts
	 * <SortedArray>.has(1); // true
	 * ```
	 */
	has(key: K): boolean {
		return this.#keyIdx.has(key);
	}

	/**
	 * Gets the lower bound of the key
	 * @param key - The key to be searched
	 * @returns The nearest key value pair
	 *
	 * @example
	 * ```ts
	 * <SortedArray>.lowerbound(1); // { key: 1, value: 10 }
	 * ```
	 */
	lowerbound(key: K): [K, V] | undefined {
		const idx = this.#keyIdx.get(key);
		if (idx !== undefined) return this.#array[idx];
		let left = 0;
		let right = this.#size;
		while (left < right) {
			const mid = left + ((right - left) >> 1);
			if (!this.#array[mid]) right = mid;
			else if (key <= this.#array[mid][0]) right = mid;
			else left = mid + 1;
		}

		if (left < this.#size && this.#array[left]! < key) left++;
		return this.#array[left];
	}

	/**
	 * Gets the upper bound of the key
	 * @param key - The key to be searched
	 * @returns The nearest key value pair
	 *
	 * @example
	 * ```ts
	 * <SortedArray>.upperbound(1); // { key: 1, value: 10 }
	 * ```
	 */
	upperbound(key: K): [K, V] | undefined {
		const idx = this.#keyIdx.get(key);
		if (idx !== undefined) return this.#array[idx];
		let left = 0;
		let right = this.#size;

		while (left < right) {
			const mid = left + ((right - left) >> 1);
			if (!this.#array[mid]) right = mid;
			else if (this.#array[mid][0] <= key) left = mid + 1;
			else right = mid;
		}

		if (left < this.#size && this.#array[left]! <= key) left++;

		return this.#array[left];
	}

	lowerboundIndex(key: K): u32 {
		const idx = this.#keyIdx.get(key);
		if (idx !== undefined) return idx;
		let left = 0;
		let right = this.#size;
		while (left < right) {
			const mid = left + ((right - left) >> 1);
			if (!this.#array[mid]) right = mid;
			else if (key <= this.#array[mid][0]) right = mid;
			else left = mid + 1;
		}

		if (left < this.#size && this.#array[left]! < key) left++;
		return left;
	}

	justLE(key: K): [K, V] | undefined {
		const idx = this.#keyIdx.get(key);
		if (idx !== undefined) return this.#array[idx];
		const lbidx = this.lowerboundIndex(key);
		if (!lbidx) return undefined;
		return this.#array[lbidx - 1];
	}

	/**
	 * Clear the array
	 *
	 * @example
	 * ```ts
	 * <SortedArray>.clear();
	 * ```
	 */
	clear(): void {
		this.#currentIdx = 0;
		this.#keyIdx.clear();
		this.#array.fill(undefined);
	}

	/**
	 * returns the string representation of the SortedArray
	 *
	 */
	toString(): string {
		return this.#array.join(',');
	}

	/**
	 * returns the size of the SortedArray
	 *
	 * @example
	 * ```ts
	 * <SortedArray>.size; // 10
	 * ```
	 */
	get size(): u32 {
		return this.#size;
	}

	get array(): Array<[K, V] | undefined> {
		return this.#array;
	}

	get keyIdx(): Map<K, number> {
		return this.#keyIdx;
	}
}
