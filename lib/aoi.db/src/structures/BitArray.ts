import { type bool, type str, type u32 } from '@aoi.db/typings/type.js';

/**
 * A class representing a BitArray
 */
export default class BitArray {
	/** The bits of the BitArray */
	#bits: Uint8Array;
	/** The size of the BitArray */
	readonly #size: u32;

	/**
	 * Creates an instance of BitArray.
	 * @param size - The size of the BitArray
	 * @param bits - The bits of the BitArray
	 * @returns An instance of BitArray
	 * 
	 * @example
	 * ```ts
	 * const bitArray = new BitArray(10);
	 * 
	 * bitArray.set(1);
	 * bitArray.get(1); // true
	 * bitArray.get(2); // false
	 * ```
	 */
	constructor(size: u32, bits?: Uint8Array) {
		this.#bits = new Uint8Array(Math.ceil(size / 8));
		this.#size = Math.ceil(size / 8);

		if (bits) {
			this.#bits = bits;
		}
	}

	/**
	 * Set the bit at the index
	 * @param index - The index
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.set(1);
	 * ```
	 */
	set(index: u32): void {
		this.#bits[index >> 3] |= 1 << (index & 7);
	}

	/**
	 * Unset the bit at the index
	 * @param index - The index
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.unset(1);
	 * ```
	 */
	unset(index: u32): void {
		this.#bits[index >> 3] &= ~(1 << (index & 7));
	}

	/**
	 * Get the bit at the index
	 * @param index - The index
	 * @returns The bit at the index
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.get(1); // true
	 * ```
	 */
	get(index: u32): bool {
		return (this.#bits[index >> 3] & (1 << (index & 7))) !== 0;
	}

	/**
	 * Get the bits as an array
	 * @returns The bits as an array
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.toArray(); // Uint8Array
	 * ```
	 */
	toArray(): Uint8Array {
		return this.#bits;
	}

	/**
	 * Set the bits of the BitArray
	 * @param bits - The bits to set
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.setArray(new Uint8Array(10));
	 * ```
	 */
	setArray(bits: Uint8Array): void {
		this.#bits = bits;
	}

	/**
	 * Clear the BitArray
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.clear();
	 * ```
	 */
	clear(): void {
		this.#bits.fill(0);
	}

	/**
	 * Get the length of the BitArray
	 * @returns The length of the BitArray
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.length; // 10
	 * ```
	 */
	get length(): u32 {
		return this.#size * 8;
	}

	/**
	 * Get the size of the Uint8Array
	 * @returns The size of the Uint8Array
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.size; // 10
	 * ```
	 */
	get size(): u32 {
		return this.#size;
	}

	/**
	 * Get the string representation of the BitArray
	 * @returns The string representation of the BitArray
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.toString(); // "1,2,3,4"
	 * ```
	 */
	toString(): str {
		return this.#bits.join(',');
	}

	/**
	 * Merge the bitArray with the current BitArray
	 * @param bitArray - The bitArray to merge
	 * 
	 * @example
	 * ```ts
	 * <BitArray>.merge(new BitArray(10));
	 * ```
	 */
	merge(bitArray: BitArray): void {
		const bits = bitArray.toArray();
		for (let i = 0; i < bits.length; i++) {
			this.#bits[i] |= bits[i];
		}
	}
}