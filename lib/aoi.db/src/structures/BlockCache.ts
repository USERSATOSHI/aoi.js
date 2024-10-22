import { Deque } from '@js-sdsl/deque';
import { type u32 } from '@aoi.db/typings/type.js';

/**
 * A class representing a block of the BlockCache
 */
export class Block {
	/** The frequency of the block */
	freq: u32;
	/** The id of the block ( mainly the offset of the block in the SSTable ) */
	id: u32;
	/** the Uint8Array block of the SSTable */
	buffer: Uint8Array;

	/**
	 * Creates an instance of Block.
	 * @param blockId - The id of the block ( mainly the offset of the block in the SSTable )
	 * @param block - the Uint8Array block of the SSTable
	 */
	constructor(blockId: u32, block: Uint8Array) {
		this.id = blockId;
		this.buffer = block;
		this.freq = 1;
	}
}


/**
 * A class representing a BlockCache
 */
export default class BlockCache {
	/** The cache which maps the key to the block */
	cache: Map<u32, Block>;
	/** The frequency map to map the frequency to the key */
	freqMap: Map<u32, Deque<u32>>;
	/** The minimum frequency */
	#minFreq: u32;
	/** The capacity of the cache */
	readonly #capacity: u32;
	/**
	 * Creates an instance of BlockCache.
	 * @param capacity - The capacity of the cache
	 * @returns An instance of BlockCache
	 * 
	 * @example
	 * ```ts
	 * const cache = new BlockCache(10);
	 * 
	 * cache.put('key', new Uint8Array(10));
	 * cache.get('key'); // Uint8Array(10);
	 * cache.get('key2'); // undefined
	 * ```
	 */
	constructor(capacity: u32) {
		this.#capacity = capacity;
		this.cache = new Map<u32, Block>();
		this.freqMap = new Map<u32, Deque<u32>>();
		this.#minFreq = 0;
	}

	/**
	 * Get the block from the cache
	 * @param key - The key of the block
	 * @returns The block if it exists in the cache, otherwise undefined
	 * @example
	 * ```ts
	 * <BlockCache>.get('key'); // Uint8Array | undefined
	 * ```
	 */
	get(key: u32) {
		if (!this.cache.has(key)) {
			return undefined;
		}

		const node = this.cache.get(key)!;
		this.#updateFrequency(node);
		return node.buffer;
	}

	/**
	 * Put the block in the cache
	 * @param key - The key of the block
	 * @param value - The Uint8Array block of the SSTable
	 * @example
	 * ```ts
	 * <BlockCache>.put('key', new Uint8Array(10));
	 * ```
	 */
	put(key: u32, value: Uint8Array) {
		if (this.#capacity === 0) {
			return;
		}

		if (this.cache.has(key)) {
			const node = this.cache.get(key)!;
			node.buffer = value;
			this.#updateFrequency(node);
		} else {
			if (this.cache.size >= this.#capacity) {
				this.#evict();
			}

			const newNode = new Block(key, value);
			this.cache.set(key, newNode);
			if (!this.freqMap.has(1)) {
				this.freqMap.set(1, new Deque());
			}

			this.freqMap.get(1)!.pushFront(key);
			this.#minFreq = 1;
		}
	}

	has(key: u32) {
		return this.cache.has(key);
	}

	/**
	 * Clear the cache
	 * @example
	 * ```ts
	 * <BlockCache>.clear();
	 * ```
	 */
	clear() {
		this.cache.clear();
		this.freqMap.clear();
		this.#minFreq = 0;
	}

	/**
	 *	Update the frequency of the block
	 * @param node - The block
	 * @internal
	 * 
	 */
	#updateFrequency(node: Block) {
		const oldFreq = node.freq;
		const oldList = this.freqMap.get(oldFreq);
		if (!oldList) return;
		oldList?.eraseElementByValue(node.id);

		if (oldFreq === this.#minFreq && oldList.empty()) {
			this.#minFreq++;
		}

		node.freq++;
		if (!this.freqMap.has(node.freq)) {
			this.freqMap.set(node.freq, new Deque());
		}

		this.freqMap.get(node.freq)?.pushFront(node.id);
	}

	/**
	 * Evict the block from the cache
	 * @internal
	 * 
	 */
	#evict() {
		const list = this.freqMap.get(this.#minFreq);
		const nodeToEvict = list?.popBack();
		if (!nodeToEvict) return;
		this.cache.delete(nodeToEvict);
	}
}
