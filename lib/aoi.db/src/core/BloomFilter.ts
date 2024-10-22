import murmurhash from 'murmurhash';

import {
	type bool,
	type HashInputType,
	type HashFunction,
	type keyDataType,
	type u32,
} from '@aoi.db/typings/type.js';
import BitArray from '../structures/BitArray.js';
import { hashInt, hashu64 } from '@aoi.db/utils/customHashes.js';

export default class BloomFilter<T extends keyDataType> {
	static defaultHashFn<T extends keyDataType>(dataType: T): HashFunction<T> {
		if (dataType.startsWith('str:')) {
			return murmurhash.v3 as unknown as HashFunction<T>;
		} else if (dataType === 'u64' || dataType === 'i64') {
			return hashu64 as unknown as HashFunction<T>;
		} else {
			return hashInt as unknown as HashFunction<T>;
		}
	}

	#bits: BitArray;
	#hashCount: u32;
	readonly #hashFn: HashFunction<T>;

	constructor(
		bitSize: u32,
		hashCount: u32,
		dataType: T,
		customHashFn: HashFunction<T> | undefined,
	) {
		this.#bits = new BitArray(bitSize);
		this.#hashCount = hashCount;
		this.#hashFn = customHashFn ?? BloomFilter.defaultHashFn(dataType);
	}

	add(key: HashInputType<T>) {
		let keyToHash: Uint8Array | HashInputType<T> = key;

		for (let i = 0; i < this.#hashCount; i++) {
			const idx = this.#hashFn(keyToHash, i) % this.#bits.length;
			this.#bits.set(idx);
		}
	}

	lookup(key: HashInputType<T>): bool {
		let keyToHash: Uint8Array | HashInputType<T> = key;

		for (let i = 0; i < this.#hashCount; i++) {
			const idx = this.#hashFn(keyToHash, i) % this.#bits.length;
			if (!this.#bits.get(idx)) return false;
		}

		return true;
	}

	setBits(bits: Uint8Array) {
		this.#bits = new BitArray(bits.length, bits);
	}

	setHashCount(count: u32) {
		this.#hashCount = count;
	}

	clear() {
		this.#bits.clear();
	}

	get bits() {
		return this.#bits;
	}

	get hashCount() {
		return this.#hashCount;
	}
}
